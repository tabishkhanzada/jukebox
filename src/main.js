// main.js — entry point of the Earth Information Jukebox web app. Loads fonts and styles, then connects
// everything: controls → (frames → features | picture → bands → schedule) → sound in a Web Worker → player →
// stage overlay, live caption, values panel (Picture only) and export bar. Also keyboard shortcuts, friendly errors,
// the stage drop zone (choosing or dropping a file makes the sound at once), seek bar, stage badges, and the
// brightness fallback for uploaded pictures that are not a NASA map of the chosen layer. There is no Generate button
// (owner's request, 2026-11-15): Play makes the sound first when needed; choosing a file makes it at once; G still
// works. Media keys / lock screen play-pause through the Media Session API.
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './styles/tokens.css';
import './styles/glass.css';
import './styles/layout.css';
import { initModeSwitch } from './ui/modeSwitch.js';
import { initControls } from './ui/controls.js';
import { createStage } from './ui/stage.js';
import { showPictureTable, highlight, setNow } from './ui/valuesPanel.js';
import { say, resetCaption } from './ui/caption.js';
import { initExportBar } from './ui/exportBar.js';
import { Player } from './core/player.js';
import { VoiceGuide } from './core/voiceGuide.js';
import { playEarcon } from './core/earcons.js';
import { synthesize } from './core/synth.js';
import { VIDEO_TYPES } from './core/videoTypes.js';
import { videoPos, radarFrac, pictureSlotIndex, pictureLineX, STRIPS } from './core/scan.js';
import { checkVideoFile, loadVideo, grabFrames, cleanStarImage, MAX_SECONDS } from './core/frames.js';
import { videoFeatures, detectStars } from './core/features.js';
import { gridAt } from './dsp/envelope.js';
import { spaceWords } from './dsp/space.js';
import { LAYERS } from './picture/layers.js';
import { classifyPicture, classifyBrightness, legendFit } from './picture/classify.js';
import { buildSchedule, noteCaption } from './picture/schedule.js';

const $ = (id) => document.getElementById(id);
const player = new Player();
const voiceGuide = new VoiceGuide({
  onStateChange: (speaking) => {
    const btn = $('voice-guide-btn');
    const text = $('voice-guide-text');
    if (btn) {
      btn.setAttribute('aria-pressed', String(speaking));
      btn.classList.toggle('active', speaking);
    }
    if (text) {
      text.textContent = speaking ? 'Stop audio guide' : 'Audio guide';
    }
    const heroBtn = $('hero-guide-btn');
    if (heroBtn) {
      heroBtn.textContent = speaking ? 'Stop audio guide' : 'Listen to audio guide';
    }
  },
});
const stage = createStage($('stage-canvas'));
let recording = false;
const exportBar = initExportBar({
  player, canvas: $('stage-canvas'), say,
  startDrawing: () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop); },
  lock: (on) => { recording = on; $('play').disabled = on; document.querySelectorAll('input[name="mode"]').forEach((r) => (r.disabled = on)); setPlayButtonState(); },
});
function setPlayButtonState() { const b = $('play'); b.dataset.state = player.playing ? 'playing' : 'paused'; b.setAttribute('aria-label', player.playing ? 'Pause' : 'Play'); }
const results = { video: null, picture: null };
const featureCache = new Map();
let mode = 'video', job = null, jobDone = Promise.resolve(), rafId = 0, lastNowAt = 0, lastLabelAt = 0, seeking = false;
const SOURCE_LABEL = { airQuality: 'NASA GMAO · PM2.5', weather: 'NASA GMAO · GEOS-FP wind', co2: 'NASA SVS · DYAMOND CO2', space: 'NASA GSFC · Caldwell 73' };

