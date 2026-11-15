// render.js — one entry point for all sounds: picks the right engine for a video type or picture layer.
// Pure (no DOM), so it runs in Node tests and inside the Web Worker (src/dsp/worker.js).
import { renderAirQuality } from './airQuality.js';
import { renderWeather } from './weather.js';
import { renderCO2 } from './co2.js';
import { renderSpace } from './space.js';
import { renderPicture } from './instruments.js';

/**
 * kind: 'airQuality' | 'weather' | 'co2' | 'space' | 'picture'
 * data: features (video), {bins} (space) or {notes, duration} (picture). opts: {P, turns, seed}
 * Returns {left, right, sampleRate, duration, ...extra}.
 */
export function render(kind, data, opts = {}) {
  switch (kind) {
    case 'airQuality': return renderAirQuality(data, opts);
    case 'weather': return renderWeather(data, opts);
    case 'co2': return renderCO2(data, opts);
    case 'space': return renderSpace(data, opts);
    case 'picture': return renderPicture(data, opts);
    default: throw new Error('unknown sound type ' + kind);
  }
}
