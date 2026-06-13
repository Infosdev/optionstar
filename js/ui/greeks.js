import { S } from '../state.js';
import { getDaysToExpiry, calcGreeks } from '../black-scholes.js';

export function updateGreeks() {
  const spot = S.nifty || S.atm || 23800;
  const K = S.atm;
  const T = getDaysToExpiry();
  const r = 0.065;
  const ceG = calcGreeks(spot, K, T, r, S.ceIV || 0.15, 'CE');
  const peG = calcGreeks(spot, K, T, r, S.peIV || 0.15, 'PE');
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('g-ce-delta', ceG.delta); set('g-ce-gamma', ceG.gamma);
  set('g-ce-theta', ceG.theta); set('g-ce-vega', ceG.vega);
  set('g-pe-delta', peG.delta); set('g-pe-gamma', peG.gamma);
  set('g-pe-theta', peG.theta); set('g-pe-vega', peG.vega);
}
