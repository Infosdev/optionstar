// ==================== TOAST ====================
let _toastTimer;
export function showToast(msg,type='info') {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast ${type} show`;
  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}
