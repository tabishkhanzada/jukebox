// exportBar.js — the Download panel: "Download video" (records the stage + sound in real time with a progress
// bar, then saves earth-jukebox-<type>-<date>.mp4/.webm; a second click re-saves the same file) and
// "Download audio (WAV)" (instant, from the sound buffer). Hides the video button if recording is impossible.
import { encodeWav } from '../core/wav.js';
import { pickMime, recordStage, saveBlob } from '../core/recorder.js';

const $ = (id) => document.getElementById(id);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }; // local date

/** deps: {player, canvas, startDrawing(), lock(bool), say(text)} */
export function initExportBar(deps) {
  const canRecord = !!pickMime();
  let result = null, recorded = null, ac = null;
  const vbtn = $('dl-video'), wbtn = $('dl-wav');
  if (!canRecord) vbtn.hidden = true;
  const baseName = () => `earth-jukebox-${result.mode === 'video' ? result.T.file : result.layer.id}-${today()}`;
  const idle = 'Video recording plays the sound once in real time (keep this tab open). Files are made on your computer; nothing is uploaded.';

  function update(r) {
    if (ac) ac.abort();
    result = r; recorded = null;
    vbtn.disabled = !r; wbtn.disabled = !r;
    $('dl-video-text').textContent = 'Download video';
    $('rec').hidden = true;
    $('export-note').textContent = !r ? 'Press Play or choose a file first. Files are made on your computer; nothing is uploaded.'
      : canRecord ? idle : 'Video download is not possible in this browser (no MediaRecorder). Use “Download audio (WAV)”; Chrome or Edge can record video.';
  }

  wbtn.addEventListener('click', () => {
    if (!result) return;
    const a = result.audio;
    saveBlob(new Blob([encodeWav(a.left, a.right, a.sampleRate)], { type: 'audio/wav' }), baseName() + '.wav');
    deps.say('Audio file saved (WAV).', { force: true });
  });

  vbtn.addEventListener('click', async () => {
    if (!result) return;
    if (ac) { ac.abort(); return; } // second click while recording = cancel
    if (recorded && recorded.for === result) { saveBlob(recorded.blob, `${baseName()}.${recorded.ext}`); deps.say('Video file saved again.', { force: true }); return; }
    ac = new AbortController();
    const mine = ac;
    $('dl-video-text').textContent = 'Cancel recording'; wbtn.disabled = true; $('rec').hidden = false; $('rec-bar').value = 0;
    $('rec-text').textContent = 'Recording video… 0 %';
    deps.lock(true); deps.say('Recording the video in real time. Please wait.', { force: true });
    try {
      const out = await recordStage({
        canvas: deps.canvas, player: deps.player, startDrawing: deps.startDrawing, signal: mine.signal,
        onProgress: (p) => { $('rec-bar').value = p; $('rec-text').textContent = `Recording video… ${Math.round(p * 100)} %`; },
      });
      recorded = { ...out, for: result };
      saveBlob(out.blob, `${baseName()}.${out.ext}`);
      $('export-note').textContent = `Video saved (${out.ext.toUpperCase()}, ${(out.blob.size / 1e6).toFixed(1)} MB). Click again to save another copy.`;
      deps.say('Video recorded and saved.', { force: true });
    } catch (e) {
      $('export-note').textContent = e.name === 'AbortError' ? 'Recording cancelled.' : 'Recording failed: ' + e.message;
      deps.say(e.name === 'AbortError' ? 'Recording cancelled.' : 'Recording failed.', { force: true });
    } finally {
      if (ac === mine) ac = null;
      $('dl-video-text').textContent = 'Download video'; wbtn.disabled = !result; $('rec').hidden = true;
      deps.lock(false);
    }
  });
  return { update, get recording() { return !!ac; } };
}
