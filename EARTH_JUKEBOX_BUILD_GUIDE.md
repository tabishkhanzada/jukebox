# EARTH INFORMATION JUKEBOX — COMPLETE BUILD GUIDE (v3)
*For Claude Code in VS Code. Read the WHOLE file before doing anything. This file replaces every earlier guide.*

Project: NASA Space Apps Challenge #14 "The Earth Information Jukebox" — a website that turns NASA Earth images and videos into **sound** (data sonification), so blind and low-vision people can "hear" the data.
Owner works in Roman Urdu/English and is **not a musician**, so every sound must be easy to understand, not "pretty music".

---

## 0. HOW YOU MUST WORK (rules, no exceptions)

1. **Plan first.** Before writing code, write `PLAN.md` (what you will build, in what order, why). Then build.
2. **Header comment in every code file**: 2–5 lines saying what the file does, in simple English.
3. **SELF-CHECK after every step.** Run the checks listed in that step. If one fails, fix it and re-run. Do NOT start the next step until all pass. Write the result in `reports/stepN.md`.
4. **Never invent data.** Colour tables, value ranges, layer IDs, URLs: use the ones in this file or verify them. If something is unverified, write "UNVERIFIED" in the report and in the UI tooltip.
5. **You cannot hear audio.** Never claim a sound "sounds good". Only claim what you measured (peak, spectrum, panning, timing). Put every "a human must listen" item in `reports/LISTEN_CHECKLIST.md` (Section 8).
6. **Keep reports short.** Format for every step:
   `STEP N DONE` / `Did:` / `Self-check:` (each check PASS/FAIL with the number) / `Gaps fixed:` / `Decisions:` / `Next:`
7. **Windows + sandbox.** The owner uses Windows. If a command fails with EPERM / access denied, stop and tell the owner: *reply "allow sandbox bypass" (or use /sandbox)*. Do not work around it silently.
8. **Do not ask questions** unless blocked. Take the most reasonable choice, write it under `Decisions:`, continue.
9. Only these assets exist: **4 videos and 4 pictures** (Section 2). Do not add more layers or types.
10. Everything runs **in the browser** (static site, no server, no upload to any server). Uploaded files never leave the user's computer.

---

## 1. THE PLAN IN PLAIN WORDS (what we build and why)

The site has **two modes** on the front page: **Video** and **Picture**.

**Video mode.** The user picks a video type from a dropdown (Air Quality, Weather, Carbon Dioxide, Space), then either uses the built-in sample video or uploads a video. The site:
1. cuts the video into frames (4 per second),
2. splits each frame into 32 vertical strips (left to right),
3. turns the colours of each strip into one number 0–1 using the rule for that video type,
4. moves a **vertical line from left to right** across the video (one sweep = 4 s by default); only the strip under the line makes sound,
5. makes a **natural sound** (wind, rumble, "tink"), NOT music; louder/rougher = more of the thing (more dust, stronger wind, more CO2),
6. sends the sound left/right ear according to the line position,
7. produces a **video with the moving line and the sound**, which the user can play and **download**.
(Space is different: the line is a **radar line rotating from the centre**, and each star it touches makes a small "tink".)

**Picture mode.** The user picks one of 4 layers (Temperature, Precipitation, Aerosol, Vegetation), uses the built-in sample picture or uploads a picture of that layer. The site:
1. reads each pixel's colour and finds which **legend band** it belongs to (e.g. "orange = 24.4–27.9 °C"),
2. scans with a **vertical line left to right**; each strip is split into 3 parts (north / middle / south) and plays **3 short notes**; the note depends on the band (cold = low note, hot = high note); **each layer has its own instrument**,
3. default pattern is **zig-zag** (even strips play north→south, odd strips south→north); a "Straight" switch exists,
4. produces a **video** (picture + moving line + sound) that can be played and downloaded.

Why this design: sonification works best as a quick "audio overview" together with text and visuals; so the site always shows a live text caption and a values table next to the sound.

---

## 2. FINAL DECISIONS (do not change)

