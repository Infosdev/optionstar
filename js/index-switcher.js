import { S } from './state.js';

// ==================== INDEX SWITCHER ====================
export function switchIndex(idx) {
  S.activeIndex = idx;
  document.querySelectorAll('.idx-sw-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('sw-' + idx);
  if (btn) btn.classList.add('active');
  // Reset chain & symbol state
  S.selectedExpiry = '';
  S.expiryList = [];
  S.chainRaw = [];
  S.chain = [];
  S.callPrice = 0; S.putPrice = 0;
  S.callHistory = []; S.putHistory = [];
  document.getElementById('expiryRow').innerHTML = '<span style="font-size:10px;color:#888">Loading...</span>';
  document.getElementById('chainBody').innerHTML = '';
  // Update ATM rounding: BANKNIFTY uses 100, others 50
  const spot = idx === 'BANKNIFTY' ? S.bnf : idx === 'FINNIFTY' ? S.fn : S.nifty;
  const step = idx === 'BANKNIFTY' ? 100 : 50;
  if (spot) S.atm = Math.round(spot / step) * step;
  window.manualRefresh();
}
