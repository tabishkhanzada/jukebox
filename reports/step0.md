STEP 0 DONE

Did:
- Working folder: `C:\Users\JAWED\Desktop\jukebox1` (Windows 10). Node v22.18.0, npm 10.9.3.
- `reference_dsp/` already present (no zip). Read all 6 files: README.txt, air_quality_scan.py, weather_scan.py, co2_rule.py, co2_scan.py, legend_table_sst_rain.csv (64 SST + 64 rain points).
- Created the Vite vanilla project files (package.json, index.html, src/main.js, vite.config.js, playwright.config.js). Installed vite 8.3.8, vitest 5.1.0, playwright, @playwright/test, @axe-core/playwright, ffmpeg-static, ffprobe-static, @fontsource/space-grotesk, @fontsource/inter. `npx playwright install chromium` done.
- Wrote PLAN.md.

Self-check:
- node >= 20: PASS (v22.18.0)
- `npx vitest run` runs with 0 tests: PASS (exit 0)
- ffmpeg-static prints a version: PASS (ffmpeg 6.1.1-essentials)
- dev server answers on localhost: PASS (HTTP 200 on http://localhost:5173/, title "Earth Information Jukebox")
- Playwright opens about:blank: PASS (Chromium 159.0.8154.6)

Gaps fixed:
- `npm create vite@latest .` is interactive in a non-empty folder → wrote the same template files by hand.
- ffmpeg-static ships no ffprobe → added `ffprobe-static` (v4.0.2) for the probe checks in Steps 1 and 7.

Decisions:
- Folder name is `jukebox1`, not `jukebox`; used as is.
- Python 3.11 is available but not needed; the reference scripts are ported, not run.

Next: Step 1 — assets.
