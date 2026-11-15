// parse_colormap.mjs — reads a GIBS colormap v1.3 XML and returns its colour maps (title, units, entries).
// Used by tools/build_layers.mjs and for printing summaries. Node-only.
import fs from 'node:fs';
export function parseColormap(file) {
  const x = fs.readFileSync(file, 'utf8');
  return [...x.matchAll(/<ColorMap([^>]*)>([\s\S]*?)<\/ColorMap>/g)].map((m) => {
    const title = (m[1].match(/title="([^"]*)"/) || [])[1];
    const units = (m[1].match(/units="([^"]*)"/) || [])[1] || '';
    const entries = [...m[2].matchAll(/<ColorMapEntry([^>]*)\/>/g)].map((e) => {
      const a = e[1];
      const rgb = a.match(/rgb="([^"]*)"/)[1].split(',').map(Number);
      const val = (a.match(/ value="([^"]*)"/) || [])[1];
      const label = (a.match(/label="([^"]*)"/) || [])[1];
      const nums = val ? val.replace(/[\[\]()]/g, '').split(',').map((s) => (/INF/.test(s) ? (s.includes('-') ? -Infinity : Infinity) : Number(s))) : null;
      return { rgb, lo: nums ? nums[0] : null, hi: nums ? nums[nums.length - 1] : null, transparent: /transparent="true"/.test(a), nodata: /nodata="true"/.test(a), label };
    });
    return { title, units, entries };
  });
}
if (process.argv[2]) {
  for (const cm of parseColormap(process.argv[2])) {
    const e = cm.entries;
    console.log(`# ${cm.title} [${cm.units}] n=${e.length}`);
    const step = Math.max(1, Math.floor(e.length / 24));
    e.forEach((x, i) => { if (i % step === 0 || i === e.length - 1) console.log(`  ${i}: [${x.lo}, ${x.hi}) rgb ${x.rgb.join(',')}${x.transparent ? ' T' : ''}${x.nodata ? ' ND' : ''}`); });
  }
}
