// features.js — turns video frames into numbers. Pure functions (RGBA arrays in, numbers out), so they run
// in Node tests and in the browser. Each frame is split into 32 vertical strips (left→right); each strip gets one
// number per video type (Air Quality: darkness · Weather: wind colour strength · CO2: haze amount + hot patches).
// Space: finds stars along 720 rays of a radar line turning from the image centre.
// Port of reference_dsp/*.py (the owner's approved recipes).

export const COLS = 32;

// ---------- small helpers ----------
/** numpy-style percentile (linear interpolation). */
export function percentile(arr, p) {
  const a = Float64Array.from(arr).sort();
  if (!a.length) return 0;
  const k = ((a.length - 1) * p) / 100, f = Math.floor(k), c = Math.min(a.length - 1, f + 1);
  return a[f] + (a[c] - a[f]) * (k - f);
}
const clip01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Normalise by the 2nd–98th percentile range and clip to 0..1 (Air Quality, Weather). */
export function normRange(m, lo = 2, hi = 98) {
  const a = percentile(m, lo), b = percentile(m, hi), d = b - a;
  return Float32Array.from(m, (v) => (d > 1e-12 ? clip01((v - a) / d) : 0));
}
/** Normalise by the 98th percentile and clip (CO2). Zero stays zero. */
export function normP98(m) {
  const b = percentile(m, 98);
  return Float32Array.from(m, (v) => (b > 0 ? clip01(v / b) : v));
}

/** HSV of one pixel: h in degrees [0,360), s and v in 0..1 (same formula as reference co2_rule.hsv). */
export function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const s = mx > 0 ? d / Math.max(mx, 1e-9) : 0;
  let h = 0;
  if (d > 1e-9) {
    if (mx === r) h = (((g - b) / d) % 6 + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [h * 60, s, mx];
}

/** Masks: 1 = use pixel. GMAO videos hide the logo (x<0.186,y<0.117) and the date label (x<0.264,y>=0.879). */
export function gmaoMask(w, h) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / w, fy = y / h;
    m[y * w + x] = (fx < 0.186 && fy < 0.117) || (fx < 0.264 && fy >= 0.879) ? 0 : 1;
  }
  return m;
}

/**
 * 3x3 median of one plane. Neighbours outside the image or outside the mask are replaced by the centre
 * value, so masked areas (logo, date) can never leak into the result.
 */
export function maskedMedian3(src, w, h, mask) {
  const out = new Float32Array(w * h), a = new Float32Array(9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, c = src[i];
    let k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      const j = yy * w + xx;
      a[k++] = yy < 0 || yy >= h || xx < 0 || xx >= w || (mask && !mask[j]) ? c : src[j];
    }
    for (let p = 1; p < 9; p++) { const v = a[p]; let q = p - 1; while (q >= 0 && a[q] > v) { a[q + 1] = a[q]; q--; } a[q + 1] = v; }
    out[i] = a[4];
  }
  return out;
}

const stripOf = (x, w) => Math.min(COLS - 1, Math.floor((x * COLS) / w));

// ---------- per-frame strip values (raw, before normalising) ----------

/** Air Quality: v = mean of (1 − grey/255) over valid pixels; grey is 3x3-median filtered. */
export function airQualityStrips(rgba, w, h, mask = gmaoMask(w, h)) {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114;
  const gm = maskedMedian3(g, w, h, mask);
  const sum = new Float64Array(COLS), n = new Float64Array(COLS);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!mask[i]) continue;
    const c = stripOf(x, w); sum[c] += 1 - gm[i] / 255; n[c]++;
  }
  return Float32Array.from(sum, (s, c) => (n[c] ? s / n[c] : 0));
}

/** Weather: per-pixel wind strength from hue (blue 0.17 … red 1); dark = calm (0); grey/white land ignored. */
export function weatherPixel(r, g, b) {
  const [hh, s, v] = hsv(r, g, b);
  let st = clip01(1 - hh / 270);
  if (v < 0.28) st = 0;
  const valid = s >= 0.3 || v < 0.28;
  return [st, valid];
}
export function weatherStrips(rgba, w, h, mask = gmaoMask(w, h)) {
  const [R, G, B] = [0, 1, 2].map((ch) => { const p = new Float32Array(w * h); for (let i = 0; i < w * h; i++) p[i] = rgba[i * 4 + ch]; return maskedMedian3(p, w, h, mask); });
  const sum = new Float64Array(COLS), n = new Float64Array(COLS), tot = new Float64Array(COLS);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const c = stripOf(x, w); tot[c]++;
    if (!mask[i]) continue;
    const [st, valid] = weatherPixel(R[i], G[i], B[i]);
    if (valid) { sum[c] += st; n[c]++; }
  }
  // reference: "0 if <= 50 valid pixels" in a 16x256 strip (4096 px) → same fraction of the strip here
  return Float32Array.from(sum, (s, c) => (n[c] > Math.max(1, (50 * tot[c]) / 4096) ? s / n[c] : 0));
}

