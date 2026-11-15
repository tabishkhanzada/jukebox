// dsp.test.js — Step 4 checks of the 4 video sound engines on the sample videos (Claude cannot listen,
// so these measurements are the contract): peak, NaN, energy above 3 kHz, CO2 150–1000 Hz share, pan sweep,
// loudness follows data, silence where CO2 = 0, determinism, WAV round trip.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { renderAirQuality } from '../src/dsp/airQuality.js';
import { renderWeather } from '../src/dsp/weather.js';
import { renderCO2 } from '../src/dsp/co2.js';
import { renderSpace, spaceTriggers } from '../src/dsp/space.js';
import { gridAt, linePos } from '../src/dsp/envelope.js';
import { detectStars } from '../src/core/features.js';
import { encodeWav, readWavHeader } from '../src/core/wav.js';
import { sampleFeatures, starImage } from '../tools/node_features.mjs';
import { spectrum, bandShare, peak, hasNaN, rms, corr } from '../tools/audio_metrics.mjs';

const SR = 44100, P = 4;
const F = {}, OUT = {}, NUM = {};
const ENGINES = { airQuality: renderAirQuality, weather: renderWeather, co2: renderCO2 };
beforeAll(() => {
  for (const t of Object.keys(ENGINES)) { F[t] = sampleFeatures(t); OUT[t] = ENGINES[t](F[t], { P }); NUM[t] = {}; }
  F.space = detectStars(starImage(256), 256, 256);
  OUT.space = renderSpace(F.space, { P: 12, turns: 2 }); NUM.space = {};
});

const HF_LIMIT = { airQuality: 0.02, weather: 0.005, co2: 0.01, space: 0.03 };

