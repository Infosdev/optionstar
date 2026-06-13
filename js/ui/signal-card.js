import { S } from '../state.js';
import { fmtN } from '../helpers.js';
import { renderCharts } from '../chart/echarts-render.js';

export function refreshSignalLiveLTP() {
  if (!S.confirmedSig) return;
  const sig = S.confirmedSig;
  const isBull = sig.signal==='BUY_CALL', isBear = sig.signal==='BUY_PUT';
  const liveLTP = isBull ? (S.callPrice||0) : isBear ? (S.putPrice||0) : 0;
  if (!liveLTP) return;
  const el = document.getElementById('sigCurLTP');
  if (el) el.textContent = fmtN(liveLTP);
  // Update age text
  const te = document.getElementById('sigTime');
  if (te) {
    const ageMins = Math.floor((Date.now()-S.confirmedAt)/60000);
    te.textContent = ageMins < 1 ? 'Just now' : ageMins < 60 ? `${ageMins}m ago` : `${Math.floor(ageMins/60)}h ${ageMins%60}m ago`;
  }
}

export function updateSignalCard() {
  try {
  const sig = S.confirmedSig;
  const card = document.getElementById('signalCard');
  if (!card) return;

  if (!sig) {
    card.className='signal-card wait-signal';
    const ae=document.getElementById('sigAction'); if(ae){ae.textContent='ANALYZING TREND...';ae.className='signal-action wait';}
    return;
  }

  const isBull=sig.signal==='BUY_CALL', isBear=sig.signal==='BUY_PUT';
  const isWait=sig.signal==='WAIT';
  const cls=isBull?'bull-signal':isBear?'bear-signal':'wait-signal';
  card.className=`signal-card ${cls}`;

  // Header
  const icon=isBull?'📈':isBear?'📉':'⏸️';
  const label=isBull?'BUY CALL':isBear?'BUY PUT':'NEUTRAL — WAIT';
  const acCls=isBull?'bull':isBear?'bear':'wait';
  const confCls=sig.confPct>=70?'high':sig.confPct>=55?'med':'low';
  document.getElementById('sigIcon').textContent=icon;
  const acEl=document.getElementById('sigAction');
  acEl.textContent=label; acEl.className=`signal-action ${acCls}`;
  const confEl=document.getElementById('sigConf');
  confEl.textContent=`${sig.confPct}% Confidence`; confEl.className=`signal-conf ${confCls}`;
  const ageMins = Math.floor((Date.now()-S.confirmedAt)/60000);
  const ageStr = ageMins < 1 ? 'Just now' : ageMins < 60 ? `${ageMins}m ago` : `${Math.floor(ageMins/60)}h ${ageMins%60}m ago`;
  document.getElementById('sigTime').textContent=ageStr;

  // Current LTP line — always show LIVE price from S, not stale confirmed value
  const strike=isBull?`NIFTY ${S.atm} CE`:isBear?`NIFTY ${S.atm} PE`:`NIFTY ${S.atm} ATM`;
  const liveLTP = isBull ? (S.callPrice||sig.curLTP) : isBear ? (S.putPrice||sig.curLTP) : sig.curLTP;
  document.getElementById('sigStrike').textContent=strike;
  document.getElementById('sigCurLTP').textContent=fmtN(liveLTP);

  // Trigger block label changes for WAIT
  const trigBlk=document.getElementById('sigTriggerBlk');
  const trigLbl=document.getElementById('sigTriggerLbl');
  if (isWait) {
    trigBlk.className='sig-blk entry';
    trigLbl.textContent='Watch Level';
  } else if (isBull) {
    trigBlk.className='sig-blk trigger';
    trigLbl.textContent='BUY ABOVE';
  } else {
    trigBlk.className='sig-blk trigger-bear';
    trigLbl.textContent='BUY ABOVE';
  }

  // Trigger / TP / SL / RR values
  document.getElementById('sigEntry').textContent=fmtN(sig.trigger,0);
  document.getElementById('sigTPGain').textContent=`+${fmtN(sig.triggerGap,1)} from LTP`;
  document.getElementById('sigTP').textContent=fmtN(sig.tp,0);
  document.getElementById('sigSLLoss').textContent=`+${fmtN(sig.tpGain,0)} from trigger`;
  document.getElementById('sigSL').textContent=fmtN(sig.sl,0);
  document.getElementById('sigTPGain2').textContent=`-${fmtN(sig.slLoss,0)} from trigger`;
  document.getElementById('sigRR').textContent=`1 : ${sig.rr}`;

  // NIFTY levels + Lot P&L
  document.getElementById('sigNTP').textContent=sig.niftyTP;
  document.getElementById('sigNSL').textContent=sig.niftySL;
  document.getElementById('sigLotTP').textContent=`₹${fmtN(sig.lotTP,0)}`;
  document.getElementById('sigLotSL').textContent=`₹${fmtN(sig.lotSL,0)}`;

  // Reasons
  const rEl=document.getElementById('sigReasons');
  if(rEl){
    const reasons = isWait
      ? sig.signalReasons.slice(0,3)
      : sig.signalReasons.slice(0,4);
    rEl.innerHTML=reasons.map(r=>`<span class="sig-rsn">${r.t}</span>`).join('');
    if(!reasons.length) rEl.innerHTML='<span class="sig-rsn">⚡ Market balanced — monitoring...</span>';
  }

  // Chart arrow tracking — only on signal change
  const newType = isBull ? 'BUY' : isBear ? 'SELL' : '';
  if (newType && newType !== S.lastSignalType) {
    S.lastSignalType = newType;
    const pushArrow = (arr, hist) => {
      if (!hist.length) return;
      const idx = hist.length - 1;
      arr.push({ timeIdx: idx, time: hist[idx].time, price: hist[idx][newType==='BUY'?'l':'h'], type: newType });
      if (arr.length > 20) arr.shift();
    };
    if (isBull) pushArrow(S.callSignals, S.callHistory);
    if (isBear) pushArrow(S.putSignals,  S.putHistory);
    renderCharts();
  }
  } catch(err) { console.error('updateSignalCard error:', err); }
}
