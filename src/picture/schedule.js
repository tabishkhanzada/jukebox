// schedule.js — when each picture note plays. The sweep (default 32 s since 2026-11-15, slower at the owner's
// request) gives each of the 32 strips one slot; the 3 notes of a strip start at 0, 1/3 and 2/3 of the slot.
// Zig-zag (default): even strips north→south, odd strips south→north, so the cursor draws /\/\/\. Straight:
// always north→south. Pan −0.9 (left) … +0.9 (right). Instruments per layer are listed in INSTRUMENT_OF.
import { bandOf } from './layers.js';
import { STRIPS, PARTS } from './classify.js';

export const INSTRUMENT_OF = { temperature: 'piano', aerosol: 'pad', vegetation: 'marimba', any: 'kalimba' };

export function partOrder(strip, pattern = 'zigzag') {
  return pattern === 'zigzag' && strip % 2 === 1 ? [2, 1, 0] : [0, 1, 2];
}

/**
 * regions from classifyPicture()/classifyBrightness(); layer from LAYERS. Returns {duration, slots, notes}.
 * Every slot (strip × part) is listed in order; silent regions have no note.
 */
export function buildSchedule(regions, layer, { sweep = 32, pattern = 'zigzag' } = {}) {
  const slot = sweep / STRIPS, slots = [], notes = [];
  for (let s = 0; s < STRIPS; s++) {
    const order = partOrder(s, pattern);
    order.forEach((p, k) => {
      const t = s * slot + (k * slot) / 3;
      const reg = regions[s][p], b = bandOf(layer, reg);
      slots.push({ strip: s, part: p, partName: PARTS[p], t, band: b, colour: reg.colour || null, L: reg.L ?? null });
      if (b) {
        const instrument = layer.id === 'precipitation' ? (b.kind === 'snow' ? 'bell' : 'drop') : INSTRUMENT_OF[layer.id];
        notes.push({ t, strip: s, part: p, partName: PARTS[p], band: b.band, kind: b.kind, freq: b.freq, note: b.note, instrument, pan: -0.9 + (1.8 * s) / (STRIPS - 1) });
      }
    });
  }
  return { duration: sweep, slot, slots, notes };
}

/** Caption text, e.g. "Strip 12 of 32, north: ≈ 24.15–28.2 °C (orange), note D5". */
export function noteCaption(slotInfo, layer) {
  const where = `Strip ${slotInfo.strip + 1} of ${STRIPS}, ${slotInfo.partName}`;
  const b = slotInfo.band;
  if (!b) return `${where}: ${layer.id === 'any' ? 'see-through, silent' : 'no data, silent'}`;
  if (layer.id === 'any') return `${where}: ${b.name.toLowerCase()} (brightness ${Math.round(slotInfo.L)}), mostly ${slotInfo.colour}, note ${b.note}`;
  const kind = b.kind ? `${b.kind}, ` : '';
  return `${where}: ${kind}${b.text} ${layer.unit} (${b.name.toLowerCase()}), note ${b.note}`;
}
