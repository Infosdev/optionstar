import { S } from '../state.js';

// ==================== OI BAR CHART ====================
let oiChart = null;

export function renderOIChart() {
  const chain = S.chain || [];
  if (!chain.length) return;
  const container = document.getElementById('oiBarChart');
  if (!container) return;
  if (!oiChart) oiChart = echarts.init(container);
  const near = chain.slice().sort((a, b) => a.strike - b.strike);
  const strikes = near.map(r => r.strike.toString());
  const ceOI = near.map(r => +(r.ceOI / 100000).toFixed(2));
  const peOI = near.map(r => +(r.peOI / 100000).toFixed(2));
  const isDark = S.isDark;
  const bg = isDark ? '#16213e' : '#fff', textC = isDark ? '#dde' : '#444';
  oiChart.setOption({
    backgroundColor: bg,
    grid: { left: 38, right: 8, top: 8, bottom: 24 },
    xAxis: { type: 'value', axisLabel: { color: textC, fontSize: 7 }, splitLine: { lineStyle: { color: isDark ? '#334' : '#eee' } } },
    yAxis: { type: 'category', data: strikes, axisLabel: { color: textC, fontSize: 7 }, axisLine: { show: false } },
    tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br>CE OI: ${p[0].value}L<br>PE OI: ${p[1].value}L`, textStyle: { fontSize: 10 } },
    series: [
      { name: 'CE OI', type: 'bar', data: ceOI, itemStyle: { color: '#28a745' }, barMaxWidth: 10 },
      { name: 'PE OI', type: 'bar', data: peOI, itemStyle: { color: '#dc3545' }, barMaxWidth: 10 }
    ]
  }, true);
}
