import { S } from '../state.js';
import { fmtN, fmtL, timeStr } from '../helpers.js';
import { calcBSChain } from '../chart/chain-builders.js';
import { buildSyntheticCharts, calcVwapFromHistory, calcPoc } from '../chart/builders.js';
import { analyzeMarket } from '../analysis/market.js';
import { tryRefreshSignal } from '../analysis/signal-confirm.js';
import { refreshSignalLiveLTP } from './signal-card.js';
import { updateGreeks } from './greeks.js';
import { updatePCRMaxPain } from '../analysis/pcr-maxpain.js';
import { trackIVRank } from '../analysis/iv-rank.js';
import { updateMultiTF } from '../analysis/multi-tf.js';
import { trackStraddleDecay } from '../chart/straddle-decay.js';
import { checkSignalAlert } from '../alerts.js';
import { renderOIChart } from '../chart/oi-chart.js';

export function updateUI() {
  // Always ensure prices — use B-S fallback when market closed / data unavailable
  if(!S.callPrice||!S.putPrice) {
    calcBSChain();
    const ar=S.chain&&S.chain.find(r=>r.strike===S.atm);
    if(ar){S.callPrice=ar.ceLTP||S.callPrice;S.putPrice=ar.peLTP||S.putPrice;}
    if(S.callHistory.length===0) buildSyntheticCharts();
    calcVwapFromHistory(); calcPoc();
  }
  if(!S.callPrice||!S.putPrice) return;
  const ct=timeStr();
  document.getElementById('callLTP').textContent=fmtN(S.callPrice);
  document.getElementById('putLTP').textContent=fmtN(S.putPrice);
  document.getElementById('callVwapDisp').textContent=fmtN(S.callVwap);
  document.getElementById('putVwapDisp').textContent=fmtN(S.putVwap);
  document.getElementById('callPocDisp').textContent=fmtN(S.callPoc);
  document.getElementById('putPocDisp').textContent=fmtN(S.putPoc);
  document.getElementById('callOIDisp').textContent=fmtL(S.callOI);
  document.getElementById('putOIDisp').textContent=fmtL(S.putOI);
  document.getElementById('straddleDisp').textContent=fmtN(S.callVwap+S.putVwap);
  document.getElementById('straddleLTP').textContent=fmtN(S.callPrice+S.putPrice);
  document.getElementById('ceVwapStat').textContent=fmtN(S.callVwap);
  document.getElementById('cePocStat').textContent=fmtN(S.callPoc);
  document.getElementById('peVwapStat').textContent=fmtN(S.putVwap);
  document.getElementById('pePocStat').textContent=fmtN(S.putPoc);
  document.getElementById('ceIVStat').textContent=fmtN(S.ceIV*100,1)+'%';
  document.getElementById('peIVStat').textContent=fmtN(S.peIV*100,1)+'%';
  document.getElementById('commTime').textContent=ct;

  // OI power bars
  const totOI=(S.callOI||1)+(S.putOI||1);
  const cePct=Math.round(S.callOI/totOI*100)||50;
  const pePct=100-cePct;
  document.getElementById('callPower').textContent=fmtL(S.callOI);
  document.getElementById('putPower').textContent=fmtL(S.putOI);
  document.getElementById('callVolBar').style.width=cePct+'%';
  document.getElementById('putVolBar').style.width=pePct+'%';

  try { analyzeMarket(); } catch(e) { console.warn('analyzeMarket:', e); }
  tryRefreshSignal();
  refreshSignalLiveLTP();
  try { updateGreeks(); } catch(e) {}
  try { updatePCRMaxPain(); } catch(e) {}
  try { trackIVRank(); } catch(e) {}
  try { updateMultiTF(); } catch(e) {}
  try { trackStraddleDecay(); } catch(e) {}
  try { checkSignalAlert(); } catch(e) {}
  try { renderOIChart(); } catch(e) {}
}