| Topic | Decision |
|---|---|
| Video types (dropdown) | **Air Quality (PM2.5)**, **Weather (Near-surface wind)**, **Carbon Dioxide (CO2)**, **Space (Stars)** — 4 only. No "Other/Auto". |
| Picture layers (dropdown) | **Temperature (Sea Surface)**, **Precipitation (Rain & Snow)**, **Aerosol (Air Quality)**, **Vegetation (NDVI)** — 4 only. |
| Sources | Each mode has **Sample** (built-in file) or **Upload**. The type/layer is ALWAYS chosen from the dropdown. For pictures, the uploaded image must be a map of that layer with the official legend colours. |
| Video line | Vertical line, left → right, 4 s per sweep (user can set 2–10 s). Space: radar, 12 s per turn (8–30 s). |
| Picture scan | Vertical line, 32 strips × 3 sub-regions. **Zig-zag is the DEFAULT** (owner's request) with a "Straight" toggle (straight is easier to follow; mention this in the help text). |
| Driver of sound | **Colour and how dark/dense it is.** NOT movement (the CO2 camera zooms, so movement would be wrong). |
| Sound style | Natural, soft, low. No melody, beat or song in Video mode. Picture mode uses single notes (one instrument per layer). |
| Output | Both modes create a playable video (canvas + audio) with download. MP4 if the browser can record it, otherwise WebM. Also "Download audio (WAV)". |
| Theme | Unique **night + glass** theme (Section 6). |
| Languages | UI in English. |
| Credit | Footer: "Visuals and data: NASA (SVS, GMAO, Worldview/GIBS). Not an official NASA product." Check each SVS page's credit line and put it in `CREDITS.md`. |

---

## 3. TECH STACK AND FOLDER LAYOUT

- **Vite + vanilla JavaScript (ES modules)**, no UI framework. Node ≥ 20.
- **Web Audio API** for playback; all sound is synthesised with **pure JS functions** (so it can be unit-tested in Node and run in a Web Worker).
- Tests: **vitest** (DSP + classification), **Playwright** (screenshots, line movement, downloads), **@axe-core/playwright** (accessibility). `ffmpeg-static` npm package for video transcoding (do not rely on a system ffmpeg).
- Fonts: bundle with `@fontsource` (e.g. `space-grotesk`, `inter`). No external CDN at runtime.

```
jukebox/
  EARTH_JUKEBOX_BUILD_GUIDE.md     (this file)
  reference_dsp/                   (the owner's Python reference scripts: unzip reference_dsp.zip here)
  source/videos/                   (the owner's 4 original videos go here)
  source/pictures/                 (4 pictures, see Step 1)
  source/legends/                  (legend screenshots, see Step 1)
  PLAN.md  CREDITS.md  README.md
  reports/step0.md ... step9.md  LISTEN_CHECKLIST.md
  public/samples/videos/           (compressed copies, no audio)
  public/samples/pictures/
  src/
    main.js  styles/ (tokens.css, glass.css, layout.css)
    ui/      (modeSwitch, controls, stage, valuesPanel, caption, exportBar)
    core/    (frames.js, features.js, scan.js, player.js, recorder.js, wav.js)
    dsp/     (rng.js, biquad.js, envelope.js, airQuality.js, weather.js, co2.js, space.js, instruments.js)
    picture/ (layers.js, classify.js, schedule.js)
  tests/  (dsp.test.js, features.test.js, picture.test.js, e2e.spec.js)
```

---

## 4. STEPS

### STEP 0 — Environment and plan
Do:
1. Confirm the working folder is the owner's `jukebox` folder (Windows). Print Node, npm versions.
2. Unzip `reference_dsp.zip` into `reference_dsp/` (if not already). Read every file in it: they are the **exact recipes behind the owner-approved demos** (Section 5B explains them).
3. `npm create vite@latest . -- --template vanilla` (keep existing files), `npm i`, then install: `vitest`, `playwright`, `@axe-core/playwright`, `ffmpeg-static`, `@fontsource/space-grotesk`, `@fontsource/inter`. Run `npx playwright install chromium`.
4. Test that Node can run a one-line script, that `ffmpeg-static` runs (`-version`), and that `npm run dev` starts.
5. Write `PLAN.md` (1 page) and `reports/step0.md`.

SELF-CHECK: node ≥ 20 · `npx vitest run` runs (even with 0 tests) · ffmpeg-static prints a version · dev server answers on localhost · Playwright can open `about:blank`.
If anything is blocked by EPERM: STOP and give the owner the sandbox message from Rule 7.

### STEP 1 — Assets (4 videos, 4 pictures, legends)
**Videos** (owner supplies the originals in `source/videos/`; names may differ slightly, match by keyword):
| Type | Expected file | Notes |
|---|---|---|
| Air Quality | `MC01_stage4_GMAO_pm25_2048x1024_en.mp4` | 31 s, 12 fps, GMAO logo top-left, date label bottom-left |
| Weather | `MC02_stage3_GMAO_near_surface_wind_2048x1024_en.mp4` | 31 s, 12 fps, same logo/date label |
| CO2 | `dyamondPointCloud_..._dyamond_co2_anim_globe_zoomwest_3x3hyperwall_1080p30_2.mp4` | 39.2 s, 30 fps, globe zooms toward North America |
| Space | `Caldwell73_2K_Final.webm` | NASA's own sonified video (it has NASA audio and a white rotating line). Source: https://svs.gsfc.nasa.gov/13786/ |

Do:
1. For each video make a compressed sample: `ffmpeg -i IN -an -vf "scale=1024:-2" -r 12 -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart OUT.mp4` → `public/samples/videos/{air-quality,weather,co2,space}.mp4`. Target ≤ 12 MB each. **`-an` strips audio**: for Space we must NOT use NASA's audio; the sound is ours.
2. **Space special:** build a clean star image: take 40 frames evenly across the video, compute the **per-pixel temporal median** (this removes NASA's moving white line), save as `public/samples/pictures/space-stars-clean.png` (square crop of the central 1:1 area, 1024×1024). Also keep the median logic in `src/core/frames.js` (it is needed for uploaded star videos too).
3. **Pictures** (4 maps, one data layer each, no UI, no basemap if possible, black = no data), 2048×1024 PNG:
   - Try the Worldview Snapshot API (the sandbox may block NASA; if so skip to 4):
     `https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=<LAYER_ID>&CRS=EPSG:4326&TIME=2026-11-06&BBOX=-90,-180,90,180&FORMAT=image/png&WIDTH=2048&HEIGHT=1024`
   - Layer titles to find (IDs are **UNVERIFIED** here; find them in `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities` by title, never guess):
     1. Sea Surface Temperature — "Sea Surface Temperature (GHRSST / Multi-mission, v4.1 STD)" (earlier guess: `GHRSST_L4_MUR_Sea_Surface_Temperature`)
     2. Precipitation Rate — "Precipitation Rate (IMERG)" (earlier guess: `IMERG_Precipitation_Rate`)
     3. Aerosol — "Deep Blue Aerosol Optical Depth (Land and Ocean)" **NOAA-21 / VIIRS** (v2.1 STD)
     4. Vegetation — "Normalized Difference Vegetation Index (NDVI) (rolling 8-day)" **NOAA-21 / VIIRS** (v2 NRT)
   - Use a date that has data (2026-11-06 had data for these layers; verify the image is not empty).
4. If the network is blocked: ask the owner to put 4 pictures in `source/pictures/` named `temperature.png`, `precipitation.png`, `aerosol.png`, `vegetation.png`. How (tell the owner): in Worldview keep ONLY that layer, remove true-colour, pick a date with data, click the camera icon → Take snapshot. Crop away all UI so only the map remains.
5. **Legends.** Try the official colormap XML (`https://gibs.earthdata.nasa.gov/colormaps/v1.3/<LAYER_ID>.xml`). If blocked, use the legend screenshots in `source/legends/` if present, else the **seed ramps in Section 5A** (already extracted from the owner's Worldview screenshots). Whatever you use, write it in `reports/step1.md` as OFFICIAL / SCREENSHOT / SEED.
6. Save credits for every file in `CREDITS.md` (title, NASA page URL, credit line; write "UNVERIFIED" if you did not read it).

SELF-CHECK: every sample video plays (ffprobe duration > 5 s, no audio stream) · each picture is not empty (≥ 5 % non-black pixels) and is 2:1 · the Space clean image has no long straight white line (compare max column brightness variance vs a raw frame; report the numbers) · `CREDITS.md` has 8 entries · total `public/samples` size ≤ 60 MB.

### STEP 2 — Design system and app shell (night + glass)
Build the empty app shell with the design tokens and layout from **Section 6**: header, **segmented mode switch (Video | Picture)**, left controls panel, centre stage, right values panel, bottom transport bar, footer credit. No sound yet.

SELF-CHECK: Playwright screenshots at 1440×900 and 390×844 (read them and describe what you see) · all text contrast ≥ 4.5:1 (compute from tokens, list the numbers) · tab order is logical · `prefers-reduced-motion` and `prefers-reduced-transparency` handled (screenshot with each emulated) · no console errors.

### STEP 3 — Video features (frames → 32 strips → numbers 0–1)
Implement `src/core/frames.js` and `src/core/features.js` exactly as in **Section 5B (common part + the rule for each type)**.
- Frame sampling in the browser: hidden muted `<video>`, set `currentTime = i*0.25`, await `seeked`, `drawImage` to a 256×128 canvas (Space: 256×256 from the median image), read pixels. Show a progress bar. Cap upload: ≤ 5 min and ≤ 200 MB, formats mp4/webm; show friendly errors.
- The feature functions are **pure** (take RGBA arrays), so they can be tested in Node with PNG frames extracted by `ffmpeg-static`.
- Build `tests/features.test.js`: extract frames from the 4 samples at 4 fps, run the same functions, compare with the browser result (tolerance 0.03).

SELF-CHECK (print the numbers in the report):
- Output shape `[frames × 32]`, all values in 0..1, no NaN.
- **Weather:** the left-most eighth of the map has the highest mean strength (reference run: ≈0.72 vs 0.33–0.49 elsewhere; investigate if the gap is < 0.15).
- **CO2:** mean amount per quarter of the video rises (reference ≈ 0.13 → 0.28 → 0.41 → 0.42, tolerance ±0.08); ≈ 18 % of strips are silent (< 0.02) in the reference run.
- **Air Quality:** strips differ inside a frame (mean std across strips > 0.1).
- **Space:** at least 200 stars detected on the clean image and none along a straight line longer than 100 px.
- The logo and date-label areas are excluded (test: paint them white in a test frame, values must not change).

### STEP 4 — Video sound engines (4 types)
Implement `src/dsp/*` from **Section 5B** as pure functions returning stereo `Float32Array`s at 44100 Hz. Run synthesis in a Web Worker for the browser. Add `src/core/wav.js` (16-bit stereo WAV writer).
- Shared pieces: seeded RNG (`mulberry32` + Box–Muller), RBJ biquads (low/high/band), one-pole smoother, bilinear sampling of the feature grid in time and strip, master low-pass 3500 Hz, 1 s fade in/out, peak normalised to ≤ 0.9 (divide by `1.1 × peak`).
- Match the reference scripts' formulas and constants. Small numeric differences (biquad vs Butterworth) are fine; the **spectrum numbers below are the contract**.

SELF-CHECK (render the 4 sample videos and print):
- Peak ≤ 0.92 and no NaN.
- Energy above 3 kHz: Air Quality ≤ 2 %, Weather ≤ 0.5 %, CO2 ≤ 1 %, Space ≤ 3 %.
- CO2: ≥ 55 % of the energy lies between 150 and 1000 Hz (so it is audible on phone speakers).
- **Pan test:** during one sweep, the left-channel/right-channel RMS ratio goes from > 2 (line at the left) to < 0.5 (line at the right).
- **Loudness follows data:** compute the correlation between the strip value under the line and the short-time RMS of the output; must be ≥ 0.5 for Air Quality, Weather and CO2.
- **Silence rule:** where the value is 0 (CO2 black/white areas) the RMS is < 2 % of the max.
- Determinism: same seed → identical output.

### STEP 5 — Picture mode (legend → band → note, zig-zag, instruments)
Implement `src/picture/layers.js` with the 4 layers from **Section 5A** (bands, notes, ramps), `classify.js`, `schedule.js`, and the instruments in `src/dsp/instruments.js` (Section 5C).
- Classification: for every strip (32) and sub-region (north/middle/south = top/middle/bottom third) take pixels (every 2nd pixel), skip **no-data** (alpha < 128 or max(R,G,B) < 30), convert to CIELAB, find the nearest ramp sample (ΔE76). If ΔE > 25 treat as no-data. Map the sample to its band. The region's band is the **most frequent band (mode), not the average**. If valid pixels < 15 % of the region → silence.
- Precipitation uses two ramps (rain and snow): the nearest sample decides which instrument plays.
- Schedule: sweep length default 16 s → 0.5 s per strip; the 3 notes of a strip start at 0, ⅓, ⅔ of the slot. Pattern **zig-zag**: strips 0,2,4… play north→south, strips 1,3,5… play south→north. Pattern **straight**: always north→south. Pan = −0.9 … +0.9 by strip.
- Optional crop: four number inputs (left/top/right/bottom %) for uploaded pictures (the samples are already clean).

SELF-CHECK:
- Swatch test: feed every band's swatch colours as flat images → the classifier returns exactly that band (100 %).
- Noise test: add ±8 random colour noise → still ≥ 95 % correct.
- Black image → silence everywhere (no notes).
- Schedule test: for strips 0,1,2 the note order is N-M-S, S-M-N, N-M-S in zig-zag and N-M-S ×3 in straight; total duration = sweep length.
- Render the 4 sample pictures: peak ≤ 0.92, energy above 3 kHz ≤ 3 %, number of notes printed per picture (a picture with 0 notes = FAIL).
- Print, for each sample picture, the % of regions per band (for the report: a human sanity check, e.g. Temperature should be mostly mid/high bands in the tropics).

### STEP 6 — Frontend wiring (both modes)
Connect everything to the shell from Step 2 (**Section 6 is the spec**).
- Video mode: dropdown (4 types) · source (Sample / Upload) · scan speed · volume · **Generate** · Play/Pause · line overlay · live caption · values panel · export bar.
- Picture mode: dropdown (4 layers) · source (Sample / Upload) · sweep length · pattern toggle (Zig-zag default / Straight) · volume · Generate · Play/Pause · scan overlay (line + the active sub-region lit) · caption · values panel · export bar.
- Playback: decode → `AudioBuffer` → `AudioBufferSourceNode` → `GainNode` → destination (and a `MediaStreamDestination` for export). The video element is muted; keep it in sync with the audio clock (correct drift if > 0.15 s). The overlay line position comes from the audio clock: `x = ((t mod P)/P) × width`.
- A **processing state** with progress and a Cancel button. Errors are shown in plain words ("This file is too long: maximum 5 minutes").

SELF-CHECK (Playwright, real browser):
- Choose each of the 4 video samples → Generate → Play: the overlay line x at t=0.5, 1.5, 2.5, 3.5 s is within ±4 px of the expected value (**the line must really move**).
- Choose each of the 4 picture samples → Generate → Play: the lit sub-region changes in the expected zig-zag order (log 12 consecutive positions).
- Switching type/layer re-renders the values table and the caption words.
- Upload a wrong file (a .txt) and a too-long video → friendly error, no crash.
- Screenshots of both modes in playing state (read them).

### STEP 7 — Export and download
Implement `src/core/recorder.js`: draw the stage (video frame or picture + overlay) to a canvas each animation frame, `canvas.captureStream(30)` + the audio `MediaStreamDestination` track → `MediaRecorder`. Choose the mime type in this order: `video/mp4;codecs=avc1`, `video/webm;codecs=vp9,opus`, `video/webm`. Recording runs in real time with a progress bar and finishes by itself. Buttons: **Download video** (file name `earth-jukebox-<type>-<date>.<ext>`), **Download audio (WAV)** (instant, from the buffer). If `MediaRecorder` is unavailable, hide the video button and say why.

SELF-CHECK: record the Air Quality sample → file > 200 KB, has an audio track and a video track (check with ffprobe from `ffmpeg-static`), duration within ±1.5 s of the expected · WAV opens (header check) and equals the rendered buffer length · repeat for one picture and for Space · the download works twice in a row.

### STEP 8 — Accessibility and quality pass
- Keyboard only: Space play/pause · ←/→ move the line by one strip (when paused) · M mute · G generate · Tab order logical; visible focus ring; no keyboard trap.
- Live caption in an `aria-live="polite"` region, updated at most once per second (wording table in Section 6).
- All controls have labels; the mode switch is a proper `radiogroup`; errors use `role="alert"`; the canvas has a text alternative; the values table is a real `<table>` with headers.
- Colour is never the only carrier: the values table shows the colour swatch **and** its name.
- `prefers-reduced-motion`: no background animation; `prefers-reduced-transparency`/`forced-colors`: solid panels.
- Performance: first load < 3 s on a normal connection (sample videos load only when chosen); no layout shift.

SELF-CHECK: axe-core = 0 critical and 0 serious on both modes · Lighthouse accessibility ≥ 95 · keyboard-only run-through passes (script it) · screenshots at 390 px wide show no horizontal scroll.

### STEP 9 — Docs, listening checklist, deploy
- `README.md`: what it is, how to run, how it works (Section 1 in simple words), limits (Section 7), credits.
- `reports/LISTEN_CHECKLIST.md` from Section 8.
- Build (`npm run build`), preview, and give two deploy options (GitHub Pages and Netlify) with exact commands. Deploy only if the owner already connected an account; otherwise stop at the build.
- 60-second demo script for the Space Apps video: Video mode (Air Quality) → Picture mode (Temperature) → download → keyboard use.

SELF-CHECK: clean clone → `npm ci && npm run build` succeeds · preview serves all 8 samples · final full test run (vitest + Playwright) green · list every item still UNVERIFIED.

---

## 5. REFERENCE DATA

### 5A. PICTURE LAYERS — colours, bands, notes, ramps
Notes (frequencies): C4 261.63 · D4 293.66 · E4 329.63 · G4 392.00 · A4 440.00 · C5 523.25 · D5 587.33 · E5 659.25.
Value ranges below are **approximate** unless marked (the two end values of each legend are real). The classifier only needs the **band**; the table's value text is shown to the user as "≈". Refine from the official colormap XML when available.

**1) Temperature — Sea Surface Temperature (instrument: soft flute).** Legend `< 0 °C` … `≥ 32 °C` (real). 8 bands, thresholds on value:
| # | Colour | Value | Note |
|---|---|---|---|
| 1 | Maroon | < 4.3 °C | C4 |
| 2 | Purple | 4.3 – 6.85 | D4 |
| 3 | Blue | 6.85 – 16 | E4 |
| 4 | Cyan | 16 – 17.5 | G4 |
| 5 | Green | 17.5 – 20.6 | A4 |
| 6 | Yellow | 20.6 – 24.1 | C5 |
| 7 | Orange | 24.1 – 28.2 | D5 |
| 8 | Red | ≥ 28.2 | E5 |
Ramp: use `reference_dsp/legend_table_sst_rain.csv` rows with `layer=sst_C` (64 points: value,R,G,B).

**2) Precipitation — IMERG (instrument: rain = "water drop", snow = "soft bell").** Both legends `0.1 … ≥ 53.0 mm/hr` (real). 6 bands each, notes C4 D4 E4 G4 A4 C5. Ramp sample = `[R,G,B,band]`.
RAIN bands: 1 Green 0.1–16 · 2 Lime 16–22 · 3 Yellow 22–27 · 4 Orange 27–33 · 5 Red 33–45 · 6 Dark red 45–53+
```json
"rain": [[0,123,72,1],[0,156,20,1],[53,187,0,1],[163,220,0,2],[253,202,0,3],[255,108,31,4],[255,19,19,5],[200,0,0,5],[131,0,0,6],[57,0,0,6]]
```
SNOW bands: 1 Light cyan 0.1–9 · 2 Sky blue 9–16 · 3 Blue 16–31 · 4 Violet 31–38 · 5 Purple 38–46 · 6 Dark purple 46–53+
```json
"snow": [[170,249,239,1],[134,224,238,1],[106,180,223,2],[81,126,201,3],[68,84,206,3],[77,54,220,3],[107,25,233,4],[123,9,183,5],[112,6,125,5],[63,3,54,6]]
```

**3) Aerosol — Deep Blue Aerosol Optical Depth, NOAA-21/VIIRS (instrument: soft pad "hum").** Legend `< 0.0 … 5.0` (real; GIBS allows −0.70…5.00). Most of the planet is < 1, so low notes will dominate: that is correct. Bands (approximate equal split): 1 Pale yellow 0–0.8 · 2 Yellow/Amber 0.8–1.7 · 3 Orange 1.7–2.5 · 4 Red-orange 2.5–3.3 · 5 Red 3.3–4.2 · 6 Dark red 4.2–5.0 → notes C4 D4 E4 G4 A4 C5.
```json
"aerosol": [[255,251,193,1],[255,236,135,1],[255,219,101,2],[255,195,70,2],[255,163,47,3],[255,131,34,3],[255,94,26,4],[250,53,18,4],[233,24,12,5],[206,5,12,5],[171,0,14,6],[131,0,14,6]]
```

