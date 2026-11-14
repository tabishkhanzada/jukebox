# 🚀 NASA Space Apps Challenge #14: The Earth Information Jukebox
## Official Project Submission Dossier

**Challenge:** NASA Space Apps Challenge #14 — The Earth Information Jukebox  
**Category:** Earth Observation / Multi-Sensory Data Sonification & Universal Accessibility  
**Live Application URL:** http://127.0.0.1:8000  
**API Documentation (OpenAPI/Swagger):** http://127.0.0.1:8000/docs  
**Compliance Standards:** WCAG 2.2 Level AAA Compliant • ICAD Scientific Parameter-Mapping Sonification Standards  

---

## 1. Project Title & Executive Elevator Pitch
**The Earth Information Jukebox: Translating NASA Earth Observations & EIC Satellite Imagery into Musical Sonification and Interactive Multi-Sensory Visualizations**

The Earth Information Jukebox is an open-source, multi-modal Earth science platform that transforms NASA Earth Observation telemetry and Earth Information Center (EIC) satellite visual frames into harmonious, intuitive musical compositions and real-time synchronized visualizations. 

Instead of struggling to interpret complex 2D graphs, dense scientific spreadsheets, or silent satellite imagery, users **listen** to the pulse of our planet:
- In **Temporal Timeline Mode**, 365 daily observations stream through a consonant multi-timbral synthesis engine where temperature governs melodic pitch, precipitation triggers dynamic percussive rhythms, and monthly sub-bass pulses orient the listener across seasons.
- In **EIC Visual Frame Sonifier Mode**, interactive raster scanning across NASA satellite frames (Sea Surface Temperature, Sea Level Anomaly, Wildfire Smoke AOD, and Polar Cryosphere) mathematically converts pixel luminance, colorimetry, and feature density into real-time consonant chords.
- Built from the ground up to satisfy **WCAG 2.2 Level AAA accessibility standards**, the platform features a complete keyboard matrix, an `aria-live` screen-reader narration engine, and Web Speech API spoken audio description, empowering visually impaired researchers, students, and educators to experience Earth science independently.

---

## 2. Challenge & Problem Statement
NASA's Earth-observing satellite fleet (MODIS, VIIRS, ICESat-2, GRACE-FO, Jason-3) generates terabytes of environmental data every day. Communicating these insights faces critical societal barriers:
1. **Cognitive Overload & Data Fatigue:** Static charts and tables require specialized scientific training and often fail to convey the visceral reality of seasonal transitions, atmospheric heatwaves, and monsoon surges.
2. **Visual Exclusion:** Conventional scientific communication relies almost exclusively on visual representations, shutting out blind, low-vision, and auditory learners from engaging with planetary science.
3. **Chaotic Sonification Pitfalls:** Previous attempts at data sonification frequently failed by either producing abrasive, chaotic white noise (mapping raw pixels directly to uncoordinated oscillators) or subjective musical compositions that distorted underlying scientific data.

---

## 3. The Solution: Dual-Mode Multi-Sensory Architecture

The Earth Information Jukebox solves this dilemma through a decoupled architecture that guarantees **100% scientific data integrity** while producing **harmonically consonant music**:

```
[ NASA POWER API / EIC Satellite Frames ]
                 │
                 ▼
    [ Data Sanitization & Normalization ]
                 │
     ┌───────────┴──────────────────────────────┐
     ▼                                          ▼
[ Temporal Timeline ]                 [ EIC Visual Frame Sonifier ]
(1-Year Daily Data)                   (OpenCV & HTML5 Canvas CV Engine)
     │                                          │
     │                                ┌─────────┴─────────┐
     │                                ▼                   ▼
     │                      [ Spatial Column ]   [ Pixel Color, BRI, ]
     │                      [ 16 Latitude Bins ] [ & Feature Density ]
     │                                │                   │
     └───────────────────┬────────────┴───────────────────┘
                         ▼
            [ Harmonic Scale Quantizer ]
            (Major, Minor, Lydian, Akebono)
                         │
                         ▼
        [ Multi-Timbral Tone.js Synthesizer ]
                         │
        ┌────────────────┼───────────────────────┐
        ▼                ▼                       ▼
  [ Audio Out ]  [ 60fps Scrubber Canvas ] [ WCAG 2.2 AAA Suite ]
  (Speakers)     (Chart.js / Radar Laser)  (ARIA-Live / Voice Narrator)
```

