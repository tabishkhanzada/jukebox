// rng.js — seeded random numbers so every render is repeatable: mulberry32 (uniform 0..1)
// and Box–Muller (normal / "white noise" samples).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Gaussian generator (Box–Muller, uses both outputs). */
export function gaussian(rng) {
  let spare = null;
  return function () {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u < 1e-12) u = rng();
    const v = rng(), r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}
/** L samples of white Gaussian noise. */
export function noise(L, g) { const x = new Float32Array(L); for (let i = 0; i < L; i++) x[i] = g(); return x; }
