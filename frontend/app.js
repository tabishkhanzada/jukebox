/**
 * NASA Earth Information Jukebox - Mission Orchestrator
 * Module 5: Connects API telemetry, Sonification Engine (Tone.js),
 * Dynamic Chart Engine (Chart.js), Dual-Track Audio, and Audio/Data Export.
 */

// Determine API base URL (works seamlessly when served from FastAPI or opened standalone)
const API_BASE_URL = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
  ? `${window.location.origin}/api`
  : "http://127.0.0.1:8000/api";

class EarthJukeboxApp {
  constructor() {
    this.currentData = null;
    this.secondaryData = null; // Rainfall dataset for dual-track
    this.activeMetric = "temperature";
    this.activeCity = "Karachi";
    this.activeYear = 2024;
    this.customCoords = null;
    this.isDualTrackActive = true;

    // Subsystem instances
    this.chartEngine = null;
    this.sonifier = window.earthSonifier;

    // DOM Elements cache
    this.dom = {
      citySelect: document.getElementById("citySelect"),
      customCoordInputs: document.getElementById("customCoordInputs"),
      customLat: document.getElementById("customLat"),
      customLon: document.getElementById("customLon"),
      applyCoordsBtn: document.getElementById("applyCoordsBtn"),
      yearSelect: document.getElementById("yearSelect"),
      fetchBtn: document.getElementById("fetchDataBtn"),
      metricPills: document.querySelectorAll(".metric-pill"),
      
      // Export & Recording buttons
      exportCsvBtn: document.getElementById("exportCsvBtn"),
      recordAudioBtn: document.getElementById("recordAudioBtn"),
      recordDot: document.getElementById("recordDot"),
      recordText: document.getElementById("recordText"),

      // Audio controls
      scaleSelect: document.getElementById("scaleSelect"),
      instrumentSelect: document.getElementById("instrumentSelect"),
      dualTrackToggle: document.getElementById("dualTrackToggle"),
      speedRange: document.getElementById("speedRange"),
      speedDisplay: document.getElementById("speedDisplay"),
      volumeRange: document.getElementById("volumeRange"),
      volumeDisplay: document.getElementById("volumeDisplay"),

      // Transport
      playBtn: document.getElementById("playBtn"),
      pauseBtn: document.getElementById("pauseBtn"),
      restartBtn: document.getElementById("restartBtn"),

      // Telemetry HUD
      hudDate: document.getElementById("hudDate"),
      hudDayOfYear: document.getElementById("hudDayOfYear"),
      hudValue: document.getElementById("hudValue"),
      hudUnit: document.getElementById("hudUnit"),
      hudNote: document.getElementById("hudNote"),
      hudFreq: document.getElementById("hudFreq"),

      // Viewport & Info
      chartHeading: document.getElementById("chartHeading"),
      climateTag: document.getElementById("climateTag"),
      cacheBadge: document.getElementById("cacheBadge"),
      narrativeText: document.getElementById("narrativeText"),

      // Stats
      statMean: document.getElementById("statMean"),
      statMax: document.getElementById("statMax"),
      statMaxDate: document.getElementById("statMaxDate"),
      statMin: document.getElementById("statMin"),
      statMinDate: document.getElementById("statMinDate"),
      statRange: document.getElementById("statRange")
    };

    this.init();
  }

  async init() {
    console.log("Initializing Earth Information Jukebox Mission Control...");

    // 1. Initialize Visualizer & Chart Engine (Module 4)
    this.chartEngine = new window.ClimateChartEngine("climateChart", "audioVisualizer");

    // 2. Wire Sonification Engine Callbacks (Module 3)
    this.sonifier.onStepCallback = (stepInfo) => this.handleAudioStep(stepInfo);
    this.sonifier.onPlaybackStateChange = (isPlaying) => this.handlePlaybackChange(isPlaying);
    this.sonifier.onRecordingStateChange = (isRec) => this.handleRecordingChange(isRec);

    // 3. Setup UI Listeners (Module 5)
    this.bindEvents();

    // 4. Initial Telemetry Ingestion
    await this.loadTelemetry();
  }

