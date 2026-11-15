// picture.test.js — Step 5 checks of picture mode: swatch test (every official legend colour → its band),
// noise test (±8 colour noise), black image = silence, zig-zag/straight schedule order and length, and renders
// of the 4 sample pictures (peak, energy above 3 kHz, number of notes, share of regions per band).
// Step 10 (2026-11-15): "Any picture" (brightness bands, every opaque region sounds), the new instruments
// (no clicks: largest sample-to-sample step, spectral centroid) and the slower default sweep (32 s).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { LAYERS } from '../src/picture/layers.js';
import { classifyPicture, classifyBrightness, colourName, rgbToLab, legendFit } from '../src/picture/classify.js';
import { buildSchedule, noteCaption } from '../src/picture/schedule.js';
import { renderPicture, INSTRUMENTS } from '../src/dsp/instruments.js';
import { mulberry32 } from '../src/dsp/rng.js';
import { readPNG } from '../tools/lib.mjs';
import { spectrum, bandShare, peak, hasNaN } from '../tools/audio_metrics.mjs';

const NUM = {};
const flat = (rgb, w = 64, h = 48, noise = 0, rng = null) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) d[i * 4 + c] = rgb[c] + (noise ? Math.round((rng() * 2 - 1) * noise) : 0);
    d[i * 4 + 3] = 255;
  }
  return d;
};
const allRegions = (regs) => regs.flat();
const ALL_LAYERS = Object.values(LAYERS);
const MAPS = Object.values(LAYERS).filter((l) => l.id !== 'any'); // the 4 NASA map layers (with a legend)
const maxStep = (a) => { let m = 0; for (let i = 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1])); return m; };
const centroid = (sp) => { let a = 0, b = 0; sp.psd.forEach((v, k) => { a += v * k * sp.df; b += v; }); return a / b; };

describe('picture classification', () => {
  it('swatch test: every legend colour as a flat image → exactly its band (100 %)', () => {
    for (const layer of MAPS) {
      let ok = 0, n = 0, skipped = 0;
      for (const s of layer.ramp) {
        if (Math.max(...s.rgb) < 30) { skipped++; continue; } // the no-data rule (near-black) applies first
        const regs = allRegions(classifyPicture(flat(s.rgb), 64, 48, layer));
        n++; if (regs.every((r) => r.band === s.band && (r.kind || null) === (s.kind || null))) ok++;
      }
      NUM[layer.id] = { swatchColours: n, swatchCorrectPct: +((100 * ok) / n).toFixed(1), skippedNearBlack: skipped };
      expect(ok).toBe(n);
    }
  });

  it('noise test: ±8 random colour noise → still >= 95 % correct', () => {
    const rng = mulberry32(42);
    for (const layer of MAPS) {
      let ok = 0, n = 0;
      for (const s of layer.ramp) {
        if (Math.max(...s.rgb) < 30) continue;
        for (const r of allRegions(classifyPicture(flat(s.rgb, 64, 48, 8, rng), 64, 48, layer))) { n++; if (r.band === s.band && (r.kind || null) === (s.kind || null)) ok++; }
      }
      NUM[layer.id].noiseCorrectPct = +((100 * ok) / n).toFixed(1);
      expect(ok / n).toBeGreaterThanOrEqual(0.95);
    }
  });

  it('black image → silence everywhere (no notes)', () => {
    for (const layer of MAPS) {
      const regs = classifyPicture(flat([0, 0, 0]), 64, 48, layer);
      const sch = buildSchedule(regs, layer);
      expect(sch.notes.length).toBe(0);
      const r = renderPicture(sch);
      expect(peak(r.left, r.right)).toBe(0);
    }
  });
});

describe('schedule', () => {
  it('zig-zag N-M-S, S-M-N, N-M-S; straight N-M-S x3; total = sweep length; slots at 0, 1/3, 2/3', () => {
    const layer = LAYERS.temperature;
    const regs = classifyPicture(flat(layer.ramp[100].rgb), 64, 48, layer);
    const order = (pat) => buildSchedule(regs, layer, { sweep: 16, pattern: pat }).slots.slice(0, 9).map((s) => s.partName[0].toUpperCase()).join('');
    expect(order('zigzag')).toBe('NMSSMNNMS');
    expect(order('straight')).toBe('NMSNMSNMS');
    for (const sweep of [8, 16, 40]) {
      const s = buildSchedule(regs, layer, { sweep });
      expect(s.duration).toBe(sweep);
      expect(s.slots.length).toBe(96);
      expect(s.slots[95].t).toBeCloseTo(sweep - sweep / 32 / 3, 9);
      expect(s.slots[1].t - s.slots[0].t).toBeCloseTo(sweep / 32 / 3, 9);
    }
    NUM.scheduleOrder = { zigzag: order('zigzag'), straight: order('straight') };
  });
});