**4) Vegetation — NDVI rolling 8-day, NOAA-21/VIIRS (instrument: marimba).** The legend's end values were NOT visible: only the brown→green switch at **≈ 0.29–0.295** is real. Everything else is a typical-NDVI guess → mark the value text "≈, UNVERIFIED". Bands: 1 White/pink-grey `< 0.1` (barren, sand, snow) · 2 Light tan 0.1–0.2 · 3 Brown 0.2–0.29 · 4 Light green 0.3–0.45 · 5 Green 0.45–0.6 · 6 Dark green 0.6–0.8+ → notes C4 D4 E4 G4 A4 C5.
```json
"ndvi": [[239,231,232,1],[225,217,213,1],[225,210,197,1],[215,196,179,2],[200,181,165,2],[180,165,149,2],[177,152,131,2],[172,141,116,3],[161,128,100,3],[167,204,76,4],[150,186,33,4],[120,173,0,4],[93,163,0,5],[83,151,0,5],[67,141,0,5],[51,131,0,5],[33,120,1,6],[18,110,1,6],[5,100,1,6],[0,90,1,6]]
```
No-data for NDVI/others is black or transparent only (white is a real NDVI band).

### 5B. VIDEO TYPES — common pipeline and the 4 recipes
Read the Python files in `reference_dsp/` first; this section is their summary. If this text and a script disagree, the script wins and you note it in the report.

