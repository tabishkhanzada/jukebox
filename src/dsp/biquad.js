// biquad.js — simple audio filters (RBJ "cookbook" biquads): low-pass, high-pass, band-pass, and a one-pole
// smoother. All work on Float32Arrays at 44100 Hz and return a new array (input is not changed).
export const SR = 44100;

function coeffs(type, f0, Q, sr) {
  const w = (2 * Math.PI * f0) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * Q);
  let b0, b1, b2;
  if (type === 'low') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'high') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; } // band-pass, 0 dB peak
  const a0 = 1 + al;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - al) / a0];
}
export function biquad(x, type, f0, Q = Math.SQRT1_2, sr = SR) {
  const [b0, b1, b2, a1, a2] = coeffs(type, f0, Q, sr);
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i], yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi; y[i] = yi;
  }
  return y;
}
export const lowpass = (x, fc, sr = SR) => biquad(x, 'low', fc, Math.SQRT1_2, sr);
export const highpass = (x, fc, sr = SR) => biquad(x, 'high', fc, Math.SQRT1_2, sr);
/**
 * Band-pass between f1 and f2 (like scipy butter(2,[f1,f2],'band')). Wide bands: high-pass f1 then low-pass f2.
 * Narrow bands (f2/f1 < 2): two cascaded RBJ band-passes at the geometric centre, Q chosen so the
 * cascade's −3 dB width equals f2 − f1.
 */
export function bandpass(x, f1, f2, sr = SR) {
  if (f2 / f1 >= 2) return lowpass(highpass(x, f1, sr), f2, sr);
  const f0 = Math.sqrt(f1 * f2), Q = (f0 / (f2 - f1)) * 0.6436;
  return biquad(biquad(x, 'band', f0, Q, sr), 'band', f0, Q, sr);
}
/** One-pole low-pass (first order), e.g. 5 Hz smoothing of a control curve or 0.25 Hz gusts. */
export function onePole(x, fc, sr = SR) {
  // bilinear first-order Butterworth, same as scipy butter(1, fc)
  const k = Math.tan((Math.PI * fc) / sr), b = k / (1 + k), a = (k - 1) / (k + 1);
  const y = new Float32Array(x.length); let x1 = 0, y1 = 0;
  for (let i = 0; i < x.length; i++) { const yi = b * (x[i] + x1) - a * y1; x1 = x[i]; y1 = yi; y[i] = yi; }
  return y;
}
