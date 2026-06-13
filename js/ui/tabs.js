import { S } from '../state.js';
import { renderCharts, resizeAllCharts } from '../chart/echarts-render.js';
import { buildOptionChartsFromNifty, buildSyntheticCharts, addVwap, calcVwapFromHistory, calcPoc } from '../chart/builders.js';
import { renderJournal } from '../trading/journal.js';

export function switchTab(tab) {
  document.getElementById('chartTab').classList.toggle('hidden', tab !== 'chart');
  document.getElementById('orderTab').classList.toggle('active', tab === 'order');
  const jt = document.getElementById('journalTab');
  if (jt) jt.classList.toggle('active', tab === 'journal');
  document.getElementById('chartTabBtn').classList.toggle('active', tab === 'chart');
  document.getElementById('orderTabBtn').classList.toggle('active', tab === 'order');
  const jBtn = document.getElementById('journalTabBtn');
  if (jBtn) jBtn.classList.toggle('active', tab === 'journal');
  if (tab === 'chart') setTimeout(() => { resizeAllCharts(); }, 80);
  if (tab === 'journal') renderJournal();
}

export function setTF(tf,btn) {
  S.tf=tf;
  document.querySelectorAll('.tf-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(S.niftyHistory.length) buildOptionChartsFromNifty(); else buildSyntheticCharts();
  addVwap(S.callHistory); addVwap(S.putHistory);
  calcVwapFromHistory(); calcPoc(); renderCharts();
}

export function setChartType(t,btn) {
  S.chartType=t;
  document.querySelectorAll('.ct-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderCharts();
}
