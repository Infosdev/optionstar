import { S } from '../state.js';
import { fmtN, timeStr } from '../helpers.js';
import { showToast } from '../ui/toast.js';
import { playAlertSound } from '../alerts.js';
import { recordTrade, squareOffAndRecord } from './journal.js';

// ==================== TRADING ====================
export function placeTrade(action, type) {
  const qty = parseInt(document.getElementById('qtyInput').value) || 1;
  const price = type === 'CALL' ? S.callPrice : S.putPrice;
  if (!price) { showToast('No price data available', 'error'); return; }
  const sym = type === 'CALL' ? document.getElementById('ceInput').value : document.getElementById('peInput').value;
  S.positions.push({ action, type, price, qty, sym, units: qty * 75, time: timeStr() });
  recordTrade(action, type, price, qty);
  showToast(`${action} ${type} @ \u20b9${price.toFixed(2)} \u2014 ${qty} lot(s)`, action === 'BUY' ? 'success' : 'info');
  playAlertSound(action === 'BUY' ? 880 : 440, 0.15);
  updatePositionPnl();
}

export function squareOff() { squareOffAndRecord(); }

export function updatePositionPnl() {
  if(!S.positions.length) return;
  let pnl=0;
  S.positions.forEach(p=>{
    const cur=p.type==='CALL'?S.callPrice:S.putPrice;
    pnl+=(p.action==='BUY'?cur-p.price:p.price-cur)*p.units;
  });
  S.totalPnl=+pnl.toFixed(2);
  const el=document.getElementById('pnlDisplay');
  el.textContent=`P&L: \u20b9${fmtN(S.totalPnl)}`;
  el.className=`pnl-display ${S.totalPnl>=0?'profit':'loss'}`;
}
