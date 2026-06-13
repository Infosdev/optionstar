// ==================== BLACK-SCHOLES ====================
import S from './state.js';
import { nowIST } from './helpers.js';

export function normCDF(x) {
  const a=[0.254829592,-0.284496736,1.421413741,-1.453152027,1.061405429], p=0.3275911;
  const s=x<0?-1:1; x=Math.abs(x)/Math.sqrt(2);
  const t=1/(1+p*x);
  let y=1-((((a[4]*t+a[3])*t+a[2])*t+a[1])*t+a[0])*t*Math.exp(-x*x);
  return 0.5*(1+s*y);
}

export function blackScholes(S_price,K,T,r,sigma,type) {
  if(T<=0)T=0.0001; if(sigma<=0)sigma=0.15; if(S_price<=0||K<=0)return 0;
  const d1=(Math.log(S_price/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T));
  const d2=d1-sigma*Math.sqrt(T);
  if(type==='CE')return Math.max(0,S_price*normCDF(d1)-K*Math.exp(-r*T)*normCDF(d2));
  return Math.max(0,K*Math.exp(-r*T)*normCDF(-d2)-S_price*normCDF(-d1));
}

export function getDaysToExpiry() {
  const now = nowIST();
  // Priority 1: use the actual selected NSE expiry date
  if (S.selectedExpiry) {
    try {
      const MN={JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
      const p = S.selectedExpiry.split('-');
      const exp = new Date(+p[2], MN[p[1].toUpperCase()], +p[0], 15, 30, 0);
      const days = (exp - now) / 864e5;   // ms → days
      if (days > 0) return days / 365;
    } catch(e) {}
  }
  // Priority 2: next monthly NIFTY expiry (last Thursday of the month)
  function lastThursdayOf(y, m) {
    const last = new Date(y, m+1, 0);          // last day of month
    const diff = (last.getDay()+3)%7;          // days to go back to Thursday
    return new Date(y, m, last.getDate()-diff, 15, 30, 0);
  }
  let exp = lastThursdayOf(now.getFullYear(), now.getMonth());
  if (exp <= now) exp = lastThursdayOf(now.getFullYear(), now.getMonth()+1);
  return Math.max(0.001, (exp-now) / 864e5 / 365);
}

// ==================== GREEKS ====================
export function calcGreeks(spotPrice, K, T, r, sigma, type) {
  if (T <= 0) T = 0.0001;
  if (sigma <= 0) sigma = 0.15;
  if (spotPrice <= 0 || K <= 0) return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  const d1 = (Math.log(spotPrice / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const nd1 = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
  const delta = type === 'CE' ? normCDF(d1) : normCDF(d1) - 1;
  const gamma = nd1 / (spotPrice * sigma * Math.sqrt(T));
  const theta = (-(spotPrice * nd1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * (type === 'CE' ? normCDF(d2) : normCDF(-d2))) / 365;
  const vega = spotPrice * nd1 * Math.sqrt(T) / 100;
  return { delta: +delta.toFixed(3), gamma: +gamma.toFixed(4), theta: +theta.toFixed(2), vega: +vega.toFixed(2) };
}