// ---------------- UI helpers ----------------
function showError(msg, { note = false } = {}) {
  const e = $('error');
  if (!msg) { e.hidden = true; e.textContent = ''; return; }
  e.textContent = (note ? 'Note: ' : '') + msg; e.hidden = false; e.classList.toggle('note', note);
}
function processing(on, text = 'Working…', value = null) {
  $('processing').hidden = !on;
  $('processing-text').textContent = text;
  $('engine-text').textContent = on ? text : 'Sound is made on your computer';
  $('engine-status').querySelector('.dot').classList.toggle('ok', !on);
  const bar = $('processing-bar');
  if (value == null) bar.removeAttribute('value'); else bar.value = value;
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function setPlayButton() {
  const b = $('play'), r = results[mode];
  b.disabled = recording;
  b.dataset.state = player.playing ? 'playing' : 'paused';
  b.setAttribute('aria-label', player.playing ? 'Pause' : 'Play');
  $('seek').disabled = !r || recording;
  const st = !r ? 'No sound yet' : player.playing ? 'Playing' : player.time >= player.duration - 0.01 && player.time > 0 ? 'Finished' : player.time > 0 ? 'Paused' : 'Ready';
  $('track-status').lastChild.textContent = st;
  $('track-status').querySelector('.dot').classList.toggle('ok', player.playing);
}
const current = () => results[mode];

// ---------------- sources ----------------
function fileKey(f) { return `${f.name}:${f.size}:${f.lastModified}`; }
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('This picture could not be opened. Please choose a PNG or JPEG file.'));
    im.src = url;
  });
}
function pixelsOf(el, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(el, 0, 0, w, h);
  return { data: cx.getImageData(0, 0, w, h).data, canvas: c };
}
async function checkDuration(v) {
  if (!isFinite(v.duration) || v.duration <= 0) throw new Error('This video has no length we can read. Please try another MP4 or WebM file.');
  if (v.duration > MAX_SECONDS) throw new Error(`This file is too long: maximum 5 minutes (this one is ${fmtTime(v.duration)}).`);
}

// ---------------- generate ----------------
function generate(opts) {
  if (job || recording) return jobDone;
  jobDone = runGenerate(opts);
  return jobDone;
}
async function runGenerate({ fromKey = false } = {}) {
  showError(null);
  player.pause(); setPlayButton();
  const ac = new AbortController(); job = ac;
  try {
    if (mode === 'video') await generateVideo(ac.signal); else await generatePicture(ac.signal);
    const r = current();
    player.load(r.audio);
    exportBar.update(r);
    setPlayButton(); drawNow();
    say(`Ready: ${r.title}. Press Play to listen.`, { force: true });
    if (fromKey || [$('stage-pick'), document.body].includes(document.activeElement) || !document.activeElement) $('play').focus();
  } catch (e) {
    if (e.name === 'AbortError') { say('Cancelled.', { force: true }); }
    else { showError(e.message || 'Something went wrong. Please try again.'); say('Error: ' + (e.message || 'something went wrong'), { force: true }); }
  } finally {
    job = null; processing(false); refreshChrome();
  }
}