**Common pipeline.** Frames at 4/s (step 0.25 s) · each frame split into 32 vertical strips · per-strip number `v` (rule per type) · normalise all strip values of the video by the **98th percentile** (Weather/Air Quality: by the 2nd–98th percentile range) and clip to 0..1 · build a control curve `h(t)` by bilinear interpolation: time between frames and position between strips, where the strip position is `x = (t mod P)/P` with `P` = sweep length (4 s) · smooth `h` with a 5 Hz one-pole low-pass, clip 0..1 · pan `= −0.9 + 1.8·x` (equal-power: `L = cos((pan+1)π/4)`, `R = sin((pan+1)π/4)`) · mix, master low-pass 3500 Hz, fade 1 s, peak normalise.
Masks (fractions of the frame, GMAO videos): logo = `x < 0.186, y < 0.117`; date label = `x < 0.264, y > 0.879`. These pixels are ignored.
Median filter (3×3 on each channel or on grey) before measuring, to remove thin coast/border lines.

**Air Quality (PM2.5)** — sound "Wind + Dust". `v` = mean over valid pixels of `1 − luminance/255` (darker = more dust). Normalise by 2nd–98th percentile.
```
gust  = clip(1 + lowpass0.25Hz(noise)·1.5, 0.6, 1.4)
wind  = lowpass700(highpass120(noise)) · (0.05 + 0.45·h^1.2) · gust
grit  = bandpass[700,2200](noise)      · 0.15·h^2 · gust
air   = lowpass900(noise)              · 0.03·(1 − h)
ticks = impulses at rate 30·h^2 per second, each a 4 ms noise burst · exp(−t/1 ms) · 0.25
out   = wind + grit + air + ticks
```
Caption words by `h`: <0.15 "clean air", <0.4 "light haze", <0.65 "moderate dust", <0.85 "heavy dust", else "very heavy dust".

