import { S } from '../state.js';
import { fmtN } from '../helpers.js';
import { showToast } from '../ui/toast.js';

// ==================== TRADE JOURNAL ====================
export function loadTrades() { return JSON.parse(localStorage.getItem('os_trades') || '[]'); }
export function saveTrades(t) { localStorage.setItem('os_trades', JSON.stringify(t)); }

export function recordTrade(action, type, price, qty) {
  if (!document.getElementById('s-autosave')?.checked) return;
  const trades = loadTrades();
  trades.unshift({
    id: Date.now(),
    date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    action, type, price: +price.toFixed(2), qty,
    exit: null, pnl: null,
    sym: type === 'CALL' ? (document.getElementById('ceInput')?.value || '') : (document.getElementById('peInput')?.value || ''),
    nifty: +(S.nifty || 0).toFixed(2)
  });
  if (trades.length > 500) trades.pop();
  saveTrades(trades);
  renderJournal();
}

export function squareOffAndRecord() {
  if (!S.positions.length) { showToast('No open positions', 'error'); return; }
  const trades = loadTrades();
  S.positions.forEach(p => {
    const cur = p.type === 'CALL' ? S.callPrice : S.putPrice;
    const pnl = +((p.action === 'BUY' ? cur - p.price : p.price - cur) * p.units).toFixed(2);
    const match = trades.find(t => t.action === p.action && t.type === p.type && t.price === p.price && !t.exit);
    if (match) { match.exit = +cur.toFixed(2); match.pnl = pnl; }
  });
  saveTrades(trades);
  S.positions = []; S.totalPnl = 0;
  document.getElementById('pnlDisplay').textContent = 'P&L: \u20b90';
  document.getElementById('pnlDisplay').className = 'pnl-display';
  showToast('All positions squared off & saved', 'info');
  renderJournal();
}

export function renderJournal() {
  const trades = loadTrades();
  const tbody = document.getElementById('journalBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  trades.slice(0, 100).forEach(t => {
    const tr = document.createElement('tr');
    const pnlCls = t.pnl === null ? '' : t.pnl >= 0 ? 'j-profit' : 'j-loss';
    const pnlText = t.pnl === null ? 'Open' : `\u20b9${fmtN(t.pnl)}`;
    tr.innerHTML = `<td style="font-size:9px;color:#888">${t.date}</td><td style="font-size:9px">${t.sym||t.type}</td><td class="${t.action==='BUY'?'j-buy':'j-sell'}">${t.action}</td><td>\u20b9${fmtN(t.price)}</td><td>${t.exit ? '\u20b9'+fmtN(t.exit) : '--'}</td><td>${t.qty}</td><td class="${pnlCls}">${pnlText}</td><td style="font-size:9px">${fmtN(t.nifty)}</td>`;
    tbody.appendChild(tr);
  });
  // Stats
  const closed = trades.filter(t => t.pnl !== null);
  const wins = closed.filter(t => t.pnl > 0).length;
  const totalPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const best = closed.length ? Math.max(...closed.map(t => t.pnl)) : 0;
  const worst = closed.length ? Math.min(...closed.map(t => t.pnl)) : 0;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('j-total', trades.length);
  set('j-wr', closed.length ? Math.round(wins / closed.length * 100) + '%' : '0%');
  set('j-pnl', `\u20b9${fmtN(totalPnl)}`);
  set('j-best', `\u20b9${fmtN(best)}`);
  set('j-worst', `\u20b9${fmtN(worst)}`);
  const pnlEl = document.getElementById('j-pnl');
  if (pnlEl) pnlEl.style.color = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
}

export function clearJournal() {
  if (!confirm('Clear all trade history?')) return;
  localStorage.removeItem('os_trades');
  renderJournal();
  showToast('Journal cleared', 'info');
}

export function exportJournal() {
  const trades = loadTrades();
  if (!trades.length) { showToast('No trades to export', 'error'); return; }
  const hdr = 'Date,Symbol,Action,Entry,Exit,Qty,PnL,NIFTY\n';
  const rows = trades.map(t => `${t.date},${t.sym||t.type},${t.action},${t.price},${t.exit||''},${t.qty},${t.pnl||''},${t.nifty}`).join('\n');
  const blob = new Blob([hdr + rows], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `OptionStar_Journal_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}
