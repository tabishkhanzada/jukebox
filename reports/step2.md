STEP 2 DONE

Did:
- App shell in `index.html` (all regions and controls for both modes, ready for wiring) + `src/styles/{tokens,glass,layout}.css` + `src/ui/modeSwitch.js` + `src/main.js` (fonts bundled with @fontsource: Space Grotesk 500/700, Inter 400/600).
- Night + glass theme: gradient #070B1A→#101A3A, two blurred aurora blobs (cyan 12 %, violet 10 %, slow drift), star-dot SVG (< 1 KB), glass panels exactly as Section 6, solid fallback rgba(16,26,58,0.96).
- Layout: desktop three columns 300 px | flexible | 340 px; under 1100 px one column in the order Mode → Controls → Stage → Caption → Values → Export.
- Check script: `tools/check_step2.mjs` (Playwright). Screenshots in `reports/screens/step2-*.png`. Raw output: `reports/step2_check_output.txt`.

Self-check:
- Screenshots 1440×900 and 390×844: PASS. 1440: header with logo + "Hear the planet" on the left, large cyan-filled "Video" segment and "Picture" in the centre, key hints on the right; Controls panel left (Video type, Source, Scan speed 4 s, help text, Volume 80 %, yellow "Generate sound"); dark 16:9 stage centre with the empty-state message and play/mute/time below; Live caption and Download panels under it; Values panel right with table header + "Now: —". 390: single column, same order, no clipping.
- Text contrast ≥ 4.5:1 from tokens: PASS — text/glass 12.37 · muted/glass 6.84 · muted/glass+aurora 5.34 · text/glass+aurora 9.66 · accent/glass 7.34 · dark on yellow buttons 10.84 · dark on cyan switch 9.85 · error text 9.07.
- Contrast measured on the real rendered (blurred) panels: PASS — 37 text elements, minimum 4.58:1 ("Upload" label, where the radio circle shares the text box); 4.73:1 minimum with reduced transparency.
- Tab order logical: PASS — skip link → Video/Picture switch → Video type → Source → Scan speed → Volume → Generate → Mute → transcript (Play is disabled until a sound exists).
- prefers-reduced-motion: PASS (aurora animation-name = none; screenshot `step2-reduced-motion.png`).
- prefers-reduced-transparency: PASS (backdrop-filter none, background rgba(16,26,58,0.96); screenshot `step2-reduced-transparency.png`). forced-colors and no-backdrop-filter fallbacks are in CSS.
- Console errors: PASS (0).
- 390 px no horizontal scroll: PASS (scrollWidth 390).

Gaps fixed:
- The reduced-motion rule lost to the more specific `.aurora.a1` selector → fixed.
- `display:flex` overrode `[hidden]` (file row and recording bar showed) → global `[hidden]{display:none!important}`.
- The fixed body gradient stopped partway down the page in full-page screenshots → normal gradient + solid html colour.
- Contrast tool: border/corner pixels and double-counted opacity gave false failures → use a solid element background when there is one, else the 90th-percentile worst pixel.

Decisions:
- The mode switch is native radios inside `role="radiogroup"` (arrow keys work natively).
- One shared Volume slider for both modes. Space mode shows a "Number of turns" (1–3) select.
- Layer accent colours are used only for borders and swatches (Aerosol #D55E00 is 3.9:1 as text, which is too low for text but fine for non-text).

Next: Step 3 — video features.
