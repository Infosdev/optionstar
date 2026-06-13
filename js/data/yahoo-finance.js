import { fetchViaProxy } from '../proxy.js';
import { S } from '../state.js';

const STRIKES_RANGE = 10;

// ==================== YAHOO FINANCE ====================
// ^CNXFIN maps to wrong index on YF; primary FINNIFTY source is NSE allIndices
export const YF_SYMS = { nifty:'^NSEI', bnf:'^NSEBANK', fn:'^CNXFINANCE', sx:'^BSESN', vix:'^INDIAVIX' };

export async function fetchYFIndex(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d&includePrePost=false`;
  try {
    const d = await fetchViaProxy(url, 10000);
    if (!d?.chart?.result?.[0]) return null;
    const res = d.chart.result[0];
    const meta = res.meta;
    const price = meta.regularMarketPrice || meta.regularMarketPreviousClose || meta.previousClose || 0;
    const prev  = meta.chartPreviousClose || meta.regularMarketPreviousClose || meta.previousClose || price;
    if (!price) return null;
    // Build candle history from timestamps
    const ts=res.timestamp||[], q=res.indicators?.quote?.[0]||{};
    const history=[];
    for(let i=0;i<ts.length;i++){
      if(q.close&&q.close[i]!=null){
        history.push({
          time: new Date(ts[i]*1000),
          o: q.open?.[i]||q.close[i], h:q.high?.[i]||q.close[i],
          l: q.low?.[i]||q.close[i],  c: q.close[i], v: q.volume?.[i]||0
        });
      }
    }
    return { price:+price.toFixed(2), prev:+prev.toFixed(2), history };
  } catch(e) { return null; }
}

// ==================== YAHOO FINANCE OPTIONS ====================
export async function fetchYFOptions(symbol='^NSEI') {
  const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
  try {
    const d = await fetchViaProxy(url, 12000);
    if (!d?.optionChain?.result?.[0]) return null;
    const result = d.optionChain.result[0];
    const options = result.options?.[0];
    if (!options) return null;
    const calls = options.calls || [];
    const puts = options.puts || [];
    if (!calls.length && !puts.length) return null;
    return {
      expirationDates: result.expirationDates || [],
      strikes: result.strikes || [],
      calls, puts,
      underlyingPrice: result.quote?.regularMarketPrice || 0
    };
  } catch(e) { return null; }
}

export function buildChainFromYFOptions(calls, puts) {
  const callMap = {}, putMap = {};
  calls.forEach(c => { callMap[c.strike] = c; });
  puts.forEach(p => { putMap[p.strike] = p; });
  const allStrikes = [...new Set([...calls.map(c=>c.strike), ...puts.map(p=>p.strike)])].sort((a,b)=>a-b);
  const near = allStrikes.filter(s => Math.abs(s - S.atm) <= STRIKES_RANGE * 50);
  S.chain = near.map(K => {
    const c = callMap[K] || {};
    const p = putMap[K] || {};
    return {
      strike: K,
      ceLTP: c.lastPrice || 0, ceOI: c.openInterest || 0,
      ceIV: ((c.impliedVolatility || 0) * 100).toFixed(1), ceChg: c.change || 0, ceVol: c.volume || 0,
      peLTP: p.lastPrice || 0, peOI: p.openInterest || 0,
      peIV: ((p.impliedVolatility || 0) * 100).toFixed(1), peChg: p.change || 0, peVol: p.volume || 0,
    };
  });
}
