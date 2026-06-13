// ==================== STATE ====================
const S = {
  // Indices
  nifty:0, niftyPrev:0, bnf:0, bnfPrev:0, fn:0, fnPrev:0, sx:0, sxPrev:0,
  // ATM & selected
  atm:23800, selectedExpiry:'', expiryList:[],
  ceSymbol:'', peSymbol:'', ceIV:0.15, peIV:0.15,
  // Options prices (from NSE or B-S)
  callPrice:0, putPrice:0, callPrev:0, putPrev:0,
  callVwap:0, putVwap:0, callPoc:0, putPoc:0,
  callOI:0, putOI:0, callVol:0, putVol:0,
  // Chart histories
  callHistory:[], putHistory:[], niftyHistory:[],
  // UI state
  tf:5, chartType:'candlestick', isDark:false,
  // POC & tape
  pocHistory:[], tape1:[], tape2:[],
  // Positions
  positions:[], totalPnl:0,
  // VWAP accumulators
  vwapPV_c:0, vwapV_c:0, vwapPV_p:0, vwapV_p:0,
  // Data source
  dataSource:'none', lastUpdate:null,
  // India VIX (live from Yahoo Finance)
  indiaVix:15,
  // Full chain (from NSE)
  chainRaw:[],
  // Buy/Sell signal history for chart arrows
  callSignals:[], putSignals:[], lastSignalType:'',
};

// Index switcher
S.activeIndex = 'NIFTY';

// Straddle decay
S.straddleHistory = [];

// Signal confirmation state
S.confirmedSig = null;
S.confirmedAt = 0;
S.confirmedType = '';

export { S as default, S };
