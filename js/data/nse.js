import { fetchViaProxy } from '../proxy.js';

// ==================== NSE ALL INDICES (accurate NIFTY / BNF / FINNIFTY) ====================
export async function fetchNSEAllIndices() {
  const url = 'https://www.nseindia.com/api/allIndices';
  try {
    const d = await fetchViaProxy(url, 8000);
    if (!d?.data?.length) return null;
    const res = {};
    d.data.forEach(idx => {
      const price = parseFloat(idx.last) || 0;
      const prev  = parseFloat(idx.previousClose) || price;
      if (!price) return;
      if (idx.index === 'NIFTY 50')           res.nifty = {price, prev};
      else if (idx.index === 'NIFTY BANK')    res.bnf   = {price, prev};
      else if (idx.index === 'NIFTY FIN SERVICE') res.fn = {price, prev};
    });
    return Object.keys(res).length ? res : null;
  } catch(e) { return null; }
}

// ==================== NSE OPTION CHAIN ====================
export async function fetchNSEOptionChain(symbol='NIFTY') {
  const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`;
  const d = await fetchViaProxy(url, 12000);
  if (d?.records?.data?.length) return d;
  return null;
}
