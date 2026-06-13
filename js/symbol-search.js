import { showToast } from './ui/toast.js';

// ==================== SYMBOL SEARCH ====================
export const SYMS_LIST=[];
for(let k=23000;k<=25000;k+=50){SYMS_LIST.push(`NIFTY MAY ${k} CE`,`NIFTY MAY ${k} PE`);}
for(let k=51000;k<=56000;k+=100){SYMS_LIST.push(`BANKNIFTY MAY ${k} CE`,`BANKNIFTY MAY ${k} PE`);}

export function searchSymbol(v) {
  const box=document.getElementById('suggBox');
  if(!v){box.style.display='none';return;}
  const m=SYMS_LIST.filter(s=>s.toLowerCase().includes(v.toLowerCase())).slice(0,8);
  if(!m.length){box.style.display='none';return;}
  box.innerHTML=m.map(s=>`<div class="sug-item" onmousedown="selectSym('${s}')">${s}</div>`).join('');
  box.style.display='block';
}

export function selectSym(sym) {
  const isCE=sym.endsWith('CE');
  if(isCE){document.getElementById('ceInput').value=sym;document.getElementById('sym1Tag').textContent=sym;document.getElementById('ceSymTitle').textContent=sym;document.getElementById('tape1Title').textContent=sym+' \u2014 Order Flow';}
  else{document.getElementById('peInput').value=sym;document.getElementById('sym2Tag').textContent=sym;document.getElementById('peSymTitle').textContent=sym;document.getElementById('tape2Title').textContent=sym+' \u2014 Order Flow';}
  document.getElementById('suggBox').style.display='none';
  document.getElementById('symbolSearch').value='';
  showToast('Symbol: '+sym,'info');
}

export function hideSugg(){setTimeout(()=>{const b=document.getElementById('suggBox');if(b)b.style.display='none';},180);}

export function updateSymbols() { showToast('Symbols updated \u2014 refreshing...','info'); window.manualRefresh(); }
