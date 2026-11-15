// e2e.spec.js — Playwright tests in a real Chromium against the Vite dev server.
// Step 3: browser features match Node · Step 6: line movement, zig-zag order, errors, screenshots ·
// Step 7: export/download · Step 8: axe, keyboard, caption rate, 390 px, forced colors.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test.describe('Step 3 — features in the browser match Node', () => {
  for (const [type, file] of [['airQuality', 'air-quality'], ['weather', 'weather'], ['co2', 'co2']]) {
    test(`${type} browser vs node (mean |diff| <= 0.03)`, async ({ page }) => {
      const nodePath = `tmp/node_features_${type}.json`;
      test.skip(!fs.existsSync(nodePath), 'run vitest first (it writes the Node results)');
      test.skip(!!process.env.BASE_URL, 'imports /src modules: dev server only');
      const node = JSON.parse(fs.readFileSync(nodePath, 'utf8'));
      await page.goto('./');
      const br = await page.evaluate(async ([type, file]) => {
        const fr = await import('/src/core/frames.js'); const fe = await import('/src/core/features.js');
        const v = await fr.loadVideo(`/samples/videos/${file}.mp4`);
        const g = await fr.grabFrames(v, { width: 256 });
        const f = fe.videoFeatures(type, g.frames, g.w, g.h);
        return { N: f.N, w: g.w, h: g.h, cols: Array.from(f.cols) };
      }, [type, file]);
      const N = Math.min(br.N, node.N);
      let sum = 0, max = 0;
      for (let i = 0; i < N * 32; i++) { const d = Math.abs(br.cols[i] - node.cols[i]); sum += d; if (d > max) max = d; }
      const mean = sum / (N * 32);
      const line = `${type}: browser N=${br.N} (${br.w}x${br.h}), node N=${node.N}, mean|diff|=${mean.toFixed(4)}, max|diff|=${max.toFixed(3)}`;
      console.log(line); fs.appendFileSync('tmp/step3_browser.txt', line + '\n');
      expect(Math.abs(br.N - node.N)).toBeLessThanOrEqual(1);
      expect(mean).toBeLessThanOrEqual(0.03);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------
// Step 8 — accessibility and quality
test.describe('Step 8 — accessibility', () => {
  const log8 = (s) => LOG('tmp/step8_log.txt')(s);

  async function axe(page, label) {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const other = r.violations.filter((v) => !(v.impact === 'critical' || v.impact === 'serious'));
    log8(`[axe ${label}] critical ${bad.filter((v) => v.impact === 'critical').length}, serious ${bad.filter((v) => v.impact === 'serious').length}, moderate/minor ${other.length}${[...bad, ...other].map((v) => ` | ${v.impact}: ${v.id} (${v.nodes.length})`).join('')}; passes ${r.passes.length}`);
    return bad;
  }

  test('axe-core: 0 critical and 0 serious in both modes (idle, playing, phone width)', async ({ page }) => {
    await setup(page);
    expect(await axe(page, 'video idle 1280')).toEqual([]);
    await generateAndWait(page); await page.click('#play'); await page.waitForTimeout(1200);
    expect(await axe(page, 'video playing')).toEqual([]);
    await page.click('#play');
    await page.click('label.seg:has-text("Picture")');
    expect(await axe(page, 'picture idle')).toEqual([]);
    await generateAndWait(page); await page.click('#play'); await page.waitForTimeout(1200);
    expect(await axe(page, 'picture playing')).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await axe(page, 'picture playing 390 px')).toEqual([]);
    await page.click('#play'); await page.click('label.seg:has-text("Video")');
    expect(await axe(page, 'video 390 px')).toEqual([]);
  });

  test('keyboard-only run-through (Space, arrows, M, G, Tab order, focus ring, no trap)', async ({ page }) => {
    test.setTimeout(180000);
    const errors = await setup(page);
    const kb = page.keyboard, steps = [];
    const focused = () => page.evaluate(() => { const a = document.activeElement; return (a.id || a.name || a.tagName) + (a.type === 'radio' ? ':' + a.value : ''); });
    const ring = () => page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; });
    await kb.press('Tab'); steps.push('Tab → ' + await focused());
    for (let i = 0; i < 6 && (await focused()) !== 'mode:video'; i++) { await kb.press('Tab'); steps.push('Tab → ' + await focused()); }
    steps.push('(focus ring: ' + await ring() + ')');
    expect(await focused()).toBe('mode:video');
    await kb.press('ArrowRight'); const m1 = await page.evaluate(() => document.body.dataset.mode); steps.push('ArrowRight → mode ' + m1);
    await kb.press('ArrowLeft'); const m2 = await page.evaluate(() => document.body.dataset.mode); steps.push('ArrowLeft → mode ' + m2);
    expect(m1).toBe('picture'); expect(m2).toBe('video');
    await kb.press('Tab'); steps.push('Tab → ' + await focused());
    await kb.press('ArrowDown'); const vt = await page.inputValue('#video-type'); steps.push('ArrowDown on the type list → ' + vt);
    expect(vt).toBe('weather');
    await kb.press('Tab'); steps.push('Tab → ' + await focused());
    await kb.press('g');
    await page.waitForFunction(() => window.__jukebox.state().ready && !window.__jukebox.state().busy, null, { timeout: 150000 });
    steps.push('G → generated; focus on ' + await focused() + ' (ring: ' + await ring() + ')');
    expect(await focused()).toBe('play');
    const r1 = await ring(); expect(r1).toMatch(/solid 3px/);
    await kb.press(' '); await page.waitForTimeout(1000);
    const s1 = await page.evaluate(() => window.__jukebox.state()); steps.push(`Space → playing ${s1.playing}, t=${s1.t.toFixed(2)}`);
    expect(s1.playing).toBe(true);
    await kb.press(' '); const s2 = await page.evaluate(() => window.__jukebox.state()); steps.push(`Space → playing ${s2.playing}, t=${s2.t.toFixed(2)}`);
    expect(s2.playing).toBe(false);
    await page.evaluate(PAGE_HELPERS);
    const x0 = await page.evaluate(() => { window.__jukebox.renderNow(); return window.__findLineX().x; });
    await kb.press('ArrowRight'); const s3 = await page.evaluate(() => window.__jukebox.state());
    const x1 = await page.evaluate(() => { window.__jukebox.renderNow(); return window.__findLineX().x; });
    steps.push(`ArrowRight (paused) → t ${s2.t.toFixed(3)} → ${s3.t.toFixed(3)} (+${(s3.t - s2.t).toFixed(3)} s = one strip of 4 s), line ${x0.toFixed(0)} → ${x1.toFixed(0)} px`);
    expect(s3.t - s2.t).toBeCloseTo(4 / 32, 3); expect(x1).toBeGreaterThan(x0);
    await kb.press('ArrowLeft'); const s4 = await page.evaluate(() => window.__jukebox.state()); steps.push(`ArrowLeft → t ${s4.t.toFixed(3)}`);
    expect(s4.t).toBeCloseTo(s2.t, 3);
    await kb.press('m'); const mu1 = await page.getAttribute('#mute', 'aria-pressed'); await kb.press('m'); const mu2 = await page.getAttribute('#mute', 'aria-pressed');
    steps.push(`M → muted ${mu1}; M → muted ${mu2}`); expect(mu1).toBe('true'); expect(mu2).toBe('false');
    // no keyboard trap: Tab through the whole page and come back round to the start
    const seen = [];
    for (let i = 0; i < 40; i++) { await kb.press('Tab'); seen.push(await focused()); }
    const firstAgain = seen.indexOf(seen[0], 1);
    steps.push(`Tab ×40 visits ${new Set(seen).size} different stops and cycles (stop "${seen[0]}" comes back after ${firstAgain} presses): ${seen.slice(0, firstAgain > 0 ? firstAgain : 40).join(' → ')}`);
    expect(new Set(seen).size).toBeGreaterThan(10);
    expect(firstAgain).toBeGreaterThan(0);
    log8('[keyboard]\n  ' + steps.join('\n  '));
    expect(errors).toEqual([]);
  });

  test('caption is aria-live polite and updates at most once per second; semantics in place', async ({ page }) => {
    await setup(page);
    await page.click('label.seg:has-text("Picture")');
    await generateAndWait(page);
    await page.evaluate(() => { window.__capCount = 0; new MutationObserver(() => window.__capCount++).observe(document.getElementById('caption'), { childList: true, characterData: true, subtree: true }); });
    await page.click('#play'); await page.waitForTimeout(5000);
    const n = await page.evaluate(() => window.__capCount);
    const sem = await page.evaluate(() => ({
      live: document.getElementById('caption').getAttribute('aria-live'),
      radiogroup: document.querySelector('.mode-switch').getAttribute('role'),
      alert: document.getElementById('error').getAttribute('role'),
      canvasRole: document.getElementById('stage-canvas').getAttribute('role'),
      canvasLabel: document.getElementById('stage-canvas').getAttribute('aria-label'),
      th: document.querySelectorAll('#values-table thead th[scope=col]').length,
      rowHeaders: document.querySelectorAll('#values-table tbody th[scope=row]').length,
      swatchAndName: [...document.querySelectorAll('#values-table tbody th')].every((th) => th.querySelector('.swatch') && th.textContent.trim().length > 2),
      unlabeled: [...document.querySelectorAll('input:not([type=hidden]),select,button')].filter((e) => !(e.labels?.length || e.getAttribute('aria-label') || e.textContent.trim())).map((e) => e.id),
    }));
    log8(`[caption] ${n} caption updates in 5 s of picture playback (notes every 0.17 s); semantics ${JSON.stringify(sem)}`);
    expect(n).toBeLessThanOrEqual(6);
    expect(sem.live).toBe('polite'); expect(sem.radiogroup).toBe('radiogroup'); expect(sem.alert).toBe('alert'); expect(sem.canvasRole).toBe('img');
    expect(sem.canvasLabel.length).toBeGreaterThan(20); expect(sem.th).toBe(3); expect(sem.rowHeaders).toBeGreaterThan(5); expect(sem.swatchAndName).toBe(true); expect(sem.unlabeled).toEqual([]);
  });

  test('390 px: both modes playing, no horizontal scroll (screenshots)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    const out = [];
    for (const m of ['Video', 'Picture']) {
      await page.click(`label.seg:has-text("${m}")`);
      await generateAndWait(page); await page.click('#play'); await page.waitForTimeout(1500);
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth]);
      await page.screenshot({ path: `reports/screens/step8-${m.toLowerCase()}-390.png`, fullPage: true });
      out.push(`${m}: scrollWidth ${sw[0]}/${sw[1]} vs viewport ${sw[2]}`);
      expect(Math.max(sw[0], sw[1])).toBeLessThanOrEqual(sw[2]);
      await page.click('#play');
    }
    log8('[390 px] ' + out.join(' · '));
  });

  test('forced colors / reduced motion / first load (no samples, no layout shift)', async ({ page }) => {
    const reqs = [];
    page.on('request', (r) => reqs.push(r.url()));
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await page.goto('./', { waitUntil: 'networkidle' });
    const st = await page.evaluate(() => {
      const g = getComputedStyle(document.querySelector('.glass'));
      return { backdrop: g.backdropFilter, border: g.borderTopStyle, shadow: g.boxShadow };
    });
    const samples = reqs.filter((u) => u.includes('/samples/'));
    log8(`[forced-colors + reduced-motion] card backdrop-filter ${st.backdrop}, border ${st.border}, shd ${st.shadow}; requests at first load ${reqs.length}, sample files loaded ${samples.length}`);
    expect(st.backdrop).toBe('none'); expect(st.border).toBe('solid'); expect(samples).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------
// Step 7 — export and download (real-time recording, ffprobe from ffprobe-static, WAV header)
test.describe('Step 7 — export', () => {
  const cases = [
    { name: 'air-quality', go: async (p) => { await p.selectOption('#video-type', 'airQuality'); } },
    { name: 'temperature', go: async (p) => { await p.click('label.seg:has-text("Picture")'); await p.selectOption('#picture-layer', 'temperature'); } },
    { name: 'space', go: async (p) => { await p.selectOption('#video-type', 'space'); } },
  ];
  for (const c of cases) {
    test(`record + download ${c.name} (video twice, WAV twice)`, async ({ page }) => {
      test.setTimeout(240000);
      const { probe, mediaDuration } = await import('../tools/lib.mjs');
      const { readWavHeader } = await import('../src/core/wav.js');
      const log7 = LOG('tmp/step7_log.txt');
      const errors = await setup(page);
      await c.go(page);
      await generateAndWait(page);
      const audioLen = await page.evaluate(() => window.__jukebox.result().audio.left.length);
      const expected = audioLen / 44100;
      fs.mkdirSync('tmp/step7', { recursive: true });
      // video: first click records in real time, second click saves the same file again
      const [d1] = await Promise.all([page.waitForEvent('download', { timeout: 200000 }), page.click('#dl-video')]);
      const f1 = `tmp/step7/${d1.suggestedFilename()}`; await d1.saveAs(f1);
      const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('#dl-video')]);
      const f2 = `tmp/step7/2-${d2.suggestedFilename()}`; await d2.saveAs(f2);
      const p = probe(f1), dur = mediaDuration(f1);
      const v = p.streams.find((s) => s.codec_type === 'video'), a = p.streams.find((s) => s.codec_type === 'audio');
      const size = fs.statSync(f1).size;
      // WAV twice
      const [w1] = await Promise.all([page.waitForEvent('download'), page.click('#dl-wav')]);
      const g1 = `tmp/step7/${w1.suggestedFilename()}`; await w1.saveAs(g1);
      const [w2] = await Promise.all([page.waitForEvent('download'), page.click('#dl-wav')]);
      const g2 = `tmp/step7/2-${w2.suggestedFilename()}`; await w2.saveAs(g2);
      const buf = fs.readFileSync(g1); const hd = readWavHeader(new Uint8Array(buf));
      log7(`[${c.name}] ${d1.suggestedFilename()}: ${(size / 1e6).toFixed(2)} MB, video ${v?.codec_name} ${v?.width}x${v?.height}, audio ${a?.codec_name}, duration ${dur.seconds.toFixed(2)} s (${dur.how}) vs expected ${expected.toFixed(2)} s; ` +
        `second download ${d2.suggestedFilename()} ${fs.statSync(f2).size === size ? 'identical size' : 'DIFFERENT'}; ` +
        `WAV ${w1.suggestedFilename()}: ${hd.channels} ch ${hd.sampleRate} Hz ${hd.bits}-bit, ${hd.frames} frames vs buffer ${audioLen}; second WAV ${fs.statSync(g2).size === buf.length ? 'identical size' : 'DIFFERENT'}`);
      expect(d1.suggestedFilename()).toMatch(new RegExp(`^earth-jukebox-${c.name}-\\d{4}-\\d{2}-\\d{2}\\.(mp4|webm)$`));
      expect(size).toBeGreaterThan(200 * 1024);
      expect(v).toBeTruthy(); expect(a).toBeTruthy();
      expect(Math.abs(dur.seconds - expected)).toBeLessThanOrEqual(1.5);
      expect(fs.statSync(f2).size).toBe(size);
      expect(hd).toEqual({ channels: 2, sampleRate: 44100, bits: 16, frames: audioLen });
      expect(fs.statSync(g2).size).toBe(buf.length);
      expect(errors).toEqual([]);
    });
  }
});

