# PLAN — Earth Information Jukebox

**Goal:** a static website (Vite + vanilla JS, runs fully in the browser) that turns 4 NASA videos and 4 NASA map pictures into sound so blind and low-vision people can hear the data. Natural sounds for videos, one simple instrument per picture layer. Each result can be played and downloaded as a video and as a WAV.

## Build order (each step ends with a self-check and `reports/stepN.md`)
0. **Environment.** Node 22, Vite, vitest, Playwright + axe, ffmpeg-static (+ ffprobe-static for probing). Confirm everything runs.
1. **Assets.** Compress the 4 videos (no audio) to `public/samples/videos/`. Build the clean star image for Space (temporal median of 40 frames). Get 4 map pictures and legends (GIBS if the network allows, otherwise ask the owner / use seed ramps). Write `CREDITS.md`.
2. **Shell.** Night + glass design tokens, header with Video | Picture switch, controls / stage / values columns, transport, caption, export bar, footer. Check contrast, tab order, reduced motion / transparency.
3. **Video features.** `frames.js` (frame grabbing, masks, median filters) and `features.js` (pure functions: 32 strips → 0..1 per type, percentile normalisation, star detection). Node tests use ffmpeg-extracted frames; compare with the browser.
4. **Video sound.** `src/dsp/*` pure functions (seeded RNG, RBJ biquads, smoothers, bilinear control curve) porting the owner's Python recipes. Web Worker for the browser. `wav.js`. Check spectrum, pan, loudness-follows-data, silence, determinism.
5. **Picture mode.** Layers/bands/ramps from Section 5A, CIELAB nearest-ramp classifier with mode per region, zig-zag/straight schedule, 5 instruments. Swatch, noise, black-image and schedule tests.
6. **Wiring.** Connect both modes to the UI; audio-clock-driven overlay line; processing state + cancel; friendly errors. Playwright checks the line really moves and the zig-zag order.
7. **Export.** Canvas + audio → MediaRecorder (mp4 → webm fallback), WAV download. Probe the files.
8. **Accessibility.** Keyboard shortcuts, aria-live caption, radiogroup, axe 0 critical/serious, Lighthouse-style audit, 390 px no horizontal scroll.
9. **Docs + deploy.** README, LISTEN_CHECKLIST, build, preview, GitHub Pages / Netlify commands, 60 s demo script.

## Why this order
Data first (assets → features → sound) so each later layer is built on numbers that were already checked. The UI only wires tested pure functions together. All "does it sound right" questions go to the human listener (`reports/LISTEN_CHECKLIST.md`), because Claude cannot hear.

## Key rules
No server, no runtime NASA calls, nothing invented (unverified items are labelled UNVERIFIED), only the 4 videos + 4 pictures.

## Step 10 (added 2026-11-15, owner's request after Step 9)
10. **Redesign + picture sound.** Light layout from the owner's reference picture (top bar with section links, Video|Picture switch, controls + "How this sound is made" box, dark stage with badges, player bar with seek, caption + download side by side, values table only in Picture mode). Remove the volume slider and the Video values table. "Choose video / Choose picture" drop zone in the middle of the stage (choosing a file makes the sound at once). Picture: zig-zag cursor that draws /\/\/\, slower default sweep (32 s), new softer instruments with a small room echo, and "Any picture" (brightness → note) so every picture makes sound.
