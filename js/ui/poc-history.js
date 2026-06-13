import { S } from '../state.js';
import { fmtN, timeStr } from '../helpers.js';

let lastPocTs=0;

export function updatePocHistory() {
  const now=Date.now();
  if(now-lastPocTs<60000) return;
  lastPocTs=now;
  if(!S.callPoc||!S.putPoc) return;
  S.pocHistory.unshift({call:S.callPoc,put:S.putPoc,str:+(S.callPoc+S.putPoc).toFixed(2),time:timeStr()});
  if(S.pocHistory.length>25) S.pocHistory.pop();
  renderPocHistory();
}

export function renderPocHistory() {
  const tbody=document.getElementById('pocBody'); if(!tbody) return;
  tbody.innerHTML='';
  S.pocHistory.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="call-val">${fmtN(r.call)}</td><td class="put-val">${fmtN(r.put)}</td><td class="str-val">${fmtN(r.str)}</td><td style="font-size:8px;color:#888">${r.time}</td>`;
    tbody.appendChild(tr);
  });
}

export function clearPocHistory() { S.pocHistory=[]; renderPocHistory(); }
