// classify.js — reads a map picture and decides which legend band each region belongs to.
// For each of 32 strips × 3 sub-regions (north / middle / south) it looks at every 2nd pixel, skips no-data
// (transparent or near-black), converts the colour to CIELAB, finds the nearest legend colour (ΔE76),
// and takes the most frequent band (mode). Too few valid pixels (< 15 %) = silence. Pure functions.
// classifyBrightness() is the "Any picture" variant: band = average brightness, so every picture makes sound.
// legendFit() tells whether an uploaded picture really is a snapshot of the layer (else: Any picture).

/** sRGB 0..255 → CIELAB (D65). */
export function rgbToLab(r, g, b) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Prepare a fast lookup for a layer's ramp: ramp = [{rgb:[r,g,b], band, kind}] (kind: 'rain'/'snow'/undefined).
 * Returns classifyPixel(r,g,b) → index into ramp, or -1 (ΔE > maxDE). Results are cached per colour.
 */
export function makePixelClassifier(ramp, maxDE = 25) {
  const labs = ramp.map((s) => rgbToLab(...s.rgb));
  const cache = new Map();
  return function (r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let v = cache.get(key);
    if (v !== undefined) return v;
    const [L, A, B] = rgbToLab(r, g, b);
    let best = -1, bd = Infinity;
    for (let i = 0; i < labs.length; i++) {
      const d = (L - labs[i][0]) ** 2 + (A - labs[i][1]) ** 2 + (B - labs[i][2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    v = Math.sqrt(bd) > maxDE ? -1 : best;
    cache.set(key, v);
    return v;
  };
}

export const STRIPS = 32;
export const PARTS = ['north', 'middle', 'south'];

/**
 * Classify a whole picture. rgba: Uint8ClampedArray, w, h. layer: {ramp}. crop: {left,top,right,bottom} in %.
 * Returns regions[strip][part] = {band (1..n) or 0 = silence, kind ('rain'/'snow'/null), validFrac, counts}.
 */
export function classifyPicture(rgba, w, h, layer, { crop = null, step = 2, minValid = 0.15, maxDE = 25 } = {}) {
  const cls = makePixelClassifier(layer.ramp, maxDE);
  const x0 = Math.round(((crop?.left || 0) / 100) * w), x1 = Math.round(w - ((crop?.right || 0) / 100) * w);
  const y0 = Math.round(((crop?.top || 0) / 100) * h), y1 = Math.round(h - ((crop?.bottom || 0) / 100) * h);
  const cw = x1 - x0, ch = y1 - y0;
  const regions = [];
  for (let s = 0; s < STRIPS; s++) {
    const sx0 = x0 + Math.floor((s * cw) / STRIPS), sx1 = x0 + Math.floor(((s + 1) * cw) / STRIPS);
    const row = [];
    for (let p = 0; p < 3; p++) {
      const py0 = y0 + Math.floor((p * ch) / 3), py1 = y0 + Math.floor(((p + 1) * ch) / 3);
      const counts = new Map(); let total = 0, valid = 0;
      for (let y = py0; y < py1; y += step) for (let x = sx0; x < sx1; x += step) {
        total++;
        const i = (y * w + x) * 4;
        const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
        if (rgba[i + 3] < 128 || Math.max(r, g, b) < 30) continue; // no data
        const k = cls(r, g, b);
        if (k < 0) continue; // colour not on the legend
        const smp = layer.ramp[k], key = (smp.kind ? smp.kind + ':' : '') + smp.band;
        counts.set(key, (counts.get(key) || 0) + 1); valid++;
      }
      const validFrac = total ? valid / total : 0;
      let band = 0, kind = null;
      if (validFrac >= minValid) {
        let bestN = -1;
        for (const [key, n] of counts) if (n > bestN) { bestN = n; const parts = key.split(':'); band = +parts[parts.length - 1]; kind = parts.length > 1 ? parts[0] : null; }
      }
      row.push({ band, kind, validFrac, counts: Object.fromEntries(counts) });
    }
    regions.push(row);
  }
  return regions;
}

/** Rough colour name of an average CIELAB colour (used in captions for "Any picture"). */
export function colourName(L, A, B) {
  const C = Math.hypot(A, B);
  if (C < 12) return L < 20 ? 'black' : L > 85 ? 'white' : 'grey';
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  if (h < 20 || h >= 345) return 'pink';
  if (h < 50) return L < 45 ? 'brown' : 'red';
  if (h < 75) return L < 45 ? 'brown' : 'orange';
  if (h < 105) return 'yellow';
  if (h < 170) return 'green';
  if (h < 230) return 'cyan';
  if (h < 315) return 'blue';
  return 'purple';
}

/**
 * "Any picture": every region gets a band from its average brightness (CIELAB L*, 8 bands of 12.5), so any photo
 * or drawing makes sound. Only see-through regions (< 15 % opaque pixels) are silent. Same output shape as
 * classifyPicture, plus L (mean lightness) and colour (name of the average colour) per region.
 */
export function classifyBrightness(rgba, w, h, { crop = null, step = 2, minValid = 0.15 } = {}) {
  const x0 = Math.round(((crop?.left || 0) / 100) * w), x1 = Math.round(w - ((crop?.right || 0) / 100) * w);
  const y0 = Math.round(((crop?.top || 0) / 100) * h), y1 = Math.round(h - ((crop?.bottom || 0) / 100) * h);
  const cw = x1 - x0, ch = y1 - y0, cache = new Map();
  const lab = (r, g, b) => { const k = (r << 16) | (g << 8) | b; let v = cache.get(k); if (!v) { v = rgbToLab(r, g, b); cache.set(k, v); } return v; };
  const regions = [];
  for (let s = 0; s < STRIPS; s++) {
    const sx0 = x0 + Math.floor((s * cw) / STRIPS), sx1 = x0 + Math.floor(((s + 1) * cw) / STRIPS);
    const row = [];
    for (let p = 0; p < 3; p++) {
      const py0 = y0 + Math.floor((p * ch) / 3), py1 = y0 + Math.floor(((p + 1) * ch) / 3);
      let total = 0, valid = 0, sL = 0, sA = 0, sB = 0;
      for (let y = py0; y < py1; y += step) for (let x = sx0; x < sx1; x += step) {
        total++;
        const i = (y * w + x) * 4;
        if (rgba[i + 3] < 128) continue;
        const [L, A, B] = lab(rgba[i], rgba[i + 1], rgba[i + 2]);
        sL += L; sA += A; sB += B; valid++;
      }
      const validFrac = total ? valid / total : 0;
      if (validFrac < minValid || !valid) { row.push({ band: 0, kind: null, validFrac, L: null, colour: null, counts: {} }); continue; }
      const L = sL / valid, band = Math.min(8, Math.floor(L / 12.5) + 1);
      row.push({ band, kind: null, validFrac, L, colour: colourName(L, sA / valid, sB / valid), counts: { [band]: valid } });
    }
    regions.push(row);
  }
  return regions;
}

/**
 * How well a picture fits a layer's legend: share of its coloured pixels (not see-through, not near-black) whose
 * colour is within ΔE 8 of a legend colour. Real map snapshots score high; photos and other pictures score low.
 */
export function legendFit(rgba, w, h, layer, { step = 4, maxDE = 8 } = {}) {
  const cls = makePixelClassifier(layer.ramp, maxDE);
  let n = 0, ok = 0;
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const i = (y * w + x) * 4, r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    if (rgba[i + 3] < 128 || Math.max(r, g, b) < 30) continue;
    n++; if (cls(r, g, b) >= 0) ok++;
  }
  return n ? ok / n : 0;
}
