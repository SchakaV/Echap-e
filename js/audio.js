// audio.js — musique d'ambiance générative (aucun fichier audio externe,
// tout est synthétisé en direct avec la Web Audio API).

const STORAGE_KEY = 'velo-jeu-music-enabled';
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // gamme pentatonique en C

let ctx = null;
let masterGain = null;
let loopHandle = null;
let enabled = false;

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, time, duration, type, gainValue) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(gainValue, time + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

/** Petit "clic" bruité — sert de pulsation de pédalage pour la musique de course. */
function click(time, gainValue) {
  const size = Math.floor(ctx.sampleRate * 0.03);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.value = gainValue;
  src.connect(g);
  g.connect(masterGain);
  src.start(time);
}

export function stopMusic() {
  if (loopHandle) {
    clearInterval(loopHandle);
    loopHandle = null;
  }
}

/** Nappe douce et aléatoire pour les écrans de menu / configuration / résultats. */
export function playMenuMusic() {
  stopMusic();
  if (!enabled) return;
  ensureContext();
  loopHandle = setInterval(() => {
    const now = ctx.currentTime;
    const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    tone(note / 2, now, 2.6, 'sine', 0.2);
    if (Math.random() < 0.5) tone(note, now + 0.5, 2.0, 'triangle', 0.1);
  }, 1900);
}

/** Rythme plus soutenu façon pédalage, pour l'écran de course. */
export function playRaceMusic() {
  stopMusic();
  if (!enabled) return;
  ensureContext();
  let beat = 0;
  loopHandle = setInterval(() => {
    const now = ctx.currentTime;
    click(now, 0.22);
    if (beat % 2 === 0) tone(110, now, 0.28, 'sawtooth', 0.14);
    if (beat % 4 === 2) tone(PENTATONIC[2], now, 0.5, 'square', 0.07);
    beat++;
  }, 340);
}

export function setEnabled(value) {
  enabled = !!value;
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch (e) { /* stockage indisponible, tant pis */ }
  if (!enabled) stopMusic();
}

export function isEnabled() {
  return enabled;
}

/** À appeler une fois au démarrage pour relire la préférence de l'utilisateur. */
export function loadPreference() {
  try { enabled = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { enabled = false; }
  return enabled;
}