**Weather (near-surface wind)** — sound "Wind + Whistle". The colours: dark navy/black = calm, blue, cyan, green, yellow, orange, red = strongest. Per pixel: HSV; `strength = clip(1 − hue/270, 0, 1)` (blue≈0.17, cyan≈0.33, green≈0.56, yellow≈0.78, orange≈0.89, red=1); if `V < 0.28` → strength 0 (calm); a pixel is **valid** if `S ≥ 0.30` or `V < 0.28` (grey/white land is ignored). `v` = mean strength over valid pixels (0 if < 50 valid pixels in the strip). Normalise by 2nd–98th percentile.
```
gust    = clip(1 + lowpass0.3Hz(noise)·2.2, 0.4, 1.7)
whoosh  = lowpass600(highpass80(noise))   · (0.04 + 0.5·h^1.3) · gust
mid     = bandpass[300,1100](noise)       · 0.10·h^1.6 · gust
whistle = Σ w_i · bandpass[fc_i·0.93, fc_i·1.07](noise),  fc = 450, 700, 1000 Hz
          w_i = clip(1 − |h − c_i|/0.3, 0, 1), c = 0.25, 0.55, 0.85;  then × 1.4·h^1.5 · clip(gust, 0.5, 1.5)
calm    = lowpass500(noise) · 0.025·(1 − h)
out     = whoosh + mid + whistle + calm
```
Caption words: <0.15 "calm", <0.4 "light breeze", <0.65 "windy", <0.85 "strong wind", else "storm-force wind".

