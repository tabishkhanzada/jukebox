// airQuality.js — "Wind + Dust" sound for the PM2.5 video (port of reference_dsp/air_quality_scan.py).
// Darker strip under the line = more dust = louder wind, rough grit and dust "ticks". Clean air = soft air.
import { SR, lowpass, highpass, bandpass, onePole } from './biquad.js';
import { mulberry32, gaussian, noise } from './rng.js';
import { STEP, controlCurve, linePos, panStereo, master, addKernels } from './envelope.js';

const clip = (v, a, b) => (v < a ? a : v > b ? b : v);

export function renderAirQuality({ cols, N }, { P = 4, seed = 3, sr = SR } = {}) {
  const L = Math.floor(N * STEP * sr);
  const rng = mulberry32(seed), g = gaussian(rng);
  const h = controlCurve(cols, N, L, P, sr);
  const gl = onePole(noise(L, g), 0.25, sr);
  const wind = lowpass(highpass(noise(L, g), 120, sr), 700, sr);
  const grit = bandpass(noise(L, g), 700, 2200, sr);
  const air = lowpass(noise(L, g), 900, sr);
  const s = new Float32Array(L);
  const idx = [];
  for (let n = 0; n < L; n++) {
    const hn = h[n], gust = clip(1 + gl[n] * 1.5, 0.6, 1.4);
    s[n] = wind[n] * (0.05 + 0.45 * hn ** 1.2) * gust + grit[n] * (0.15 * hn * hn) * gust + air[n] * (0.03 * (1 - hn));
    if (rng() < (30 * hn * hn) / sr) idx.push(n);
  }
  const kl = Math.floor(0.004 * sr), k = new Float32Array(kl);
  for (let j = 0; j < kl; j++) k[j] = g() * Math.exp(-j / (0.001 * sr)) * 0.25;
  addKernels(s, idx, null, k);
  return { ...master(panStereo(s, (n) => -0.9 + 1.8 * linePos(n / sr, P)), { sr }), control: h };
}

/** Caption words for a value h (0..1). */
export function airQualityWords(h) {
  return h < 0.15 ? 'clean air' : h < 0.4 ? 'light haze' : h < 0.65 ? 'moderate dust' : h < 0.85 ? 'heavy dust' : 'very heavy dust';
}