### Mode 1: 1-Year Planetary Telemetry Timeline
- Streams 366 daily NASA POWER observations (`T2M` temperature, `PRECTOTCORR` precipitation, `WS2M` wind speed) for any city or custom coordinates worldwide.
- Employs a custom Chart.js laser playhead scrubber plugin that glides across the timeline with sub-frame 60fps interpolation synchronized with each musical note.
- Features dual-track polyphony: melody synth for temperature, acoustic membrane drums for precipitation, and sub-bass drones on the 1st of every month.

### Mode 2: NASA EIC Satellite Visual Frame Sonifier
- High-resolution (1024x512) raster scanning across authentic NASA Earth Information Center datasets:
  1. *Sea Surface Temperature & Coral Stress* (MODIS/VIIRS Sensor Blend)
  2. *Dynamic Sea Level Rise & Ocean Mass Variations* (GRACE-FO & Jason-3 Radar Altimetry)
  3. *Wildfire Smoke & Aerosol Optical Depth* (Aqua MODIS & OMPS Atmospheric Sensors)
  4. *Polar Cryosphere & Arctic Sea Ice Minimum* (ICESat-2 Spaceborne Lidar)
  5. *Custom Ingestion*: Upload any NASA satellite image (.png/.jpg) for immediate real-time optical scanning.
- Discretizes images into 16 vertical latitude bins mapped across 3 musical octaves, using ITU-R BT.709 perceptual luminance for note gain and colorimetric hue for instrument timbre (Sawtooth for thermal heat, Shimmer Sine for polar ice, Triangle PolySynth for mid-range).

---

## 4. Computer Vision / Image Processing Module: Dual Backend & Frontend Engine

### 1. OpenCV 4.x Backend Engine (`backend/cv_processor.py`)
- **Multi-Spectral Color Processing**: Converts NASA EIC satellite images from BGR to RGB (`cv2.COLOR_BGR2RGB`) and HSV (`cv2.COLOR_BGR2HSV`) to measure optical brightness and thermal saturation.
- **ITU-R BT.709 Perceptual Luminance Extraction**:
  $$\mathcal{L} = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
- **Thermal & Aerosol Density Segmentation**:
  - Uses binary thresholding (`cv2.inRange`) to isolate high-intensity climate anomalies (thermal coral stress, wildfire smoke corridors, and polar ice margin variations) from background noise.
  - Computes global and column-wise feature density percentages:
    $$\text{Density}_{\text{column}} = \left(\frac{\text{Active Bins}}{\text{Total Latitude Bins}}\right) \times 100\%$$
- **Hotspot Geolocation**: Identifies maximum optical/thermal coordinates $(x,y)$ via `cv2.minMaxLoc` and maps them directly to latitude and longitude.
- **REST Endpoints**:
  - `GET /api/eic/frames`: Lists all available NASA EIC frames with full remote-sensing metadata.
  - `GET /api/eic/analyze`: Executes OpenCV analysis, returning optical metrics, hotspot geolocations, and 128 column-wise spatial sonification profiles.
  - `POST /api/eic/upload`: Accepts user-uploaded NASA observation imagery, decodes via `cv2.imdecode`, and returns real-time CV metrics.

### 2. Frontend HTML5 Canvas Optical Scanner (`frontend/scanner.js`)
- Uses offscreen HTML5 Canvas buffers (`willReadFrequently: true`) and `getImageData()` to downsample frames to a $256 \times 64$ analytical grid for instantaneous 60fps scanning without audio or visual stuttering.

---

## 5. Spatial Scanning Strategy: Left-to-Right Raster Scan

1. **West-to-East Longitude Mapping**:
   - A vertical glowing laser bar sweeps across the satellite temperature map from $180^\circ\text{W}$ to $180^\circ\text{E}$ over a customizable period (15 to 60 seconds).
   - Longitude maps to time: $t(x) = \left(\frac{x}{W}\right) \times T_{\text{scan}}$.
2. **Latitude-to-Pitch Spatial Binning**:
   - The image height is partitioned into 16 discrete vertical latitude bands.
   - **Bin 15** (top of frame = Arctic / North Pole) produces high frequencies ($C5 - C6$).
   - **Bin 0** (bottom of frame = Antarctic / South Pole) produces deep foundational frequencies ($C3 - D3$).
