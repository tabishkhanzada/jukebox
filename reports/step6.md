STEP 6 DONE

Did:
- Wiring in `src/main.js` + new modules: `src/core/player.js` (Web Audio: AudioBuffer → source → Gain → speakers + MediaStreamDestination; the single clock), `src/core/synth.js` (Web Worker client, Cancel terminates the worker), `src/core/scan.js` (line position, radar angle, picture slot from time), `src/core/videoTypes.js` (titles, caption words, Colour → number → meaning rows), `src/ui/stage.js` (canvas: video/picture fitted, glowing line, lit region, radar + 30° trail), `src/ui/valuesPanel.js` (real `<table>`, active row highlighted, "Now:" line), `src/ui/caption.js` (aria-live, ≤ 1 update/s, last-20 transcript), `src/ui/controls.js`, `src/ui/exportBar.js` (placeholder until Step 7).
- Video mode: type, Sample/Upload, speed (Space: turn time 8–30 s + 1–3 turns), volume, Generate (processing panel with progress + Cancel), Play/Pause, Mute, line overlay, caption, values. The muted video element follows the audio clock (re-seeks if drift > 0.15 s). Features are cached, so changing the speed re-generates quickly.
- Picture mode: layer, Sample/Upload, sweep 8–40 s, Zig-zag/Straight, crop (uploads only), Generate, Play, scan line + lit north/middle/south region, caption ("Strip 12 of 32, south: ≈ 6.9–16.1 °C (blue), note E4"), band table with the playing band highlighted.
- Warning (Section 7): if > 98 % of strips/regions are silent, a note says the type/layer may be wrong.
- Keyboard shortcuts already wired (Space, G, M, ←/→), tested in Step 8.
- Tests: `tests/e2e.spec.js` block "Step 6" (11 tests). Fixtures: `tests/fixtures/not-a-video.txt`, `tests/fixtures/too-long.mp4` (301 s, 9 KB).

Self-check (Playwright, real Chromium; the line is found **in the canvas pixels**, not read from state):
- All 4 video samples → Generate → Play, line at ≈0.5/1.5/2.5/3.5 s: PASS — measured x equals the audio-clock x to **0.0 px** every time (tolerance ±4). Example Air Quality: t=0.610 → 195 px, 1.518 → 485, 2.618 → 837, 3.730 → 1193 (the line really moves).
  - Weather 217/486/867/1221 px, CO2 186/550/832/1199 px, all diff 0.0 px; the line covers 100 % of the rows.
  - Space radar: angle = audio clock exactly (16.5°, 49.8°, 91.8°, 184.9°); 100 % of line pixels on the expected ray, 0 % on a ray 20° away.
- All 4 picture samples → Generate → Play, 12 consecutive lit positions: PASS — `strip1-N strip1-M strip1-S strip2-S strip2-M strip2-N strip3-N strip3-M strip3-S strip4-S strip4-M strip4-N` (Temperature, Precipitation, NDVI; Aerosol the same order one slot later). No slot skipped; the outline colour #FFB703 was found in the canvas at every position.
- Switching type/layer re-renders the table and the caption: PASS (8/8: heading, row count/unit column and "… chosen. Press Generate sound." change each time).
- Wrong file / too long: PASS — .txt as video: "This file is not a video we can read. Please choose an MP4 or WebM video." · 301 s video: "This file is too long: maximum 5 minutes (this one is 5:01)." · .txt as picture: "This file is not a picture we can read. Please choose a PNG or JPEG map." `role="alert"`, no page errors, the sample still generates afterwards.
- Screenshots while playing: `reports/screens/step6-video-playing.png` (Weather: line at strip 20, caption "Strip 20 of 32: windy", Green row highlighted, Now: "strip 20/32 · value 0.48 · windy"); `reports/screens/step6-picture-playing.png` (Temperature: line at strip 12, south region outlined in yellow, Blue row highlighted, caption "Strip 12 of 32, south: ≈ 6.9–16.1 °C (blue), note E4").
- No console errors in any test. The Web Worker made every sound in these runs.

Gaps fixed:
- The values table wrapped value ranges and the active-row highlight missed the row-header cell → CSS fixed.
- Test-side: the outline pixel was sampled under the scan-line glow → the test now samples the outline end away from the line.

Decisions:
- Changing type/layer/source/speed clears the old sound (stage empty, Play disabled) and the caption says "Press Generate sound"; volume changes apply live.
- After Generate, focus moves to Play so Space plays at once.
- The CO2 audio (39.25 s) is 0.08 s shorter than the video; the video stops with it.
- `window.__jukebox` (read-only state + draw-now) is kept as a small test hook.

Next: Step 7 — export and download.