describe('sample pictures', () => {
  it('render: peak <= 0.92, energy above 3 kHz <= 3 %, notes > 0, no clicks; band shares printed', () => {
    for (const layer of Object.values(LAYERS)) {
      const img = readPNG(`public/${layer.sample}`);
      const regs = layer.id === 'any' ? classifyBrightness(img.data, img.w, img.h) : classifyPicture(img.data, img.w, img.h, layer);
      NUM[layer.id] = NUM[layer.id] || {};
      const sch = buildSchedule(regs, layer);
      const out = renderPicture(sch);
      const sp = spectrum([out.left, out.right]);
      const shares = {};
      for (const r of regs.flat()) { const k = r.band ? (r.kind ? r.kind + ' ' : '') + 'band ' + r.band : 'silent'; shares[k] = (shares[k] || 0) + 1; }
      Object.keys(shares).forEach((k) => (shares[k] = +((100 * shares[k]) / 96).toFixed(1)));
      Object.assign(NUM[layer.id], {
        notes: sch.notes.length, peak: +peak(out.left, out.right).toFixed(3), above3kHzPct: +(100 * bandShare(sp, 3000, 22050)).toFixed(3),
        seconds: out.duration, regionSharesPct: shares, exampleCaption: noteCaption(sch.slots.find((s) => s.band) || sch.slots[0], layer),
        maxSampleStep: +Math.max(maxStep(out.left), maxStep(out.right)).toFixed(4), centroidHz: Math.round(centroid(sp)),
      });
      expect(NUM[layer.id].maxSampleStep).toBeLessThan(0.15); // a click would be a sudden jump
      expect(hasNaN(out.left, out.right)).toBe(false);
      expect(sch.notes.length).toBeGreaterThan(0);
      expect(NUM[layer.id].peak).toBeLessThanOrEqual(0.92);
      expect(NUM[layer.id].above3kHzPct).toBeLessThanOrEqual(3);
    }
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync('tmp/step5_numbers.json', JSON.stringify(NUM, null, 1));
  });
});

describe('any picture (brightness)', () => {
  const any = LAYERS.any;
  it('black → lowest band everywhere, white → highest, see-through → silent; every opaque region sounds', () => {
    const b = classifyBrightness(flat([0, 0, 0]), 64, 48).flat(), w = classifyBrightness(flat([255, 255, 255]), 64, 48).flat();
    expect(b.every((r) => r.band === 1)).toBe(true);
    expect(w.every((r) => r.band === 8)).toBe(true);
    const clear = new Uint8ClampedArray(64 * 48 * 4); // all alpha 0
    expect(classifyBrightness(clear, 64, 48).flat().every((r) => r.band === 0)).toBe(true);
    expect(buildSchedule(classifyBrightness(flat([0, 0, 0]), 64, 48), any).notes.length).toBe(96);
  });
  it('left-dark → right-bright gradient: bands never go down from strip to strip, and span 1..8', () => {
    const W = 320, H = 48, d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = Math.round((255 * x) / (W - 1)), i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    const bands = classifyBrightness(d, W, H).map((row) => row[1].band);
    for (let s = 1; s < bands.length; s++) expect(bands[s]).toBeGreaterThanOrEqual(bands[s - 1]);
    expect(bands[0]).toBe(1); expect(bands[31]).toBe(8);
    NUM.anyGradientBands = bands.join('');
  });
  it('legend fit: each sample map fits its own layer 100 %; a screenshot (not a map) fits Temperature < 85 % → Any picture', () => {
    const fit = {};
    for (const layer of MAPS) { const img = readPNG(`public/${layer.sample}`); fit[layer.id] = +legendFit(img.data, img.w, img.h, layer).toFixed(3); expect(fit[layer.id]).toBeGreaterThanOrEqual(0.99); }
    const shot = readPNG('reports/screens/step6-video-playing.png');
    fit.screenshotAsTemperature = +legendFit(shot.data, shot.w, shot.h, LAYERS.temperature).toFixed(3);
    expect(fit.screenshotAsTemperature).toBeLessThan(0.85);
    NUM.legendFit = fit;
  });
  it('colour names of pure colours', () => {
    const name = (rgb) => colourName(...rgbToLab(...rgb));
    const got = { red: name([220, 30, 30]), green: name([30, 180, 40]), blue: name([30, 60, 220]), yellow: name([240, 220, 40]), grey: name([128, 128, 128]), white: name([250, 250, 250]) };
    NUM.colourNames = got;
    expect(got).toEqual({ red: 'red', green: 'green', blue: 'blue', yellow: 'yellow', grey: 'grey', white: 'white' });
  });
  it('every instrument: starts and ends at silence, no NaN, peak < 1', () => {
    const out = {};
    for (const [k, fn] of Object.entries(INSTRUMENTS)) {
      const y = fn(440);
      let pk = 0; for (const v of y) pk = Math.max(pk, Math.abs(v));
      out[k] = { seconds: +(y.length / 44100).toFixed(2), peak: +pk.toFixed(3), first: +Math.abs(y[0]).toFixed(4), last: +Math.abs(y[y.length - 1]).toFixed(4) };
      expect(Number.isNaN(pk)).toBe(false); expect(pk).toBeLessThan(1);
      expect(Math.abs(y[0])).toBeLessThan(0.01); expect(Math.abs(y[y.length - 1])).toBeLessThan(0.01);
    }
    NUM.instruments = out;
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync('tmp/step10_numbers.json', JSON.stringify(NUM, null, 1));
  });
});
