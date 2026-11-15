// envelope.js — shared building blocks for all sounds: the control curve h(t) (bilinear sampling of the
// [frames x 32] grid under the moving line), equal-power panning, master 3500 Hz low-pass, 1 s fades,
// peak normalisation (peak = 1/1.1 ≈ 0.91).
import { SR, lowpass, onePole } from './biquad.js';

export const STEP = 0.25;
export const COLS = 32;

/** Line position 0..1 at time t for sweep length P. */
export const linePos = (t, P) => (t % P) / P;

/** Unsmoothed grid value at time t (bilinear in frame time and strip position). */
export function gridAt(grid, N, t, P) {
  const fi = Math.min(Math.max(t / STEP - 0.5, 0), N - 1.001), i0 = Math.floor(fi), fr = fi - i0, i1 = Math.min(i0 + 1, N - 1);
  const ci = Math.min(Math.max(linePos(t, P) * COLS - 0.5, 0), COLS - 1.001), c0 = Math.floor(ci), cf = ci - c0;
  const g = (i, c) => grid[i * COLS + c];
  return (g(i0, c0) * (1 - cf) + g(i0, c0 + 1) * cf) * (1 - fr) + (g(i1, c0) * (1 - cf) + g(i1, c0 + 1) * cf) * fr;
}

/** Control curve at audio rate: bilinear sample, 5 Hz one-pole smoothing, clip 0..1. */
export function controlCurve(grid, N, L, P, sr = SR) {
  const h = new Float32Array(L);
  for (let n = 0; n < L; n++) h[n] = gridAt(grid, N, n / sr, P);
  const s = onePole(h, 5, sr);
  for (let n = 0; n < L; n++) s[n] = s[n] < 0 ? 0 : s[n] > 1 ? 1 : s[n];
  return s;
}

/** Mono signal + per-sample pan (−1..1) → stereo with equal-power law. */
export function panStereo(s, panAt) {
  const L = new Float32Array(s.length), R = new Float32Array(s.length);
  for (let n = 0; n < s.length; n++) { const a = ((panAt(n) + 1) * Math.PI) / 4; L[n] = s[n] * Math.cos(a); R[n] = s[n] * Math.sin(a); }
  return [L, R];
}

/** Master chain: low-pass 3500 Hz on both channels, optional 1 s fade in/out, divide by 1.1 × peak. */
export function master([L, R], { fade = 1, sr = SR } = {}) {
  let l = lowpass(L, 3500, sr), r = lowpass(R, 3500, sr);
  const n = l.length, T = n / sr;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr; const g = fade > 0 ? Math.min(1, t / fade, (T - t) / fade) : 1;
    l[i] *= g; r[i] *= g;
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  if (peak > 0) { const k = 1 / (peak * 1.1); for (let i = 0; i < n; i++) { l[i] *= k; r[i] *= k; } }
  return { left: l, right: r, sampleRate: sr, duration: T };
}

/** Add `kernel` scaled by `amp` at every index in `idx`. Sparse convolution for clicks/ticks. */
export function addKernels(out, idx, amps, kernel) {
  for (let k = 0; k < idx.length; k++) {
    const i0 = idx[k], a = amps ? amps[k] : 1;
    for (let j = 0; j < kernel.length && i0 + j < out.length; j++) out[i0 + j] += a * kernel[j];
  }
}
