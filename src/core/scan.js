// scan.js — where the scan line is at time t (pure, no DOM). Video: vertical line x = (t mod P)/P.
// Space: radar angle (0 = 12 o'clock, clockwise). Picture: current slot (strip + north/middle/south).
export const STRIPS = 32;

export function videoPos(t, P) {
  const x = (((t % P) + P) % P) / P;
  return { x, strip: Math.min(STRIPS - 1, Math.floor(x * STRIPS)) };
}
/** Radar angle as a fraction of a full turn (0..1). */
export function radarFrac(t, P) { return (((t % P) + P) % P) / P; }

/** Picture: index of the slot (0..95) playing at time t, or -1 after the sweep. */
export function pictureSlotIndex(t, sweep) {
  if (t < 0 || t >= sweep) return -1;
  return Math.min(STRIPS * 3 - 1, Math.floor(t / (sweep / STRIPS / 3)));
}
/** Picture line x (0..1): moves smoothly over the whole sweep. */
export function pictureLineX(t, sweep) { return Math.min(1, Math.max(0, t / sweep)); }
