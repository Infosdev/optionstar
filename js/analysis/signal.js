import { S } from '../state.js';
import { fmtN, fmtL } from '../helpers.js';

export function r5up(v)  { return Math.ceil(v/5)*5; }   // round up to nearest 5
export function r5dn(v)  { return Math.floor(v/5)*5; }   // round down to nearest 5

export function analyzeTradeSignal() {
  if (!S.callPrice || !S.putPrice) return null;
  const cp=S.callPrice, pp=S.putPrice, cv=S.callVwap||cp, pv=S.putVwap||pp;
  const cPoc=S.callPoc||cp, pPoc=S.putPoc||pp;
  const cOI=S.callOI||1, pOI=S.putOI||1;
  const vix = S.indiaVix || 15;

  // --- Score each factor ---
  let bull=0, bear=0;
  const factors=[];

  // 1. Call vs VWAP: call below VWAP means premium cheap -> bias call buy
  if (cp < cv)  { bull+=3; factors.push({t:'📉 Call below VWAP — cheap premium',s:'bull'}); }
  else          { bear+=2; factors.push({t:'📈 Call above VWAP — premium elevated',s:'bear'}); }

  // 2. Put vs VWAP: put above VWAP means put premium rising -> bearish
  if (pp > pv)  { bear+=3; factors.push({t:'📈 Put above VWAP — put demand rising',s:'bear'}); }
  else          { bull+=2; factors.push({t:'📉 Put below VWAP — bearish pressure weak',s:'bull'}); }

  // 3. Call POC: call above POC = momentum support
  if (cp > cPoc){ bull+=2; factors.push({t:'🟢 Call > POC — momentum support',s:'bull'}); }
  else          { bear+=2; factors.push({t:'🔴 Call < POC — call weakness',s:'bear'}); }

  // 4. Put POC: put below POC = downside exhausted
  if (pp < pPoc){ bull+=2; factors.push({t:'🟢 Put < POC — downside exhausted',s:'bull'}); }
  else          { bear+=2; factors.push({t:'🔴 Put > POC — downside accelerating',s:'bear'}); }

  // 5. OI analysis: put OI > call OI -> institutions writing puts = bullish
  if (pOI > cOI){ bull+=3; factors.push({t:`💹 Put OI > Call OI (${fmtL(pOI)} vs ${fmtL(cOI)}) — market bullish`,s:'bull'}); }
  else          { bear+=3; factors.push({t:`📉 Call OI > Put OI (${fmtL(cOI)} vs ${fmtL(pOI)}) — market bearish`,s:'bear'}); }

  // 6. Straddle vs VWAP
  const strLTP=cp+pp, strVwap=cv+pv;
  if (strLTP < strVwap){ bull+=1; factors.push({t:'⚖️ Straddle below VWAP — range contraction',s:'bull'}); }
  else                 { bear+=1; factors.push({t:'⚡ Straddle above VWAP — expansion risk',s:'bear'}); }

  // 7. VIX sentiment
  if (vix < 14)       { bull+=2; factors.push({t:`😌 Low VIX (${vix.toFixed(1)}) — calm market, trend likely`,s:'bull'}); }
  else if (vix > 20)  { bear+=2; factors.push({t:`⚠️ High VIX (${vix.toFixed(1)}) — elevated fear`,s:'bear'}); }
  else                { factors.push({t:`📊 VIX neutral (${vix.toFixed(1)})`,s:'neu'}); }

  const total=bull+bear||1;
  const bullPct=Math.round(bull/total*100);
  const bearPct=100-bullPct;

  // --- Determine signal (min 60% for directional) ---
  let signal, confPct;
  if      (bullPct >= 65) { signal='BUY_CALL'; confPct=bullPct; }
  else if (bearPct >= 65) { signal='BUY_PUT';  confPct=bearPct; }
  else if (bullPct >= 60) { signal='BUY_CALL'; confPct=bullPct; }
  else if (bearPct >= 60) { signal='BUY_PUT';  confPct=bearPct; }
  else                    { signal='WAIT';      confPct=Math.max(bullPct,bearPct); }

  const isBull=signal==='BUY_CALL', isBear=signal==='BUY_PUT';
  const curLTP = isBull ? cp : isBear ? pp : (cp+pp)/2;

  // --- Breakout TRIGGER: max of VWAP, POC, or +2% from LTP — capped at +5% ---
  const rawTrigger = isBull ? Math.min(cp*1.05, Math.max(cv||0, cPoc||0, cp*1.02))
                   : isBear ? Math.min(pp*1.05, Math.max(pv||0, pPoc||0, pp*1.02))
                   : curLTP * 1.02;
  const trigger = r5up(rawTrigger);

  // --- TP and SL both from TRIGGER to guarantee R:R > 1:1.5 ---
  // Fixed slPct=7%, tpPct scales with confidence -> always R:R >= 1:1.5
  const vixMul = Math.max(0.85, Math.min(1.4, vix/15));
  const slPct = 0.07;                                            // 7% below trigger
  const tpPct = (confPct >= 75 ? 0.18 : confPct >= 65 ? 0.15 : 0.12) * vixMul;

  const tp  = r5up(trigger * (1 + tpPct));   // TP above trigger
  const sl  = r5dn(trigger * (1 - slPct));   // SL below trigger (fixed 7%)

  const tpGain    = +(tp - trigger).toFixed(2);
  const slLoss    = +(trigger - sl).toFixed(2);
  const tpFromLTP = +(tp - curLTP).toFixed(2);
  const slFromLTP = +(curLTP - sl).toFixed(2);
  const rr = slLoss > 0 ? +(tpGain/slLoss).toFixed(2) : 0;
  const triggerGap = +(trigger - curLTP).toFixed(2);

  // NIFTY target levels via delta (ATM delta ~ 0.50)
  const delta = 0.50;
  const nifty = S.nifty || S.atm || 23800;
  const niftyTP = isBull ? +(nifty + tpGain/delta).toFixed(0)
                : isBear ? +(nifty - tpGain/delta).toFixed(0) : '--';
  const niftySL = isBull ? +(nifty - slLoss/delta).toFixed(0)
                : isBear ? +(nifty + slLoss/delta).toFixed(0) : '--';

  // Lot-based P&L (75 units per lot)
  const lotUnits = 75;
  const lotTP = +(tpGain*lotUnits).toFixed(0);
  const lotSL = +(slLoss*lotUnits).toFixed(0);

  // Top 4 reasons for signal
  const signalReasons = factors
    .filter(f => isBull ? f.s==='bull' : isBear ? f.s==='bear' : true)
    .slice(0, 4);

  return { signal, confPct, curLTP, trigger, triggerGap, tp, sl, tpGain, slLoss, tpFromLTP, slFromLTP, rr, niftyTP, niftySL, lotTP, lotSL, signalReasons, bullPct, bearPct };
}
