import { S } from '../state.js';
import { renderCharts } from '../chart/echarts-render.js';

export function toggleDarkMode() {
  S.isDark=!S.isDark;
  document.body.classList.toggle('dark',S.isDark);
  document.getElementById('themeBtn').innerHTML=S.isDark?'<i class="fas fa-sun"></i>':'<i class="fas fa-moon"></i>';
  document.getElementById('s-dark').checked=S.isDark;
  renderCharts();
}
