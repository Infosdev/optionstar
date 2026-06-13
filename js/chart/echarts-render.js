import { S } from '../state.js';

// ==================== CHARTS ====================
let chart1=null, chart2=null;

export function getHAData(hist) {
  const ha=[];
  hist.forEach((d,i)=>{
    const haC=(d.o+d.h+d.l+d.c)/4;
    const haO=i===0?(d.o+d.c)/2:(ha[i-1][0]+ha[i-1][1])/2;
    const haH=Math.max(d.h,haO,haC);
    const haL=Math.max(0.01,Math.min(d.l,haO,haC));
    ha.push([haO,haC,haL,haH]);
  });
  return ha;
}

export function buildEChartOption(hist, accent, isDark, signals=[]) {
  if(!hist.length) return {};
  const bg=isDark?'#16213e':'#fff', textC=isDark?'#dde':'#444', gridC=isDark?'rgba(255,255,255,.05)':'#f0f0f0';
  const times=hist.map(d=>d.time.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false}));
  let priceData;
  if(S.chartType==='heikinashi') priceData=getHAData(hist);
  else if(S.chartType==='line') priceData=hist.map(d=>d.c);
  else priceData=hist.map(d=>[d.o,d.c,d.l,d.h]);

  const upC='#28a745', dnC='#dc3545';
  const series=[];

  // Build markPoint data from signal history
  const markPts=[];
  signals.forEach(sig=>{
    const idx = sig.timeIdx < hist.length ? sig.timeIdx : hist.length-1;
    const candle = hist[idx];
    if (!candle) return;
    const isBuy = sig.type==='BUY';
    markPts.push({
      coord:[idx, isBuy ? candle.l*0.994 : candle.h*1.006],
      symbol:'arrow',
      symbolRotate: isBuy ? 180 : 0,   // 180=point up (buy), 0=point down (sell)
      symbolSize:[18,24],
      label:{
        show:true,
        formatter: isBuy?'B':'S',
        color:'#fff', fontSize:9, fontWeight:'bold',
        offset: isBuy?[0,8]:[0,-8]
      },
      itemStyle:{color: isBuy?'#28a745':'#dc3545',
        shadowBlur:6, shadowColor: isBuy?'rgba(40,167,69,.6)':'rgba(220,53,69,.6)'}
    });
  });

  const priceSeriesObj = S.chartType==='line'
    ? {name:'Price',type:'line',data:priceData,smooth:true,lineStyle:{color:accent,width:2},symbol:'none',
       areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:accent+'33'},{offset:1,color:accent+'05'}]}},yAxisIndex:0}
    : {name:'Price',type:'candlestick',data:priceData,
       itemStyle:{color:upC,color0:dnC,borderColor:upC,borderColor0:dnC},yAxisIndex:0};

  if (markPts.length) priceSeriesObj.markPoint = {animation:true, data:markPts};
  series.push(priceSeriesObj);

  const showVwap=document.getElementById('s-vwap')?.checked!==false;
  const showVol=document.getElementById('s-vol')?.checked!==false;
  if(showVwap && hist[0]?.vwap){
    series.push({name:'VWAP',type:'line',data:hist.map(d=>d.vwap),smooth:true,lineStyle:{color:'#FF9800',width:1.5,type:'dashed'},symbol:'none',yAxisIndex:0,z:10});
  }
  if(showVol){
    series.push({name:'Vol',type:'bar',data:hist.map(d=>d.v),yAxisIndex:1,xAxisIndex:1,
      itemStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:accent+'88'},{offset:1,color:accent+'22'}]}},barMaxWidth:6});
  }
  return {
    backgroundColor:bg,
    grid:[{left:'48px',right:'8px',top:'8px',bottom:'80px'},{left:'48px',right:'8px',top:'76%',bottom:'20px'}],
    xAxis:[
      {type:'category',data:times,gridIndex:0,axisLabel:{color:textC,fontSize:8,rotate:25},axisTick:{show:false},splitLine:{show:false}},
      {type:'category',data:times,gridIndex:1,axisLabel:{show:false},axisTick:{show:false},splitLine:{show:false}},
    ],
    yAxis:[
      {type:'value',scale:true,gridIndex:0,axisLabel:{color:textC,fontSize:8,formatter:v=>v.toFixed(1)},splitLine:{lineStyle:{color:gridC}}},
      {type:'value',gridIndex:1,axisLabel:{show:false},splitLine:{show:false}},
    ],
    dataZoom:[{type:'inside',xAxisIndex:[0,1],start:Math.max(0,100-80),end:100},{type:'slider',xAxisIndex:[0,1],start:Math.max(0,100-80),end:100,height:16,bottom:2,textStyle:{color:textC,fontSize:8}}],
    tooltip:{trigger:'axis',axisPointer:{type:'cross'},backgroundColor:isDark?'rgba(22,22,44,.95)':'#fff',borderColor:gridC,textStyle:{color:textC,fontSize:10}},
    legend:{data:['Price','VWAP'],right:4,top:2,textStyle:{color:textC,fontSize:8},itemWidth:12,itemHeight:8},
    series,
  };
}

export function renderCharts() {
  if(!chart1){ chart1=echarts.init(document.getElementById('chart-container')); chart2=echarts.init(document.getElementById('chart-container2')); }
  if(S.callHistory.length>0) chart1.setOption(buildEChartOption(S.callHistory,'#28a745',S.isDark,S.callSignals||[]),true);
  if(S.putHistory.length>0) chart2.setOption(buildEChartOption(S.putHistory,'#dc3545',S.isDark,S.putSignals||[]),true);
}

export function resizeAllCharts() { if(chart1) chart1.resize(); if(chart2) chart2.resize(); }
