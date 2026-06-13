import { S } from '../state.js';
import { analyzeTradeSignal } from './signal.js';
import { updateSignalCard } from '../ui/signal-card.js';

// ==================== SIGNAL CONFIRMATION ENGINE ====================
// Prevents flickering — signal only changes when trend is confirmed over
// multiple consecutive checks AND a minimum hold time has passed.
const SIG_BUF_SIZE = 5;       // number of readings to track
const SIG_CONFIRM_MIN = 3;    // need 3 of last 5 agreeing
const SIG_HOLD_MS = 45000;    // min 45 s before a signal can flip

let _sigBuf = [];              // rolling signal readings

export function tryRefreshSignal() {
  if (!S.callPrice || !S.putPrice) return;
  const raw = analyzeTradeSignal();
  if (!raw) return;

  // Rolling buffer
  _sigBuf.push(raw.signal);
  if (_sigBuf.length > SIG_BUF_SIZE) _sigBuf.shift();

  // Count votes
  const votes = {};
  _sigBuf.forEach(s => { votes[s] = (votes[s]||0)+1; });
  const top = Object.entries(votes).sort((a,b)=>b[1]-a[1])[0];
  const dominant = top[0], count = top[1];

  const now = Date.now();
  const holdOk = (now - S.confirmedAt) >= SIG_HOLD_MS;

  // Publish new signal only when dominant has enough votes AND hold time passed
  if (count >= SIG_CONFIRM_MIN && (dominant !== S.confirmedType || !S.confirmedSig) && holdOk) {
    S.confirmedType = dominant;
    S.confirmedAt = now;
    S.confirmedSig = { ...raw, signal: dominant };
    updateSignalCard();
    return;
  }

  // First-time render (no confirmed signal yet) — show immediately
  if (!S.confirmedSig) {
    S.confirmedType = raw.signal;
    S.confirmedAt = now;
    S.confirmedSig = raw;
    updateSignalCard();
  }
}
