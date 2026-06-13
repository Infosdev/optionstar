import { resizeAllCharts } from '../chart/echarts-render.js';

export function initDivider() {
  const div=document.getElementById('divider'), left=document.getElementById('leftPanel');
  let drag=false, startX, startW;
  div.addEventListener('mousedown',e=>{drag=true;startX=e.clientX;startW=left.offsetWidth;document.body.style.userSelect='none';});
  document.addEventListener('mousemove',e=>{if(!drag)return;left.style.width=Math.min(480,Math.max(160,startW+e.clientX-startX))+'px';});
  document.addEventListener('mouseup',()=>{drag=false;document.body.style.userSelect='';});

  window.addEventListener('resize',()=>{ resizeAllCharts(); });
}
