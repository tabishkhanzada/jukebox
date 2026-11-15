// instruments.js — the picture instruments (one note = one sound, 44100 Hz) and the picture renderer that places
// the scheduled notes in time and left/right, then adds a soft room reverb. Redesigned 2026-11-15 after the owner
// said the old picture sounds were strange: smooth (raised-cosine) attacks and releases, longer natural decays so
// notes overlap gently, no harsh high partials. piano (Temperature), drop (Rain), bell (Snow), pad (Aerosol),
// marimba (Vegetation), kalimba (Any picture). Not heard by a person yet (Claude cannot hear): UNVERIFIED.
import { SR, lowpass } from './biquad.js';
import { master } from './envelope.js';

const TWO_PI = 2 * Math.PI;

/** Smooth envelope: raised-cosine attack (atk s) and release over the last rel s of the note. */
function smooth(n, len, atk, rel, sr) {
  const t = n / sr, left = (len - n) / sr;
  const a = t < atk ? 0.5 - 0.5 * Math.cos((Math.PI * t) / atk) : 1;
  const r = left < rel ? 0.5 - 0.5 * Math.cos((Math.PI * Math.max(0, left)) / rel) : 1;
  return a * r;
}
/** Sum of decaying sine partials: parts = [[ratio, amp, tau seconds], …]. */
function partials(f, parts, dur, atk, rel, gain, sr) {
  const len = Math.floor(dur * sr), y = new Float32Array(len);
  for (const [m, a, tau] of parts) {
    const w = (TWO_PI * f * m) / sr;
    if (f * m > sr / 2 - 1000) continue;
    for (let n = 0; n < len; n++) y[n] += a * Math.sin(w * n) * Math.exp(-n / (tau * sr));
  }
  for (let n = 0; n < len; n++) y[n] *= gain * smooth(n, len, atk, rel, sr);
  return y;
}

/** Soft piano: 7 slightly stretched partials, higher ones fade faster. */
export function piano(f, sr = SR) {
  const parts = [];
  for (let k = 1; k <= 7; k++) parts.push([k * Math.sqrt(1 + 0.0003 * k * k), 1 / k ** 1.6, 1.1 / (1 + 0.55 * (k - 1))]);
  return partials(f, parts, 1.8, 0.004, 0.2, 0.32, sr);
}
/** Water drop: a short round "bloop" whose pitch rises quickly to the note (like a real droplet). */
export function drop(f, sr = SR) {
  const len = Math.floor(0.45 * sr), y = new Float32Array(len); let ph = 0;
  for (let n = 0; n < len; n++) {
    const t = n / sr, fi = f * (0.72 + 0.28 * (1 - Math.exp(-t / 0.025)));
    ph += (TWO_PI * fi) / sr;
    y[n] = 0.55 * (Math.sin(ph) + 0.12 * Math.sin(2 * ph) * Math.exp(-t / 0.05)) * Math.exp(-t / 0.11) * smooth(n, len, 0.0015, 0.05, sr);
  }
  return y;
}
/** Music-box bell (snow): bright but gentle, long ring. */
export function bell(f, sr = SR) {
  return partials(f, [[1, 1, 0.9], [2, 0.3, 0.45], [3, 0.12, 0.25], [4.17, 0.05, 0.12]], 1.4, 0.002, 0.2, 0.34, sr);
}
/** Warm pad (aerosol): two slightly detuned voices, soft harmonics, slow swell in and out. */
export function pad(f, sr = SR) {
  const len = Math.floor(1.0 * sr), y = new Float32Array(len);
  for (const det of [0.9965, 1.0035]) for (let k = 1; k <= 5; k++) {
    const w = (TWO_PI * f * det * k) / sr, a = 0.55 ** (k - 1) / Math.sqrt(k);
    for (let n = 0; n < len; n++) y[n] += a * Math.sin(w * n + k);
  }
  for (let n = 0; n < len; n++) y[n] *= 0.2 * smooth(n, len, 0.15, 0.45, sr);
  return lowpass(y, 1400, sr);
}
/** Soft marimba (vegetation): wooden tone with a quick, quiet mallet partial. */
export function marimba(f, sr = SR) {
  return partials(f, [[1, 1, 0.32], [3.9, 0.2, 0.035], [9.2, 0.04, 0.01]], 0.8, 0.002, 0.15, 0.5, sr);
}
/** Kalimba (any picture): plucked metal tine, round and short. */
export function kalimba(f, sr = SR) {
  return partials(f, [[1, 1, 0.45], [2, 0.12, 0.15], [5.9, 0.1, 0.04]], 1.1, 0.002, 0.15, 0.45, sr);
}
export const INSTRUMENTS = { piano, drop, bell, pad, marimba, kalimba };

/** Small Schroeder/Freeverb-style room: 6 damped combs + 3 all-passes. offset (samples) decorrelates L and R. */
export function reverb(x, sr = SR, offset = 0) {
  const scale = sr / 44100, out = new Float32Array(x.length);
  for (const d0 of [1116, 1188, 1277, 1356, 1422, 1491]) {
    const d = Math.round((d0 + offset) * scale), buf = new Float32Array(d); let i = 0, store = 0;
    for (let n = 0; n < x.length; n++) {
      const y = buf[i]; store = y * 0.65 + store * 0.35;
      buf[i] = x[n] + store * 0.78; out[n] += y;
      if (++i >= d) i = 0;
    }
  }
  for (const d0 of [556, 441, 341]) {
    const d = Math.round((d0 + offset) * scale), buf = new Float32Array(d); let i = 0;
    for (let n = 0; n < x.length; n++) {
      const b = buf[i], v = out[n];
      out[n] = -v + b; buf[i] = v + b * 0.5;
      if (++i >= d) i = 0;
    }
  }
  return out;
}
const rms = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, a.length)); };

/**
 * Render a picture schedule {notes, duration} → stereo. Audio = sweep + 2.5 s tail so the last notes and the
 * room can ring out. wet = reverb level relative to the dry sound (by RMS).
 */
export function renderPicture({ notes, duration }, { sr = SR, tail = 2.5, wet = 0.3 } = {}) {
  const L = Math.floor((duration + tail) * sr), Lc = new Float32Array(L), Rc = new Float32Array(L);
  const cache = new Map();
  for (const nt of notes) {
    const key = nt.instrument + nt.freq;
    let y = cache.get(key);
    if (!y) { y = INSTRUMENTS[nt.instrument](nt.freq, sr); cache.set(key, y); }
    const a = ((nt.pan + 1) * Math.PI) / 4, gl = Math.cos(a), gr = Math.sin(a), n0 = Math.floor(nt.t * sr);
    for (let j = 0; j < y.length && n0 + j < L; j++) { Lc[n0 + j] += y[j] * gl; Rc[n0 + j] += y[j] * gr; }
  }
  if (notes.length) {
    const wl = reverb(Lc, sr, 0), wr = reverb(Rc, sr, 23);
    const k = (wet * (rms(Lc) + rms(Rc))) / Math.max(1e-12, rms(wl) + rms(wr));
    const fadeN = Math.floor(0.4 * sr);
    for (let n = 0; n < L; n++) {
      const g = n > L - fadeN ? 0.5 - 0.5 * Math.cos((Math.PI * (L - n)) / fadeN) : 1;
      Lc[n] = (Lc[n] + k * wl[n]) * g; Rc[n] = (Rc[n] + k * wr[n]) * g;
    }
  }
  return { ...master([Lc, Rc], { sr, fade: 0 }), notes };
}