/** CO2 per pixel: golden/brown haze = some CO2, orange/red bright patches = high CO2, white/grey/black = none. */
export function co2Pixel(r, g, b) {
  const [h, s, v] = hsv(r, g, b);
  const warm = h <= 60 || h >= 345;
  const haze = warm && s >= 0.35 && v >= 0.12;
  const hot = warm && s >= 0.6 && v >= 0.7 && h <= 32;
  let val = 0;
  if (haze) val = 0.15 + 0.45 * clip01((v - 0.12) / 0.5);
  if (hot) val = 0.65 + 0.35 * clip01(s);
  return [val, hot ? 1 : 0];
}
export function co2Strips(rgba, w, h) {
  const a = new Float64Array(COLS), hot = new Float64Array(COLS), n = new Float64Array(COLS);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; const c = stripOf(x, w);
    const [val, ht] = co2Pixel(rgba[i], rgba[i + 1], rgba[i + 2]);
    a[c] += val; hot[c] += ht; n[c]++;
  }
  return { amount: Float32Array.from(a, (s, c) => s / n[c]), hot: Float32Array.from(hot, (s, c) => s / n[c]) };
}

/**
 * All frames of one video → normalised feature grid.
 * type: 'airQuality' | 'weather' | 'co2'. Returns { N, cols: Float32Array(N*32) [frame-major], hot?: Float32Array, raw }.
 * opts.mask: false to switch off the GMAO logo/date mask (uploads without the logo).
 */
export function videoFeatures(type, frames, w, h, opts = {}) {
  const N = frames.length;
  const mask = opts.mask === false ? new Uint8Array(w * h).fill(1) : gmaoMask(w, h);
  const raw = new Float32Array(N * COLS);
  if (type === 'co2') {
    const hot = new Float32Array(N * COLS);
    frames.forEach((f, i) => { const r = co2Strips(f, w, h); raw.set(r.amount, i * COLS); hot.set(r.hot, i * COLS); });
    return { N, cols: normP98(raw), hot: normP98(hot), raw, rawHot: hot };
  }
  const fn = type === 'weather' ? weatherStrips : airQualityStrips;
  frames.forEach((f, i) => raw.set(fn(f, w, h, mask), i * COLS));
  return { N, cols: normRange(raw), raw };
}

// ---------- Space (stars) ----------

/**
 * Radar scan of a star image. 720 rays from the centre (bin 0 = 12 o'clock, clockwise), 1-px steps up to R.
 * Brightness b = max(R,G,B)/255 after a 3x3 median. A star = local max along the ray over ±2 px with b ≥ 0.5.
 * Keeps the 2 brightest per bin. Returns { bins: [[{r,b,x,px,py}]], stars (unique pixels), longestRun (px) }.
 */
export function detectStars(rgba, w, h, { bins = 720, minB = 0.5, median = true } = {}) {
  let bp = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) bp[i] = Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) / 255;
  if (median) bp = maskedMedian3(bp, w, h, null);
  const R = Math.min(w, h) / 2, cx = w / 2, cy = h / 2, nR = Math.floor(R);
  const out = [], uniq = new Map();
  let longestRun = 0;
  const ray = new Float32Array(nR), rx = new Int32Array(nR), ry = new Int32Array(nR);
  for (let k = 0; k < bins; k++) {
    const a = (k / bins) * 2 * Math.PI, sa = Math.sin(a), ca = Math.cos(a);
    for (let r = 0; r < nR; r++) {
      const x = Math.min(w - 1, Math.max(0, Math.round(cx + r * sa - 0.5))), y = Math.min(h - 1, Math.max(0, Math.round(cy - r * ca - 0.5)));
      rx[r] = x; ry[r] = y; ray[r] = bp[y * w + x];
    }
    const found = [];
    let run = 0;
    for (let r = 0; r < nR; r++) {
      const b = ray[r];
      run = b >= minB ? run + 1 : 0; if (run > longestRun && r > 0.15 * R) longestRun = run;
      if (b < minB) continue;
      let isMax = true;
      for (let d = -2; d <= 2 && isMax; d++) {
        if (!d || r + d < 0 || r + d >= nR) continue;
        if (d < 0 ? ray[r + d] >= b : ray[r + d] > b) isMax = false; // first sample of a plateau wins
      }
      if (isMax) found.push({ r: r / R, b, x: rx[r] / w, px: rx[r], py: ry[r] });
    }
    found.sort((p, q) => q.b - p.b);
    const keep = found.slice(0, 2);
    keep.forEach((s) => uniq.set(s.py * w + s.px, s));
    out.push(keep);
  }
  return { bins: out, stars: [...uniq.values()], longestRun };
}
