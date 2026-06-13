import { S } from '../state.js';

export function trackIVRank() {
  const iv = S.indiaVix;
  if (!iv || iv <= 0) return;
  const key = 'os_iv_history';
  const hist = JSON.parse(localStorage.getItem(key) || '[]');
  const today = new Date().toDateString();
  if (!hist.length || hist[hist.length - 1].d !== today) {
    hist.push({ d: today, iv });
    if (hist.length > 30) hist.shift();
    localStorage.setItem(key, JSON.stringify(hist));
  }
  if (hist.length < 2) { S.ivRank = '--'; return; }
  const ivs = hist.map(h => h.iv);
  const min = Math.min(...ivs), max = Math.max(...ivs);
  S.ivRank = max > min ? Math.round((iv - min) / (max - min) * 100) : 50;
  const el = document.getElementById('ivrBadge');
  if (el) {
    el.textContent = `IVR: ${S.ivRank}`;
    el.className = 'badge ' + (S.ivRank > 70 ? 'bear' : S.ivRank < 30 ? 'bull' : 'ivr');
  }
}