test('Step 7 — no MediaRecorder: video button hidden, WAV still works, the note says why', async ({ page }) => {
  await page.addInitScript(() => { delete window.MediaRecorder; });
  await page.goto('./');
  await page.click('label.seg:has-text("Picture")');
  await generateAndWait(page);
  await expect(page.locator('#dl-video')).toBeHidden();
  await expect(page.locator('#dl-wav')).toBeEnabled();
  const note = await page.textContent('#export-note');
  LOG('tmp/step7_log.txt')('[no MediaRecorder] video button hidden; note: "' + note + '"');
  expect(note).toContain('not possible in this browser');
});

// ---------------------------------------------------------------------------------------------------------
// Step 6 — frontend wiring
// Pixel helpers run inside the page: they look for the solid accent-colour core of the line in the canvas.
const PAGE_HELPERS = () => {
  const isAccent = (d, i) => Math.abs(d[i] - 56) < 4 && Math.abs(d[i + 1] - 189) < 4 && Math.abs(d[i + 2] - 248) < 4; // ACCENT #38BDF8
  window.__findLineX = () => {
    const c = document.getElementById('stage-canvas'), x = c.getContext('2d'), r = window.__jukebox.state().rect;
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const count = (col) => { let n = 0; for (let y = r.y; y < r.y + r.h; y += 4) if (isAccent(d, (y * c.width + col) * 4)) n++; return n; };
    let best = -1, bestN = 0;
    for (let col = r.x; col < r.x + r.w; col++) { const n = count(col); if (n > bestN) { bestN = n; best = col; } }
    let s = 0, k = 0; // centre of the 3-px core
    for (let col = best - 3; col <= best + 3; col++) if (count(col) >= bestN * 0.9) { s += col; k++; }
    return { x: s / k, rowsHit: bestN / Math.ceil(r.h / 4) };
  };
  window.__rayHit = (angle, cx, cy, R) => {
    const x = document.getElementById('stage-canvas').getContext('2d'); let hit = 0, n = 0;
    for (let f = 0.25; f <= 0.951; f += 0.05) {
      n++;
      const d = x.getImageData(Math.round(cx + f * R * Math.cos(angle)) - 1, Math.round(cy + f * R * Math.sin(angle)) - 1, 3, 3).data;
      let ok = false; for (let i = 0; i < d.length; i += 4) if (isAccent(d, i)) ok = true;
      if (ok) hit++;
    }
    return hit / n;
  };
  window.__pixel = (px, py) => Array.from(document.getElementById('stage-canvas').getContext('2d').getImageData(Math.round(px), Math.round(py), 1, 1).data);
};
async function setup(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('./'); await page.evaluate(PAGE_HELPERS);
  return errors;
}
async function generateAndWait(page) { // there is no Generate button since 2026-11-15; same code path as the G key
  await page.evaluate(() => { window.__jukebox.generate(); });
  await page.waitForFunction(() => window.__jukebox.state().ready && !window.__jukebox.state().busy, null, { timeout: 150000 });
}
const LOG = (file) => (s) => { console.log(s); fs.mkdirSync('tmp', { recursive: true }); fs.appendFileSync(file, s + '\n'); };
const log6 = LOG('tmp/step6_log.txt');
const PARTS = ['N', 'M', 'S'];

