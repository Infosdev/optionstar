import { S } from '../state.js';
import { nowIST } from '../helpers.js';

// ==================== CHART DATA BUILDERS ====================
export function buildOptionChartsFromNifty() {
  const nh=S.niftyHistory;
  if(!nh.length) return;
  const lastN=nh[nh.length-1].c;
  const ceP=S.callPrice, peP=S.putPrice;
  if(!ceP||!peP) return;

  // Delta approximation: ATM CE delta ≈ 0.5, ATM PE delta ≈ -0.5
  // We use realized delta from price difference over NIFTY move
  const ceDelta = 0.5;
  const peAbsDelta = 0.5;

  // Calculate offset so last candle = current LTP
  const ceBase = ceP - ceDelta * lastN;
  const peBase = peP + peAbsDelta * lastN;

  // Resample to selected TF
  const tfMs = S.tf * 60000;
  const grouped = {};
  nh.forEach(c=>{
    const bucket = Math.floor(c.time.getTime()/tfMs)*tfMs;
    if(!grouped[bucket]) grouped[bucket]={time:new Date(bucket),items:[]};
    grouped[bucket].items.push(c);
  });
  const resampled = Object.values(grouped).sort((a,b)=>a.time-b.time).map(g=>{
    const items=g.items;
    return {
      time:g.time,
      o:items[0].o, h:Math.max(...items.map(i=>i.h)),
      l:Math.min(...items.map(i=>i.l)), c:items[items.length-1].c,
      v:items.reduce((s,i)=>s+i.v,0)
    };
  });

  S.callHistory = resampled.map(nc=>{
    const noise=()=>(Math.random()-0.5)*0.4;
    const c=Math.max(0.05, ceDelta*nc.c+ceBase+noise());
    const o=Math.max(0.05, ceDelta*nc.o+ceBase+noise());
    const h=Math.max(c,o, ceDelta*nc.h+ceBase)+Math.random()*0.3;
    const l=Math.max(0.05, Math.min(c,o, ceDelta*nc.l+ceBase)-Math.random()*0.3);
    const v=Math.max(1,Math.floor(nc.v*0.3*(0.7+Math.random()*0.6)));
    return {time:nc.time,o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v};
  });

  S.putHistory = resampled.map(nc=>{
    const noise=()=>(Math.random()-0.5)*0.4;
    const c=Math.max(0.05, peBase-peAbsDelta*nc.c+noise());
    const o=Math.max(0.05, peBase-peAbsDelta*nc.o+noise());
    const h=Math.max(c,o, peBase-peAbsDelta*nc.l+noise())+Math.random()*0.3;
    const l=Math.max(0.05, Math.min(c,o, peBase-peAbsDelta*nc.h+noise())-Math.random()*0.3);
    const v=Math.max(1,Math.floor(nc.v*0.28*(0.7+Math.random()*0.6)));
    return {time:nc.time,o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v};
  });

  // Anchor last candle to real price
  if(S.callHistory.length){ const last=S.callHistory[S.callHistory.length-1]; last.c=ceP; last.h=Math.max(last.h,ceP); last.l=Math.min(last.l,ceP); }
  if(S.putHistory.length){ const last=S.putHistory[S.putHistory.length-1]; last.c=peP; last.h=Math.max(last.h,peP); last.l=Math.min(last.l,peP); }
  addVwap(S.callHistory); addVwap(S.putHistory);
}

export function buildSyntheticCharts() {
  if(!S.callPrice||!S.putPrice) return;
  const now=nowIST();
  const mktOpen=new Date(now); mktOpen.setHours(9,15,0,0);
  const elapsedMs=now-mktOpen;
  const tfMs=S.tf*60000;
  const periods=Math.max(1,Math.min(200,Math.floor(elapsedMs/tfMs)));

  function gen(basePrice) {
    let p=basePrice*1.2;
    const arr=[];
    for(let i=0;i<periods;i++){
      const t=new Date(mktOpen.getTime()+i*tfMs);
      const o=p, chg=(Math.random()-.52)*p*0.02;
      const c=Math.max(0.05,p+chg);
      const h=Math.max(o,c)+Math.random()*p*0.007;
      const l=Math.max(0.05,Math.min(o,c)-Math.random()*p*0.007);
      const v=Math.floor(Math.random()*300000)+50000;
      arr.push({time:t,o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v});
      p=c;
    }
    // Anchor last to real price
    if(arr.length){ const last=arr[arr.length-1]; last.c=basePrice; last.h=Math.max(last.h,basePrice); last.l=Math.min(last.l,basePrice); }
    addVwap(arr);
    return arr;
  }
  S.callHistory=gen(S.callPrice);
  S.putHistory=gen(S.putPrice);
}

export function addVwap(hist) {
  let pv=0,v=0;
  hist.forEach(c=>{
    const avg=(c.o+c.h+c.l+c.c)/4; pv+=avg*c.v; v+=c.v;
    c.vwap=v>0?+(pv/v).toFixed(2):c.c;
  });
}

export function calcVwapFromHistory() {
  if(S.callHistory.length){ const l=S.callHistory[S.callHistory.length-1]; S.callVwap=l.vwap||l.c; }
  if(S.putHistory.length){ const l=S.putHistory[S.putHistory.length-1]; S.putVwap=l.vwap||l.c; }
}

export function calcPoc() {
  function getPoc(hist) {
    if(!hist.length) return 0;
    const m={}; hist.forEach(c=>{const k=Math.round(c.c);m[k]=(m[k]||0)+c.v;});
    let mv=0,p=0; Object.entries(m).forEach(([k,v])=>{if(v>mv){mv=v;p=+k;}});
    return p;
  }
  S.callPoc=getPoc(S.callHistory)||S.callPrice;
  S.putPoc=getPoc(S.putHistory)||S.putPrice;
}