async function generateVideo(signal) {
  const c = controls.video(), T = VIDEO_TYPES[c.type];
  let url = T.sample, key = `${c.type}|sample`;
  if (c.source === 'upload') {
    const err = checkVideoFile(c.file); if (err) throw new Error(err);
    key = `${c.type}|${fileKey(c.file)}`;
  }
  let feat = featureCache.get(key);
  if (!feat) {
    if (c.source === 'upload') url = URL.createObjectURL(c.file);
    processing(true, 'Opening the video…', 0);
    if (T.radar) {
      let display, small;
      if (c.source === 'sample') {
        const im = await loadImage(url);
        display = { el: im, w: im.naturalWidth, h: im.naturalHeight };
        small = pixelsOf(im, 256, 256).data;
      } else {
        const v = await loadVideo(url); await checkDuration(v);
        processing(true, 'Removing the moving line (median of 40 frames)…', 0);
        const clean = await cleanStarImage(v, { size: 512, onProgress: (p) => processing(true, 'Removing the moving line (median of 40 frames)…', p * 0.8), signal });
        const cv = document.createElement('canvas'); cv.width = cv.height = 512;
        cv.getContext('2d').putImageData(new ImageData(clean.data, 512, 512), 0, 0);
        display = { el: cv, w: 512, h: 512 };
        small = pixelsOf(cv, 256, 256).data;
      }
      processing(true, 'Finding stars…', 0.85);
      const st = detectStars(small, 256, 256);
      feat = { kind: 'space', display, bins: st.bins, stars: st.stars.length };
    } else {
      const v = await loadVideo(url); await checkDuration(v);
      const g = await grabFrames(v, { width: 256, signal, onProgress: (p) => processing(true, `Reading video frames… ${Math.round(p * 100)} %`, p * 0.8) });
      const f = videoFeatures(c.type, g.frames, g.w, g.h, { mask: T.mask });
      feat = { kind: 'video', video: v, display: { el: v, w: v.videoWidth, h: v.videoHeight }, features: { cols: f.cols, hot: f.hot, N: f.N } };
    }
    featureCache.set(key, feat);
  }
  processing(true, 'Making the sound…', 0.9);
  const opts = T.radar ? { P: c.P, turns: c.turns } : { P: c.P };
  const audio = await synthesize(c.type, T.radar ? { bins: feat.bins } : feat.features, opts, signal);
  stage.setSource(feat.display.el, feat.display.w, feat.display.h);
  if (feat.kind === 'video') { feat.video.pause(); feat.video.currentTime = 0; }
  results.video = { mode: 'video', type: c.type, T, title: T.title, P: c.P, turns: c.turns, feat, audio, triggers: audio.triggers, source: c.source, fileName: c.file?.name };
  $('stage-empty').hidden = true;
  // warning: almost everything silent → probably the wrong type for this video
  if (!T.radar) {
    const cols = feat.features.cols; let z = 0; for (const v of cols) if (v < 0.02) z++;
    if (z / cols.length > 0.98) showError(`Almost nothing in this video matches the ${T.title} colours, so it is nearly silent. Check that you chose the right video type.`, { note: true });
  } else if (feat.stars < 5) showError('Very few stars were found in this video, so it is nearly silent.', { note: true });
}

