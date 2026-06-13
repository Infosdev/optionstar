// ==================== HELPERS ====================
export function fmtN(n, d=2) { if(n==null||isNaN(n))return '--'; return (+n).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d}); }
export function fmtL(n) { if(!n) return '--'; return n>=10000000?`${(n/10000000).toFixed(2)}Cr`:n>=100000?`${(n/100000).toFixed(2)}L`:`${(n/1000).toFixed(1)}K`; }
export function nowIST() { return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'})); }
export function isMarketOpen() {
  const t=nowIST(); const day=t.getDay(); if(day===0||day===6) return false;
  const mins=t.getHours()*60+t.getMinutes();
  return mins>=9*60+15 && mins<15*60+30;
}
export function timeStr(d) { return (d||new Date()).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}); }
