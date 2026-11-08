# 🚀 NASA Space Apps Challenge — Submission Document

## 1. Project Title
**The Earth Information Jukebox: Translating NASA Earth Observations into Musical Sonification and Interactive Dynamic Visualizations**

---

## 2. High-Level Summary (Elevator Pitch)
The Earth Information Jukebox is an open-source data sonification and visualization platform that transforms NASA Earth Observation satellite telemetry into harmonious, intuitive music and real-time synchronized charts. Instead of deciphering complex 2D graphs or dense scientific spreadsheets, users **listen** to a year of planetary climate telemetry. Daily temperatures modulate melodic pitch across consonant pentatonic scales, rainfall triggers dynamic acoustic percussion, and monthly calendar pulses orient the listener in time. Designed with accessibility at its core, the project empowers visually impaired individuals, students, and researchers to experience Earth's dynamic climate system through sound.

---

## 3. Challenge Description & The Problem
NASA's Earth-observing satellites and reanalysis missions generate terabytes of critical environmental telemetry every single day. However, communicating these datasets to the public faces two major barriers:
1. **Cognitive Overload & Data Fatigue:** Static line plots and tables require specialized scientific literacy and often fail to convey the visceral, emotional reality of seasonal transitions, extreme heatwaves, and monsoon surges.
2. **Accessibility Barriers:** Traditional climate communication relies almost exclusively on visual mediums, shutting out visually impaired learners and auditory thinkers.

---

## 4. The Solution: How It Works
The Earth Information Jukebox bridges science and music through a 5-module decoupled architecture:

1. **NASA POWER Data Ingestion:** Directly queries the NASA Langley Research Center POWER Project API for daily air temperature (`T2M`), precipitation (`PRECTOTCORR`), and wind speed (`WS2M`).
2. **Data Sanitization & Normalization:** Resolves missing sensor readings (`-999` sentinels) using linear interpolation to prevent jarring audio artifacts, scaling measurements between `0.0` and `1.0`.
3. **Harmonic Sonification Engine (Tone.js):** 
   - Uses **Musical Scale Quantization** (C Major Pentatonic, Lydian Celestial, Minor Pentatonic, Akebono) across 3 octaves so that raw sensor volatility sounds consonant, pleasing, and never chaotic.
   - **Polyphony & Dual-Track Layering:** Temperature plays the primary melodic synth, while rainfall triggers percussive acoustic drum impacts scaled to precipitation intensity.
   - **Timekeeping Drones:** A soft sub-bass note (`C2`) marks the 1st day of each month.
4. **Synchronized Playhead (Chart.js):** A custom vertical glowing needle tracks the currently playing calendar day with millisecond accuracy and allows click-to-seek scrubbing.
5. **Interactive Global Exploration & AI Intelligence:** Features an interactive Leaflet map to pick any coordinate on Earth, client-side `.webm` audio recording, CSV export for research, and an AI-driven scientific climate anomaly briefing.

---

## 5. NASA Earth Science Data Utilized
- **Data Source:** NASA Langley Research Center POWER (Prediction of Worldwide Energy Resources) Project.
- **Parameters:**
  - `T2M`: Air Temperature at 2 Meters (°C)
  - `PRECTOTCORR`: Corrected Total Precipitation (mm/day)
  - `WS2M`: Wind Speed at 2 Meters (m/s)
- **Coverage:** Global grid, daily resolution from 1981 to present.
- **Attribution Statement:**
  > *"These data were obtained from the NASA Langley Research Center POWER Project funded through the NASA Earth Science Directorate Applied Science Program."*

---

## 6. Societal Impact & Accessibility
- **Inclusive Science Education:** Provides an auditory modality for blind and visually impaired students to explore climate trends independently.
- **Multi-Sensory Engagement:** Combines auditory pitch and visual curves to deepen intuition regarding climate volatility and extreme weather events.
- **Open Science:** Researchers and educators can download cleaned, normalized datasets as CSVs or export generated audio tracks for presentations and educational curricula.

---

## 7. Technology Stack
- **Backend:** Python 3.10+, FastAPI, Uvicorn, Pandas, NumPy, Requests
- **Audio Synthesis:** Tone.js (Web Audio API)
- **Data Visualization:** Chart.js, HTML5 Canvas
- **Geographic Exploration:** Leaflet.js with CartoDB Dark Matter tiles
- **AI & Climatology:** Rule-based atmospheric analysis with optional Groq LLM integration
- **Version Control & Tooling:** Git, GitHub, RESTful APIs

---

## 8. Team Members & Roles
- **Team Lead & Backend Engineering:** NASA POWER integration, FastAPI microservice, caching layer.
- **Audio & Sonification Specialist:** Tone.js harmonic scales, synthesis design, Web Audio MediaRecorder.
- **Frontend & Visualization Developer:** Chart.js synchronized scrubber, Leaflet map, mission control HUD.
- **UI/UX & Accessibility Designer:** Obsidian space observatory theme, contrast accessibility, responsive layouts.

