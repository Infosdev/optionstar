// ==================== YAHOO FINANCE WEBSOCKET ====================
import { S } from '../state.js';
import { calcBSChain } from '../chart/chain-builders.js';
import { updateIndexBoxes } from '../ui/index-boxes.js';
import { calcVwapFromHistory, calcPoc } from '../chart/builders.js';
import { updateUI } from '../ui/update-ui.js';
import { renderCharts } from '../chart/echarts-render.js';
import { updatePositionPnl } from '../trading/trades.js';
import { showToast } from '../ui/toast.js';
import { timeStr } from '../helpers.js';

export const WS_SYMS = ['^NSEI','^NSEBANK','^CNXFINANCE','^BSESN','^INDIAVIX'];

// Minimal protobuf decoder for Yahoo Finance price ticks
function decodeYFProto(msgData) {
  try {
    let buf;
    if (typeof msgData === 'string') {
      // base64-encoded text
      const bin = atob(msgData);
      buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    } else if (msgData instanceof ArrayBuffer) {
      buf = new Uint8Array(msgData);
    } else { return null; }

    const res = {}; let pos = 0;
    while (pos < buf.length) {
      let tag = 0, s = 0;
      do { if(pos>=buf.length) return res; tag |= (buf[pos]&0x7F)<<s; s+=7; } while(buf[pos++]&0x80);
      const fn = tag>>3, wt = tag&7;
      if (wt===0) {           // varint — skip
        do { if(pos>=buf.length) return res; } while(buf[pos++]&0x80);
      } else if (wt===1) {    // 64-bit — skip
        pos += 8;
      } else if (wt===2) {    // length-delimited (string/bytes)
        let len=0; s=0;
        do { if(pos>=buf.length) return res; len|=(buf[pos]&0x7F)<<s; s+=7; } while(buf[pos++]&0x80);
        if (fn===1) res.id = new TextDecoder().decode(buf.slice(pos, pos+len));
        pos += len;
      } else if (wt===5) {    // 32-bit float
        if (pos+4 > buf.length) return res;
        const v = new DataView(buf.buffer, buf.byteOffset+pos, 4).getFloat32(0,true);
        if      (fn===2)  res.price         = v;
        else if (fn===8)  res.changePct     = v;
        else if (fn===10) res.dayHigh       = v;
        else if (fn===11) res.dayLow        = v;
        else if (fn===12) res.change        = v;
        pos += 4;
      } else { break; }
    }
    return (res.id && res.price > 0) ? res : null;
  } catch(e) { return null; }
}

function onWSTick(d) {
  let hit = false;
  // Range guards reject bad/wrong-symbol data
  if      (d.id==='^NSEI'     && d.price>15000 && d.price<40000)  { S.niftyPrev=S.nifty; S.nifty=+d.price.toFixed(2); S.atm=Math.round(S.nifty/50)*50; hit=true; }
  else if (d.id==='^NSEBANK'  && d.price>30000 && d.price<80000)  { S.bnfPrev=S.bnf;  S.bnf=+d.price.toFixed(2); hit=true; }
  else if ((d.id==='^CNXFINANCE'||d.id==='^CNXFIN') && d.price>10000 && d.price<40000) { S.fnPrev=S.fn; S.fn=+d.price.toFixed(2); hit=true; }
  else if (d.id==='^BSESN'    && d.price>40000 && d.price<120000) { S.sxPrev=S.sx;   S.sx=+d.price.toFixed(2); hit=true; }
  else if (d.id==='^INDIAVIX' && d.price>5     && d.price<100)    { S.indiaVix=+d.price.toFixed(2); hit=true; }
  if (!hit) return;

  updateIndexBoxes();

  // Recalculate B-S option prices from live NIFTY (when no exchange option data)
  if (S.nifty > 0 && S.dataSource !== 'live') {
    calcBSChain();
    const atmR = S.chain && S.chain.find(r=>r.strike===S.atm);
    if (atmR) {
      S.callPrev=S.callPrice; S.callPrice=atmR.ceLTP;
      S.putPrev=S.putPrice;  S.putPrice=atmR.peLTP;
    }
  } else if (S.dataSource==='live' && S.nifty>0 && S.callPrice>0) {
    // Live option data: adjust by ATM delta from NIFTY move
    const mv = S.nifty - (S.niftyPrev||S.nifty);
    if (Math.abs(mv) > 0.1) {
      S.callPrice = Math.max(0.05, +(S.callPrice + 0.5*mv).toFixed(2));
      S.putPrice  = Math.max(0.05, +(S.putPrice  - 0.5*mv).toFixed(2));
    }
  }

  // Patch last candle in option charts
  if (S.callHistory.length) {
    const l=S.callHistory[S.callHistory.length-1];
    l.c=S.callPrice; l.h=Math.max(l.h,S.callPrice); l.l=Math.min(l.l,S.callPrice);
  }
  if (S.putHistory.length) {
    const l=S.putHistory[S.putHistory.length-1];
    l.c=S.putPrice; l.h=Math.max(l.h,S.putPrice); l.l=Math.min(l.l,S.putPrice);
  }

  calcVwapFromHistory(); calcPoc();
  updateUI(); renderCharts(); updatePositionPnl();
  // Update status time on every tick
  document.getElementById('statusTime').textContent = 'Tick: ' + timeStr();
}

export function connectYFWebSocket() {
  if (window._yfWs && (window._yfWs.readyState===WebSocket.OPEN||window._yfWs.readyState===WebSocket.CONNECTING)) return;
  if (window._wsReconnTimer) { clearTimeout(window._wsReconnTimer); window._wsReconnTimer=null; }

  try {
    const ws = new WebSocket('wss://streamer.finance.yahoo.com/');
    ws.binaryType = 'arraybuffer';
    window._yfWs = ws;

    ws.onopen = () => {
      window._wsConnected = true;
      ws.send(JSON.stringify({ subscribe: WS_SYMS }));
      console.log('YF WebSocket connected, subscribed:', WS_SYMS.join(','));
      const badge = document.getElementById('dataSrcBadge');
      if (badge) { badge.textContent='LIVE WS'; badge.className='data-src live-src'; }
      const dot = document.getElementById('statusDot');
      if (dot) dot.className='status-dot live';
      const msg = document.getElementById('statusMsg');
      if (msg) msg.textContent='Yahoo Finance WebSocket \u2713 Real-time prices';
      showToast('Live WebSocket connected \u2014 Real-time prices active', 'success');
    };

    ws.onmessage = (e) => {
      let raw = e.data;
      // If binary ArrayBuffer, convert to base64 for decoder
      if (raw instanceof ArrayBuffer) {
        const bytes = new Uint8Array(raw);
        let str = '';
        for (let i=0; i<bytes.length; i++) str += String.fromCharCode(bytes[i]);
        raw = btoa(str);
      }
      const tick = decodeYFProto(raw);
      if (tick) onWSTick(tick);
    };

    ws.onerror = (e) => {
      window._wsConnected = false;
      console.warn('YF WebSocket error', e);
    };

    ws.onclose = (e) => {
      window._wsConnected = false;
      console.log('YF WebSocket closed:', e.code, e.reason);
      const msg = document.getElementById('statusMsg');
      if (msg) msg.textContent = `WebSocket closed (${e.code}) \u2014 reconnecting in 5s...`;
      const dot = document.getElementById('statusDot');
      if (dot) dot.className = 'status-dot fetching';
      window._wsReconnTimer = setTimeout(connectYFWebSocket, 5000);
    };
  } catch(err) {
    console.error('WebSocket init failed:', err);
    window._wsConnected = false;
  }
}
