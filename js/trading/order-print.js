import { S } from '../state.js';
import { fmtN, fmtL, timeStr } from '../helpers.js';

// ==================== ORDER PRINT ====================
export function addOrderPrintTick() {
  if(!S.callPrice||!S.putPrice) return;
  const t=timeStr();
  const ceVol=Math.floor(Math.random()*200000)+20000;
  const peVol=Math.floor(Math.random()*180000)+20000;
  const cePrint=Math.floor((Math.random()-.48)*ceVol);
  const pePrint=Math.floor((Math.random()-.52)*peVol);
  S.tape1.unshift({time:t,price:fmtN(S.callPrice),vol:fmtL(ceVol),print:cePrint});
  S.tape2.unshift({time:t,price:fmtN(S.putPrice),vol:fmtL(peVol),print:pePrint});
  if(S.tape1.length>80) S.tape1.pop();
  if(S.tape2.length>80) S.tape2.pop();
  renderTape('tape1Body',S.tape1);
  renderTape('tape2Body',S.tape2);
}

export function renderTape(id,data) {
  const el=document.getElementById(id); if(!el) return;
  el.innerHTML='';
  data.slice(0,60).forEach(r=>{
    const buy=r.print>0;
    const tr=document.createElement('tr');
    tr.className=buy?'tape-buy':'tape-sell';
    tr.innerHTML=`<td>${r.time}</td><td>${r.price}</td><td>${r.vol}</td><td class="op-val">${r.print>0?'+':''}${fmtN(r.print,0)}</td>`;
    el.appendChild(tr);
  });
}