async function generatePicture(signal) {
  const c = controls.picture();
  let layer = LAYERS[c.layer];
  let url = layer.sample, key = `${c.layer}|sample`;
  if (c.source === 'upload') {
    const f = c.file;
    if (!f) throw new Error('Please choose a picture file first.');
    if (!/^image\/(png|jpeg)$/.test(f.type) && !/\.(png|jpe?g)$/i.test(f.name)) throw new Error('This file is not a picture we can read. Please choose a PNG or JPEG picture.');
    if (f.size > 50 * 1024 * 1024) throw new Error('This picture is too big: maximum 50 MB.');
    key = `${c.layer}|${fileKey(f)}`; url = URL.createObjectURL(f);
  }
  processing(true, 'Reading the map colours…', 0.1);
  let img = featureCache.get('img|' + key);
  if (!img) {
    const im = await loadImage(url);
    const s = Math.min(1, 4096 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.round(im.naturalWidth * s), h = Math.round(im.naturalHeight * s);
    img = { el: im, w, h, data: pixelsOf(im, w, h).data };
    featureCache.set('img|' + key, img);
  }
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  await new Promise((r) => setTimeout(r, 0));
  const crop = null;
  let regions = layer.id === 'any' ? classifyBrightness(img.data, img.w, img.h, { crop }) : classifyPicture(img.data, img.w, img.h, layer, { crop });
  let fellBack = null;
  // an upload that is not a snapshot of this layer (fewer than 85 % of its coloured pixels are legend colours) → brightness
  if (c.source === 'upload' && layer.id !== 'any' && (legendFit(img.data, img.w, img.h, layer) < 0.85 || regions.flat().filter((r) => !r.band).length / 96 > 0.85)) {
    fellBack = layer.title; layer = LAYERS.any;
    regions = classifyBrightness(img.data, img.w, img.h, { crop });
  }
  const schedule = buildSchedule(regions, layer, { sweep: c.sweep, pattern: c.pattern });
  processing(true, 'Making the notes…', 0.6);
  const audio = await synthesize('picture', { notes: schedule.notes, duration: schedule.duration }, {}, signal);
  stage.setSource(img.el, img.w, img.h);
  results.picture = { mode: 'picture', layer, title: layer.title, display: { el: img.el, w: img.w, h: img.h }, regions, schedule, audio, crop, sweep: c.sweep, pattern: c.pattern, source: c.source, fileName: c.file?.name };
  $('stage-empty').hidden = true;
  const silent = regions.flat().filter((r) => !r.band).length / 96;
  showPictureTable(layer);
  if (fellBack) showError(`This picture is not a ${fellBack} map, so it is played by brightness instead: dark = low notes, bright = high notes.`, { note: true });
  else if (schedule.notes.length === 0 || silent > 0.98) showError(`Almost nothing in this picture matches the ${layer.title} legend colours, so it is nearly silent. Check that you chose the right layer.`, { note: true });
}

// ---------------- playback + drawing ----------------
function overlayFor(r, t) {
  if (r.mode === 'video') return r.T.radar ? { type: 'radar', frac: radarFrac(t, r.P) } : { type: 'line', x: videoPos(t, r.P).x };
  const i = pictureSlotIndex(t, r.sweep), slot = i >= 0 ? r.schedule.slots[i] : null;
  return { type: 'picture', x: pictureLineX(t, r.sweep), u: pictureLineX(t, r.sweep), pattern: r.pattern, region: slot ? { strip: slot.strip, part: slot.part } : null, slot, index: i };
}

function describe(r, t) {
  if (r.mode === 'video') {
    if (r.T.radar) {
      const frac = radarFrac(t, r.P), hour = Math.round(frac * 12) || 12;
      const recent = (r.triggers || []).filter((x) => x.t <= t && x.t > t - 0.12).pop();
      const words = spaceWords(recent);
      return { caption: `Radar at ${hour} o'clock: ${words}`, now: `Now: angle ${Math.round(frac * 360)}° · ${words}${recent ? ` · ${Math.round(400 * 2 ** (2 * recent.r))} Hz` : ''}`, key: recent ? (recent.b > 0.8 ? 'r0' : 'r1') : 'r2' };
    }
    const f = r.feat.features, { strip } = videoPos(t, r.P);
    const v = gridAt(f.cols, f.N, t, r.P), hh = f.hot ? gridAt(f.hot, f.N, t, r.P) : 0;
    const words = r.T.words(v, hh);
    const rowIdx = r.T.rows.findIndex((row) => row[3].startsWith(words.split(',')[0]));
    return { caption: `Strip ${strip + 1} of ${STRIPS}: ${words}`, now: `Now: strip ${strip + 1}/${STRIPS} · value ${v.toFixed(2)} · ${words}`, key: rowIdx >= 0 ? 'r' + rowIdx : null };
  }
  const i = pictureSlotIndex(t, r.sweep);
  if (i < 0) return { caption: 'End of the sweep.', now: 'Now: —', key: null };
  const slot = r.schedule.slots[i];
  return {
    caption: noteCaption(slot, r.layer),
    now: `Now: strip ${slot.strip + 1}/${STRIPS} ${slot.partName}${slot.band ? ` · ${slot.band.text} ${r.layer.unit} · note ${slot.band.note}` : ' · silent'}`,
    key: slot.band ? (slot.band.kind || '') + slot.band.band : null,
  };
}

function syncVideo(r, t) {
  if (r.mode !== 'video' || r.T.radar) return;
  const v = r.feat.video, target = Math.min(t, v.duration - 0.05);
  if (player.playing) {
    if (v.paused) v.play().catch(() => {});
    if (Math.abs(v.currentTime - target) > 0.15) v.currentTime = target;
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - target) > 0.04) v.currentTime = target;
  }
}

