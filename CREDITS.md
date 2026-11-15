# CREDITS

Visuals and data: NASA (SVS, GMAO, Worldview/GIBS). **Not an official NASA product.**
The Earth Information Jukebox makes its own synthesised sound. NASA's original audio (Space video) is removed.
Credit lines were read from each SVS page (fetched 2026-11-14).

## Videos (public/samples/videos/, compressed, audio removed)

1. **Air Quality — `air-quality.mp4`** (from `MC01_stage4_GMAO_pm25_2048x1024_en.mp4`)
   - Title: "Particulate Matter (PM) 2.5" — https://svs.gsfc.nasa.gov/5151/
   - Credit line: "NASA's Global Modeling and Assimilation Office". Visualizer: Joseph V. Ardizzone (NASA/GSFC).
2. **Weather — `weather.mp4`** (from `MC02_stage3_GMAO_near_surface_wind_2048x1024_en.mp4`)
   - Title: "GEOS-FP Near-Surface Wind Speed" — https://svs.gsfc.nasa.gov/5148/
   - Credit line: "NASA's Global Modeling and Assimilation Office". Visualizer: Joseph V. Ardizzone (NASA/GSFC).
3. **Carbon Dioxide — `co2.mp4`** (from `dyamondPointCloud_1-22-2025a_dyamond_co2_anim_globe_zoomwest_3x3hyperwall_1080p30_2.mp4`)
   - Title: "DYAMOND Global Carbon Dioxide" — https://svs.gsfc.nasa.gov/5196/
   - Credit line: "NASA's Scientific Visualization Studio". Visualizers: AJ Christensen (SSAI), Greg Shirah (NASA/GSFC), Helen-Nicole Kostis (USRA), Mark SubbaRao (NASA/GSFC). Scientists: Lesley Ott (NASA/GSFC), Brad Weir (Morgan State University), William Putman (NASA/GSFC), Tomohiro Oda (USRA/EfSI).
4. **Space — `space.mp4`** (from `Caldwell73_2K_Final.webm`) and **`space-stars-clean.png`** (temporal median of 40 frames, made by this project)
   - Title: "Data Sonification: Caldwell 73" — https://svs.gsfc.nasa.gov/13786/
   - Credit line: "NASA's Goddard Space Flight Center". Sonification (not used here): SYSTEM Sounds (M. Russo, A. Santaguida). Technical support: Aaron E. Lepsch (ADNET Systems, Inc.).

## Pictures (public/samples/pictures/, Worldview Snapshot API, date 2026-11-06, EPSG:4326, 2048x1024, no-data flattened to black)
Acknowledgement (from the Earthdata GIBS API page): "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
Snapshot tool: NASA Worldview Snapshots — https://wvs.earthdata.nasa.gov/

5. **Temperature — `temperature.png`**: GIBS layer `GHRSST_L4_MUR_Sea_Surface_Temperature`, "Sea Surface Temperature (L4, MUR, GHRSST)". Colormap: https://gibs.earthdata.nasa.gov/colormaps/v1.3/GHRSST_Sea_Surface_Temperature.xml
6. **Precipitation — `precipitation.png`**: GIBS layer `IMERG_Precipitation_Rate`, "Precipitation Rate (IMERG)". Colormap: https://gibs.earthdata.nasa.gov/colormaps/v1.3/GPM_Precipitation_Rate.xml
7. **Aerosol — `aerosol.png`**: GIBS layer `VIIRS_NOAA21_AOD_Deep_Blue_Land_Ocean`, "Deep Blue Aerosol Optical Depth (Land and Ocean, VIIRS, NOAA-21)". Colormap: https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_VIIRS_AOD.xml
8. **Vegetation — `vegetation.png`**: GIBS layer `VIIRS_NOAA21_NDVI_8Day`, "Normalized Difference Vegetation Index (rolling 8-day, VIIRS, NOAA-21)". Colormap: https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_NDVI.xml

Note: the per-dataset citations (GHRSST MUR, GPM IMERG, VIIRS Deep Blue, VIIRS NDVI product DOIs) were not read: UNVERIFIED.

## Software
Fonts: Space Grotesk and Inter (SIL Open Font License, bundled via @fontsource). Build: Vite. Video tools: ffmpeg-static / ffprobe-static (build-time only).
