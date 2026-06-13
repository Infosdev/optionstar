import { S } from '../state.js';
import { fmtN, fmtL } from '../helpers.js';

export function renderChain() {
  const chain=S.chain||[];
  const tbody=document.getElementById('chainBody');
  if(!tbody) return;
  tbody.innerHTML='';
  chain.forEach(r=>{
    const isAtm=r.strike===S.atm;
    const tr=document.createElement('tr');
    if(isAtm) tr.className='atm';
    const ceDir=r.ceChg>=0?'▲':'▼', peDir=r.peChg>=0?'▲':'▼';
    const ceColor=r.ceChg>=0?'var(--green)':'var(--red)', peColor=r.peChg>=0?'var(--green)':'var(--red)';
    tr.innerHTML=`
      <td class="ce-col" style="font-weight:${isAtm?700:400}">
        ${fmtN(r.ceLTP)}<br>
        <span class="chain-oi" style="color:${ceColor}">${ceDir}${fmtN(Math.abs(r.ceChg))}</span>
      </td>
      <td class="chain-oi">${fmtL(r.ceOI)}</td>
      <td style="font-weight:700;font-size:${isAtm?'11':'10'}px">${r.strike}</td>
      <td class="chain-oi">${fmtL(r.peOI)}</td>
      <td class="pe-col" style="font-weight:${isAtm?700:400}">
        ${fmtN(r.peLTP)}<br>
        <span class="chain-oi" style="color:${peColor}">${peDir}${fmtN(Math.abs(r.peChg))}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