/** Draw the stage for the current audio time and update the texts. Returns info (used by tests). */
function drawNow() {
  const r = current();
  if (!r) { stage.draw(null); $('time').textContent = '0:00 / 0:00'; return null; }
  const t = player.time;
  syncVideo(r, t);
  const ov = overlayFor(r, t), info = stage.draw(ov);
  const d = describe(r, t), now = performance.now();
  $('time').textContent = `${fmtTime(t)} / ${fmtTime(player.duration)}`;
  if (now - lastNowAt > 200 || !player.playing) {
    setNow(d.now); highlight(d.key); $('now-pos').textContent = d.now.replace('Now: ', '');
    const P = r.mode === 'video' ? r.P : r.sweep, tt = r.mode === 'video' ? t % P : Math.min(t, P);
    $('badge-time').textContent = `${r.mode === 'video' && r.T.radar ? 'Turn' : 'Sweep'}: ${tt.toFixed(1)} s / ${P.toFixed(1)} s`;
    lastNowAt = now;
  }
  if (!seeking) $('seek').value = player.duration ? Math.round((1000 * t) / player.duration) : 0;
  if (player.playing && say(d.caption)) { /* caption updated (max once per second) */ }
  if (now - lastLabelAt > 1000 || !player.playing) {
    $('stage-canvas').setAttribute('aria-label', `${r.title}. ${r.mode === 'video' ? (r.T.radar ? 'Star picture with a turning radar line.' : 'Video with a scan line moving left to right.') : `Picture with a ${r.pattern === 'zigzag' ? 'zig-zag' : 'top-to-bottom'} cursor; the playing region is outlined.`} ${d.caption}`);
    lastLabelAt = now;
  }
  return { t, ov, info, rect: { ...stage.rect } };
}
function loop() { drawNow(); if (player.playing) rafId = requestAnimationFrame(loop); else setPlayButton(); }

async function togglePlay() {
  if (job || recording) return;
  if (!current()) { await generate(); if (!current() || job) return; }
  if (player.playing) {
    playEarcon('pause');
    player.pause(); cancelAnimationFrame(rafId); drawNow(); say(`Paused at ${fmtTime(player.time)}.`, { force: true });
  } else {
    playEarcon('play');
    await player.play(); cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop);
  }
  setPlayButton();
}
player.onended = () => { setPlayButton(); drawNow(); say('Finished. Press Play to listen again.', { force: true }); };

function stepLine(dir) {
  const r = current(); if (!r || player.playing) return;
  playEarcon('step');
  const P = r.mode === 'video' ? r.P : r.sweep;
  player.seek(player.time + (dir * P) / STRIPS);
  const d = drawNow(); if (d) say(describe(r, player.time).caption, { force: true });
}

