STEP 3 DONE

Did:
- `src/core/features.js` (pure): percentile (numpy-style), 2–98 % range normalisation (Air Quality, Weather), 98th-percentile normalisation (CO2), HSV, GMAO mask (logo x<0.186,y<0.117; date x<0.264,y≥0.879), masked 3×3 median, per-strip rules for Air Quality / Weather / CO2 (port of the reference scripts), `videoFeatures()` → `[N × 32]` grid, and `detectStars()` (720 rays, 3×3 median, local max ±2 px, b ≥ 0.5, 2 brightest per bin).
- `src/core/frames.js`: temporal median, file check (mp4/webm, ≤ 200 MB), duration check (≤ 5 min, friendly messages), hidden muted `<video>`, `grabFrames()` (seek to i·0.25 s, await `seeked`, draw 256 wide, progress callback, AbortSignal for Cancel), `cleanStarImage()` for uploaded star videos.
- Tests: `tests/features.test.js` (vitest, frames extracted at 4 fps with ffmpeg-static via `tools/node_features.mjs`) and `tests/e2e.spec.js` block "Step 3" (same functions in Chromium, frames grabbed by seeking).

Self-check (numbers):
- Output shape and range: PASS — Air Quality [124 × 32], Weather [124 × 32], CO2 [157 × 32]; all values in 0..1, no NaN.
- Weather left-most eighth is strongest: PASS — 8 groups L→R: **0.71**, 0.33, 0.35, 0.33, 0.49, 0.36, 0.40, 0.38 (gap 0.22 ≥ 0.15; reference ≈ 0.72 vs 0.33–0.49).
- CO2 amount per quarter rises: PASS — **0.12 → 0.27 → 0.41 → 0.42** (reference 0.13 → 0.28 → 0.41 → 0.42, all within ±0.08). Silent strips (< 0.02): **19.6 %** (reference ≈ 18 %).
- Air Quality strips differ inside a frame: PASS — mean std across strips **0.262** (> 0.1).
- Space: PASS — **233 stars** on the 256×256 clean image (≥ 200); longest straight bright run along a ray **38 px** (< 100); stars found in 720/720 bins (dense cluster).
- Logo/date areas excluded: PASS — painting them white changes Air Quality and Weather strip values by exactly **0**.
- Browser vs Node (tolerance 0.03, mean |diff|): PASS — Air Quality **0.0080** (max 0.052) · Weather **0.0185** (max 0.113) · CO2 **0.0235** (max 0.452; the browser takes 158 frames vs 157 from ffmpeg, so a few zooming CO2 frames are about 1/12 s apart).

Gaps fixed:
- Browser frame grabbing took over a minute per video (x264's default 250-frame keyframe distance made every seek decode ~20 s of video) → re-encoded the samples with one keyframe per second (`tools/make_videos.mjs`); now about 10 s per video. Re-ran the Step 1 checks: all PASS (4.0 / 8.5 / 5.1 / 2.6 MB, total 27.1 MB).
- The vitest `beforeAll` (frame extraction) sat on the default 10 s hook timeout → `hookTimeout` raised to 180 s.

Decisions:
- The median filter ignores masked neighbours (uses the centre pixel instead). This keeps the logo test exact; the reference script median-filtered before masking.
- Weather's "0 if ≤ 50 valid pixels" is scaled to the strip size (the reference used 16×256 strips; ours are 8×128): threshold = 50 × strip pixels / 4096.
- Frame width 256, height keeps the video's shape (128 for GMAO, 144 for CO2).
- Space analysis uses 256×256 (233 stars). The 3×3 median is kept, as the guide says.
- The GMAO mask is on for all Air Quality/Weather videos (an upload without the logo loses only ~3 % of the frame).
- Tests use Playwright's bundled Chromium 159, which plays H.264 and can record MP4 (checked); Edge 156 and Chrome 157 are also installed.

Next: Step 4 — video sound engines.
