// make_pictures.mjs — copies the 4 Worldview snapshots (source/pictures) into public/samples/pictures,
// flattening transparent "no data" onto black (rule: black = no data). Prints coverage and size.
import { readPNG, writePNG } from './lib.mjs';
for (const n of ['temperature', 'precipitation', 'aerosol', 'vegetation']) {
  const { data, w, h } = readPNG(`source/pictures/${n}.png`);
  let valid = 0;
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(data[i * 4 + c] * a);
    data[i * 4 + 3] = 255;
    if (Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= 30) valid++;
  }
  writePNG(`public/samples/pictures/${n}.png`, data, w, h);
  console.log(n, `${w}x${h}`, 'ratio', w / h, 'non-black %', ((100 * valid) / (w * h)).toFixed(1));
}
