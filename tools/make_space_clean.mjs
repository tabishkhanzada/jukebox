// make_space_clean.mjs — builds public/samples/pictures/space-stars-clean.png from the Space video.
// Takes 40 frames evenly across the video (square centre crop, 1024x1024), per-pixel temporal median
// (removes NASA's rotating white line), then measures "line-ness" of a raw frame vs the clean image.
import { readFrames, writePNG, probe } from './lib.mjs';
import { temporalMedian } from '../src/core/frames.js';

const SRC = 'source/videos/Caldwell73_2K_Final.webm';
const OUT = 'public/samples/pictures/space-stars-clean.png';
const S = 1024, N = 40;

const dur = +probe(SRC).format.duration;
const vf = `fps=${N}/${dur},crop='min(iw,ih)':'min(iw,ih)',scale=${S}:${S}`;
const frames = readFrames(SRC, { vf, w: S, h: S, maxFrames: N });
console.log('frames read', frames.length);
const clean = temporalMedian(frames, S, S);
writePNG(OUT, clean, S, S);

/** Line metrics: for 720 rays from the centre, mean brightness over r = 0.2R..R and longest run of b >= 0.5. */
export function lineMetrics(img, w, h) {
  const R = Math.min(w, h) / 2, cx = w / 2, cy = h / 2;
  let maxMean = 0, means = [], maxRun = 0;
  for (let k = 0; k < 720; k++) {
    const a = (k / 720) * 2 * Math.PI;
    let sum = 0, n = 0, run = 0;
    for (let r = 0; r < R; r++) {
      const x = Math.round(cx + r * Math.sin(a)), y = Math.round(cy - r * Math.cos(a));
      if (x < 0 || y < 0 || x >= w || y >= h) break;
      const i = (y * w + x) * 4;
      const b = Math.max(img[i], img[i + 1], img[i + 2]) / 255;
      if (r > 0.2 * R) { sum += b; n++; if (b >= 0.5) { run++; if (run > maxRun) maxRun = run; } else run = 0; }
    }
    means.push(sum / n);
  }
  const sorted = [...means].sort((a, b) => a - b);
  maxMean = sorted[sorted.length - 1];
  const med = sorted[360];
  // guide metric: variance of column-mean brightness
  const colMean = new Float64Array(w);
  for (let x = 0; x < w; x++) { let s = 0; for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; s += Math.max(img[i], img[i + 1], img[i + 2]) / 255; } colMean[x] = s / h; }
  const m = colMean.reduce((a, b) => a + b, 0) / w;
  const colVar = colMean.reduce((a, b) => a + (b - m) ** 2, 0) / w;
  return { rayMaxOverMedian: +(maxMean / med).toFixed(2), longestBrightRunPx: maxRun, colMeanVariance: +colVar.toExponential(3) };
}

const raw = frames[Math.floor(N / 4)];
console.log('RAW frame  ', JSON.stringify(lineMetrics(raw, S, S)));
console.log('CLEAN image', JSON.stringify(lineMetrics(clean, S, S)));
