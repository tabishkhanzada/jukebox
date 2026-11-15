// node_features.mjs — Node-side feature extraction for the samples (used by tests and the Step 3 report).
// Extracts frames at 4 fps with ffmpeg-static (256 wide), runs src/core/features.js, returns the grids.
import { readFrames, ffmpeg } from './lib.mjs';
import { videoFeatures, detectStars, COLS } from '../src/core/features.js';

export const SAMPLE = { airQuality: 'public/samples/videos/air-quality.mp4', weather: 'public/samples/videos/weather.mp4', co2: 'public/samples/videos/co2.mp4' };
export const SIZE = { airQuality: [256, 128], weather: [256, 128], co2: [256, 144] };

export function sampleFrames(type) {
  const [w, h] = SIZE[type];
  return { frames: readFrames(SAMPLE[type], { vf: `fps=4,scale=${w}:${h}:flags=bilinear`, w, h }), w, h };
}
export function sampleFeatures(type) {
  const { frames, w, h } = sampleFrames(type);
  return { ...videoFeatures(type, frames, w, h), w, h, frames };
}
export function starImage(size = 256) {
  const buf = ffmpeg(['-i', 'public/samples/pictures/space-stars-clean.png', '-vf', `scale=${size}:${size}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
  return new Uint8ClampedArray(buf.buffer, buf.byteOffset, size * size * 4).slice();
}
/** mean over [frames, groups of strips] helper */
export function groupMeans(cols, N, groups) {
  const per = COLS / groups, out = new Array(groups).fill(0);
  for (let i = 0; i < N; i++) for (let c = 0; c < COLS; c++) out[Math.floor(c / per)] += cols[i * COLS + c] / (N * per);
  return out;
}
export function quarterMeans(cols, N) {
  const q = Math.floor(N / 4), out = [];
  for (let k = 0; k < 4; k++) { let s = 0; for (let i = k * q; i < (k + 1) * q; i++) for (let c = 0; c < COLS; c++) s += cols[i * COLS + c]; out.push(s / (q * COLS)); }
  return out;
}
if (process.argv[1].endsWith('node_features.mjs')) {
  const r2 = (a) => [...a].map((v) => +v.toFixed(2));
  for (const t of ['airQuality', 'weather', 'co2']) {
    console.time(t); const f = sampleFeatures(t); console.timeEnd(t);
    console.log(t, 'N', f.N, 'groups8', r2(groupMeans(f.cols, f.N, 8)), 'quarters', r2(quarterMeans(f.cols, f.N)));
    if (t === 'co2') console.log('  silent <0.02 %', (100 * f.cols.filter((v) => v < 0.02).length / f.cols.length).toFixed(1), 'hot quarters', r2(quarterMeans(f.hot, f.N)));
  }
  for (const [s, med] of [[256, true], [256, false], [512, true]]) {
    const st = detectStars(starImage(s), s, s, { median: med });
    console.log(`space ${s}px median=${med}: stars ${st.stars.length}, bins with stars ${st.bins.filter((b) => b.length).length}/720, longest bright run ${st.longestRun}px`);
  }
}
