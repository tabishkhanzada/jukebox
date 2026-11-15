// frames.js — gets pictures (frames) out of a video and cleans them.
// Pure helper (Node + browser): temporal median of many frames (removes NASA's moving radar line from star
// videos). Masks and 3x3 median filters live in features.js.
// Browser helpers: check an uploaded file, open it in a hidden <video>, grab frames every 0.25 s.

export const STEP = 0.25;             // seconds between analysed frames (4 per second)
export const MAX_SECONDS = 300;       // upload limit: 5 minutes
export const MAX_BYTES = 200 * 1024 * 1024; // upload limit: 200 MB

/** Per-pixel median over time of RGBA frames (all same size). Returns a new RGBA array. */
export function temporalMedian(frames, w, h) {
  const n = frames.length;
  const out = new Uint8ClampedArray(w * h * 4);
  const buf = new Uint8Array(n);
  const mid = n >> 1;
  for (let p = 0; p < w * h * 4; p++) {
    if ((p & 3) === 3) { out[p] = 255; continue; }
    for (let k = 0; k < n; k++) {
      // insertion sort while filling
      const v = frames[k][p];
      let j = k - 1;
      while (j >= 0 && buf[j] > v) { buf[j + 1] = buf[j]; j--; }
      buf[j + 1] = v;
    }
    out[p] = n % 2 ? buf[mid] : (buf[mid - 1] + buf[mid] + 1) >> 1;
  }
  return out;
}

// ---------------- browser-only helpers (use DOM; never called in Node tests) ----------------

/** Check an uploaded video file. Returns null if fine, or a friendly error sentence. */
export function checkVideoFile(file) {
  if (!file) return 'Please choose a video file first.';
  const okType = /^video\/(mp4|webm)$/.test(file.type) || /\.(mp4|webm)$/i.test(file.name);
  if (!okType) return 'This file is not a video we can read. Please choose an MP4 or WebM video.';
  if (file.size > MAX_BYTES) return 'This file is too big: maximum 200 MB.';
  return null;
}

/** Load a video URL into a hidden muted <video>. Resolves when metadata is known. */
export function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error('This video could not be opened. Please try an MP4 or WebM file.'));
    v.src = url;
  });
}

function seek(v, t) {
  return new Promise((resolve, reject) => {
    const done = () => { v.removeEventListener('seeked', done); resolve(); };
    v.addEventListener('seeked', done);
    v.onerror = () => reject(new Error('The video stopped loading.'));
    v.currentTime = t;
  });
}

/**
 * Grab frames every STEP seconds, drawn to a w x h canvas. Returns {frames:[Uint8ClampedArray], w, h, duration}.
 * opts: {width=256, height (default keeps aspect), onProgress(0..1), signal (AbortSignal), times (optional list)}
 */
export async function grabFrames(v, opts = {}) {
  const duration = v.duration;
  if (!isFinite(duration) || duration <= 0) throw new Error('This video has no length we can read.');
  if (duration > MAX_SECONDS) throw new Error('This file is too long: maximum 5 minutes.');
  const w = opts.width || 256;
  const h = opts.height || Math.max(2, Math.round((w * v.videoHeight) / v.videoWidth / 2) * 2);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const times = opts.times || (() => { const t = []; for (let i = 0; i * STEP < duration - 0.01; i++) t.push(i * STEP); return t; })();
  const frames = [];
  for (let i = 0; i < times.length; i++) {
    if (opts.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    await seek(v, Math.min(times[i], duration - 0.04));
    ctx.drawImage(v, 0, 0, w, h);
    frames.push(ctx.getImageData(0, 0, w, h).data);
    opts.onProgress?.((i + 1) / times.length);
  }
  return { frames, w, h, duration };
}

/** Square centre crop of a star video, temporal median over `count` frames → clean RGBA image (size x size). */
export async function cleanStarImage(v, { size = 256, count = 40, onProgress, signal } = {}) {
  const d = v.duration;
  const times = Array.from({ length: count }, (_, i) => ((i + 0.5) * d) / count);
  const s = Math.min(v.videoWidth, v.videoHeight);
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const frames = [];
  for (let i = 0; i < times.length; i++) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    await seek(v, times[i]);
    ctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, 0, 0, size, size);
    frames.push(ctx.getImageData(0, 0, size, size).data);
    onProgress?.((i + 1) / times.length);
  }
  return { data: temporalMedian(frames, size, size), w: size, h: size };
}
