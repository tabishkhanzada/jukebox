STEP 4 DONE

Did:
- `src/dsp/rng.js` (mulberry32 + Box–Muller), `biquad.js` (RBJ low/high/band-pass, first-order Butterworth smoother), `envelope.js` (bilinear control curve under the line, 5 Hz smoothing, equal-power pan, master 3500 Hz low-pass, 1 s fades, peak ÷ 1.1·peak, sparse kernel adder).
- Engines (pure, stereo Float32Array at 44100 Hz): `airQuality.js` (Wind + Dust), `weather.js` (Wind + Whistle), `co2.js` (CO2 Hum + crackle), `space.js` (Star Twinkle, radar triggers thinned to the brightest per 40 ms). Caption-word functions in each.
- `src/dsp/render.js` (one entry point) + `src/dsp/worker.js` (Web Worker, transfers buffers). `src/core/wav.js` (16-bit stereo WAV writer + header reader).
- `tests/dsp.test.js` + `tools/audio_metrics.mjs` (Welch spectrum, band share, RMS, correlation). Rendered WAVs for listening: `tmp/wav/{airQuality,weather,co2,space}.wav`.

Self-check (sample videos, P = 4 s; Space 12 s × 2 turns):
- Peak ≤ 0.92, no NaN: PASS — all four peaks 0.909, no NaN.
- Energy above 3 kHz: PASS — Air Quality **1.44 %** (≤ 2) · Weather **0.07 %** (≤ 0.5) · CO2 **0.12 %** (≤ 1) · Space **< 0.001 %** (≤ 3).
- CO2 energy 150–1000 Hz: PASS — **72.5 %** (≥ 55).
- Pan test (L/R RMS, line at 2–12 % vs 88–98 % of a sweep): PASS — Air Quality 5.54 → 0.209 · Weather 5.04 → 0.201 · CO2 5.69 → 0.184.
- Loudness follows data (corr of strip value under the line vs 50 ms RMS): PASS — Air Quality **0.973** · Weather **0.949** · CO2 **0.984**.
- Silence rule (CO2 value 0 for ±0.2 s): PASS — 49 such windows, worst RMS **0.000 %** of the max (< 2 %).
- Determinism: PASS — same seed gives bit-identical output; seed 4 differs.
- Extra: Space makes 600 tinks in 24 s (= the 25/s ceiling; min gap 16.7 ms); an image with no stars gives total silence. WAV header = 2 ch / 44100 Hz / 16 bit and frames = buffer length.

Gaps fixed: none needed (all passed on the first run).

Decisions:
- Band-pass: wide bands = high-pass→low-pass (each 2nd-order Butterworth, like scipy order-2 band); narrow whistle bands (±7 %) = two cascaded RBJ band-passes with Q scaled so the −3 dB width equals the band.
- The one-pole smoothers (5 Hz, 0.2–0.3 Hz gusts) use the same bilinear first-order Butterworth as scipy `butter(1, fc)`. As in the reference, the very slow gust filters on white noise give only small gust swings; kept faithful (a listener may ask for more gusting).
- Audio length = frames × 0.25 s (as in the reference). For CO2 that is 39.25 s for a 39.33 s video; playback holds the last frame.
- **Space is UNVERIFIED** (new design, never heard). The dense cluster gives stars on every ray, so the tinks run at the 25/s ceiling the whole time; this is on the listening checklist.
- The Web Worker is exercised in the browser in Step 6 (it needs the picture instruments from Step 5 to load).

Next: Step 5 — picture mode.
