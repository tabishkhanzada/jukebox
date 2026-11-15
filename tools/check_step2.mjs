// check_step2.mjs — Step 2 self-check in a real Chromium: screenshots (1440x900, 390x844, reduced motion,
// reduced transparency), text contrast measured on the real rendered panels, tab order, console errors.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { hex, lum, ratio, over } from './contrast.mjs';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = 'reports/screens'; fs.mkdirSync(OUT, { recursive: true });
let ok = true; const pf = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) ok = false; };

// 1) token contrast (text on the lightest possible panel: glass 7% white over the bottom gradient colour)
const bgBottom = hex('#101A3A'), glassOnBottom = over([255, 255, 255], 0.07, bgBottom);
const auroraWorst = over(hex('#4CC9F0'), 0.12, glassOnBottom); // cyan blob shining through (very blurred)
const pairs = [
  ['text on glass', '#EAF0FF', glassOnBottom], ['muted on glass', '#A9B4D6', glassOnBottom],
  ['muted on glass+aurora', '#A9B4D6', auroraWorst], ['text on glass+aurora', '#EAF0FF', auroraWorst],
  ['accent (link/focus) on glass', '#4CC9F0', glassOnBottom], ['on-accent text on accent2 (Generate/Play)', '#0B1020', hex('#FFB703')],
  ['on-accent on accent (mode switch)', '#0B1020', hex('#4CC9F0')], ['error text on error box', '#FFD6D6', over(hex('#FF6B6B'), 0.12, glassOnBottom)],
];
console.log('Token contrast:');
for (const [n, fg, bg] of pairs) { const r = ratio(hex(fg), bg); pf(r >= 4.5, `  ${n}: ${r.toFixed(2)}:1`); }

const browser = await chromium.launch();
async function page(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.reducedMotion || 'no-preference' });
  const p = await ctx.newPage(); const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(e.message));
  if (opts.reducedTransparency) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  }
  await p.goto(URL, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  return { p, ctx, errors };
}

// 2) screenshots
const desk = await page();
await desk.p.screenshot({ path: `${OUT}/step2-desktop-1440.png` });
const mob = await page({ viewport: { width: 390, height: 844 } });
await mob.p.screenshot({ path: `${OUT}/step2-mobile-390.png`, fullPage: true });
const sw = await mob.p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
pf(sw[0] <= sw[1], `mobile no horizontal scroll: scrollWidth ${sw[0]} <= ${sw[1]}`);

// 3) measured contrast on the rendered page: hide text, screenshot, compare each text box with its real background
async function measured(pg, label) {
  const items = await pg.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode; if (!t.textContent.trim()) continue;
      const el = t.parentElement; if (seen.has(el)) continue; seen.add(el);
      if (el.closest('[hidden],.visually-hidden,option,script,style,.skip-link')) continue;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || r.bottom > innerHeight || r.right > innerWidth) continue;
      let op = 1; for (let a = el; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
      const solid = /^rgb\(/.test(cs.backgroundColor) ? cs.backgroundColor : null;
      out.push({ text: t.textContent.trim().slice(0, 30), color: cs.color, solid, x: r.x, y: r.y, w: r.width, h: r.height, op });
    }
    return out;
  });
  await pg.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important} kbd{border-color:transparent!important}' });
  const png = PNG.sync.read(await pg.screenshot());
  let worst = { r: 99 };
  const dpr = 1;
  for (const it of items) {
    const fg = it.color.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3);
    // background = the 90th-percentile-worst pixel (towards the text's luminance) inside the text box,
    // so tiny border/corner pixels do not count but real bright/dark patches behind the text do.
    const lf = lum(fg); const px = [];
    for (let y = Math.floor(it.y * dpr); y < Math.min(png.height, (it.y + it.h) * dpr); y++) for (let x = Math.floor(it.x * dpr); x < Math.min(png.width, (it.x + it.w) * dpr); x++) {
      const i = (y * png.width + x) * 4; const c = [png.data[i], png.data[i + 1], png.data[i + 2]];
      px.push([Math.abs(lum(c) - lf), c]);
    }
    if (!px.length) continue;
    px.sort((a, b) => b[0] - a[0]);
    const best = it.solid ? it.solid.match(/\d+/g).map(Number).slice(0, 3) : px[Math.floor(px.length * 0.9)][1];
    const eff = over(fg, it.op, best); // disabled buttons are drawn at reduced opacity
    const r = ratio(eff, best); it.r = r;
    if (r < worst.r) worst = { ...it, r };
  }
  const below = items.filter((i) => i.r < 4.5);
  console.log(`Measured contrast (${label}): ${items.length} text elements, minimum ${worst.r.toFixed(2)}:1 ("${worst.text}")`);
  below.forEach((b) => console.log(`   below 4.5: "${b.text}" ${b.r.toFixed(2)}:1 op=${b.op}`));
  return { worst, below };
}
const m1 = await measured(desk.p, 'desktop');
const disabledOnly = m1.below.every((b) => b.op < 1);
pf(m1.below.length === 0 || disabledOnly, `rendered text contrast >= 4.5:1 (exceptions are disabled controls only: ${disabledOnly})`);

// 4) tab order
const tp = await page();
const order = [];
for (let i = 0; i < 22; i++) {
  await tp.p.keyboard.press('Tab');
  order.push(await tp.p.evaluate(() => { const a = document.activeElement; const l = a.labels?.[0]?.textContent.trim() || a.getAttribute('aria-label') || a.textContent.trim() || a.id; return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}[${l.slice(0, 28)}]`; }));
}
console.log('Tab order:\n  ' + order.join('\n  '));
const idx = (s) => order.findIndex((o) => o.includes(s));
pf(idx('Skip') === 0 && idx('Video') < idx('video-type') && idx('video-type') < idx('#generate') && idx('#generate') < idx('#mute'), 'tab order: skip link → mode → controls → generate → player');

// 5) reduced motion / transparency
const rm = await page({ reducedMotion: 'reduce' });
const anim = await rm.p.evaluate(() => getComputedStyle(document.querySelector('.aurora')).animationName);
await rm.p.screenshot({ path: `${OUT}/step2-reduced-motion.png` });
pf(anim === 'none', `prefers-reduced-motion: aurora animation-name = ${anim}`);
const rt = await page({ reducedTransparency: true });
const bf = await rt.p.evaluate(() => { const s = getComputedStyle(document.querySelector('.glass')); return [s.backdropFilter, s.backgroundColor]; });
await rt.p.screenshot({ path: `${OUT}/step2-reduced-transparency.png` });
pf(bf[0] === 'none' && bf[1].includes('0.96'), `prefers-reduced-transparency: backdrop-filter=${bf[0]}, background=${bf[1]}`);
const m2 = await measured(rt.p, 'reduced transparency');

// 6) console errors
const errs = [desk, mob, tp, rm, rt].flatMap((x) => x.errors);
pf(errs.length === 0, `console errors: ${errs.length} ${errs.join(' | ')}`);
await browser.close();
process.exit(ok ? 0 : 1);