// ---------------- wiring ----------------
function clearResult(m) {
  if (results[m] && m === mode) { player.stop(); cancelAnimationFrame(rafId); }
  results[m] = null;
  if (m === mode) { stage.setSource(null); stage.draw(null); $('stage-empty').hidden = false; exportBar.update(null); setPlayButton(); $('time').textContent = '0:00 / 0:00'; refreshChrome(); }
}
/** Texts that depend on the mode and the chosen type/layer: values table, side box, drop zone, badges. */
function showTable() {
  if (mode === 'picture') showPictureTable(results.picture?.layer || LAYERS[controls.picture().layer]);
  refreshChrome();
}
function refreshChrome() {
  const r = current();
  $('mode-tag').textContent = mode === 'video' ? 'Video mode' : 'Picture mode';
  if (mode === 'video') {
    const T = VIDEO_TYPES[controls.video().type];
    $('pipe-text').textContent = T.radar ? T.sub : `${T.sub} The video is read 4 times per second and cut into 32 strips; each strip becomes one number from 0 to 1, and the strip under the line makes the sound.`;
    $('drop-title').textContent = 'Add your video'; $('stage-pick').textContent = 'Choose video';
    $('drop-sub').textContent = 'MP4 or WebM, up to 5 minutes. You can also drop a file here, or press Play to hear the sample.';
  } else {
    const L = LAYERS[controls.picture().layer], pat = controls.picture().pattern === 'zigzag' ? 'zig-zag (/\\/\\/\\)' : 'straight (top to bottom)';
    $('pipe-text').textContent = `The picture is cut into 32 strips, each split into north / middle / south (96 parts). Each part’s ${L.id === 'any' ? 'brightness' : 'colour, matched to the official legend,'} picks a note on the ${L.instrumentName}. A cursor visits every part on a ${pat} path, from left to right.`;
    $('drop-title').textContent = 'Add your picture'; $('stage-pick').textContent = 'Choose picture';
    $('drop-sub').textContent = 'PNG or JPEG: a NASA map of the chosen layer, or any photo or drawing. You can also drop a file here, or press Play to hear the sample.';
  }
  if (!r) { ['badge-source', 'now-pos', 'badge-time'].forEach((id) => ($(id).textContent = '')); $('seek').value = 0; setPlayButton(); }
  else {
    $('badge-source').textContent = r.source === 'upload' ? `Your file · ${r.fileName || ''}` : r.mode === 'video' ? SOURCE_LABEL[r.type] : r.layer.id === 'any' ? 'NASA GIBS · sample picture' : `NASA GIBS · ${r.layer.gibs} · ${r.layer.date}`;
    setPlayButton();
  }
  const curCh = mode === 'video' ? controls.video().type : controls.picture().layer;
  document.querySelectorAll('.channel-card').forEach((c) => {
    const isAct = c.dataset.channelMode === mode && c.dataset.channelId === curCh;
    c.classList.toggle('active', isAct);
    const actText = c.querySelector('.channel-action');
    if (actText) actText.textContent = isAct ? 'Active channel ●' : 'Load channel →';
  });
}
function onControl(what) {
  const m = what.startsWith('video') ? 'video' : 'picture';
  clearResult(m); showError(null);
  if (what === 'pattern') refreshChrome();
  if ((what === 'video-file' || what === 'picture-file') && m === mode && controls[m]().file) {
    say('File chosen. Making the sound…', { force: true });
    (async () => { if (job) { job.abort(); await jobDone; } generate(); })();
    return;
  }
  if (what === 'video-file' || what === 'picture-file') { say('Using the sample. Press Play to listen.', { force: true }); return; }
  if (what === 'video-type' || what === 'picture-layer') {
    showTable();
    const name = m === 'video' ? VIDEO_TYPES[controls.video().type].title : LAYERS[controls.picture().layer].title;
    say(`${name} chosen. Press Play to listen.`, { force: true });
  } else say('Settings changed. Press Play to listen.', { force: true });
}

const controls = initControls(onControl);
if (location.hash === '#picture') document.querySelector('input[name="mode"][value="picture"]').checked = true; // deep link
const modeSwitch = initModeSwitch((m) => {
  if (job) job.abort();
  player.stop(); cancelAnimationFrame(rafId);
  mode = m; showError(null); showTable();
  history.replaceState(null, '', m === 'picture' ? '#picture' : location.pathname + location.search);
  const r = current();
  if (r) player.load(r.audio);
  restoreStage(); refreshChrome();
  exportBar.update(r); setPlayButton();
  say(`${m === 'video' ? 'Video' : 'Picture'} mode.${r ? ' Press Play to listen.' : ' Choose a type and press Play.'}`, { force: true });
});
function restoreStage() {
  const r = current();
  if (!r) { stage.setSource(null); stage.draw(null); $('stage-empty').hidden = false; $('time').textContent = '0:00 / 0:00'; return; }
  const d = r.mode === 'video' ? r.feat.display : r.display;
  stage.setSource(d.el, d.w, d.h);
  $('stage-empty').hidden = true; drawNow();
}

