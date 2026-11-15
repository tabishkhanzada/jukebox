// synth.js — asks the Web Worker (src/dsp/worker.js) to make a sound, so the page stays responsive.
// Cancel = the worker is stopped at once. Falls back to the main thread if workers are not available.
import { render } from '../dsp/render.js';

let worker = null, nextId = 1;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('../dsp/worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id); if (!p) return;
    pending.delete(e.data.id);
    e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data);
  };
  worker.onerror = (e) => { for (const p of pending.values()) p.reject(new Error(e.message || 'The sound maker stopped.')); pending.clear(); worker = null; };
  return worker;
}

/** Make a sound. signal: AbortSignal (Cancel). Resolves {left, right, sampleRate, duration, triggers}. */
export function synthesize(kind, data, opts, signal) {
  if (typeof Worker === 'undefined') return Promise.resolve(render(kind, data, opts));
  return new Promise((resolve, reject) => {
    const id = nextId++, w = getWorker();
    pending.set(id, { resolve, reject });
    signal?.addEventListener('abort', () => {
      if (!pending.has(id)) return;
      pending.delete(id); w.terminate(); worker = null;
      for (const p of pending.values()) p.reject(new DOMException('Cancelled', 'AbortError'));
      pending.clear();
      reject(new DOMException('Cancelled', 'AbortError'));
    }, { once: true });
    w.postMessage({ id, kind, data, opts });
  });
}
