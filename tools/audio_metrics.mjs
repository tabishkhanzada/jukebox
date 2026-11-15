// audio_metrics.mjs — measuring tools for rendered audio (Claude cannot listen, so these numbers are the check):
// power spectrum (Welch, Hann window, FFT 16384), share of energy in a frequency band, windowed RMS, peak,
// Pearson correlation. Node-only, used by tests.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}
/** Averaged power spectrum of one or more channels. Returns {psd: Float64Array(nfft/2+1), df}. */
export function spectrum(channels, sr = 44100, nfft = 16384) {
  const psd = new Float64Array(nfft / 2 + 1), w = new Float64Array(nfft);
  for (let i = 0; i < nfft; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (nfft - 1));
  const re = new Float64Array(nfft), im = new Float64Array(nfft);
  for (const x of channels) for (let o = 0; o + nfft <= x.length; o += nfft / 2) {
    for (let i = 0; i < nfft; i++) { re[i] = x[o + i] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k <= nfft / 2; k++) psd[k] += re[k] * re[k] + im[k] * im[k];
  }
  return { psd, df: sr / nfft };
}
export function bandShare({ psd, df }, f1, f2) {
  let tot = 0, band = 0;
  for (let k = 1; k < psd.length; k++) { tot += psd[k]; const f = k * df; if (f > f1 && f < f2) band += psd[k]; }
  return band / tot;
}
export function peak(...ch) { let p = 0; for (const x of ch) for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p || a !== a) p = a !== a ? NaN : a; } return p; }
export function hasNaN(...ch) { return ch.some((x) => x.some((v) => !Number.isFinite(v))); }
/** RMS of [i0, i1) of one channel. */
export function rms(x, i0 = 0, i1 = x.length) { let s = 0; for (let i = i0; i < i1; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, i1 - i0)); }
export function corr(a, b) {
  const n = a.length; const ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return sab / Math.sqrt(saa * sbb);
}
