// worker.js — Web Worker that makes the sound off the main thread so the page never freezes.
// Receives {id, kind, data, opts}, replies {id, left, right, sampleRate, duration, triggers?} (buffers transferred).
import { render } from './render.js';

self.onmessage = (e) => {
  const { id, kind, data, opts } = e.data;
  try {
    const r = render(kind, data, opts);
    const msg = { id, left: r.left, right: r.right, sampleRate: r.sampleRate, duration: r.duration, triggers: r.triggers || null };
    self.postMessage(msg, [r.left.buffer, r.right.buffer]);
  } catch (err) {
    self.postMessage({ id, error: err.message || String(err) });
  }
};
