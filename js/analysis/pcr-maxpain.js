import { S } from '../state.js';

export function calcPCR() {
  const chain = S.chainRaw || [];
  let totCE = 0, totPE = 0;
  chain.forEach(d => {
    totCE += d.CE?.openInterest || 0;
    totPE += d.PE?.openInterest || 0;
  });
  S.pcr = totCE > 0 ? +(totPE / totCE).toFixed(2) : 0;
  return S.pcr;
}

export function calcMaxPain() {
  const chain = S.chainRaw || [];
  if (!chain.length) return 0;
  let minPain = Infinity, mpStrike = 0;
  const strikes = [...new Set(chain.map(d => d.strikePrice).filter(Boolean))];
  strikes.forEach(expiry => {
    let pain = 0;
    chain.forEach(d => {
      const K = d.strikePrice;
      if (d.CE?.openInterest) pain += Math.max(0, K - expiry) * d.CE.openInterest;
      if (d.PE?.openInterest) pain += Math.max(0, expiry - K) * d.PE.openInterest;
    });
    if (pain < minPain) { minPain = pain; mpStrike = expiry; }
  });
  S.maxPain = mpStrike;
  return mpStrike;
}

export function updatePCRMaxPain() {
  const pcr = calcPCR();
  const mp = calcMaxPain();
  const pcrEl = document.getElementById('pcrBadge');
  if (pcrEl) {
    pcrEl.textContent = `PCR: ${pcr || '--'}`;
    pcrEl.className = 'badge ' + (pcr > 1.2 ? 'bull' : pcr < 0.8 ? 'bear' : 'pcr');
  }
  const mpEl = document.getElementById('mpBadge');
  if (mpEl) mpEl.textContent = `MaxPain: ${mp || '--'}`;
}
