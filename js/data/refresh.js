// ==================== MAIN REFRESH & AUTO-REFRESH ====================
import { S } from '../state.js';
import { fmtN, timeStr } from '../helpers.js';
import { setStatus } from '../ui/status-bar.js';
import { showToast } from '../ui/toast.js';
import { fetchNSEAllIndices, fetchNSEOptionChain } from './nse.js';
import { YF_SYMS, fetchYFIndex, fetchYFOptions, buildChainFromYFOptions } from './yahoo-finance.js';
import { buildChainFromNSE, calcBSChain, STRIKES_RANGE, updateSymbolLabels } from '../chart/chain-builders.js';
import { buildOptionChartsFromNifty, buildSyntheticCharts, calcVwapFromHistory, calcPoc } from '../chart/builders.js';
import { updateUI } from '../ui/update-ui.js';
import { renderCharts } from '../chart/echarts-render.js';
import { renderChain } from '../ui/chain-table.js';
import { updateStrategy } from '../analysis/strategy.js';
import { updateIndexBoxes } from '../ui/index-boxes.js';
import { renderExpiryButtons } from '../ui/expiry.js';

let refreshTimer = null;

export async function refreshData(showToastFlag=false) {
  setStatus('fetching','Fetching live data...');
  spinRefresh(true);
  try {
    // 1. Fetch indices in parallel — NSE allIndices for NIFTY/BNF/FN accuracy,
    //    Yahoo Finance for NIFTY chart history, SENSEX (BSE), and India VIX
    const [nseAllRes, nRes, sxRes, vixRes] = await Promise.allSettled([
      fetchNSEAllIndices(),           // Accurate NIFTY + BANKNIFTY + FINNIFTY from NSE
      fetchYFIndex(YF_SYMS.nifty),   // NIFTY 1-min history for charts + price fallback
      fetchYFIndex(YF_SYMS.sx),      // SENSEX (BSE — not in NSE allIndices)
      fetchYFIndex(YF_SYMS.vix),     // India VIX
    ]);

    let gotIndices = false;

    // Priority 1: NSE allIndices (accurate FINNIFTY, BANKNIFTY)
    const nseAll = nseAllRes.status==='fulfilled' ? nseAllRes.value : null;
    if (nseAll) {
      if (nseAll.nifty) { S.niftyPrev=nseAll.nifty.prev; S.nifty=nseAll.nifty.price; gotIndices=true; }
      if (nseAll.bnf)   { S.bnfPrev=nseAll.bnf.prev;     S.bnf=nseAll.bnf.price; }
      if (nseAll.fn)    { S.fnPrev=nseAll.fn.prev;        S.fn=nseAll.fn.price; }
    }

    // Priority 2: Yahoo Finance NIFTY (always needed for intraday chart history)
    if (nRes.status==='fulfilled' && nRes.value) {
      const d=nRes.value;
      S.niftyHistory = d.history;   // chart candles always from Yahoo Finance
      if (!gotIndices) { S.niftyPrev=d.prev; S.nifty=d.price; gotIndices=true; }
      // Fill BANKNIFTY / FINNIFTY from YF only if NSE didn't supply them
      // (we skip ^CNXFIN / ^NSEBANK here since NSE allIndices is more accurate)
    }

    // SENSEX from Yahoo Finance (BSE index — not on NSE)
    if (sxRes.status==='fulfilled' && sxRes.value) {
      const d=sxRes.value;
      // Validate: SENSEX should be > 40000
      if (d.price > 40000) { S.sxPrev=d.prev; S.sx=d.price; }
    }

    // India VIX
    if (vixRes.status==='fulfilled' && vixRes.value) { S.indiaVix=vixRes.value.price||15; }

    // If BANKNIFTY or FINNIFTY still missing (NSE + YF both failed), fetch them separately
    if (!S.bnf) {
      const r = await fetchYFIndex(YF_SYMS.bnf);
      if (r && r.price > 30000) { S.bnfPrev=r.prev; S.bnf=r.price; }
    }
    if (!S.fn) {
      const r = await fetchYFIndex(YF_SYMS.fn);
      if (r && r.price > 10000) { S.fnPrev=r.prev; S.fn=r.price; }
    }

    // Update ATM based on active index and correct step
    const _atmStep = S.activeIndex === 'BANKNIFTY' ? 100 : 50;
    const _atmSpot = S.activeIndex === 'BANKNIFTY' ? S.bnf : S.activeIndex === 'FINNIFTY' ? S.fn : S.nifty;
    if (_atmSpot > 0) S.atm = Math.round(_atmSpot / _atmStep) * _atmStep;
    const _chainTitle = document.getElementById('chainTitle');
    if (_chainTitle) _chainTitle.textContent = `Options Chain \u2014 ${S.activeIndex || 'NIFTY'}`;

    updateIndexBoxes();

    // 2. Fetch NSE option chain
    const optData = await fetchNSEOptionChain(S.activeIndex || 'NIFTY');
    if (optData?.records) {
      const recs = optData.records;
      // Extract expiry dates
      if(recs.expiryDates?.length) {
        S.expiryList = recs.expiryDates;
        if(!S.selectedExpiry) S.selectedExpiry = recs.expiryDates[0];
        renderExpiryButtons();
      }
      // Underlying value
      if(recs.underlyingValue) {
        S.nifty = recs.underlyingValue; S.atm=Math.round(S.nifty/50)*50;
        document.getElementById('underlyingVal').textContent=`Spot: ${fmtN(S.nifty)}`;
        updateIndexBoxes();
      }
      // Filter by selected expiry
      const filteredData = recs.data.filter(d => !S.selectedExpiry || d.expiryDate===S.selectedExpiry);
      S.chainRaw = filteredData;

      // Find ATM data
      const atmRow = filteredData.find(d=>d.strikePrice===S.atm) || filteredData.reduce((a,b)=>Math.abs(b.strikePrice-S.nifty)<Math.abs(a.strikePrice-S.nifty)?b:a,filteredData[0]);
      if(atmRow){
        if(atmRow.CE){
          S.callPrev=S.callPrice;
          S.callPrice=atmRow.CE.lastPrice||0;
          S.callOI=atmRow.CE.openInterest||0;
          S.callVol=atmRow.CE.totalTradedVolume||0;
          S.ceIV=(atmRow.CE.impliedVolatility||15)/100;
          S.ceSymbol=atmRow.CE.identifier||`NIFTY ${S.selectedExpiry} ${S.atm} CE`;
        }
        if(atmRow.PE){
          S.putPrev=S.putPrice;
          S.putPrice=atmRow.PE.lastPrice||0;
          S.putOI=atmRow.PE.openInterest||0;
          S.putVol=atmRow.PE.totalTradedVolume||0;
          S.peIV=(atmRow.PE.impliedVolatility||15)/100;
          S.peSymbol=atmRow.PE.identifier||`NIFTY ${S.selectedExpiry} ${S.atm} PE`;
        }
      }
      // Build full chain
      buildChainFromNSE(filteredData);
      // Update symbol displays
      updateSymbolLabels();
      S.dataSource='live';
      setStatus('live','NSE Live Data \u2713', 'live-src', 'LIVE');
    } else {
      // Fallback 1: Try Yahoo Finance options chain
      setStatus('fetching','NSE unavailable \u2014 trying Yahoo Finance options...');
      const yfOpts = await fetchYFOptions('^NSEI');
      if (yfOpts && (yfOpts.calls.length > 0 || yfOpts.puts.length > 0)) {
        const atm = S.atm;
        const findNearest = (arr, strike) => arr.length ? arr.reduce((a,b) => Math.abs(b.strike-strike) < Math.abs(a.strike-strike) ? b : a, arr[0]) : null;
        const atmCE = findNearest(yfOpts.calls, atm);
        const atmPE = findNearest(yfOpts.puts, atm);
        if (atmCE && atmCE.lastPrice > 0) {
          S.callPrev=S.callPrice; S.callPrice=atmCE.lastPrice;
          S.callOI=atmCE.openInterest||0; S.callVol=atmCE.volume||0;
          S.ceIV=atmCE.impliedVolatility||0.15;
        }
        if (atmPE && atmPE.lastPrice > 0) {
          S.putPrev=S.putPrice; S.putPrice=atmPE.lastPrice;
          S.putOI=atmPE.openInterest||0; S.putVol=atmPE.volume||0;
          S.peIV=atmPE.impliedVolatility||0.15;
        }
        buildChainFromYFOptions(yfOpts.calls, yfOpts.puts);
        updateSymbolLabels();
        S.dataSource='live';
        setStatus('live','Yahoo Finance Options \u2713','live-src','LIVE');
      } else {
        // Fallback 2: Black-Scholes using India VIX
        calcBSChain();
        S.dataSource=gotIndices?'bs':'sim';
        const msg=gotIndices?`Index live \u00b7 Options: B-S (VIX ${fmtN(S.indiaVix,1)})`:'Using simulation (check internet)';
        const badgeType=gotIndices?'bs-src':'sim-src';
        const badgeText=gotIndices?'B-S EST':'SIMULATION';
        setStatus(gotIndices?'live':'sim',msg,badgeType,badgeText);
      }
    }

    // 3. Rebuild option charts from NIFTY history
    if(S.niftyHistory.length>1 && S.callPrice>0){
      buildOptionChartsFromNifty();
    } else if(S.callPrice>0) {
      buildSyntheticCharts();
    }

    calcVwapFromHistory();
    calcPoc();
    updateUI();
    renderCharts();
    renderChain();
    updateStrategy();

    S.lastUpdate=new Date();
    document.getElementById('statusTime').textContent=`Updated: ${timeStr(S.lastUpdate)}`;
    if(showToastFlag) showToast('Data refreshed','success');
  } catch(e) {
    console.error('refreshData error',e);
    setStatus('error','Fetch error \u2014 check internet connection','sim-src','ERROR');
    calcBSChain(); buildSyntheticCharts(); updateUI(); renderCharts(); renderChain();
  } finally {
    spinRefresh(false);
  }
}

export function manualRefresh() { refreshData(true); }

export function spinRefresh(on) {
  const ic=document.getElementById('refreshIcon');
  if(ic){ if(on) ic.className='fas fa-sync-alt fa-spin'; else ic.className='fas fa-sync-alt'; }
}

export function scheduleAutoRefresh() {
  if(refreshTimer) clearInterval(refreshTimer);
  const interval=parseInt(document.getElementById('s-interval')?.value||'30')*1000;
  refreshTimer=setInterval(()=>{
    if(document.getElementById('s-autorefresh')?.checked!==false) refreshData();
  }, Math.max(10000,interval));
}