**Carbon Dioxide (CO2)** — sound "CO2 Hum". Colours: golden/brown haze = CO2 (thicker/brighter = more), orange/red patches = high CO2, white/grey = snow (NOT CO2), black = space. No movement is used (camera zooms). Per pixel (HSV, hue in degrees):
```
warm = hue ≤ 60 or hue ≥ 345
haze = warm and S ≥ 0.35 and V ≥ 0.12
hot  = warm and S ≥ 0.60 and V ≥ 0.70 and hue ≤ 32
val  = 0.15 + 0.45·clip((V − 0.12)/0.5, 0, 1)  for haze;   0.65 + 0.35·clip(S,0,1) for hot;  else 0
amount (a) = mean val over ALL pixels in the strip;  hotfrac (hh) = mean(hot);  each normalised by its 98th percentile
```
```
swell  = clip(1 + lowpass0.2Hz(noise)·2.5, 0.7, 1.3)
rumble = bandpass[70,450](noise)·3.0 · 0.55·a^1.2 · swell
airy   = bandpass[300,900](noise)·2.0 · 0.18·a^1.6 · swell
oo     = (sin(2π·110·t) + 0.6·sin(2π·165.7·t)) · 0.10·a
crackle= impulses at rate 18·hh^1.5 /s, each = lowpass1800(noise) 10 ms · exp(−t/3 ms) · random(0.4–1) · 1.2
out    = rumble + airy + oo + crackle
```
Silent (gain 0) where `a = 0`. LESSON: a buzzy stack of harmonics at 60–85 Hz sounded bad and was inaudible on phones; keep this soft rumble. Caption words: a<0.05 "no CO2 in view", <0.3 "thin CO2", <0.6 "moderate CO2", else "dense CO2"; add ", hotspots" if hh > 0.3.

