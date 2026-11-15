STEP 9 DONE

Did:
- `README.md` (what it is, how to run, how it works in simple words, file map, known limits from Section 7, credits, deploy commands).
- `reports/LISTEN_CHECKLIST.md` (Section 8 as a fill-in table + 2 measured notes for the listener).
- `reports/DEMO_SCRIPT.md` (60 s: Air Quality video → Temperature picture → download → keyboard).
- Deploy files ready: `.github/workflows/deploy.yml` (GitHub Pages via Actions) and `netlify.toml`. `.gitignore` keeps node_modules, dist, tmp, test results and the 138 MB original videos out of git.
- `playwright.config.js`: `BASE_URL=http://localhost:4173` runs the browser tests against the built site.

Self-check:
- Clean clone → `npm ci && npm run build`: PASS (copy without node_modules/dist/tmp/source videos, 34 MB, in the scratchpad; built in 0.7 s; dist has all samples).
- Preview serves all 8 samples: PASS — 4 videos (video/mp4: 4.0 / 8.5 / 5.1 / 2.6 MB) + 4 pictures (image/png) + the clean star image + the worker, all HTTP 200 from `npm run preview` (port 4173). Built site also passes the Air Quality line test, the Temperature zig-zag test and the Air Quality recording test (3/3).
- Final full test run: PASS — **vitest 21/21** (features 7, DSP 9, picture 5); **Playwright 23/23** in 5.8 min (Step 3 browser-vs-Node 3, Step 6 wiring 11, Step 7 export 4, Step 8 accessibility 5). Step 3 browser vs Node again: mean |diff| 0.0074 / 0.0184 / 0.0226.
- Header comment in every code file: PASS (src, tools, tests, configs, index.html, workflow).

Deploy: NOT deployed. A GitHub account is logged in via `gh`, but deploying creates a **public repository and site** under that account, so I am waiting for the owner's go-ahead. Commands (README "Deploy"):
- GitHub Pages: `git init && git add . && git commit -m "Earth Information Jukebox"` → `gh repo create earth-information-jukebox --public --source=. --push` → `gh api -X POST "repos/{owner}/earth-information-jukebox/pages" -f build_type=workflow`
- Netlify: `npx netlify-cli login` → `npx netlify-cli deploy --build --prod`

Still UNVERIFIED (everything else was measured or read from an official source):
1. **How anything sounds.** No sound has been heard by a person; only peak, spectrum, pan, loudness correlation and timing were measured → LISTEN_CHECKLIST.
2. **Space "Star Twinkle"**: new design; on the dense sample cluster it runs at the 25 tinks/s ceiling the whole time.
3. **Picture instruments** (flute, drop, bell, pad, marimba): the owner's suggestion, not listened to.
4. Temperature band edges inside the legend (4.35, 6.9, 16.05, 17.55, 20.55, 24.15, 28.2 °C): read from the legend picture (shown as "≈"); the ends and all colours are official.
5. Grouping of the official colours into 6 bands (rain, snow, aerosol, NDVI): our choice (nearest seed colour); the value ranges themselves come from the official tables.
6. Values-table swatches for the **video** types (Air Quality, Weather, CO2, Space): illustrative colours, labelled as approximate in the panel.
7. Per-dataset citations/DOIs (GHRSST MUR, GPM IMERG, VIIRS Deep Blue AOD, VIIRS NDVI): not read (noted in CREDITS.md).
8. Browsers: tested only in Chromium 159 (codec/recorder support also checked in Edge 156 and Chrome 157). Safari and Firefox are untested.
9. Uploading a **star video** (temporal median in the browser) and uploading Worldview pictures with crop: code paths exist but have no end-to-end test with a real upload.

Gaps fixed: none needed in this step.

Decisions:
- Not deploying without an explicit yes (public and outward-facing).
- The original videos are git-ignored (too big; the site only needs the compressed samples).

Next: the owner listens (LISTEN_CHECKLIST) and decides on deploy.
