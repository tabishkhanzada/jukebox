// weather.js — "Wind + Whistle" sound for the near-surface wind video (port of reference_dsp/weather_scan.py).
// Stronger wind colour under the line = louder whoosh, more mid noise and a soft whistle that rises
// (450 → 700 → 1000 Hz) with strength; calm = a very quiet low hush.
import { SR, lowpass, highpass, bandpass, onePole } from './biquad.js';
import { mulberry32, gaussian, noise } from './rng.js';
import { STEP, controlCurve, linePos, panStereo, master } from './envelope.js';

const clip = (v, a, b) => (v < a ? a : v > b ? b : v);

export function renderWeather({ cols, N }, { P = 4, seed = 11, sr = SR } = {}) {
  const L = Math.floor(N * STEP * sr);
  const g = gaussian(mulberry32(seed));
  const h = controlCurve(cols, N, L, P, sr);
  const gl = onePole(noise(L, g), 0.3, sr);
  const whoosh = lowpass(highpass(noise(L, g), 80, sr), 600, sr);
  const mid = bandpass(noise(L, g), 300, 1100, sr);
  const fcs = [450, 700, 1000], cs = [0.25, 0.55, 0.85];
  const wh = fcs.map((fc) => bandpass(noise(L, g), fc * 0.93, fc * 1.07, sr));
  const calm = lowpass(noise(L, g), 500, sr);
  const s = new Float32Array(L);
  for (let n = 0; n < L; n++) {
    const hn = h[n], gust = clip(1 + gl[n] * 2.2, 0.4, 1.7);
    let whistle = 0;
    for (let i = 0; i < 3; i++) whistle += wh[i][n] * clip(1 - Math.abs(hn - cs[i]) / 0.3, 0, 1);
    whistle *= 1.4 * hn ** 1.5 * clip(gust, 0.5, 1.5);
    s[n] = whoosh[n] * (0.04 + 0.5 * hn ** 1.3) * gust + mid[n] * (0.1 * hn ** 1.6) * gust + whistle + calm[n] * (0.025 * (1 - hn));
  }
  return { ...master(panStereo(s, (n) => -0.9 + 1.8 * linePos(n / sr, P)), { sr }), control: h };
}

export function weatherWords(h) {
  return h < 0.15 ? 'calm' : h < 0.4 ? 'light breeze' : h < 0.65 ? 'windy' : h < 0.85 ? 'strong wind' : 'storm-force wind';
}
