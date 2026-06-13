import { S } from './state.js';
import { fmtN } from './helpers.js';
import { showToast } from './ui/toast.js';

// ==================== ALERTS & NOTIFICATIONS ====================
export async function toggleNotifPerm() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission !== 'granted') {
    document.getElementById('s-notif').checked = false;
    showToast('Notifications blocked by browser', 'error');
  }
}

export function sendAlert(title, body, type = 'info') {
  // In-app badge
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.textContent = `${title}: ${body}`;
    badge.className = 'notif-badge show';
    setTimeout(() => badge.classList.remove('show'), 5000);
  }
  // Browser notification
  if (document.getElementById('s-notif')?.checked && Notification.permission === 'granted') {
    new Notification('\u2b50 OptionStar \u2014 ' + title, { body, silent: false });
  }
  // Sound
  playAlertSound(type === 'bull' ? 880 : type === 'bear' ? 440 : 660);
}

export function playAlertSound(freq = 660, dur = 0.25) {
  if (!document.getElementById('s-sound')?.checked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch (e) {}
}

// Track previous signal to detect flip
let _lastAlertedSignal = '';

export function checkSignalAlert() {
  if (!S.confirmedSig) return;
  const mode = document.getElementById('s-alertsig')?.value || 'all';
  if (mode === 'none') return;
  const sig = S.confirmedSig.signal;
  if (sig === _lastAlertedSignal) return;
  if (mode === 'directional' && sig === 'WAIT') { _lastAlertedSignal = sig; return; }
  _lastAlertedSignal = sig;
  const isBull = sig === 'BUY_CALL', isBear = sig === 'BUY_PUT';
  const label = isBull ? 'BUY CALL' : isBear ? 'BUY PUT' : 'WAIT \u2014 No Trade';
  const type = isBull ? 'bull' : isBear ? 'bear' : 'info';
  sendAlert('Signal', `${label} @ ${fmtN(isBull ? S.callPrice : S.putPrice)} \u2014 Conf: ${S.confirmedSig.confPct}%`, type);
}