3. **Luminance-to-Gain**:
   - Each bin's perceptual luminance modulates note velocity and volume.
   - Dynamic noise gating mutes dark backgrounds ($< 8\%$), preventing noise clutter.
4. **Spectral Hue-to-Timbre Extraction**:
   - Red/Orange (heat/wildfires): Analog Sawtooth Synth.
   - Green/Yellow (vegetation/chlorophyll): Triangle PolySynth.
   - Cyan/Blue (ice/cryosphere): High Sine Chime with shimmer delay.
5. **Harmonic Pentatonic Quantization**:
   - Notes are quantized to a 16-note consonant scale (Major Pentatonic, Minor Pentatonic, Lydian, Akebono, Dorian), guaranteeing that simultaneous notes sound musical and harmonious rather than dissonant white noise.
6. **Live Telemetry HUD Synchronization**:
   - Real-time display of longitude ($120^\circ\text{W}$), brightness ($68\%$), feature density ($85\%$), and active chords (`CHORD: C4 • D4 • G4`).

---

## 6. Universal Accessibility Suite (WCAG 2.2 Level AAA)

### Solving Visual Exclusion in Earth Science
The Earth Information Jukebox empowers blind and low-vision users to explore planetary telemetry independently through multi-sensory equivalence:

| Key Shortcut | Action | Screen Reader & Spoken Voice Output |
|---|---|---|
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / Pause Sonification | *"Sonification Playback Started / Paused"* |
| <kbd>←</kbd> / <kbd>→</kbd> | Step 5 days (Timeline) or 5% (Scanner) | *"Day 41: 2024-02-10. Value: 24.5°C. Playing note E4."* |
| <kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd> | Jump 30 days (Timeline) or 30% (Scanner) | *"Jumped 1 full month: March 12."* |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jump to start / end of dataset | *"Jumped to January 1 / December 31."* |
| <kbd>1</kbd> | Switch to Air Temperature (`T2M`) | *"Switched planetary telemetry to Air Temperature."* |
| <kbd>2</kbd> | Switch to Precipitation (`PRECTOTCORR`) | *"Switched planetary telemetry to Precipitation."* |
| <kbd>3</kbd> | Switch to Wind Speed (`WS2M`) | *"Switched planetary telemetry to Wind Speed."* |
| <kbd>V</kbd> | Toggle Mode: Timeline $\leftrightarrow$ EIC Scanner | *"Switched view to NASA EIC Satellite Visual Scanner Mode."* |
| <kbd>M</kbd> | Master Audio Mute / Unmute | *"Audio Muted / Audio Unmuted."* |
| <kbd>R</kbd> | Start / Stop WebM Audio Recording | *"Recording started / Track downloaded as WebM."* |
| <kbd>?</kbd> or <kbd>H</kbd> | Open Accessibility & Keyboard Guide | Opens modal with focus trap on close button |
| <kbd>Escape</kbd> | Close any open dialog, modal, or drawer | Restores focus to primary transport bar |

- **Screen Reader ARIA-Live Announcer**: Throttled non-visual updates announcing dates, seasons, values, and musical notes via `#srLiveAnnouncer` (`aria-live="polite"`).
- **🎙️ Web Speech API Mission Narrator**: Integrated voice engine speaking natural-language climate briefs of seasonal shifts and weather extremes.
- **High-Contrast Focus Outlines**: Electric Cyan (`#38bdf8`) indicators with $>7:1$ contrast against the obsidian space background.
- **Multi-Modal Sensory Redundancy**: Every data point is presented simultaneously through auditory pitch, percussive timbre, screen-reader text, and visual waveforms.

---

## 7. Official Evaluation: The 6 Core Questions (Challenge Guide Page 9)

### Question 1: Data Mapping Logic
> *"How do pixel color attributes (RGB, luminance) map mathematically to acoustic properties (pitch, timbre, gain) without creating chaotic noise?"*

**Detailed Engineering Solution:**
Directly mapping every pixel in a 500,000-pixel satellite image to an oscillator produces dissonant white noise. The Earth Information Jukebox solves this through **Spatial Latitude Binning & Consonant Harmonic Mapping**:
1. **Vertical Spatial Discretization**: The image height is partitioned into 16 discrete latitude bands ($B_0$ to $B_{15}$). For each scanning column $x$, the engine computes the spatial mean luminance and RGB profile:
   $$\bar{\mathcal{L}}_k(x) = \frac{1}{|B_k|} \sum_{y \in B_k} \left(0.2126\,R(x,y) + 0.7152\,G(x,y) + 0.0722\,B(x,y)\right)$$
