// check_step1.mjs — Step 1 self-check: sample videos (duration, no audio), pictures (2:1, >=5% non-black),
// CREDITS.md entry count, total size of public/samples.
import fs from 'node:fs';
import path from 'node:path';
import { probe, readPNG } from './lib.mjs';
let ok = true;
const pf = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) ok = false; };
for (const n of ['air-quality', 'weather', 'co2', 'space']) {
  const f = `public/samples/videos/${n}.mp4`; const p = probe(f);
  const v = p.streams.find((s) => s.codec_type === 'video'); const a = p.streams.some((s) => s.codec_type === 'audio');
  const mb = fs.statSync(f).size / 1e6;
  pf(+p.format.duration > 5 && !a && mb <= 12, `${n}.mp4 duration ${(+p.format.duration).toFixed(2)} s, ${v.width}x${v.height} ${v.codec_name}, audio stream: ${a}, ${mb.toFixed(1)} MB`);
}
for (const n of ['temperature', 'precipitation', 'aerosol', 'vegetation']) {
  const { data, w, h } = readPNG(`public/samples/pictures/${n}.png`);
  let nb = 0; for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] >= 128 && Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= 30) nb++;
  pf(w === 2 * h && nb / (w * h) >= 0.05, `${n}.png ${w}x${h}, non-black ${((100 * nb) / (w * h)).toFixed(1)} %`);
}
const credits = (fs.readFileSync('CREDITS.md', 'utf8').match(/^\d\. \*\*/gm) || []).length;
pf(credits === 8, `CREDITS.md entries: ${credits}`);
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
const tot = size('public/samples') / 1e6; pf(tot <= 60, `public/samples total ${tot.toFixed(1)} MB`);
process.exit(ok ? 0 : 1);
