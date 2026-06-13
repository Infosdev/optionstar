import { S } from './state.js';
import { calcVwapFromHistory, calcPoc } from './chart/builders.js';
import { updateUI } from './ui/update-ui.js';
import { renderCharts } from './chart/echarts-render.js';
import { updatePositionPnl } from './trading/trades.js';
import { addOrderPrintTick } from './trading/order-print.js';
import { updatePocHistory } from './ui/poc-history.js';

// ==================== MICRO TICK (fallback when WebSocket not connected) ====================
let microTickTimer = null;

export function startMicroTick() {
  if(microTickTimer) clearInterval(microTickTimer);
  microTickTimer=setInterval(()=>{
    if(!S.callPrice||!S.putPrice) return;
    // Only add random noise when WebSocket is NOT providing live prices
    if(!window._wsConnected){
      const ceNoise=(Math.random()-.505)*S.callPrice*0.003;
      const peNoise=(Math.random()-.495)*S.putPrice*0.003;
      S.callPrice=Math.max(0.05,+(S.callPrice+ceNoise).toFixed(2));
      S.putPrice=Math.max(0.05,+(S.putPrice+peNoise).toFixed(2));
    }
    // Always update last candle volume accumulation
    if(S.callHistory.length){
      const l=S.callHistory[S.callHistory.length-1];
      l.c=S.callPrice; l.h=Math.max(l.h,S.callPrice); l.l=Math.min(l.l,S.callPrice);
      l.v+=Math.floor(Math.random()*50000);
    }
    if(S.putHistory.length){
      const l=S.putHistory[S.putHistory.length-1];
      l.c=S.putPrice; l.h=Math.max(l.h,S.putPrice); l.l=Math.min(l.l,S.putPrice);
      l.v+=Math.floor(Math.random()*40000);
    }
    calcVwapFromHistory(); calcPoc();
    updateUI(); renderCharts(); updatePositionPnl();
    addOrderPrintTick();
    updatePocHistory();
  }, 3000);
}
