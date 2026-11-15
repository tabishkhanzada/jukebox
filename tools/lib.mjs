// lib.mjs — Node-only helpers for build tools and tests (never shipped to the browser).
// Runs ffmpeg-static / ffprobe-static, reads raw RGBA frames from videos, reads and writes PNG files.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
const require = createRequire(import.meta.url);
export const FFMPEG = require('ffmpeg-static');
export const FFPROBE = require('ffprobe-static').path;

export function ffmpeg(args, opts = {}) {
  const r = spawnSync(FFMPEG, ['-v', 'error', ...args], { maxBuffer: 2 ** 31 - 1, ...opts });
  if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr || '').toString());
  return r.stdout;
}

export function probe(file) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height', '-of', 'json', file]);
  if (r.status !== 0) throw new Error('ffprobe failed: ' + r.stderr.toString());
  return JSON.parse(r.stdout.toString());
}

/** Read frames as RGBA arrays. vf = ffmpeg filter (must produce w x h). */
export function readFrames(file, { vf, w, h, maxFrames, ss }) {
  const args = [];
  if (ss != null) args.push('-ss', String(ss));
  args.push('-i', file, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'rgba');
  if (maxFrames) args.push('-frames:v', String(maxFrames));
  args.push('pipe:1');
  const buf = ffmpeg(args);
  const size = w * h * 4, frames = [];
  for (let o = 0; o + size <= buf.length; o += size) frames.push(new Uint8ClampedArray(buf.buffer, buf.byteOffset + o, size).slice());
  return frames;
}

export function readPNG(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  return { data: new Uint8ClampedArray(p.data), w: p.width, h: p.height };
}

export function writePNG(file, data, w, h) {
  const p = new PNG({ width: w, height: h });
  p.data = Buffer.from(data.buffer, data.byteOffset, data.length);
  fs.writeFileSync(file, PNG.sync.write(p));
}

/** Real playing time of a media file: container duration if present, else decode it and read the last time=. */
export function mediaDuration(file) {
  const p = probe(file); const d = parseFloat(p.format.duration);
  if (Number.isFinite(d) && d > 0) return { seconds: d, how: 'container' };
  const r = spawnSync(FFMPEG, ['-v', 'info', '-i', file, '-f', 'null', '-'], { maxBuffer: 2 ** 28 });
  const m = [...r.stderr.toString().matchAll(/time=(\d+):(\d+):([\d.]+)/g)].pop();
  return { seconds: m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : NaN, how: 'decoded' };
}
