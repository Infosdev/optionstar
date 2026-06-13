// ==================== STATUS BAR ====================
export function setStatus(state, msg, badgeClass='', badgeText='') {
  const dot=document.getElementById('statusDot');
  const msgEl=document.getElementById('statusMsg');
  const badge=document.getElementById('dataSrcBadge');
  if(dot) { dot.className='status-dot '+state; }
  if(msgEl) msgEl.textContent=msg;
  if(badge) { badge.textContent=badgeText; badge.className=`data-src ${badgeClass}`; }
}
