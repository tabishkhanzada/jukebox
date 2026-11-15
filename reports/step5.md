STEP 5 DONE

Did:
- `tools/build_layers.mjs` → `src/picture/legend-data.js` (generated from the OFFICIAL GIBS colormaps).
- `src/picture/layers.js` (4 layers: band name, swatch, value text, note, unit, instrument, sample, GIBS id), `classify.js` (CIELAB, ΔE76 nearest legend colour, cut-off 25, every 2nd pixel, no-data = alpha < 128 or max(R,G,B) < 30, band = mode, < 15 % valid → silence, optional crop %), `schedule.js` (32 slots, notes at 0, ⅓, ⅔ of a slot, zig-zag/straight, pan −0.9…+0.9, caption text), `src/dsp/instruments.js` (flute, water drop, soft bell, pad, marimba + `renderPicture`).
- `tests/picture.test.js`.

Legend source: **OFFICIAL** for all 4 layers. Band value ranges now used (Section 5A names and notes kept):
- Temperature (°C, flute): bands by the 5A thresholds on official values: <4.35 · 4.35–6.9 · 6.9–16.05 · 16.05–17.55 · 17.55–20.55 · 20.55–24.15 · 24.15–28.2 · ≥28.2 (inner edges shown as "≈").
- Rain (mm/hr, log scale, water drop): 0.1–0.67 · 0.67–1.26 · 1.26–2.37 · 2.37–4.47 · 4.47–18.8 · ≥18.8
- Snow (mm/hr, soft bell): 0.1–0.32 · 0.32–0.60 · 0.60–5.31 · 5.31–10.6 · 10.6–37.6 · ≥37.6
- Aerosol (AOD, pad): <0.105 · 0.105–0.24 · 0.24–0.375 · 0.375–0.51 · 0.51–0.65 · ≥0.65
- NDVI (marimba): <0.10 · 0.10–0.22 · 0.22–0.30 · 0.30–0.465 · 0.465–0.66 · ≥0.66
- Seed-colour → official-colour assignment needed **0 out-of-order fixes** on all four ramps.

Self-check:
- Swatch test (every official legend colour as a flat image → its band): PASS **100 %** — Temperature 215/215, Precipitation 220/220 (rain and snow both correct), Aerosol 152/152, NDVI 138/138. (2 NDVI colours for 0.98–1.0, RGB 0,24,0/0,24,1, are darker than the no-data limit max<30 and read as no data, as the guide's rule says.)
- Noise test (±8): PASS — Temperature 98.1 % · Precipitation 98.4 % · Aerosol 97.1 % · NDVI 98.5 % (≥ 95).
- Black image → no notes and zero output: PASS (all 4 layers).
- Schedule: PASS — zig-zag `NMS SMN NMS`, straight `NMS NMS NMS`; duration = sweep (8/16/40 s); 96 slots; notes at 0, ⅓, ⅔ of each slot.
- Sample renders (16 s sweep): PASS —
  - Temperature: 87 notes · peak 0.909 · >3 kHz 0.003 %
  - Precipitation: 57 notes · peak 0.909 · >3 kHz 0.000 %
  - Aerosol: 38 notes · peak 0.909 · >3 kHz 0.000 %
  - NDVI: 39 notes · peak 0.909 · >3 kHz 0.012 %
- Share of regions per band (human sanity check):
  - Temperature: band 3 blue 38.5 · band 8 red 25.0 · band 1 maroon 18.8 · silent 9.4 · band 7 orange 4.2 · band 6 yellow 3.1 · band 2 purple 1.0. Per row: middle (tropics) almost all **red/orange**, north and south rows blue/maroon → as expected.
  - Precipitation: rain band 1 55.2 · silent 40.6 · rain band 2 2.1 · rain band 3 1.0 · snow band 1 1.0 (light rain dominates a 2:1 thirds view; heavy cores are too small to win the mode).
  - Aerosol: silent 60.4 · band 1 26.0 · band 2 11.5 · band 3 2.1 (swath gaps = silent; low AOD dominates, as expected).
  - NDVI: silent 59.4 (ocean) · band 6 13.5 · band 2 9.4 · band 1 6.3 · band 5 6.3 · band 4 4.2 · band 3 1.0.
- Example caption: "Strip 1 of 32, north: ≈ 6.9–16.1 °C (blue), note E4".

Gaps fixed: none needed.

Decisions:
- Section 5A value text replaced by official values. Rain/snow (log scale) and AOD (0–0.7 detail) differ a lot from the 5A guesses; **NDVI value text is no longer UNVERIFIED** (official table; the 0.30 brown→green switch matches the owner's screenshot).
- Picture audio = sweep + 1 s tail so the last note can ring (the schedule itself is exactly the sweep length). No 1 s fade (it would cut strip 1's notes); peak normalisation and 3500 Hz low-pass as for video.
- The water drop glides exponentially from 1.6 f to f; every note gets a 1–20 ms edge fade to avoid clicks.

Next: Step 6 — frontend wiring.
