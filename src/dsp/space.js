// space.js — "Star Twinkle" sound for the Space video (NEW, never listened to: UNVERIFIED).
// A radar line turns from the image centre (12 s per turn, clockwise from 12 o'clock). Each star it touches
// makes a short "tink": higher pitch = farther from the centre (400–1600 Hz), louder = brighter, panned by the
// star's left/right position. At most one tink per 40 ms so it never turns into mush.
import { SR } from './biquad.js';
import { master } from './envelope.js';

/** Build the list of tinks from detectStars() bins: keep only the brightest star in every 40 ms window. */
export function spaceTriggers(bins, { P = 12, turns = 2 } = {}) {
  const nb = bins.length, best = new Map();
  for (let turn = 0; turn < turns; turn++) for (let k = 0; k < nb; k++) for (const s of bins[k]) {
    const t = turn * P + (k / nb) * P, w = Math.floor(t / 0.04 + 1e-9);
    const cur = best.get(w);
    if (!cur || s.b > cur.b) best.set(w, { t, r: s.r, b: s.b, x: s.x, bin: k });
  }
  return [...best.values()].sort((a, b) => a.t - b.t);
}

export function renderSpace({ bins }, { P = 12, turns = 2, sr = SR } = {}) {
  const trig = spaceTriggers(bins, { P, turns });
  const L = Math.floor(turns * P * sr), D = Math.floor(0.25 * sr);
  const Lc = new Float32Array(L), Rc = new Float32Array(L);
  const atk = 0.001 * sr;
  for (const tr of trig) {
    const f = 400 * 2 ** (2 * tr.r), amp = 0.15 + 0.55 * tr.b, n0 = Math.floor(tr.t * sr);
    const pa = ((-0.9 + 1.8 * tr.x + 1) * Math.PI) / 4, gl = Math.cos(pa), gr = Math.sin(pa);
    for (let j = 0; j < D && n0 + j < L; j++) {
      const t = j / sr, a = Math.min(1, j / atk);
      const v = amp * a * (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.06) + 0.3 * Math.sin(2 * Math.PI * 2.76 * f * t) * Math.exp(-t / 0.025));
      Lc[n0 + j] += v * gl; Rc[n0 + j] += v * gr;
    }
  }
  return { ...master([Lc, Rc], { sr }), triggers: trig };
}

export function spaceWords(tr) {
  if (!tr) return 'no stars on the line';
  return `${tr.b > 0.8 ? 'bright' : 'faint'} star, ${tr.r < 0.5 ? 'near the centre' : 'far from the centre'}`;
}