**Space (Stars)** — sound "Star Twinkle". **NEW, never tested: mark UNVERIFIED in the report.** Input: the clean median star image (Step 1). Radar line from the image centre, 12 s per turn (8–30), starting at 12 o'clock, clockwise.
1. `R = min(w,h)/2`. For each of 720 angle bins sample the ray from the centre to radius R in 1-px steps; brightness `b = max(R,G,B)/255` after a 3×3 median filter.
2. A **star** = local maximum along the ray over ±2 px with `b ≥ 0.5`. Keep the 2 brightest per bin: `(r_norm = r/R, b, x_norm = star x / width)`.
3. Time of a bin = `bin/720 · P`. Thin the triggers: keep only the brightest one in every 40 ms window (max ≈ 25 tinks per second) so it never turns into mush.
4. Each tink: `f = 400 · 2^(2·r_norm)` Hz (400–1600, continuous, NOT musical notes) sine, amplitude `0.15 + 0.55·b`, attack 1 ms, decay `exp(−t/60 ms)`, plus a second partial at `2.76·f`, level 0.3, decay 25 ms. Pan = `−0.9 + 1.8·x_norm`. Duration 0.25 s.
5. No stars under the line = silence. Output length = 2 turns by default (1–3 selectable). Stage shows the clean star image with a rotating radar line and a faint trail of the last 30°.
Caption words: "bright star, near the centre / far from the centre", "no stars on the line".

### 5C. PICTURE INSTRUMENTS (one note = one short sound, 44100 Hz)
All notes then pass through the same master low-pass (3500 Hz) and peak normalisation. Note length ≤ the strip's slot ÷ 3 is NOT required; overlap is fine.
- **Flute (Temperature):** `sin(f)+0.25·sin(2f)+0.08·sin(3f)`, vibrato 5 Hz ±0.4 %, faint breath noise (bandpass 2–4 kHz at −30 dB), attack 40 ms, release 150 ms, length 0.45 s, gain 0.5.
- **Water drop (Rain):** sine gliding from `1.6·f` to `f` in 80 ms, decay `exp(−t/90 ms)`, length 0.3 s, gain 0.55.
- **Soft bell (Snow):** partials `f × (1, 2.76, 5.4, 8.93)`, amplitudes `(1, .5, .25, .12)`, decays `(0.9, .5, .3, .2) s`, length 0.8 s, gain 0.35.
- **Pad (Aerosol):** `sin(f) + sin(1.003 f) + 0.5·sin(0.5 f)`, attack 120 ms, release 250 ms, low-pass 1200 Hz, length 0.6 s, gain 0.4.
- **Marimba (NDVI):** `sin(f) + 0.35·sin(4f)·exp(−t/40 ms) + 0.1·sin(10f)·exp(−t/15 ms)`, main decay `exp(−t/150 ms)`, length 0.4 s, gain 0.55.
Caption for pictures: `"Strip 12 of 32, north: ≈ 24.4–27.9 °C (orange), note D5"`. Instruments are the owner's **suggestion**; they may change after listening.

---

## 6. FRONTEND SPEC — "NIGHT GLASS"