$('cancel').addEventListener('click', () => job?.abort());
$('play').addEventListener('click', togglePlay);
$('mute').addEventListener('click', () => {
  playEarcon('switch');
  const m = !player.muted; player.setMuted(m);
  $('mute').setAttribute('aria-pressed', String(m)); $('mute-text').textContent = m ? 'Unmute' : 'Mute';
  say(m ? 'Sound muted.' : 'Sound on.', { force: true });
});

const CHANNEL_KEYS = {
  '1': { mode: 'video', id: 'airQuality', title: 'Air Quality (PM2.5)' },
  '2': { mode: 'video', id: 'weather', title: 'Near-surface Wind' },
  '3': { mode: 'video', id: 'co2', title: 'Carbon Dioxide Plumes' },
  '4': { mode: 'video', id: 'space', title: 'Deep Space Stars' },
  '5': { mode: 'picture', id: 'temperature', title: 'Sea Surface Temperature' },
  '6': { mode: 'picture', id: 'precipitation', title: 'Precipitation Rain and Snow' },
  '7': { mode: 'picture', id: 'aerosol', title: 'Aerosol Optical Depth' },
  '8': { mode: 'picture', id: 'vegetation', title: 'Vegetation Index' },
};

function selectChannelByKey(key) {
  const ch = CHANNEL_KEYS[key];
  if (!ch) return;
  playEarcon('switch');
  if (mode !== ch.mode) {
    modeSwitch.set(ch.mode);
  }
  if (ch.mode === 'video') {
    const sel = $('video-type');
    if (sel && sel.value !== ch.id) {
      sel.value = ch.id;
      sel.dispatchEvent(new Event('change'));
    }
  } else {
    const sel = $('picture-layer');
    if (sel && sel.value !== ch.id) {
      sel.value = ch.id;
      sel.dispatchEvent(new Event('change'));
    }
  }
  const msg = `Channel ${key}: ${ch.title} chosen. Press Space to play.`;
  say(msg, { force: true });
  if (voiceGuide.speaking) {
    voiceGuide.speak(`Channel ${key}: ${ch.title} chosen. Press Space to play.`);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target, tag = t.tagName;
  const typing = tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && !['radio', 'checkbox', 'button', 'file'].includes(t.type));
  const nativeActivate = tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A' || (tag === 'INPUT' && ['radio', 'checkbox', 'file'].includes(t.type));
  if (e.key === ' ' && !typing && !nativeActivate) { e.preventDefault(); togglePlay(); return; }
  if (typing) return;
  if (e.key === 'g' || e.key === 'G') { e.preventDefault(); generate({ fromKey: true }); }
  else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); $('mute').click(); }
  else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); playEarcon('switch'); voiceGuide.toggle(); }
  else if (e.key === '?' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); toggleShortcuts(); }
  else if (e.key === 'Escape' && $('shortcuts-menu') && !$('shortcuts-menu').hidden) { e.preventDefault(); toggleShortcuts(false); }
  else if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
    e.preventDefault();
    selectChannelByKey(e.key);
  }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !(tag === 'INPUT' && t.type === 'radio')) {
    if (current() && !player.playing) { e.preventDefault(); stepLine(e.key === 'ArrowLeft' ? -1 : 1); }
  }
});

// stage drop zone: the button opens the file picker of the current mode; a dropped file is used the same way
$('stage-pick').addEventListener('click', () => $(mode === 'video' ? 'video-file' : 'picture-file').click());
const stageEl = $('stage');
stageEl.addEventListener('dragover', (e) => { if (!job && !recording) { e.preventDefault(); stageEl.classList.add('drag'); } });
stageEl.addEventListener('dragleave', () => stageEl.classList.remove('drag'));
stageEl.addEventListener('drop', (e) => {
  e.preventDefault(); stageEl.classList.remove('drag');
  const f = e.dataTransfer?.files?.[0]; if (!f || job || recording) return;
  const input = $(mode === 'video' ? 'video-file' : 'picture-file'), dt = new DataTransfer();
  dt.items.add(f); input.files = dt.files; input.dispatchEvent(new Event('change'));
});
// seek bar
const seek = $('seek');
seek.addEventListener('pointerdown', () => { seeking = true; });
seek.addEventListener('pointerup', () => { seeking = false; });
seek.addEventListener('input', () => { if (!current()) return; player.seek((+seek.value / 1000) * player.duration); drawNow(); setPlayButton(); });
seek.addEventListener('change', () => { seeking = false; const r = current(); if (r && !player.playing) say(describe(r, player.time).caption, { force: true }); });