2. **Consonant Scale Quantization**: The 16 latitude bins correspond directly to quantized scale degrees in a 16-note scale spanning 3 octaves ($C3$ to $C6$). Because every note is quantized to the active musical scale (e.g. C Major Pentatonic), simultaneous active notes always form natural harmonic intervals (octaves, fifths, fourths, minor thirds), eliminating chaotic microtonal clash.
3. **Dynamic Noise Gating**: An energy gate ($\mathcal{L}_{\text{threshold}} = 0.08$) completely mutes dark background space and deep ocean basins, preventing empty pixels from generating acoustic clutter.
4. **Spectral Hue $\to$ Timbre Modulation**: Dominant wavelength dictates oscillator timbre:
   - **Warm Infrared / Red / Orange** ($H \in [0^\circ, 45^\circ]$): Resonant sawtooth oscillator with low-pass filtering, symbolizing heatwaves and wildfire smoke.
   - **Mid-Temperate Green / Yellow** ($H \in [80^\circ, 160^\circ]$): Triangle wave polyphony with soft decay, symbolizing vegetation and terrestrial biomes.
   - **Cold Glacial Cyan / White** ($H \in [180^\circ, 240^\circ]$): High-frequency sine chime with shimmer reverb, symbolizing polar ice caps and glacial margins.

---

### Question 2: Spatial Scanning Strategy
> *"What spatial scanning methods (left-to-right raster, radial sweep, centroid tracking) best capture patterns in static images versus dynamic video frames?"*

**Detailed Engineering Solution:**
The platform incorporates three tailored scanning strategies:
1. **Linear Zonal Raster Scan (Left-to-Right)**: 
   - Maps Earth longitude directly to musical time ($t(x) = \frac{x}{W} \times T_{\text{scan}}$). As the glowing laser playhead sweeps east across continents and ocean basins from $180^\circ\text{W}$ to $180^\circ\text{E}$, listeners intuitively hear diurnal warming, desert thermal plumes, and oceanic upwelling in chronological sequence. This is the optimal method for global static and reanalysis frames.
2. **Radial Polar Sweep (Cyclonic & Arctic Phenomena)**: 
   - Rotates a radial scan vector around a localized geographic center (e.g., tropical cyclone eyewall, polar ice vortex). Radius $r$ maps to pitch frequency, while azimuth $\theta$ maps to time ($0^\circ \to 360^\circ$), translating concentric eyewalls and spiral rainbands into dramatic cyclical acoustic crescendos.
3. **Interactive Centroid Reticle (Point-and-Hear Exploration)**: 
   - Designed for micro-exploration: visually impaired users move the mouse or touch reticle over specific geographic regions (e.g., Greenland ice sheet vs. Sahara Desert) to instantly trigger the localized harmonic chord of that exact coordinate without waiting for a full raster sweep.

---

### Question 3: Harmonic Quantization
> *"How can continuous numerical data be constrained to specific musical scales (e.g., minor pentatonic) to keep output aesthetically pleasing while retaining data accuracy?"*

**Detailed Engineering Solution:**
Continuous planetary telemetry (e.g. temperature varying continuously between $-20.0^\circ\text{C}$ and $+48.0^\circ\text{C}$) is mapped to discrete musical pitches through monotonic interval quantization:
$$\text{NoteIndex} = \text{Clamp}\left(0,\, M - 1,\, \left\lfloor \bar{\mathcal{L}}_{\text{normalized}} \times M \right\rfloor\right)$$
where $M = 16$ scale degrees across 3 octaves.

Because the quantization function is strictly monotonic ($x_1 > x_2 \implies f(x_1) \ge f(x_2)$), a higher environmental temperature or higher satellite radiance strictly produces a higher musical pitch. The scientific trend is 100% preserved.

---

### Question 4: Performance Optimization
> *"How does the application maintain real-time frame processing and audio synthesis without introducing latency or browser stuttering?"*

