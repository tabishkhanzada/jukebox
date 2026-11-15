// recorder.js — makes the downloadable video: the stage canvas (video frame or picture + moving line) is captured
// at 30 fps together with the sound (MediaStreamDestination) and recorded with MediaRecorder, in real time,
// from the start to the end of the sound. Prefers MP4 (H.264 + AAC, plays everywhere), then MP4 (H.264),
// then WebM (VP9 + Opus), then plain WebM.
export const MIME_ORDER = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm'];

export function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  return MIME_ORDER.find((m) => MediaRecorder.isTypeSupported(m)) || null;
}
export const extFor = (mime) => (mime.startsWith('video/mp4') ? 'mp4' : 'webm');

/**
 * Record the stage while the player plays the whole sound once.
 * opts: {canvas, player, startDrawing() (starts the app's draw loop), onProgress(0..1), signal}
 * Resolves {blob, mime, ext, duration}.
 */
export function recordStage({ canvas, player, startDrawing, onProgress, signal }) {
  const mime = pickMime();
  if (!mime) return Promise.reject(new Error('This browser cannot record video. Use "Download audio (WAV)" instead.'));
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(30);
    player.ensure();
    const track = player.dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 });
    const chunks = []; let timer = 0, done = false;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      clearInterval(timer);
      stream.getVideoTracks().forEach((t) => t.stop());
      if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
      resolve({ blob: new Blob(chunks, { type: mime.split(';')[0] }), mime, ext: extFor(mime), duration: player.duration });
    };
    rec.onerror = (e) => { clearInterval(timer); reject(e.error || new Error('Recording failed.')); };
    const finish = () => { if (done) return; done = true; player.pause(); setTimeout(() => rec.state !== 'inactive' && rec.stop(), 150); };
    signal?.addEventListener('abort', finish, { once: true });
    player.stop();
    rec.start(250);
    player.play().then(() => {
      startDrawing?.();
      timer = setInterval(() => {
        onProgress?.(player.duration ? player.time / player.duration : 0);
        if (!player.playing && player.time >= player.duration - 0.02) finish();
      }, 100);
    }, (e) => { done = true; rec.stop(); reject(e); });
  });
}

/** Save a Blob as a file (the browser's normal download). */
export function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.style.display = 'none';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}