showTable();
stage.draw(null);

// Hero button and channel gallery wiring
$('hero-listen-btn')?.addEventListener('click', () => {
  togglePlay();
  $('stage-col')?.scrollIntoView({ behavior: 'smooth' });
});

$('voice-guide-btn')?.addEventListener('click', () => {
  playEarcon('switch');
  voiceGuide.toggle();
});

$('hero-guide-btn')?.addEventListener('click', () => {
  playEarcon('switch');
  voiceGuide.toggle();
});

// Theme switcher: Light (white) theme by default, toggles to Dark theme
const initTheme = () => {
  const toggleBtn = $('theme-toggle-btn');
  const themeText = $('theme-text');
  const themeIcon = $('theme-icon');
  const metaTheme = $('meta-theme-color');

  const applyTheme = (theme) => {
    document.body.dataset.theme = theme;
    localStorage.setItem('jukebox_theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#070a12' : '#ffffff');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    if (themeText) {
      themeText.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
      } else {
        themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      }
    }
  };

  const initialTheme = localStorage.getItem('jukebox_theme') || 'light';
  applyTheme(initialTheme);

  toggleBtn?.addEventListener('click', () => {
    const currentTheme = document.body.dataset.theme || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    playEarcon('switch');
    applyTheme(nextTheme);
  });
};

initTheme();

// Keyboard shortcuts dropdown
function toggleShortcuts(show) {
  const menu = $('shortcuts-menu');
  const btn = $('shortcuts-btn');
  if (!menu) return;
  const isHidden = menu.hidden;
  const target = show !== undefined ? show : isHidden;
  menu.hidden = !target;
  btn?.setAttribute('aria-expanded', String(target));
  if (target) playEarcon('switch');
}

$('shortcuts-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleShortcuts();
});

$('shortcuts-close')?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleShortcuts(false);
});

document.addEventListener('click', (e) => {
  const menu = $('shortcuts-menu');
  if (menu && !menu.hidden && !e.target.closest('.shortcuts-dropdown-wrap')) {
    toggleShortcuts(false);
  }
});

document.querySelectorAll('.channel-card').forEach((card) => {
  card.addEventListener('click', () => {
    const targetMode = card.dataset.channelMode;
    const channelId = card.dataset.channelId;
    if (mode !== targetMode) {
      modeSwitch.set(targetMode);
    }
    if (targetMode === 'video') {
      const sel = $('video-type');
      if (sel && sel.value !== channelId) {
        sel.value = channelId;
        sel.dispatchEvent(new Event('change'));
      }
    } else {
      const sel = $('picture-layer');
      if (sel && sel.value !== channelId) {
        sel.value = channelId;
        sel.dispatchEvent(new Event('change'));
      }
    }
    $('stage-col')?.scrollIntoView({ behavior: 'smooth' });
    if (!player.playing) togglePlay();
  });
});

// Test/automation hook (read-only view of the state + draw one frame now).
// media keys and lock screen (Media Session API), where the browser supports it
if ('mediaSession' in navigator) {
  try {
    navigator.mediaSession.setActionHandler('play', () => { if (!player.playing) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (player.playing) togglePlay(); });
  } catch { /* action not supported */ }
}

window.__jukebox = {
  generate: () => generate(),
  state: () => ({ mode, playing: player.playing, t: player.time, duration: player.duration, ready: !!current(), busy: !!job, P: current()?.P, sweep: current()?.sweep, rect: { ...stage.rect } }),
  renderNow: () => drawNow(),
  seek: (t) => { player.seek(t); return drawNow(); },
  result: () => current(),
  player,
};