**Look.** A calm night sky with frosted-glass panels.
- Background: vertical gradient `#070B1A → #101A3A`, two blurred aurora blobs (cyan `#4CC9F0` at 12 % opacity, violet `#7B61FF` at 10 %) drifting very slowly (off when reduced motion), plus a very faint star-dot pattern (SVG/CSS, < 2 KB).
- **Glass panel:** `background: rgba(255,255,255,0.07); backdrop-filter: blur(18px) saturate(140%); border: 1px solid rgba(255,255,255,0.16); border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)`. Provide a solid fallback (`rgba(16,26,58,0.96)`) when `prefers-reduced-transparency` or no `backdrop-filter`.
- Colours (tokens): `--bg #0B1020`, `--panel #131B36`, `--text #EAF0FF`, `--muted #A9B4D6`, `--accent #4CC9F0` (focus, line), `--accent2 #FFB703` (play, highlights), `--ok #5BE3A4`, `--err #FF6B6B`. Layer accents (colour-blind safe, Okabe-Ito): Temperature `#E69F00`, Precipitation `#56B4E9`, Aerosol `#D55E00`, Vegetation `#009E73`. Verify contrast ≥ 4.5:1 for text on the real blurred panel (measure in a screenshot, not just tokens).
- Type: Space Grotesk (headings), Inter (text), tabular numbers for values. Base 16 px, line-height 1.5.
- Motion: 150–250 ms ease; the scan line has a soft glow; no flashing > 3 Hz.

**Layout (desktop ≥ 1100 px).** Header: logo "Earth Information Jukebox" + small tagline "Hear the planet" + the **segmented switch Video | Picture** (large, centred). Three columns: **Controls** (left, 300 px) · **Stage** (centre, flexible, 16:9 canvas with the line overlay, under it the transport bar) · **Values** (right, 340 px). Below the stage: **Live caption** (large text) and the **export bar**. Footer: credit line. Mobile: single column in the order Mode → Controls → Stage → Caption → Values → Export.

**Controls — Video mode:** Type dropdown (Air Quality (PM2.5) / Weather (Near-surface wind) / Carbon Dioxide (CO2) / Space (Stars)) · Source radio (Sample / Upload) + file button (accept `video/mp4,video/webm`) · Scan speed slider 2–10 s (Space: "Turn time" 8–30 s) · Volume · **Generate sound** (primary button).
**Controls — Picture mode:** Layer dropdown (4) · Source radio (Sample / Upload) + file button (`image/png,image/jpeg`) · Sweep length 8–40 s (default 16) · Pattern switch **Zig-zag** (default) / Straight (help text: "Straight is easier to follow; zig-zag changes direction every strip") · Crop inputs (uploads only) · Volume · **Generate sound**.
**Values panel (important: the owner needs the values for every note):**
- Video: a table "Colour → number → meaning" for the chosen type (rows from Section 5B, with colour swatch + name) and a live line "Now: strip 14/32 · value 0.62 · strong wind".
- Picture: the full band table of the chosen layer (swatch, colour name, value range, note name) with the **currently playing band highlighted**, and the unit (°C, mm/hr, AOD, NDVI). Show an "≈ approximate" label where Section 5A says so.
**Live caption** (aria-live, polite, ≤ 1 update/s) and an optional "Show transcript" list of the last 20 captions.
**Export bar:** Download video · Download audio (WAV) · recording progress.
**Empty/error states:** friendly one-line messages with what to do next.

---

## 7. KNOWN LIMITS (write them in README)
- Sounds are synthesised, not recordings; the numbers shown are **relative to the loaded video** (percentile-normalised), not absolute units, for videos.
- Picture values are exact only where the legend ends were visible; NDVI value text is a typical-NDVI guess; Rain/Snow thresholds assume an evenly divided bar.
- Space mode and the Picture instruments have not been listened to by a human yet.
- Land is silent in Weather (no wind colour over land); white/grey is snow in CO2 and is silent.
- Recording the output video happens in real time and works best in Chrome/Edge; Safari may only offer WAV.
- A picture/video of a different layer chosen under the wrong dropdown name gives meaningless sound: show a warning if > 98 % of pixels are silent.

## 8. LISTEN CHECKLIST (the owner or teammate does this; Claude Code only writes the file)
For each: play, then answer Good / Too loud / Too harsh / Too weak / Confusing.
1. Air Quality sample — does heavier dust sound rougher and louder? Is it comfortable on a phone speaker?
2. Weather sample — does the whistle follow strong wind? Does the left-most storm area stand out?
3. CO2 sample — is the rumble audible on a phone? Is the crackle too much/too little?
4. Space sample — are the "tinks" understandable, not mush? Is 12 s per turn right?
5. Temperature picture — can you tell cold from hot by pitch? Zig-zag vs Straight: which is easier?
6. Precipitation — can you tell rain (drops) from snow (bell)?
7. Aerosol and NDVI — are the pad and marimba distinguishable from the others?
8. Is the line speed (video 4 s, picture 16 s) right?
Write the answers into `reports/LISTEN_RESULTS.md` and turn them into parameter changes.

## 9. WHAT IS OUT OF SCOPE (do not build)
More layers or video types, user accounts, a backend, AI/ML models, movement-based sound, music/beat/melody in Video mode, uploading a picture without choosing its layer, any NASA live API calls at runtime.
