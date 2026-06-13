// ==================== BOOT — Entry Point ====================
import S from './state.js';
import { isMarketOpen, timeStr } from './helpers.js';
import { setStatus } from './ui/status-bar.js';
import { showToast } from './ui/toast.js';
import { calcBSChain, updateSymbolLabels } from './chart/chain-builders.js';
import { buildSyntheticCharts, calcVwapFromHistory, calcPoc } from './chart/builders.js';
import { updateUI } from './ui/update-ui.js';
import { renderCharts } from './chart/echarts-render.js';
import { refreshData, manualRefresh, scheduleAutoRefresh } from './data/refresh.js';
import { connectYFWebSocket } from './data/websocket.js';
import { startMicroTick } from './micro-tick.js';
import { updatePocHistory, clearPocHistory } from './ui/poc-history.js';
import { tryRefreshSignal } from './analysis/signal-confirm.js';
import { renderJournal, clearJournal, exportJournal } from './trading/journal.js';
import { toggleNotifPerm } from './alerts.js';
import { toggleDarkMode } from './ui/dark-mode.js';
import { toggleSettings, toggleMobilePanel } from './ui/settings.js';
import { switchTab, setTF, setChartType } from './ui/tabs.js';
import { placeTrade, squareOff } from './trading/trades.js';
import { switchIndex } from './index-switcher.js';
import { searchSymbol, selectSym, hideSugg, updateSymbols } from './symbol-search.js';
import { selectExpiry } from './ui/expiry.js';
import { initDivider } from './ui/divider.js';

// ==================== AUTH ====================
let authUser = localStorage.getItem('os_auth_user');
if (!authUser) {
  authUser = 'kathirvel301@gmail.com';
  localStorage.setItem('os_auth_user', authUser);
  localStorage.setItem('os_auth_time', Date.now());
}
document.getElementById('userTag').textContent = authUser ? authUser.split('@')[0] : '';
document.getElementById('s-email').value = authUser || '';

function logout() {
  if(window._yfWs){try{window._yfWs.close();}catch(e){}}
  if(window._wsReconnTimer){clearTimeout(window._wsReconnTimer);}
  localStorage.removeItem('os_auth_user');
  localStorage.removeItem('os_auth_time');
  window.location.href = 'login.html';
}

// ==================== EXPOSE TO HTML onclick HANDLERS ====================
window.manualRefresh = manualRefresh;
window.toggleSettings = toggleSettings;
window.toggleDarkMode = toggleDarkMode;
window.logout = logout;
window.switchTab = switchTab;
window.setTF = setTF;
window.setChartType = setChartType;
window.placeTrade = placeTrade;
window.squareOff = squareOff;
window.switchIndex = switchIndex;
window.searchSymbol = searchSymbol;
window.selectSym = selectSym;
window.hideSugg = hideSugg;
window.updateSymbols = updateSymbols;
window.selectExpiry = selectExpiry;
window.toggleMobilePanel = toggleMobilePanel;
window.clearPocHistory = clearPocHistory;
window.clearJournal = clearJournal;
window.exportJournal = exportJournal;
window.renderCharts = renderCharts;
window.toggleNotifPerm = toggleNotifPerm;

// ==================== INIT ====================
(async function init(){
  setStatus('fetching','Connecting to Yahoo Finance WebSocket...');
  document.getElementById('s-interval').addEventListener('change', scheduleAutoRefresh);

  // Init resizable divider
  initDivider();

  // Connect WebSocket
  connectYFWebSocket();

  // Prime B-S prices immediately so prediction shows on first render
  calcBSChain();
  buildSyntheticCharts();
  calcVwapFromHistory();
  calcPoc();
  updateUI();
  renderCharts();

  await refreshData(false);

  // Guarantee prices are never 0 — essential for market-closed predictions
  if (!S.callPrice || !S.putPrice) {
    calcBSChain();
    const ar = S.chain && S.chain.find(r=>r.strike===S.atm);
    if (ar) { S.callPrice=ar.ceLTP; S.putPrice=ar.peLTP; }
    buildSyntheticCharts();
    calcVwapFromHistory();
    calcPoc();
    updateUI();
    renderCharts();
  }

  startMicroTick();
  scheduleAutoRefresh();
  updatePocHistory();
  tryRefreshSignal();
  renderJournal();
  toggleNotifPerm();

  showToast(isMarketOpen() ? 'Market Open — Live data active' : 'Market Closed — Prediction mode active', 'info');
})();
