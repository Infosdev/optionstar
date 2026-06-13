import { S } from '../state.js';
import { fmtN, fmtL } from '../helpers.js';

export function analyzeMarket() {
  if(!S.callPrice||!S.putPrice) return;
  const callAboveVwap=S.callPrice>S.callVwap;
  const putAboveVwap=S.putPrice>S.putVwap;
  const callAbovePoc=S.callPrice>S.callPoc;
  const putAbovePoc=S.putPrice>S.putPoc;
  const ceOIStrong=S.callOI>S.putOI;
  const strLTP=S.callPrice+S.putPrice;
  const strVwap=S.callVwap+S.putVwap;
  const strAbove=strLTP>strVwap;

  let bearScore=50,bullScore=50;
  if(!callAboveVwap)bearScore+=8;else bullScore+=8;
  if(putAboveVwap)bearScore+=8;else bullScore+=8;
  if(!callAbovePoc)bearScore+=7;else bullScore+=7;
  if(!putAbovePoc)bearScore+=7;else bullScore+=7;
  if(!ceOIStrong)bearScore+=7;else bullScore+=7;
  if(!strAbove)bearScore+=5;else bullScore+=5;

  const total=bearScore+bullScore;
  const bPct=Math.round(bearScore/total*100);
  const buPct=100-bPct;

  let trend,tcls;
  if(bPct>70){trend='STRONG BEARISH';tcls='bear';}
  else if(bPct>55){trend='BEARISH';tcls='bear';}
  else if(buPct>70){trend='STRONG BULLISH';tcls='bull';}
  else if(buPct>55){trend='BULLISH';tcls='bull';}
  else{trend='VOLATILE';tcls='vol';}

  const msv=Math.abs(S.callPrice-S.callVwap)+Math.abs(S.putPrice-S.putVwap)>15?'VOLATILE':'STABLE';
  const smi=S.putOI>S.callOI?'PUT ▼':'CALL ▲';
  const dstr=bPct>55?'PUT ▼':'CALL ▲';
  const xrp=Math.abs(S.callPrice-S.callPoc)<8?'Neutral':S.callPrice>S.callPoc?'High':'Low';
  const vix=S.indiaVix>0?S.indiaVix:(S.ceIV+S.peIV)/2*100;
  const vixStr=vix>20?'High':vix<12?'Low':'Neutral';
  const signal=bPct>55?`🔴 BUY PUT @ POC ${fmtN(S.putPoc,0)}`:`🟢 BUY CALL @ POC ${fmtN(S.callPoc,0)}`;

  // Badges
  setBadge('trendBadge',`${tcls==='bear'?'📉':tcls==='bull'?'📈':'⚡'} ${trend}`,tcls);
  setBadge('msvBadge',`⚡ ${msv}`,msv==='VOLATILE'?'vol':'bull');
  setBadge('dstrBadge',`DSTR: ${dstr}`,bPct>55?'bear':'bull');
  setBadge('xrpBadge',`XRP: ${xrp}`,xrp==='Neutral'?'neu':xrp==='High'?'bear':'bull');
  setBadge('vixBadge',`VIX: ${fmtN(vix,1)} (${vixStr})`,vixStr==='High'?'bear':vixStr==='Low'?'bull':'neu');

  // Commentary
  setComm('c-msv',msv,msv==='VOLATILE'?'vol':'bull');
  setComm('c-str',trend,tcls);
  setComm('c-cpoc',`${callAbovePoc?'↑':'↓'} ${fmtN(S.callPrice,0)} (POC ${fmtN(S.callPoc,0)})`,callAbovePoc?'bull':'bear');
  setComm('c-ppoc',`${putAbovePoc?'↑':'↓'} ${fmtN(S.putPrice,0)} (POC ${fmtN(S.putPoc,0)})`,putAbovePoc?'bull':'bear');
  setComm('c-smi',smi,smi.includes('PUT')?'bear':'bull');
  setComm('c-str2',strAbove?'ABOVE VWAP':'BELOW VWAP',strAbove?'bull':'bear');
  setComm('c-xrp',xrp,xrp==='Neutral'?'':'bull');
  setComm('c-vix',`${vixStr} (${fmtN(vix,1)}%)`,vixStr==='High'?'bear':'');
  setComm('c-signal',signal,bPct>55?'bear':'bull');

  const fs=document.getElementById('finalSignal');
  if(fs){
    fs.style.background=tcls==='bear'?'rgba(220,53,69,.1)':tcls==='bull'?'rgba(40,167,69,.1)':'rgba(230,168,23,.1)';
    fs.style.color=tcls==='bear'?'var(--red)':tcls==='bull'?'var(--green)':'var(--yellow)';
    fs.textContent=`${tcls==='bear'?'↓':'↑'} ${trend} — Best: ${bPct>55?'PUT BUY':'CALL BUY'}`;
  }

  // Sentiment
  document.getElementById('sentScore').textContent=bPct;
  document.getElementById('sentScore').style.color=tcls==='bear'?'var(--red)':'var(--green)';
  document.getElementById('sentFill').style.width=bPct+'%';
  document.getElementById('sentLabel').textContent=trend;
  document.getElementById('sentLabel').style.color=tcls==='bear'?'var(--red)':'var(--green)';
  document.getElementById('sentEntry').textContent=signal;
  document.getElementById('ceSignalBar').style.width=buPct+'%';
  document.getElementById('peSignalBar').style.width=bPct+'%';
  document.getElementById('scenarioBadge').textContent=`${msv==='VOLATILE'?'⚡':'📊'} ${trend}`;

  // Indicators
  setInd('ind-dstr',dstr,bPct>55?'bear':'bull');
  setInd('ind-smi',smi.includes('PUT')?'PUT Bias':'CALL Bias',smi.includes('PUT')?'bear':'bull');
  setInd('ind-xrp',xrp,xrp==='Neutral'?'neu':xrp==='High'?'bear':'bull');
  setInd('ind-vix',vixStr,vixStr==='High'?'bear':'neu');
  setInd('ind-poc',bPct>55?'PUT':'CALL',bPct>55?'bear':'bull');
}

export function setBadge(id,text,cls){ const el=document.getElementById(id); if(el){el.className=`badge ${cls}`;el.textContent=text;} }
export function setComm(id,text,cls){ const el=document.getElementById(id); if(el){el.textContent=text;el.className='c-val '+(cls||'');} }
export function setInd(id,text,cls){ const el=document.getElementById(id); if(!el)return; el.className=`ind-item ${cls}`; el.querySelector('.ind-val').textContent=text; }
