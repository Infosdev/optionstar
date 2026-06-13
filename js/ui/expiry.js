import { S } from '../state.js';

export function renderExpiryButtons() {
  const row=document.getElementById('expiryRow');
  if(!row) return;
  row.innerHTML='';
  S.expiryList.slice(0,4).forEach(exp=>{
    const btn=document.createElement('button');
    btn.className='exp-btn'+(exp===S.selectedExpiry?' active':'');
    btn.textContent=exp;
    btn.onclick=()=>selectExpiry(exp);
    row.appendChild(btn);
  });
}

export function selectExpiry(exp) {
  S.selectedExpiry=exp;
  renderExpiryButtons();
  window.manualRefresh();
}
