let audioCtx = null;
let enabled = true;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function ensureResumed() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}

function playTone(freq, duration, type = 'sine') {
  if (!enabled) return;
  ensureResumed();
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playTurnWarning() {
  playTone(880, 0.3);
  setTimeout(() => playTone(880, 0.3), 350);
}

export function playMainWarning() {
  playTone(660, 0.2);
  setTimeout(() => playTone(880, 0.2), 250);
  setTimeout(() => playTone(1100, 0.3), 500);
}

export function playPenaltyAlert() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playTone(440, 0.15, 'square'), i * 200);
  }
}

export function speakTTS(text) {
  if (!enabled) return;
  if (!('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ko-KR';
  utter.rate = 1.0;
  speechSynthesis.speak(utter);
}

export function setSoundEnabled(on) {
  enabled = on;
}

export function isSoundEnabled() {
  return enabled;
}

export function initSound() {
  // Create context on first user interaction
  document.addEventListener('click', () => ensureResumed(), { once: true });
}