  bindEvents() {
    // City selection
    this.dom.citySelect.addEventListener("change", (e) => {
      if (e.target.value === "custom") {
        this.dom.customCoordInputs.classList.remove("hidden");
      } else {
        this.dom.customCoordInputs.classList.add("hidden");
        this.activeCity = e.target.value;
        this.customCoords = null;
        this.loadTelemetry();
      }
    });

    // Custom coordinates button
    this.dom.applyCoordsBtn.addEventListener("click", () => {
      const lat = parseFloat(this.dom.customLat.value);
      const lon = parseFloat(this.dom.customLon.value);
      if (!isNaN(lat) && !isNaN(lon)) {
        this.customCoords = { lat, lon };
        this.activeCity = null;
        this.loadTelemetry();
      }
    });

    // Metric Toggle Pills
    this.dom.metricPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        this.dom.metricPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        this.activeMetric = pill.getAttribute("data-metric");
        this.loadTelemetry();
      });
    });

    // Year selection
    this.dom.yearSelect.addEventListener("change", (e) => {
      this.activeYear = parseInt(e.target.value, 10);
      this.loadTelemetry();
    });

    // Ingest Button
    this.dom.fetchBtn.addEventListener("click", () => {
      this.loadTelemetry(true);
    });

    // Dual-track toggle
    if (this.dom.dualTrackToggle) {
      this.dom.dualTrackToggle.addEventListener("change", (e) => {
        this.isDualTrackActive = e.target.checked;
        this.sonifier.setDualTrack(this.isDualTrackActive);
        if (this.currentData) {
          this.chartEngine.renderDataset(this.currentData, this.secondaryData, this.isDualTrackActive);
        }
      });
    }

    // Audio Settings
    this.dom.scaleSelect.addEventListener("change", (e) => {
      this.sonifier.setScale(e.target.value);
    });

    this.dom.instrumentSelect.addEventListener("change", (e) => {
      this.sonifier.buildMelodySynth(e.target.value);
    });

    this.dom.speedRange.addEventListener("input", (e) => {
      const speed = parseFloat(e.target.value);
      this.dom.speedDisplay.textContent = `${speed.toFixed(1)}x`;
      this.sonifier.setSpeed(speed);
    });

    this.dom.volumeRange.addEventListener("input", (e) => {
      const db = parseInt(e.target.value, 10);
      this.dom.volumeDisplay.textContent = `${db} dB`;
      this.sonifier.setMasterVolume(db);
    });

    // Master Transport Controls
    this.dom.playBtn.addEventListener("click", () => {
      if (this.sonifier.isPlaying) {
        this.sonifier.pause();
      } else {
        this.sonifier.play();
      }
    });

    this.dom.pauseBtn.addEventListener("click", () => {
      this.sonifier.pause();
    });

    this.dom.restartBtn.addEventListener("click", () => {
      this.sonifier.stop();
    });

    // Data Export CSV Button
    if (this.dom.exportCsvBtn) {
      this.dom.exportCsvBtn.addEventListener("click", () => {
        this.exportDataCsv();
      });
    }

    // Audio Recording / Download Button
    if (this.dom.recordAudioBtn) {
      this.dom.recordAudioBtn.addEventListener("click", () => {
        if (this.sonifier.isRecording) {
          this.sonifier.stopRecordingAndDownload();
        } else {
          this.sonifier.startRecording();
        }
      });
    }

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        this.dom.playBtn.click();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.sonifier.seek(this.sonifier.currentIndex + 5);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        this.sonifier.seek(this.sonifier.currentIndex - 5);
      } else if (e.code === "KeyR") {
        e.preventDefault();
        this.sonifier.stop();
      }
    });
  }

  /**
   * Primary Telemetry Ingestion Pipeline:
   * Requests data from FastAPI backend or falls back to simulated offline data.
   */
  async loadTelemetry(forceRefresh = false) {
    this.sonifier.stop();
    this.dom.fetchBtn.innerHTML = '<span class="btn-icon">⏳</span> Ingesting...';
    this.dom.fetchBtn.disabled = true;

    let url = `${API_BASE_URL}/data?type=${this.activeMetric}&year=${this.activeYear}&force_refresh=${forceRefresh}`;
    if (this.customCoords) {
      url += `&lat=${this.customCoords.lat}&lon=${this.customCoords.lon}`;
    } else {
      url += `&city=${encodeURIComponent(this.activeCity)}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // If metric is temperature and not custom coordinates, pre-fetch rainfall for dual-track
      if (this.activeMetric === "temperature" && this.activeCity) {
        try {
          const rainUrl = `${API_BASE_URL}/data?city=${encodeURIComponent(this.activeCity)}&type=rainfall&year=${this.activeYear}`;
          const rainRes = await fetch(rainUrl);
          if (rainRes.ok) {
            this.secondaryData = await rainRes.json();
          }
        } catch (e) {
          console.warn("Secondary rainfall fetch skipped:", e);
        }
      } else {
        this.secondaryData = null;
      }

      this.processDataSuccess(data);
    } catch (err) {
      console.warn("Backend API request failed; activating client-side offline generator:", err);
      const fallbackData = this.generateClientOfflineData();
      this.processDataSuccess(fallbackData);
    } finally {
      this.dom.fetchBtn.innerHTML = '<span class="btn-icon">⚡</span> Ingest Telemetry';
      this.dom.fetchBtn.disabled = false;
    }
  }

  /**
   * Applies ingested NASA dataset across all subsystems.
   */
  processDataSuccess(data) {
    this.currentData = data;

    // 1. Configure Tone.js Sonifier
    this.sonifier.loadDataset(data, this.secondaryData);
    this.sonifier.setDualTrack(this.isDualTrackActive);

    // 2. Render into Chart.js (with dual-axis if available)
    this.chartEngine.renderDataset(data, this.secondaryData, this.isDualTrackActive);

    // 3. Update HUD Display
    this.dom.hudUnit.textContent = data.unit;
    this.dom.chartHeading.textContent = `${data.city} — ${data.parameter_name} (${data.year})`;
    this.dom.climateTag.textContent = data.location.climate || "Global Observation Point";
    this.dom.cacheBadge.textContent = data.cached
      ? "⚡ Cached NASA POWER Telemetry"
      : data.status === "fallback"
      ? "⚠️ Offline Simulated Dataset"
      : "🛰️ Live Ingested from NASA POWER";

    // 4. Update Statistics Card
    const ins = data.insights;
    this.dom.statMean.textContent = `${ins.mean} ${data.unit}`;
    this.dom.statMax.textContent = `${ins.max} ${data.unit}`;
    this.dom.statMaxDate.textContent = `Peak: ${ins.peak_record.date}`;
    this.dom.statMin.textContent = `${ins.min} ${data.unit}`;
    this.dom.statMinDate.textContent = `Trough: ${ins.trough_record.date}`;
    const range = (ins.max - ins.min).toFixed(1);
    this.dom.statRange.textContent = `${range} ${data.unit}`;

    // 5. Update Climate Narrative Story
    this.dom.narrativeText.textContent = data.narrative;

    // 6. Reset HUD readout to day 0
    if (data.dates.length > 0) {
      this.dom.hudDate.textContent = data.dates[0];
      this.dom.hudDayOfYear.textContent = `Day 1 / ${data.dates.length}`;
      this.dom.hudValue.textContent = data.values[0];
      this.dom.hudNote.textContent = "--";
      this.dom.hudFreq.textContent = "0 Hz";
    }
  }

  /**
   * Invoked on every tick/note generated by the Sonification Engine.
   */
  handleAudioStep(stepInfo) {
    this.dom.hudDate.textContent = stepInfo.date;
    this.dom.hudDayOfYear.textContent = `Day ${stepInfo.index + 1} / ${this.currentData.dates.length}`;
    this.dom.hudValue.textContent = stepInfo.value;
    this.dom.hudNote.textContent = stepInfo.note;
    this.dom.hudFreq.textContent = stepInfo.frequency > 0 ? `${stepInfo.frequency} Hz` : "--";

    this.chartEngine.updateScrubber(stepInfo.index, stepInfo.note, stepInfo.frequency);
  }

  /**
   * Updates Play / Pause button styling.
   */
  handlePlaybackChange(isPlaying) {
    const playText = this.dom.playBtn.querySelector(".play-text");
    const playIcon = this.dom.playBtn.querySelector(".transport-icon");

    if (isPlaying) {
      this.dom.playBtn.classList.add("playing");
      playText.textContent = "PAUSE";
      playIcon.textContent = "⏸";
    } else {
      this.dom.playBtn.classList.remove("playing");
      playText.textContent = "PLAY";
      playIcon.textContent = "▶";
    }
  }

  /**
   * Updates audio recording status indicator.
   */
  handleRecordingChange(isRec) {
    if (isRec) {
      this.dom.recordDot.classList.add("recording");
      this.dom.recordText.textContent = "Recording... (Click to Finish)";
    } else {
      this.dom.recordDot.classList.remove("recording");
      this.dom.recordText.textContent = "Download Audio";
    }
  }

  /**
   * Exports dataset as CSV.
   */
  exportDataCsv() {
    const city = this.activeCity || "Location";
    const year = this.activeYear;
    const exportUrl = `${API_BASE_URL}/export?city=${encodeURIComponent(city)}&year=${year}&format=csv`;

    // Attempt direct download from backend
    window.open(exportUrl, "_blank");
  }

  /**
   * Client-side offline fallback data generator
   */
  generateClientOfflineData() {
    const year = this.activeYear;
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const totalDays = isLeap ? 366 : 365;

    const dates = [];
    const values = [];
    const normalized = [];

    const startDate = new Date(year, 0, 1);
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(startDate.getTime() + i * 86400000);
      const iso = cur.toISOString().split("T")[0];
      dates.push(iso);

      const rad = (i / totalDays) * 2 * Math.PI;
      let val = 0;
      if (this.activeMetric === "temperature") {
        val = 24.0 - 10.0 * Math.cos(rad) + (Math.random() - 0.5) * 2.5;
      } else if (this.activeMetric === "rainfall") {
        val = Math.random() < 0.18 ? Math.random() * 35.0 : 0.0;
      } else {
        val = 4.0 + Math.random() * 6.0;
      }
      values.push(parseFloat(val.toFixed(2)));
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));

    for (let v of values) {
      normalized.push(parseFloat(((v - min) / (max - min || 1)).toFixed(4)));
    }

    const maxIdx = values.indexOf(max);
    const minIdx = values.indexOf(min);

    return {
      status: "fallback",
      city: this.activeCity || "Local Observation",
      identifier: "client_fallback",
      location: { climate: "Simulated Climate Model" },
      data_type: this.activeMetric,
      parameter_code: this.activeMetric === "temperature" ? "T2M" : "PRECTOTCORR",
      parameter_name: this.activeMetric === "temperature" ? "Air Temperature at 2m" : "Precipitation",
      unit: this.activeMetric === "temperature" ? "°C" : "mm/day",
      year: year,
      dates: dates,
      values: values,
      normalized: normalized,
      insights: {
        min: min,
        max: max,
        mean: mean,
        std: 5.2,
        peak_record: { date: dates[maxIdx], value: max },
        trough_record: { date: dates[minIdx], value: min },
        total_days: totalDays
      },
      narrative: `Simulated offline climate model for ${year}. Peak observed on ${dates[maxIdx]} at ${max}. Audio sonification active.`,
      cached: false
    };
  }
}

// Boot application when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.earthJukebox = new EarthJukeboxApp();
});
