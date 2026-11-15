// features.test.js — Step 3 checks of src/core/features.js on frames extracted from the 4 samples (ffmpeg-static).
// Shape/range/NaN, Weather left-most storm, CO2 rising amount and silent share, Air Quality strip spread,
// Space star count and no radar line, and that the GMAO logo/date areas never change the values.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { COLS, airQualityStrips, weatherStrips, detectStars, gmaoMask } from '../src/core/features.js';
import { sampleFeatures, groupMeans, quarterMeans, starImage } from '../tools/node_features.mjs';

const R = {}; // results printed into the report
const F = {};
beforeAll(() => { for (const t of ['airQuality', 'weather', 'co2']) F[t] = sampleFeatures(t); });

describe('video features', () => {
  it('shape [frames x 32], values in 0..1, no NaN', () => {
    for (const t of ['airQuality', 'weather', 'co2']) {
      const f = F[t];
      expect(f.cols.length).toBe(f.N * COLS);
      expect(f.N).toBeGreaterThan(100);
      const bad = f.cols.filter((v) => !(v >= 0 && v <= 1)).length;
      expect(bad).toBe(0);
      R[t] = { N: f.N, shape: `[${f.N} x ${COLS}]` };
    }
  });

  it('Weather: left-most eighth has the highest mean strength (gap >= 0.15)', () => {
    const g = groupMeans(F.weather.cols, F.weather.N, 8);
    const rest = g.slice(1);
    R.weather.groups8 = g.map((v) => +v.toFixed(2));
    expect(g[0]).toBe(Math.max(...g));
    expect(g[0] - Math.max(...rest)).toBeGreaterThanOrEqual(0.15);
  });

  it('CO2: mean amount per quarter rises (ref 0.13 0.28 0.41 0.42 ±0.08); ~18 % silent strips', () => {
    const q = quarterMeans(F.co2.cols, F.co2.N);
    const silent = F.co2.cols.filter((v) => v < 0.02).length / F.co2.cols.length;
    R.co2.quarters = q.map((v) => +v.toFixed(2)); R.co2.silentPct = +(100 * silent).toFixed(1);
    [0.13, 0.28, 0.41, 0.42].forEach((ref, i) => expect(Math.abs(q[i] - ref)).toBeLessThanOrEqual(0.08));
    expect(silent).toBeGreaterThan(0.1); expect(silent).toBeLessThan(0.26);
  });

  it('Air Quality: strips differ inside a frame (mean std across strips > 0.1)', () => {
    const { cols, N } = F.airQuality; let s = 0;
    for (let i = 0; i < N; i++) {
      const row = cols.slice(i * COLS, (i + 1) * COLS); const m = row.reduce((a, b) => a + b, 0) / COLS;
      s += Math.sqrt(row.reduce((a, b) => a + (b - m) ** 2, 0) / COLS);
    }
    R.airQuality.meanStripStd = +(s / N).toFixed(3);
    expect(s / N).toBeGreaterThan(0.1);
  });

  it('Space: >= 200 stars on the clean image, no straight bright line > 100 px', () => {
    const st = detectStars(starImage(256), 256, 256);
    R.space = { stars: st.stars.length, longestRun: st.longestRun, binsWithStars: st.bins.filter((b) => b.length).length };
    expect(st.stars.length).toBeGreaterThanOrEqual(200);
    expect(st.longestRun).toBeLessThan(100);
  });

  it('logo and date-label areas are excluded (painting them white changes nothing)', () => {
    for (const [t, fn] of [['airQuality', airQualityStrips], ['weather', weatherStrips]]) {
      const { frames, w, h } = F[t];
      const f = frames[40]; const g = f.slice(); const m = gmaoMask(w, h);
      for (let i = 0; i < w * h; i++) if (!m[i]) { g[i * 4] = g[i * 4 + 1] = g[i * 4 + 2] = 255; }
      const a = fn(f, w, h), b = fn(g, w, h);
      const maxDiff = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      R[t].logoTestMaxDiff = maxDiff;
      expect(maxDiff).toBe(0);
    }
  });

  it('writes the numbers for the report', () => {
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync('tmp/step3_numbers.json', JSON.stringify(R, null, 1));
    for (const t of ['airQuality', 'weather', 'co2']) fs.writeFileSync(`tmp/node_features_${t}.json`, JSON.stringify({ N: F[t].N, cols: [...F[t].cols].map((v) => +v.toFixed(4)) }));
  });
});
