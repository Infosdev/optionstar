import { S } from '../state.js';
import { fmtN } from '../helpers.js';

export function updateIndexBoxes() {
  const idxs=[
    {id:'nifty',price:S.nifty,prev:S.niftyPrev},
    {id:'bnf',price:S.bnf,prev:S.bnfPrev},
    {id:'fn',price:S.fn,prev:S.fnPrev},
    {id:'sx',price:S.sx,prev:S.sxPrev},
  ];
  idxs.forEach(idx=>{
    if(!idx.price) return;
    const chg=idx.price-idx.prev;
    const pct=idx.prev?chg/idx.prev*100:0;
    const dir=chg>=0?'up':'dn';
    const box=document.getElementById(`${idx.id}-box`);
    if(box) box.className=`idx-box ${dir}`;
    const pEl=document.getElementById(`${idx.id}-price`);
    if(pEl) pEl.textContent=fmtN(idx.price);
    const cEl=document.getElementById(`${idx.id}-chg`);
    if(cEl) cEl.textContent=`${chg>=0?'▲':'▼'} ${chg>=0?'+':''}${fmtN(chg)} (${chg>=0?'+':''}${fmtN(pct)}%)`;
  });
}
