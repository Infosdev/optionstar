import { S } from '../state.js';
import { blackScholes, getDaysToExpiry } from '../black-scholes.js';
import { fmtN } from '../helpers.js';

// ==================== CHAIN BUILDERS ====================
export const STRIKES_RANGE = 10; // strikes above & below ATM

export function buildChainFromNSE(data) {
  // Sort by strike
  const sorted = [...data].sort((a,b)=>a.strikePrice-b.strikePrice);
  // Keep strikes near ATM
  const near = sorted.filter(d=>Math.abs(d.strikePrice-S.atm)<=STRIKES_RANGE*50);
  S.chain = near.map(d=>({
    strike:d.strikePrice,
    ceLTP:d.CE?.lastPrice||0, ceOI:d.CE?.openInterest||0, ceIV:d.CE?.impliedVolatility||0,
    ceChg:d.CE?.change||0, ceVol:d.CE?.totalTradedVolume||0,
    peLTP:d.PE?.lastPrice||0, peOI:d.PE?.openInterest||0, peIV:d.PE?.impliedVolatility||0,
    peChg:d.PE?.change||0, peVol:d.PE?.totalTradedVolume||0,
  }));
}

export function calcBSChain() {
  const T=getDaysToExpiry(), r=0.065, nifty=S.nifty||23800;
  const daysLeft = T * 365;
  const rawVix = (S.indiaVix || 14) / 100;   // default 14 (India VIX typical)
  // Near-expiry term structure: weekly options price at ~85% of 30-day VIX (calibrated to market data)
  const termFactor = daysLeft <= 7 ? 0.85 : daysLeft <= 15 ? 0.90 : daysLeft <= 30 ? 0.95 : 1.00;
  const atmIV = Math.max(0.08, rawVix * termFactor);
  const strikes=[];
  for(let k=S.atm-STRIKES_RANGE*50;k<=S.atm+STRIKES_RANGE*50;k+=50) strikes.push(k);
  S.chain = strikes.map(K=>{
    const m=Math.abs(K-nifty)/nifty;
    const smileAdj = daysLeft <= 15 ? 0.5 : 0.9;  // flatter skew near expiry
    const iv=Math.max(0.08, atmIV + m*smileAdj);
    const ce=+blackScholes(nifty,K,T,r,iv,'CE').toFixed(2);
    const pe=+blackScholes(nifty,K,T,r,iv,'PE').toFixed(2);
    return {strike:K,ceLTP:ce,peLTP:pe,ceOI:0,peOI:0,ceIV:+(iv*100).toFixed(1),peIV:+(iv*100).toFixed(1),ceChg:0,peChg:0,ceVol:0,peVol:0};
  });
  // Always refresh B-S prices when not live — prevent stale prices persisting
  const atmRow=S.chain.find(r=>r.strike===S.atm);
  if(atmRow){
    S.ceIV=atmIV; S.peIV=atmIV;
    if(S.dataSource !== 'live') {
      S.callPrice = atmRow.ceLTP;
      S.putPrice  = atmRow.peLTP;
    } else {
      if(!S.callPrice||S.callPrice===0) S.callPrice=atmRow.ceLTP;
      if(!S.putPrice||S.putPrice===0) S.putPrice=atmRow.peLTP;
    }
  }
}

export function updateSymbolLabels() {
  const ceSym=`NIFTY ${S.atm} CE`;
  const peSym=`NIFTY ${S.atm} PE`;
  document.getElementById('sym1Tag').textContent=ceSym;
  document.getElementById('sym2Tag').textContent=peSym;
  document.getElementById('ceSymTitle').textContent=S.ceSymbol||ceSym;
  document.getElementById('peSymTitle').textContent=S.peSymbol||peSym;
  document.getElementById('ceInput').value=S.ceSymbol||ceSym;
  document.getElementById('peInput').value=S.peSymbol||peSym;
  document.getElementById('tape1Title').textContent=(S.ceSymbol||ceSym)+' — Order Flow';
  document.getElementById('tape2Title').textContent=(S.peSymbol||peSym)+' — Order Flow';
}
