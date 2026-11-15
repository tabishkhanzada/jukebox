STEP 10 DONE

(Owner's request on 2026-11-15, after Step 9: "make the user interface like this picture, remove volume, remove the Video values table, put a choose-video option in the middle of the box, any picture should make sound, zig-zag like my picture and slowly, use better sounds for pictures.")

Did:
- **New light layout** from the owner's reference picture:
  - Top bar: brand plus section links (Player / How it works / Datasets).
  - Video|Picture switch and a shortcuts strip.
  - Controls card plus a "How this sound is made" box.
  - Dark stage with badges: source, what is playing now, sweep time.
  - Player bar: play, mute, time, **seek bar**, status.
  - Caption and Download side by side in Video mode.
  - Values table on the right, in Picture mode only.
  - Tokens are in `src/styles/tokens.css`.
- **Removed:** the volume slider (both modes) and the Video values table. The colour rule for each video type now sits in the "How this sound is made" box.
- **Drop zone in the middle of the stage:**
  - "Add your video / Choose video" or "Add your picture / Choose picture". A file can also be dropped there.
  - Choosing a file switches Source to Upload and makes the sound at once.
- **Any picture:**
  - New Map layer "Any picture (brightness)": each of the 96 parts gets a note from its average CIELAB brightness (8 bands, C4…E5), played on a kalimba. The caption names the main colour ("mostly blue").
  - If an uploaded picture is not a snapshot of the chosen layer (fewer than 85 % of its coloured pixels within ΔE 8 of the legend), the site switches to Any picture by itself and says so in a note.
- **Zig-zag cursor:**
  - A round cursor moves diagonally down one strip and up the next, drawing /\/\/\. The path still to come is drawn faintly, the travelled part in orange, and the playing part is outlined.
  - The default sweep is slower: 32 s (range 16–64 s), so each of the 96 notes lasts 0.33 s.
- **New picture sounds** (`src/dsp/instruments.js`):
  - Smooth raised-cosine starts and ends, longer natural decays, no harsh partials, and a small stereo room reverb (6 combs + 3 all-passes, wet 0.3 of the dry level by RMS).
  - Instruments: soft piano (Temperature, was flute), water drop with a rising pitch (Rain, the old one fell in pitch), music-box bell (Snow), warm detuned pad (Aerosol), soft marimba (Vegetation), kalimba (Any picture).
- Tests updated and added: Any picture, legend fit, colour names, instrument start and end, click check, cursor inside the lit region, drop zone, fallback, seek, no volume, no Video table. README, LISTEN_CHECKLIST and PLAN updated.

Self-check:
- vitest **26/26** PASS.
  - Legend fit: each sample map fits its own layer 100 %; a screenshot fits Temperature 3.9 %, so it falls back.
  - Gradient picture → bands 1→8, never going down.
  - Every instrument starts and ends at 0.
- Picture renders (32 s plus a 2.5 s tail):
  - Peak 0.909.
  - Energy above 3 kHz ≤ 0.06 %.
  - Largest sample-to-sample step 0.037–0.091, against a limit of 0.15. A click would be a sudden jump.
  - Spectral centroid 245–451 Hz.
  - Any picture plays 96/96 notes.
- Playwright **26/26** PASS (5.6 min), plus a re-run of 5 key tests after the last style change.
  - The cursor's y position follows the zig-zag: strip 1 at 117 → 285 → 484 px, strip 2 at 648 → 436 → 255 px. The cursor is always inside the outlined region.
  - The video line still matches the audio clock to within 4 px.
  - Choose video → upload → sound made at once. A screenshot under Temperature → Any picture, 96/96 notes.
- axe: 0 critical, 0 serious, **0 moderate** in both modes at 1280 and 390 px. 390 px has no horizontal scroll.
- `npm run build`: PASS.
- Screenshots: `reports/screens/step10-*.png`.

Gaps fixed:
- The first fallback rule (> 85 % silent parts) missed a colourful screenshot, because its colours were close to the rainbow Temperature legend. Added `legendFit()` with a strict ΔE 8 test.
- axe "region": the mode switch was outside a landmark, so it now sits inside `<main>`.
- The speed value wrapped onto two lines; fixed.
- The full zig-zag path made the picture busy, so now only the path still to come is drawn, and faintly.

Decisions:
- The guide asked for a volume control and a Video values table. The owner removed both, and the owner's word wins.
- The reference picture showed a user avatar and links such as "Methodology". There are no accounts, so there is no avatar. The links go to real sections of the page.
- Temperature changed from flute to soft piano. The guide called the instruments "owner's suggestion, may change after listening", and the owner said they sounded strange.
- "Any picture" uses brightness, not hue, so the pitch order (dark → bright) is easy to understand.

Still UNVERIFIED:
- **How the new sounds actually sound.** No person has listened to them yet. Only the numbers above were measured. See `reports/LISTEN_CHECKLIST.md`, items 5–10.
- The ← → keys in the shortcuts strip render as dashes in the headless-browser screenshots. This may be a font issue in the test browser only; not checked in a normal browser.
- Only Chromium was tested, as before.

Next: the owner listens (LISTEN_CHECKLIST), then decides on deployment.