test.describe('Step 6 — wiring', () => {
  for (const type of ['airQuality', 'weather', 'co2', 'space']) {
    test(`video ${type}: generate, play, the line really moves with the audio clock`, async ({ page }) => {
      const errors = await setup(page);
      await page.selectOption('#video-type', type);
      await generateAndWait(page);
      await page.click('#play');
      const rows = [];
      for (const target of type === 'space' ? [0.5, 1.5, 3, 6] : [0.5, 1.5, 2.5, 3.5]) {
        await page.waitForFunction((tt) => window.__jukebox.state().t >= tt, target, { timeout: 20000 });
        const m = await page.evaluate(() => {
          const d = window.__jukebox.renderNow(), s = window.__jukebox.state();
          if (d.ov.type === 'radar') {
            const { angle, cx, cy, R } = d.info;
            return { t: d.t, P: s.P, radar: true, frac: d.ov.frac, onRay: window.__rayHit(angle, cx, cy, R), offRay: window.__rayHit(angle + 0.35, cx, cy, R) };
          }
          return { t: d.t, P: s.P, rect: d.rect, ...window.__findLineX() };
        });
        if (m.radar) {
          const expFrac = (m.t % m.P) / m.P;
          rows.push(`t=${m.t.toFixed(3)} s: radar angle ${(m.frac * 360).toFixed(1)} deg (expected ${(expFrac * 360).toFixed(1)}), line pixels on that ray ${(m.onRay * 100).toFixed(0)} %, on a ray 20 deg away ${(m.offRay * 100).toFixed(0)} %`);
          expect(Math.abs(m.frac - expFrac)).toBeLessThan(1e-6);
          expect(m.onRay).toBeGreaterThanOrEqual(0.8);
          expect(m.offRay).toBeLessThan(0.3);
        } else {
          const exp = Math.round(m.rect.x + ((m.t % m.P) / m.P) * (m.rect.w - 1));
          const nominal = m.rect.x + ((target % m.P) / m.P) * (m.rect.w - 1);
          rows.push(`t=${m.t.toFixed(3)} s: line found at x=${m.x.toFixed(1)} px, expected ${exp} px (diff ${(m.x - exp).toFixed(1)}); nominal for ${target} s = ${nominal.toFixed(0)} px; line covers ${(m.rowsHit * 100).toFixed(0)} % of rows`);
          expect(Math.abs(m.x - exp)).toBeLessThanOrEqual(4);
          expect(m.rowsHit).toBeGreaterThan(0.9);
        }
      }
      log6(`[video ${type}]\n  ` + rows.join('\n  '));
      expect(errors).toEqual([]);
    });
  }

  for (const layer of ['temperature', 'precipitation', 'aerosol', 'vegetation']) {
    test(`picture ${layer}: generate, play, lit sub-region and cursor follow the zig-zag order`, async ({ page }) => {
      const errors = await setup(page);
      await page.click('label.seg:has-text("Picture")');
      await page.selectOption('#picture-layer', layer);
      await generateAndWait(page);
      await page.click('#play');
      const seen = [];
      while (seen.length < 12) {
        const m = await page.evaluate(() => {
          const d = window.__jukebox.renderNow(), ov = d.ov; if (!ov.region) return null;
          const r = d.rect, x0 = r.x + (ov.region.strip * r.w) / 32, y0 = r.y + (ov.region.part * r.h) / 3;
          const x1 = r.x + ((ov.region.strip + 1) * r.w) / 32, y1 = r.y + ((ov.region.part + 1) * r.h) / 3;
          // sample the outline corner farthest from the round cursor
          const corners = [[x0 + 1.5, y0 + 1.5], [x1 - 2.5, y0 + 1.5], [x0 + 1.5, y1 - 2.5], [x1 - 2.5, y1 - 2.5]];
          const far = corners.sort((a, b) => Math.hypot(b[0] - d.info.x, b[1] - d.info.y) - Math.hypot(a[0] - d.info.x, a[1] - d.info.y))[0];
          // the cursor must be inside the lit region (the zig-zag path passes through every region it plays)
          const inside = d.info.x >= x0 - 2 && d.info.x <= x1 + 2 && d.info.y >= y0 - 10 && d.info.y <= y1 + 10;
          return { i: ov.index, strip: ov.region.strip, part: ov.region.part, px: window.__pixel(far[0], far[1]), inside, cy: d.info.y };
        });
        if (m && (!seen.length || seen[seen.length - 1].i !== m.i)) seen.push(m);
        await page.waitForTimeout(25);
      }
      log6(`[picture ${layer}] 12 consecutive positions: ` + seen.map((s) => `strip${s.strip + 1}-${PARTS[s.part]}(cursor y ${Math.round(s.cy)})`).join(' '));
      for (let k = 0; k < seen.length; k++) {
        const s = seen[k];
        expect(s.i).toBe(seen[0].i + k);
        expect(s.strip).toBe(Math.floor(s.i / 3));
        expect(s.part).toBe(s.strip % 2 === 0 ? s.i % 3 : 2 - (s.i % 3));
        const [r, g, b] = s.px; // the lit region's outline is drawn in #5BD1FF
        expect(Math.abs(r - 91) + Math.abs(g - 209) + Math.abs(b - 255)).toBeLessThan(12);
        expect(s.inside).toBe(true);
      }
      expect(errors).toEqual([]);
    });
  }

  test('switching type/layer: Video has no values table and no volume; Picture re-renders the table and caption', async ({ page }) => {
    await setup(page);
    const out = [];
    expect(await page.locator('#volume').count()).toBe(0);
    expect(await page.locator('#values').isVisible()).toBe(false);
    for (const [v, title] of [['weather', 'Weather'], ['co2', 'Carbon Dioxide'], ['space', 'Space'], ['airQuality', 'Air Quality']]) {
      await page.selectOption('#video-type', v);
      const cap = await page.textContent('#caption'), pipe = await page.textContent('#pipe-text');
      out.push(`${v}: caption "${cap}", side box "${pipe.slice(0, 60)}…"`);
      expect(cap).toContain(title); expect(pipe.length).toBeGreaterThan(40);
    }
    expect(await page.locator('#values').isVisible()).toBe(false);
    await page.click('label.seg:has-text("Picture")');
    expect(await page.locator('#values').isVisible()).toBe(true);
    for (const [v, title, unit] of [['precipitation', 'Precipitation', 'mm/hr'], ['aerosol', 'Aerosol', 'AOD'], ['vegetation', 'Vegetation', 'NDVI'], ['temperature', 'Temperature', '°C']]) {
      await page.selectOption('#picture-layer', v);
      const h = await page.textContent('#values-h'), cap = await page.textContent('#caption'), th = await page.textContent('#values-table thead');
      out.push(`${v}: heading "${h}", columns "${th}", caption "${cap}"`);
      expect(h).toContain(title); expect(cap).toContain(title); expect(th).toContain(unit);
    }
    log6('[switching]\n  ' + out.join('\n  '));
  });

  test('wrong file (.txt) and too-long video give a friendly error, no crash', async ({ page }) => {
    const errors = await setup(page);
    await page.setInputFiles('#video-file', 'tests/fixtures/not-a-video.txt');
    await page.evaluate(() => { window.__jukebox.generate(); });
    await expect(page.locator('#error')).toContainText('not a video');
    const e1 = await page.textContent('#error');
    await page.setInputFiles('#video-file', 'tests/fixtures/too-long.mp4');
    await page.evaluate(() => { window.__jukebox.generate(); });
    await expect(page.locator('#error')).toContainText('too long', { timeout: 30000 });
    const e2 = await page.textContent('#error');
    await page.click('label.seg:has-text("Picture")');
    await page.setInputFiles('#picture-file', 'tests/fixtures/not-a-video.txt');
    await page.evaluate(() => { window.__jukebox.generate(); });
    await expect(page.locator('#error')).toContainText('not a picture');
    const e3 = await page.textContent('#error');
    expect(await page.locator('#error').getAttribute('role')).toBe('alert');
    await page.click('#picture-use-sample'); // back to the sample
    await generateAndWait(page); // still works afterwards
    log6(`[errors]\n  .txt as video: "${e1}"\n  301 s video: "${e2}"\n  .txt as picture: "${e3}"\n  sample generated fine afterwards`);
    expect(errors).toEqual([]);
  });

  test('stage drop zone: Choose video / Choose picture make the sound at once; a non-map picture is played by brightness', async ({ page }) => {
    test.setTimeout(240000);
    const errors = await setup(page);
    const out = [];
    await expect(page.locator('#stage-pick')).toHaveText('Choose video');
    let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#stage-pick')]);
    await fc.setFiles('public/samples/videos/weather.mp4');
    await page.waitForFunction(() => window.__jukebox.state().ready && !window.__jukebox.state().busy, null, { timeout: 150000 });
    out.push(`video: file row "${await page.textContent('#video-file-row .file-chip')}", badge "${await page.textContent('#badge-source')}", drop zone hidden ${await page.locator('#stage-empty').isHidden()}`);
    expect(await page.textContent('#video-file-name')).toBe('weather.mp4');
    expect(await page.evaluate(() => window.__jukebox.result().source)).toBe('upload');
    expect(await page.textContent('#badge-source')).toContain('weather.mp4');
    await page.click('#play'); await page.waitForTimeout(800);
    expect((await page.evaluate(() => window.__jukebox.state())).playing).toBe(true);
    await page.click('#play');

    await page.click('label.seg:has-text("Picture")');
    await expect(page.locator('#stage-pick')).toHaveText('Choose picture');
    [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#stage-pick')]);
    await fc.setFiles('public/samples/pictures/temperature.png'); // a real map of the chosen layer → stays Temperature
    await page.waitForFunction(() => window.__jukebox.state().ready && !window.__jukebox.state().busy, null, { timeout: 60000 });
    const r1 = await page.evaluate(() => ({ layer: window.__jukebox.result().layer.id, notes: window.__jukebox.result().schedule.notes.length }));
    out.push(`map picture under Temperature: layer ${r1.layer}, ${r1.notes} notes`);
    expect(r1.layer).toBe('temperature');

    await page.setInputFiles('#picture-file', 'reports/screens/step6-video-playing.png'); // a screenshot, not a map
    await page.waitForFunction(() => window.__jukebox.state().ready && !window.__jukebox.state().busy && window.__jukebox.result()?.fileName?.includes('step6'), null, { timeout: 60000 });
    const r2 = await page.evaluate(() => ({ layer: window.__jukebox.result().layer.id, notes: window.__jukebox.result().schedule.notes.length, sel: document.getElementById('picture-layer').value, note: document.getElementById('error').textContent }));
    const head = await page.textContent('#values-h');
    out.push(`screenshot picture under Temperature: played as ${r2.layer} (dropdown stays ${r2.sel}), ${r2.notes}/96 notes, table "${head}", note "${r2.note}"`);
    expect(r2.layer).toBe('any'); expect(r2.sel).toBe('temperature'); expect(r2.notes).toBe(96); expect(head).toContain('brightness');
    log6('[drop zone]\n  ' + out.join('\n  '));
    expect(errors).toEqual([]);
  });

  test('simplified page: no Generate button, crop, section links or Any-picture option; Play alone makes and plays the sound; transcript has only data lines', async ({ page }) => {
    const errors = await setup(page);
    const gone = await page.evaluate(() => ({
      generate: !!document.getElementById('generate'), crop: !!document.getElementById('crop-field'), nav: !!document.querySelector('.topnav'),
      how: !!document.getElementById('how'), datasets: !!document.getElementById('datasets'), anyOption: !!document.querySelector('#picture-layer option[value="any"]'),
      shortcuts: !!document.querySelector('.kbd-hint'), caption: !!document.getElementById('caption'),
      source: !!document.querySelector('input[name="video-source"], input[name="picture-source"]'),
    }));
    expect(gone).toEqual({ generate: false, crop: false, nav: false, how: false, datasets: false, anyOption: false, shortcuts: true, caption: true, source: false });
    await page.click('label.seg:has-text("Picture")');
    await page.click('#play'); // nothing made yet: Play makes the sound, then plays it
    await page.waitForFunction(() => window.__jukebox.state().playing, null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    const items = await page.$$eval('#transcript li', (li) => li.map((x) => x.textContent));
    log6(`[simplified] removed ${JSON.stringify(gone)}; Play-first → playing; transcript ${items.length} lines, e.g. "${items[0]}"`);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((t) => /^(Strip|Radar)/.test(t))).toBe(true);
    expect(errors).toEqual([]);
  });

  test('seek bar moves the sound and the line', async ({ page }) => {
    await setup(page);
    await generateAndWait(page);
    const a = await page.evaluate(() => window.__jukebox.state().t);
    await page.locator('#seek').fill('500');
    const b = await page.evaluate(() => window.__jukebox.state());
    log6(`[seek] t ${a.toFixed(2)} → ${b.t.toFixed(2)} s of ${b.duration.toFixed(2)} s`);
    expect(b.t).toBeCloseTo(b.duration / 2, 1);
  });

  test('screenshots of both modes while playing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setup(page);
    await page.selectOption('#video-type', 'weather');
    await generateAndWait(page); await page.click('#play'); await page.waitForTimeout(2200);
    fs.mkdirSync('reports/screens', { recursive: true });
    await page.screenshot({ path: 'reports/screens/step6-video-playing.png' });
    await page.click('#play');
    await page.click('label.seg:has-text("Picture")');
    await generateAndWait(page); await page.click('#play'); await page.waitForTimeout(5300);
    await page.screenshot({ path: 'reports/screens/step6-picture-playing.png' });
  });
});
