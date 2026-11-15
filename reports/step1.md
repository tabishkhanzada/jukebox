STEP 1 DONE

Did:
- 4 sample videos → `public/samples/videos/{air-quality,weather,co2,space}.mp4` (ffmpeg-static, `-an`, 1024 wide, 12 fps, crf 28). NASA's Space audio removed.
- Space clean star image `public/samples/pictures/space-stars-clean.png` (1024x1024): 40 frames evenly spaced, square centre crop, per-pixel temporal median (`temporalMedian` in `src/core/frames.js`, also used for uploads via `cleanStarImage`). Tool: `tools/make_space_clean.mjs`.
- Network to GIBS/Worldview WORKS. Layer IDs found **by title** in GIBS WMTS GetCapabilities (VERIFIED):
  - Temperature: `GHRSST_L4_MUR_Sea_Surface_Temperature` — "Sea Surface Temperature (L4, MUR, GHRSST)" (the guide's earlier guess was right)
  - Precipitation: `IMERG_Precipitation_Rate` — "Precipitation Rate (IMERG)"
  - Aerosol: `VIIRS_NOAA21_AOD_Deep_Blue_Land_Ocean` — "Deep Blue Aerosol Optical Depth (Land and Ocean, VIIRS, NOAA-21)"
  - Vegetation: `VIIRS_NOAA21_NDVI_8Day` — "Normalized Difference Vegetation Index (rolling 8-day, VIIRS, NOAA-21)"
- Snapshots for 2026-11-06 downloaded to `source/pictures/` (2048x1024, transparent no-data) and flattened onto black into `public/samples/pictures/` (`tools/make_pictures.mjs`).
- Legends: **OFFICIAL** for all 4 layers. GetCapabilities links to colormaps named per product, not per layer (`<LAYER_ID>.xml` returns 404). Saved: `source/legends/{GHRSST_Sea_Surface_Temperature, GPM_Precipitation_Rate, MODIS_VIIRS_AOD, MODIS_NDVI}.xml` + `_H.svg` legends. Parser: `tools/parse_colormap.mjs`.
- `CREDITS.md`: 8 entries; credit lines read from SVS pages 5151, 5148, 5196, 13786.

Self-check:
- Sample videos play, > 5 s, no audio stream: PASS ×4 (air-quality 31.00 s 2.5 MB · weather 31.00 s 9.0 MB · co2 39.33 s 4.2 MB · space 34.17 s 2.6 MB; all ≤ 12 MB)
- Pictures 2:1 and ≥ 5 % non-black: PASS ×4 (temperature 54.3 % · precipitation 16.7 % · aerosol 15.3 % · vegetation 19.4 %)
- Space clean image has no long straight white line: PASS. Measured on 720 rays from the centre (r = 0.2R..R):
  - ray mean brightness, max ÷ median: raw frame **3.16** → clean **1.42**
  - longest run of pixels with b ≥ 0.5 along a ray: raw 63 px → clean 40 px (in the dense cluster core)
  - guide metric, variance of column-mean brightness: raw 5.68e-3 → clean 5.34e-3 (a weak measure, because the line is short against a dense star field; the ray metric is the clear one)
  - Visual check of the clean image: no line visible.
- CREDITS.md has 8 entries: PASS
- Total public/samples ≤ 60 MB: PASS (25.1 MB)

Gaps fixed:
- The colormap URL pattern `colormaps/v1.3/<LAYER_ID>.xml` was wrong → used the links listed in GetCapabilities.
- `svs.gsfc.nasa.gov` refuses curl from this machine (TLS handshake error, not EPERM) → read the SVS pages with the web fetch tool instead.

Decisions:
- Official colormaps replace the Section 5A value text. Band identity (colour group, note) stays as in 5A. **Important differences found:** (a) IMERG rain/snow scales are **logarithmic** (0.1 … 53 mm/hr), so the 5A "evenly divided bar" thresholds are wrong; (b) the AOD colormap spends almost all colours on 0–0.7 (coarse bins 0.7–5), so the 5A "equal split 0–5" is wrong; (c) NDVI brown→green switch confirmed at 0.2951–0.3226. Real value ranges are computed in Step 5.
- The SST layer's GIBS title differs from the guide's Worldview title ("GHRSST / Multi-mission, v4.1 STD"); MUR L4 is the matching product.
- CO2 sample keeps its 16:9 shape (1024x576).
- Per-dataset DOIs were not read: UNVERIFIED (noted in CREDITS.md).

Next: Step 2 — design system and app shell.
