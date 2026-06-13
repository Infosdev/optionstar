import { S } from '../state.js';
import { fmtN } from '../helpers.js';

export function updateStrategy() {
  if(!S.callPrice||!S.putPrice||!S.chain) return;
  const atm=S.atm;
  const ceLTP=S.callPrice, peLTP=S.putPrice;
  const lotSize=75;
  const strCredit=+(ceLTP+peLTP).toFixed(2);
  const c50=S.chain.find(r=>r.strike===atm+50);
  const p50=S.chain.find(r=>r.strike===atm-50);
  const c100=S.chain.find(r=>r.strike===atm+100);
  const p100=S.chain.find(r=>r.strike===atm-100);

  const strats=[
    {
      name:'Short Straddle',emoji:'🎯',
      legs:`Sell ${atm}CE + Sell ${atm}PE`,
      credit:strCredit,
      maxProfit:+(strCredit*lotSize).toFixed(0),
      maxRisk:'Unlimited',
      be:`${(atm-strCredit).toFixed(0)} – ${(atm+strCredit).toFixed(0)}`
    },
    {
      name:'Short Strangle',emoji:'🛡️',
      legs:`Sell ${atm+50}CE + Sell ${atm-50}PE`,
      credit:+((c50?.ceLTP||0)+(p50?.peLTP||0)).toFixed(2),
      maxProfit:+(((c50?.ceLTP||0)+(p50?.peLTP||0))*lotSize).toFixed(0),
      maxRisk:'Unlimited',
      be:`${(atm-50-((c50?.ceLTP||0)+(p50?.peLTP||0))).toFixed(0)} – ${(atm+50+((c50?.ceLTP||0)+(p50?.peLTP||0))).toFixed(0)}`
    },
    {
      name:'Iron Condor',emoji:'🦅',
      legs:`S${atm+50}CE B${atm+100}CE / S${atm-50}PE B${atm-100}PE`,
      credit:+(((c50?.ceLTP||0)+(p50?.peLTP||0))-((c100?.ceLTP||0)+(p100?.peLTP||0))).toFixed(2),
      maxProfit:+(Math.max(0,((c50?.ceLTP||0)+(p50?.peLTP||0))-((c100?.ceLTP||0)+(p100?.peLTP||0)))*lotSize).toFixed(0),
      maxRisk:+(Math.max(0,50-Math.max(0,((c50?.ceLTP||0)+(p50?.peLTP||0))-((c100?.ceLTP||0)+(p100?.peLTP||0))))*lotSize).toFixed(0),
      be:`${(atm-50).toFixed(0)} – ${(atm+50).toFixed(0)}`
    }
  ];
  const tbody=document.getElementById('strategyBody');
  if(!tbody) return;
  tbody.innerHTML='';
  strats.forEach(st=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><b>${st.emoji} ${st.name}</b></td>
      <td style="font-size:9px">${st.legs}</td>
      <td class="${st.credit>0?'profit':'loss'}">+${fmtN(st.credit)}</td>
      <td class="profit">₹${fmtN(st.maxProfit,0)}</td>
      <td class="loss">${st.maxRisk==='Unlimited'?'Unlimited':'₹'+fmtN(st.maxRisk,0)}</td>
      <td style="font-size:9px">${st.be}</td>
    `;
    tbody.appendChild(tr);
  });
}
