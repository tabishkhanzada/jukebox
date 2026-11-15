STEP 8 DONE

Did:
- Keyboard: Space play/pause (when focus is not on a native button/radio/summary), ←/→ move the line by one strip when paused, M mute, G generate (focus then moves to Play). Visible 3 px cyan focus ring everywhere; skip link "Skip to the player".
- Live caption in `aria-live="polite"`, ≤ 1 update/s, transcript of the last 20. Mode switch = `role="radiogroup"` of native radios (arrow keys). Errors `role="alert"`. Canvas `role="img"` with a live text alternative (≤ 1 update/s). Values = real `<table>` with column and row headers; every row has a swatch **and** a colour name.
- `prefers-reduced-motion`: no aurora animation; `prefers-reduced-transparency` / `forced-colors` / no backdrop-filter: solid panels.
- Performance: samples load only on Generate; the four Latin fonts are preloaded at build (small Vite plugin) and the values table has reserved height → no layout shift. `#picture` deep link opens Picture mode.
- Tests: `tests/e2e.spec.js` block "Step 8" (5 tests); Lighthouse 12.8.2 (dev dependency) run against the production preview with Playwright's Chromium.

Self-check:
- axe-core = 0 critical, 0 serious: PASS — video idle, video playing, picture idle, picture playing, picture 390 px, video 390 px: 0/0 everywhere (also 0 moderate/minor; 47 rules pass).
- Lighthouse accessibility ≥ 95: PASS — **100** (Video) and **100** (Picture, `#picture`). Same runs (desktop preset, production build): Performance 100/100, Best Practices 100/100, FCP 0.3–0.4 s, LCP 0.4 s, **CLS 0**, 105 KiB total.
- Keyboard-only run-through (scripted): PASS — Tab → skip link → Video radio (ring solid 3px cyan) · ArrowRight/Left switches Picture/Video · ArrowDown on the type list → Weather · G generates, focus lands on Play · Space plays (t=0.95) / pauses · → moves exactly one strip (+0.125 s; the line moved 307 → 347 px in the canvas) · ← moves back · M mutes / unmutes · Tab ×40 cycles through 13 stops and comes back (no trap).
- Caption rate: PASS — 5 updates in 5 s of picture playback, where notes change every 0.17 s.
- 390 px both modes while playing: PASS — scrollWidth 390 = viewport (screenshots `reports/screens/step8-video-390.png`, `step8-picture-390.png`: single column, nothing cut off).
- Forced colors + reduced motion: PASS — backdrop-filter none, star sky hidden, aurora animation none. First load: 42 requests, **0 sample files**.
- Regression: Step 2 checks re-run: all PASS (54 text elements, minimum contrast 4.58:1).

Gaps fixed:
- CLS 0.044 / 0.063 (values table filled after first paint + font swap) → reserved table height (CLS 0.016 / 0.028) + font preload → **0 / 0**.
- After pressing G, focus stayed on a radio, so Space did not play → focus moves to Play after a keyboard Generate.

Decisions:
- Lighthouse performance on the dev server (unbundled, slow-4G mobile) is not meaningful; the production build was measured.
- The `#picture` URL hash is kept in sync with the mode (handy for sharing and for the demo).

Next: Step 9 — docs, listening checklist, deploy.
