// co2.js — "CO2 Hum" sound for the CO2 video (port of reference_dsp/co2_scan.py).
// More golden haze under the line = louder soft rumble (70–450 Hz) + airy band + a quiet "oo" tone;
// orange/red hot patches add a soft crackle. No CO2 (black space, white snow) = silence.
import { SR, bandpass, onePole } from './biquad.js';
import { mulberry32, gaussian, noise } from './rng.js';
import { STEP, controlCurve, linePos, panStereo, master, addKernels } from './envelope.js';

const clip = (v, a, b) => (v < a ? a : v > b ? b : v);

export function renderCO2({ cols, hot, N }, { P = 4, seed = 5, sr = SR } = {}) {
  const L = Math.floor(N * STEP * sr);
  const rng = mulberry32(seed), g = gaussian(rng);
  const a = controlCurve(cols, N, L, P, sr), hh = controlCurve(hot, N, L, P, sr);
  const sw = onePole(noise(L, g), 0.2, sr);
  const rum = bandpass(noise(L, g), 70, 450, sr);
  const airy = bandpass(noise(L, g), 300, 900, sr);
  const s = new Float32Array(L);
  const idx = [], amps = [];
  for (let n = 0; n < L; n++) {
    const an = a[n], swell = clip(1 + sw[n] * 2.5, 0.7, 1.3), t = n / sr;
    s[n] = rum[n] * 3.0 * (0.55 * an ** 1.2) * swell + airy[n] * 2.0 * (0.18 * an ** 1.6) * swell +
      (Math.sin(2 * Math.PI * 110 * t) + 0.6 * Math.sin(2 * Math.PI * 165.7 * t)) * (0.1 * an);
    if (rng() < (18 * hh[n] ** 1.5) / sr) { idx.push(n); amps.push(0.4 + 0.6 * rng()); }
  }
  const kl = Math.floor(0.01 * sr);
  const k = onePole(noise(kl, g), 1800, sr);
  for (let j = 0; j < kl; j++) k[j] *= Math.exp(-j / (0.003 * sr)) * 1.2;
  addKernels(s, idx, amps, k);
  return { ...master(panStereo(s, (n) => -0.9 + 1.8 * linePos(n / sr, P)), { sr }), control: a, controlHot: hh };
}

export function co2Words(a, hh = 0) {
  const w = a < 0.05 ? 'no CO2 in view' : a < 0.3 ? 'thin CO2' : a < 0.6 ? 'moderate CO2' : 'dense CO2';
  return hh > 0.3 && a >= 0.05 ? w + ', hotspots' : w;
}
