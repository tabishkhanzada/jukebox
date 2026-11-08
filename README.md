# 🌍 The Earth Information Jukebox

**Event:** NASA Space Apps Challenge  
**Category:** Earth Observation / Data Sonification & Accessibility  
**Status:** Complete & Tested  

> *Translating NASA Earth Observation meteorological telemetry into musical sonification and synchronized interactive charts.*

---

## 🎧 Overview

Instead of deciphering static graphs or tables, **The Earth Information Jukebox** allows scientists, students, and curious listeners to **hear** Earth's changing climate patterns. 

A user selects a location (e.g., Karachi, London, Dubai, Tokyo, or any custom geographic coordinate), a calendar year, and a climate parameter. The system streams 365 daily observations:
- **Temperature** is sonified through pitch across harmonious pentatonic scales (warmer days sound higher, cooler days sound lower).
- **Rainfall** is sonified through percussive rhythm (drizzles trigger soft high clicks; monsoons and downpours trigger resonant drum strikes).
- **Calendar Timekeepers** emit subtle sub-bass pulses on the 1st day of each month so the listener can easily navigate the passage of seasons.
- **Chart.js** runs with a real-time glowing playhead needle locked to the music with click-to-seek timeline scrubbing.

---

## 🏛️ The 5 High-Level Engineering Modules

The project is architected into 5 decoupled, high-grade modules:

| Module | Component | Technologies | Purpose |
|---|---|---|---|
| **Module 1** | **NASA Data Ingestion & Sanitization Engine** | Python 3.10, Pandas, NumPy, Requests | Ingests NASA Langley POWER API daily telemetry, handles missing values (`-999` sentinel interpolation), scales values `[0, 1]` for audio velocity/pitch, generates climate intelligence statistics, and manages local disk caching. |
| **Module 2** | **FastAPI RESTful Microservice** | FastAPI, Uvicorn, Pydantic, CORS | Asynchronous REST API providing `/api/data`, `/api/cities`, `/api/compare`, and `/api/health` with OpenAPI/Swagger docs (`/docs`) and static asset hosting. |
| **Module 3** | **Advanced Web Audio Sonification Engine** | Tone.js (Web Audio API) | Multi-timbral synthesizer with harmonic scale quantization (C Major Pentatonic, Lydian Celestial, Minor Pentatonic, Akebono), percussion layering, timekeeping bass drone, and precise transport scheduling. |
| **Module 4** | **Synchronized Visualizer & Chart Engine** | Three.js, Chart.js, HTML5 Canvas | Interactive 3D particle sphere globe with 12,000+ points and solar rim lighting, zero-lag glowing playhead scrubber needle, and audio-reactive particle pulse. |
| **Module 5** | **Mission Control UI/UX & Climate Intelligence** | HTML5, CSS3, ES6 JavaScript, Leaflet | Authentic NASA mission control aesthetic matching deep-space telemetry terminals, 5-column live telemetry HUD (Season, Weather, Acoustic Note, Atmosphere, Datastream), slide-out controls drawer, interactive satellite world map, and AI climate briefings. |

---

## 🚀 Quickstart

### Prerequisites
- Python 3.10+ (with `fastapi`, `uvicorn`, `requests`, `pandas`, `numpy`)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 1-Click Launch (Windows)
Double-click `start.bat` or run in terminal:
```bash
py -3.10 run.py
```
This automatically starts the backend server on `http://127.0.0.1:8000/` and opens the UI in your default browser.

### Manual Backend Launch
```bash
py -3.10 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Then visit:
- **Web App:** http://127.0.0.1:8000/
- **Interactive API Documentation:** http://127.0.0.1:8000/docs

---

## 🎵 Sonification Rules & Musical Design

To ensure sonification sounds melodious rather than abrasive noise:
1. **Scale Quantization:** Normalized values ($0.0$ to $1.0$) are mapped to a 16-note scale spanning 3 octaves (e.g., C3 through C6). The default **C Major Pentatonic** contains no semitone clashes or tritones.
2. **Timbre Selection:** Choose between **Space PolySynth**, **Acoustic Marimba**, or **Warm Atmospheric Pad**.
3. **Dual Layering:** Temperature controls melody note frequency, while precipitation triggers dynamic drum hits proportional to rain volume.
4. **Playback Speed Control:** Adjustable from 0.5x to 2.5x speed (each year takes ~15 to 45 seconds).

---

## 🧪 Testing & Verification

Run the automated test suite verifying data sanitization, sentinel interpolation, and boundary normalizations:
```bash
py -3.10 -m unittest backend.test_service
```

Run full-stack End-to-End integration verification (all routes, static assets, 3D globe, and APIs):
```bash
py -3.10 -m backend.verify_e2e
```

---

## 📡 NASA Data Attribution

*These data were obtained from the NASA Langley Research Center POWER Project funded through the NASA Earth Science Directorate Applied Science Program.*

- **NASA POWER API Documentation:** https://power.larc.nasa.gov/docs/
- **Parameters Utilized:**
  - `T2M`: Air Temperature at 2 Meters (°C)
  - `PRECTOTCORR`: Precipitation Corrected (mm/day)
  - `WS2M`: Wind Speed at 2 Meters (m/s)

---

## 📄 License
Open source under the MIT License for the NASA Space Apps Challenge.