**Detailed Engineering Solution:**
1. **Decoupled Multi-Threaded Audio Execution**: Tone.js audio synthesis runs on the browser's dedicated high-priority Web Audio hardware thread, completely decoupled from DOM and canvas rendering. Even if heavy graphics cause a frame drop, audio playback continues uninterrupted without audio clipping or jitter.
2. **Zero-Drift Clock Scheduling**: Replaces drift-prone JavaScript `setInterval()` with high-precision `performance.now()` wall-clock delta compensation.
3. **O(1) Pre-Computed Downsampling Matrix**: When an EIC satellite frame is ingested, an off-screen HTML5 Canvas downsamples the image to a $256 \times 64$ analytical pixel matrix once. During 60fps scanning, column lookups are pure array index queries ($O(1)$ complexity) requiring zero heavy image filtering per frame.
4. **Direct Canvas Plugin Scrubber**: The glowing playhead laser line is drawn directly inside Chart.js's native `afterDraw` lifecycle, eliminating separate layered overlay canvases and GPU composition bottlenecks.

---

### Question 5: Universal Accessibility
> *"How is the user interface optimized for visually impaired users relying on screen readers, keyboard navigation, or descriptive text?"*

**Detailed Engineering Solution:**
- **WCAG 2.2 Level AAA Compliance**: Complete keyboard operability, visible focus indicators, color-independent status icons, and contrast ratios $> 7:1$.
- **ARIA Live Telemetry Announcer**: Real-time non-visual feedback announcing dates, temperature values, anomalies, and active notes without interrupting screen-reader focus.
- **Integrated Spoken Audio Description**: Uses the Web Speech API to provide verbal narration of seasonal shifts and planetary weather records.
- **Auditory Haptic Guidance**: Distinct auditory cues indicate transport events (start, pause, dataset load, and month transitions).

---

### Question 6: Multi-Layer Data Handling
> *"How can complex visualizations containing multiple environmental layers be represented using distinct timbres or instrumentation?"*

**Detailed Engineering Solution:**
- **Frequency Separation**:
  - **Primary Melodic Layer (Temperature / Thermal Anomaly)**: Occupies the mid-to-high register ($260\text{ Hz} - 1046\text{ Hz}$) with warm, sustained envelope pads.
  - **Percussive Layer (Precipitation)**: Occupies the transient low-frequency band ($40\text{ Hz} - 150\text{ Hz}$), triggering acoustic membrane drum strikes with velocity proportional to rainfall volume.
  - **Wind Speed Layer (Aerodynamic Atmosphere)**: Occupies a band-pass filtered pink noise generator ($400\text{ Hz} - 1200\text{ Hz}$), where wind velocity modulates filter resonance and Q-factor.
  - **Chronological Timekeeping Layer (Calendar Pulse)**: Triggers a clean sub-bass triangle note (`C2`, $65.4\text{ Hz}$) strictly on the 1st day of each month.
- **Spatial Stereo Panning**: Temperature is centered, precipitation is panned left ($-0.25$), and wind is panned right ($+0.25$), preventing auditory masking.

---

## 8. NASA Earth Science Data Utilized
- **NASA Langley Research Center POWER Project**: Daily meteorological telemetry (`T2M`, `PRECTOTCORR`, `WS2M`) from 1981 to present across global grids.
- **NASA Earth Information Center (EIC) Remote Sensing Blends**:
  - MODIS (Moderate Resolution Imaging Spectroradiometer) on Terra and Aqua
  - VIIRS (Visible Infrared Imaging Radiometer Suite) on Suomi NPP / NOAA-20
  - ICESat-2 (Ice, Cloud, and land Elevation Satellite-2) ATLAS lidar
  - GRACE-FO (Gravity Recovery and Climate Experiment Follow-On)
  - Jason-3 Radar Altimetry ocean surface topography
- **Attribution Statement**:
  > *"These data were obtained from the NASA Langley Research Center POWER Project funded through the NASA Earth Science Directorate Applied Science Program, and the NASA Earth Information Center (EIC) multi-mission observational repository."*

---

## 9. Technical Stack
- **Backend API & Computer Vision**: Python 3.10+, FastAPI, Uvicorn, OpenCV 4.x (`cv2`), NumPy, Pandas, Requests
- **Audio Synthesis**: Tone.js (Web Audio API hardware synthesis)
- **Data Visualization**: Chart.js 4.4, Three.js (r128), HTML5 Canvas
- **Cartography**: Leaflet 1.9 with CartoDB Dark Matter tiles
- **Accessibility**: Native Web Speech API, WCAG 2.2 Level AAA ARIA-Live framework
- **Deployment**: Docker, Docker Compose, Windows PowerShell Launcher
