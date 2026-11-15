# Earth Information Jukebox
live link:  https://tabishkhanzada.github.io/jukebox/ 

**Hear the planet.** A website that turns NASA Earth videos and maps into sound (data sonification), so blind and low-vision people can hear the data. Built for NASA Space Apps Challenge #14, "The Earth Information Jukebox".

Everything runs in your browser. Uploaded files never leave your computer. There is no server and no account.

## What it does

The site has two modes. Switch between them with the big **Video | Picture** switch at the top.

**Video mode** (Air Quality, Weather, Carbon Dioxide, Space)
1. Pick a video type (there is no Sample/Upload switch: no file = the sample), then press **Choose video** in the middle of the player (or drop a file there) to use your own video (MP4/WebM, up to 5 minutes). The sound is made at once. Or just press **Play** to hear the built-in sample.
2. The site takes 4 frames per second and cuts each frame into 32 vertical strips (left to right).
3. Each strip becomes one number from 0 to 1, from its colours. The rule depends on the type:
   - darker = more dust (Air Quality)
   - blue → red = stronger wind (Weather)
   - golden haze and orange patches = more CO2 (Carbon Dioxide)
4. A vertical orange line moves left to right (4 s per sweep, adjustable from 2 to 10 s). Only the strip under the line makes sound.
5. The sound is natural, not music: wind, rumble, soft crackle. More of the thing means louder and rougher. The sound moves from your left ear to your right ear with the line.
6. **Space** is different. A radar line turns from the centre of a star picture (12 s per turn). Each star it touches makes a short "tink": higher = farther from the centre, louder = brighter.

**Picture mode** (Temperature, Precipitation, Aerosol, Vegetation, or any picture)
1. Pick a map layer, then press **Choose picture** in the middle of the player (or drop a file there). The sound is made at once. Or just press **Play** for the built-in sample.
2. The picture is cut into 32 strips. Each strip is split into north / middle / south (96 parts).
3. NASA maps: each part's colour is matched to the official legend, for example "orange = 24.1–28.2 °C". **Any other picture** (a photo, a drawing, a screenshot): if an uploaded picture is not a NASA map of the chosen layer, the site plays it by brightness instead (dark = low note, bright = high note), names the main colour in the caption, and says so.
4. A round cursor visits every part (32 s by default, adjustable from 16 to 64 s). Each part plays one note: low note = low value, high note = high value.
5. **Zig-zag** (default): the cursor goes down one strip and up the next, drawing /\/\/\ across the picture. **Straight** always goes top to bottom.
6. Each layer has its own instrument (redesigned on 2026-11-15, softer, with a small room echo):
   - soft piano: temperature
   - water drop: rain
   - music-box bell: snow
   - warm pad: aerosol
   - soft marimba: vegetation
   - kalimba: any other picture (brightness)

**Always:** a live text caption (screen-reader friendly, at most once per second), a seek bar, **Download video** (picture + moving line + sound; MP4 in Chrome/Edge) and **Download audio (WAV)**. Picture mode also shows a values table (colour swatch + colour name + value + note). There is no volume slider or Generate button: Play makes the sound when needed, and choosing a file makes it at once. Use your computer's volume, or **Mute**.

**Keyboard:**
- **Space**: play or pause
- **G**: make the sound again (after changing a setting; Play also does this)
- **M**: mute
- **← / →**: move the line by one strip (when paused)

## Run it

Needs Node.js 20 or newer.

```bash
npm ci            # install
npm run dev       # http://localhost:5173  (add #picture to open Picture mode)
npm run build     # static site in dist/
npm run preview   # serve dist/ at http://localhost:4173
```

Tests:

```bash
npx playwright install chromium   # once
npm test                          # vitest: features, sound engines, picture classifier
npx playwright test               # real-browser tests (line movement, zig-zag order, export, accessibility)
```

## How it works (files)

| Folder | What is inside |
|---|---|
| `src/core/` | frame grabbing + temporal median (`frames.js`), colour → number rules (`features.js`), audio player (the clock), scan position, recorder (video export), WAV writer |
| `src/dsp/` | pure sound functions: seeded noise, filters, the 4 video sounds, the 5 picture instruments; run in a Web Worker |
| `src/picture/` | legend bands and notes (`layers.js`, `legend-data.js` generated from the official GIBS colormaps), colour → band classifier (CIELAB, most common band per region) and the "Any picture" brightness classifier, schedule (zig-zag/straight) |
| `src/ui/` | mode switch, controls, stage canvas (line, zig-zag cursor, drop zone background), values table, caption, download bar |
| `tools/` | build helpers: compress samples, make the clean star image, build legend data, check scripts |
| `reference_dsp/` | the owner's original Python recipes (the JavaScript is a port of them) |
| `reports/` | one short report per build step, screenshots, `LISTEN_CHECKLIST.md` |

## Known limits

- Sounds are made by the computer (synthesised), not recordings. For videos, the numbers are **relative to the loaded video** (percentile-scaled), not absolute units.
- Picture values come from the official GIBS colour tables. The Temperature band edges inside the legend are approximate. The grouping of colours into 6–8 bands is ours.
- Space mode and the new picture instruments have **not been listened to by a person yet** (see `reports/LISTEN_CHECKLIST.md`).
- Non-map pictures use brightness only: two different colours of the same brightness give the same note (the caption still names the colour).
- Land is silent in Weather (no wind colour over land). White/grey (snow) and black (space) are silent in CO2.
- Recording the output video happens in real time and works best in Chrome/Edge. Safari may only offer WAV.
- A video or picture chosen under the wrong type/layer gives meaningless sound. The site shows a warning when more than 98 % of it is silent.
- For real values (°C, mm/hr…), uploaded maps must use the official legend colours of the chosen layer (Worldview snapshot of that one layer). Other pictures are played by brightness.

## Credits

Visuals and data: NASA (SVS, GMAO, Worldview/GIBS). **Not an official NASA product.** Full list with credit lines and links: [CREDITS.md](CREDITS.md).

## Deploy (static site)

The built `dist/` folder can go on any static host.

**GitHub Pages** (workflow included in `.github/workflows/deploy.yml`):

```bash
git init && git add . && git commit -m "Earth Information Jukebox"
gh repo create earth-information-jukebox --public --source=. --push
gh api -X POST "repos/{owner}/earth-information-jukebox/pages" -f build_type=workflow
# every push to main then builds and publishes: https://<your-user>.github.io/earth-information-jukebox/
```

**Netlify** (settings in `netlify.toml`):

```bash
npx netlify-cli login
npx netlify-cli deploy --build --prod      # first time: choose "Create & configure a new site"
```