describe('video sound engines', () => {
  it('peak <= 0.92 and no NaN', () => {
    for (const t of ['airQuality', 'weather', 'co2', 'space']) {
      const o = OUT[t]; NUM[t].peak = +peak(o.left, o.right).toFixed(3); NUM[t].seconds = +o.duration.toFixed(2);
      expect(hasNaN(o.left, o.right)).toBe(false);
      expect(NUM[t].peak).toBeLessThanOrEqual(0.92);
    }
  });

  it('energy above 3 kHz within limits (AQ 2 %, Weather 0.5 %, CO2 1 %, Space 3 %)', () => {
    for (const t of Object.keys(HF_LIMIT)) {
      const sp = spectrum([OUT[t].left, OUT[t].right]);
      NUM[t].above3kHzPct = +(100 * bandShare(sp, 3000, 22050)).toFixed(3);
      if (t === 'co2') NUM.co2.band150_1000Pct = +(100 * bandShare(sp, 150, 1000)).toFixed(1);
      expect(NUM[t].above3kHzPct / 100).toBeLessThanOrEqual(HF_LIMIT[t]);
    }
    expect(NUM.co2.band150_1000Pct).toBeGreaterThanOrEqual(55);
  });

  it('pan test: L/R RMS > 2 with the line at the left, < 0.5 at the right', () => {
    for (const t of Object.keys(ENGINES)) {
      const o = OUT[t], nSweeps = Math.floor(o.duration / P);
      let best = null;
      for (let k = 1; k < nSweeps - 1; k++) {
        const w = (x0, x1) => [Math.floor((k * P + x0 * P) * SR), Math.floor((k * P + x1 * P) * SR)];
        const [a0, a1] = w(0.02, 0.12), [b0, b1] = w(0.88, 0.98);
        const left = rms(o.left, a0, a1) / rms(o.right, a0, a1), right = rms(o.left, b0, b1) / rms(o.right, b0, b1);
        const level = Math.min(rms(o.left, a0, a1), rms(o.right, b0, b1));
        if (!best || level > best.level) best = { sweep: k, left, right, level };
      }
      NUM[t].pan = { sweep: best.sweep, ratioAtLeft: +best.left.toFixed(2), ratioAtRight: +best.right.toFixed(3) };
      expect(best.left).toBeGreaterThan(2);
      expect(best.right).toBeLessThan(0.5);
    }
  });

  it('loudness follows data: corr(value under line, short-time RMS) >= 0.5', () => {
    for (const t of Object.keys(ENGINES)) {
      const o = OUT[t], f = F[t], win = Math.floor(0.05 * SR), vals = [], lev = [];
      for (let i0 = SR; i0 + win < o.left.length - SR; i0 += win) {
        const tc = (i0 + win / 2) / SR;
        vals.push(gridAt(f.cols, f.N, tc, P));
        lev.push(Math.hypot(rms(o.left, i0, i0 + win), rms(o.right, i0, i0 + win)));
      }
      NUM[t].loudnessCorr = +corr(vals, lev).toFixed(3);
      expect(NUM[t].loudnessCorr).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('silence rule: where the CO2 value is 0, RMS < 2 % of the max', () => {
    const o = OUT.co2, f = F.co2, win = Math.floor(0.05 * SR);
    const all = [], zero = [];
    for (let i0 = SR; i0 + win < o.left.length - SR; i0 += win) {
      const tc = (i0 + win / 2) / SR, lv = Math.hypot(rms(o.left, i0, i0 + win), rms(o.right, i0, i0 + win));
      all.push(lv);
      let z = true; for (let d = -0.2; d <= 0.2001 && z; d += 0.025) z = gridAt(f.cols, f.N, tc + d, P) === 0 && gridAt(f.hot, f.N, tc + d, P) === 0;
      if (z) zero.push(lv);
    }
    const mx = Math.max(...all), worst = zero.length ? Math.max(...zero) / mx : 0;
    NUM.co2.silence = { zeroWindows: zero.length, worstRmsPctOfMax: +(100 * worst).toFixed(3) };
    expect(zero.length).toBeGreaterThan(10);
    expect(worst).toBeLessThan(0.02);
  });

  it('space: tinks thinned to <= 25 per second, nothing between stars', () => {
    const tr = OUT.space.triggers;
    NUM.space.tinks = tr.length; NUM.space.tinksPerSecond = +(tr.length / OUT.space.duration).toFixed(1);
    const gaps = tr.slice(1).map((x, i) => x.t - tr[i].t);
    NUM.space.minGapMs = +(1000 * Math.min(...gaps)).toFixed(1);
    expect(tr.length / OUT.space.duration).toBeLessThanOrEqual(25.01);
    const empty = { bins: Array.from({ length: 720 }, () => []) };
    const s = renderSpace(empty, { P: 12, turns: 1 });
    expect(peak(s.left, s.right)).toBe(0);
    expect(spaceTriggers(F.space.bins, { P: 12, turns: 1 }).length).toBeGreaterThan(100);
  });

  it('determinism: same seed → identical output; different seed → different', () => {
    const a = renderAirQuality(F.airQuality, { P, seed: 3 }), b = renderAirQuality(F.airQuality, { P, seed: 3 }), c = renderAirQuality(F.airQuality, { P, seed: 4 });
    let same = true; for (let i = 0; i < a.left.length; i++) if (a.left[i] !== b.left[i] || a.right[i] !== b.right[i]) { same = false; break; }
    expect(same).toBe(true);
    expect(a.left.some((v, i) => v !== c.left[i])).toBe(true);
    NUM.determinism = 'identical for seed 3 twice; differs for seed 4';
  });

  it('WAV writer: header ok and length equals the buffer', () => {
    const o = OUT.weather; const buf = encodeWav(o.left, o.right, SR); const hd = readWavHeader(buf);
    expect(hd).toEqual({ channels: 2, sampleRate: SR, bits: 16, frames: o.left.length });
    expect(buf.byteLength).toBe(44 + o.left.length * 4);
    NUM.wav = hd;
  });

  it('writes numbers for the report + WAV files for the listener', () => {
    fs.mkdirSync('tmp/wav', { recursive: true });
    for (const t of ['airQuality', 'weather', 'co2', 'space']) fs.writeFileSync(`tmp/wav/${t}.wav`, Buffer.from(encodeWav(OUT[t].left, OUT[t].right)));
    fs.writeFileSync('tmp/step4_numbers.json', JSON.stringify(NUM, null, 1));
  });
});
