import { S } from '../state.js';

export function resampleToTF(niftyHist, tfMin) {
  if (!niftyHist.length) return [];
  const tfMs = tfMin * 60000;
  const grouped = {};
  niftyHist.forEach(c => {
    const bucket = Math.floor(c.time.getTime() / tfMs) * tfMs;
    if (!grouped[bucket]) grouped[bucket] = { time: new Date(bucket), items: [] };
    grouped[bucket].items.push(c);
  });
  return Object.values(grouped).sort((a, b) => a.time - b.time).map(g => {
    const items = g.items;
    return { time: g.time, o: items[0].o, h: Math.max(...items.map(i => i.h)), l: Math.min(...items.map(i => i.l)), c: items[items.length - 1].c, v: items.reduce((s, i) => s + i.v, 0) };
  });
}

export function analyzeSignalForResampled(niftyResampled) {
  if (!niftyResampled.length || !S.callPrice || !S.putPrice) return null;
  // Simple signal based on price momentum + current option data
  const last = niftyResampled[niftyResampled.length - 1];
  const prev = niftyResampled[Math.max(0, niftyResampled.length - 4)];
  const momentum = last.c - prev.c;
  const cp = S.callPrice, pp = S.putPrice;
  const cv = S.callVwap || cp, pv = S.putVwap || pp;
  let bull = 0, bear = 0;
  if (momentum > 0) bull += 3; else bear += 3;
  if (cp < cv) bull += 2; else bear += 2;
  if (pp > pv) bear += 2; else bull += 2;
  if (S.putOI > S.callOI) bull += 2; else bear += 2;
  const total = bull + bear || 1;
  const bullPct = Math.round(bull / total * 100);
  const bearPct = 100 - bullPct;
  if (bullPct >= 60) return { signal: 'BUY CALL', cls: 'bull', conf: bullPct };
  if (bearPct >= 60) return { signal: 'BUY PUT', cls: 'bear', conf: bearPct };
  return { signal: 'WAIT', cls: 'wait', conf: Math.max(bullPct, bearPct) };
}

export function updateMultiTF() {
  const nh = S.niftyHistory;
  if (!nh.length) return;
  const tfs = [5, 15, 30];
  const results = tfs.map(tf => ({ tf, ...analyzeSignalForResampled(resampleToTF(nh, tf)) }));
  tfs.forEach(tf => {
    const r = results.find(x => x.tf === tf);
    if (!r) return;
    const cell = document.getElementById(`mtf-${tf}`);
    const sigEl = document.getElementById(`mtf-${tf}-sig`);
    const confEl = document.getElementById(`mtf-${tf}-conf`);
    if (cell) cell.className = `mtf-cell ${r.cls}`;
    if (sigEl) { sigEl.textContent = r.signal || '--'; sigEl.className = `mtf-sig ${r.cls}`; }
    if (confEl) confEl.textContent = r.conf ? `${r.conf}%` : '--';
  });
  // Confluence
  const signals = results.filter(r => r.signal).map(r => r.signal);
  const agree = signals.filter(s => s === signals[0]).length;
  const overallEl = document.getElementById('mtf-overall');
  const agreeEl = document.getElementById('mtf-agree');
  const confCell = document.getElementById('mtf-conf-cell');
  const dominant = signals[0] || 'WAIT';
  const cls = dominant === 'BUY CALL' ? 'bull' : dominant === 'BUY PUT' ? 'bear' : 'wait';
  if (overallEl) { overallEl.textContent = dominant; overallEl.className = `mtf-sig ${cls}`; }
  if (agreeEl) agreeEl.textContent = `${agree}/3 agree`;
  if (confCell) confCell.className = `mtf-cell ${agree >= 2 ? cls : 'wait'}`;
}
