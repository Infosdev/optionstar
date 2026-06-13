import { S } from '../state.js';
import { fmtN, timeStr } from '../helpers.js';

// ==================== STRADDLE DECAY CHART ====================
let decayChart = null;
let _lastDecayTs = 0;

export function trackStraddleDecay() {
  if (!S.callPrice || !S.putPrice) return;
  const now = Date.now();
  if (now - _lastDecayTs < 10000) return; // every 10s
  _lastDecayTs = now;
  S.straddleHistory.push({
    time: timeStr(),
    ltp: +(S.callPrice + S.putPrice).toFixed(2),
    vwap: +(S.callVwap + S.putVwap).toFixed(2)
  });
  if (S.straddleHistory.length > 180) S.straddleHistory.shift();
  renderStraddleDecayChart();
  const liveEl = document.getElementById('straddleLTPLive');
  if (liveEl) liveEl.textContent = fmtN(S.callPrice + S.putPrice);
}

export function renderStraddleDecayChart() {
  const hist = S.straddleHistory;
  if (hist.length < 2) return;
  const container = document.getElementById('straddleDecayChart');
  if (!container) return;
  if (!decayChart) decayChart = echarts.init(container);
  const isDark = S.isDark;
  const bg = isDark ? '#16213e' : '#fff', textC = isDark ? '#dde' : '#444';
  decayChart.setOption({
    backgroundColor: bg,
    grid: { left: 44, right: 10, top: 10, bottom: 30 },
    xAxis: { type: 'category', data: hist.map(h => h.time), axisLabel: { color: textC, fontSize: 7, rotate: 20 }, splitLine: { show: false } },
    yAxis: { type: 'value', scale: true, axisLabel: { color: textC, fontSize: 7, formatter: v => v.toFixed(0) }, splitLine: { lineStyle: { color: isDark ? '#334' : '#eee' } } },
    tooltip: { trigger: 'axis', textStyle: { fontSize: 10 } },
    legend: { data: ['LTP', 'VWAP'], right: 4, top: 0, textStyle: { color: textC, fontSize: 8 }, itemWidth: 10, itemHeight: 8 },
    series: [
      { name: 'LTP', type: 'line', data: hist.map(h => h.ltp), smooth: true, lineStyle: { color: '#e6a817', width: 2 }, symbol: 'none', areaStyle: { color: 'rgba(230,168,23,.08)' } },
      { name: 'VWAP', type: 'line', data: hist.map(h => h.vwap), smooth: true, lineStyle: { color: '#6C63FF', width: 1.5, type: 'dashed' }, symbol: 'none' }
    ]
  }, true);
}

export function getDecayChart() { return decayChart; }
