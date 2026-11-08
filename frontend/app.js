/**
 * NASA Earth Information Jukebox - Mission Orchestrator
 * Module 5: Connects API telemetry, Sonification Engine (Tone.js),
 * Dynamic Chart Engine (Chart.js), Interactive Leaflet Map, and AI Intelligence Briefs.
 */

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

    // Subsystems
    this.chartEngine = null;
    this.sonifier = window.earthSonifier;
    this.leafletMap = null;
    this.mapMarker = null;

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
      
      // Header & Map Actions
      errorBanner: document.getElementById("errorBanner"),
      errorMessage: document.getElementById("errorMessage"),
      toggleMapBtn: document.getElementById("toggleMapBtn"),
      mapDrawer: document.getElementById("mapDrawer"),
      closeMapBtn: document.getElementById("closeMapBtn"),
      exportCsvBtn: document.getElementById("exportCsvBtn"),
      recordAudioBtn: document.getElementById("recordAudioBtn"),
      recordDot: document.getElementById("recordDot"),
      recordText: document.getElementById("recordText"),

      // Audio controls
      pitchModeSelect: document.getElementById("pitchModeSelect"),
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

      // AI Brief Box
      generateAiBriefBtn: document.getElementById("generateAiBriefBtn"),
      aiBriefContainer: document.getElementById("aiBriefContainer"),
      aiSourceBadge: document.getElementById("aiSourceBadge"),
      aiBriefText: document.getElementById("aiBriefText"),

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

    // 3. Setup UI Listeners & Interactive Map
    this.bindEvents();
    this.initGlobalMap();

    // 4. Initial Telemetry Ingestion
    await this.loadTelemetry();
  }

  initGlobalMap() {
    if (!window.L || !document.getElementById("earthMap")) return;

    try {
      this.leafletMap = L.map("earthMap", {
        center: [24.86, 67.01],
        zoom: 2.5,
        minZoom: 1.5,
        maxZoom: 9
      });

      // Dark CartoDB basemap matching obsidian theme
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> | NASA POWER',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(this.leafletMap);

      // Add preset city markers
      const presetCoords = [
        { name: "Karachi", lat: 24.86, lon: 67.01 },
        { name: "Lahore", lat: 31.52, lon: 74.36 },
        { name: "London", lat: 51.51, lon: -0.13 },
        { name: "New York", lat: 40.71, lon: -74.01 },
        { name: "Dubai", lat: 25.20, lon: 55.27 },
        { name: "Tokyo", lat: 35.68, lon: 139.69 },
        { name: "Nairobi", lat: -1.29, lon: 36.82 }
      ];

      presetCoords.forEach((p) => {
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: 6,
          fillColor: "#38bdf8",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(this.leafletMap);

        marker.bindPopup(`<b>${p.name}</b><br>NASA Observation Station`);
        marker.on("click", () => {
          this.dom.citySelect.value = p.name;
          this.activeCity = p.name;
          this.customCoords = null;
          this.dom.customCoordInputs.classList.add("hidden");
          this.loadTelemetry();
        });
      });

      // Click anywhere to pick custom coordinate
      this.leafletMap.on("click", (e) => {
        const lat = parseFloat(e.latlng.lat.toFixed(2));
        const lon = parseFloat(e.latlng.lng.toFixed(2));

        if (this.mapMarker) {
          this.mapMarker.setLatLng(e.latlng);
        } else {
          this.mapMarker = L.marker(e.latlng).addTo(this.leafletMap);
        }
        this.mapMarker.bindPopup(`<b>Telemetry Pin</b><br>Lat: ${lat}, Lon: ${lon}`).openPopup();

        this.customCoords = { lat, lon };
        this.activeCity = null;
        this.dom.citySelect.value = "custom";
        this.dom.customCoordInputs.classList.remove("hidden");
        this.dom.customLat.value = lat;
        this.dom.customLon.value = lon;

        this.loadTelemetry();
      });
    } catch (err) {
      console.warn("Leaflet map initialization error:", err);
    }
  }

  bindEvents() {
    // Map drawer toggle
    if (this.dom.toggleMapBtn && this.dom.mapDrawer) {
      this.dom.toggleMapBtn.addEventListener("click", () => {
        const isHidden = this.dom.mapDrawer.classList.toggle("hidden");
        if (!isHidden && this.leafletMap) {
          setTimeout(() => this.leafletMap.invalidateSize(), 200);
        }
      });
    }

    if (this.dom.closeMapBtn && this.dom.mapDrawer) {
      this.dom.closeMapBtn.addEventListener("click", () => {
        this.dom.mapDrawer.classList.add("hidden");
      });
    }

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

    // Pitch Mode Toggle (Planetary vs Local Seasonal)
    if (this.dom.pitchModeSelect) {
      this.dom.pitchModeSelect.addEventListener("change", (e) => {
        this.sonifier.setPitchMode(e.target.value);
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

    // Transport Controls
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

    // AI Brief Generator Button
    if (this.dom.generateAiBriefBtn) {
      this.dom.generateAiBriefBtn.addEventListener("click", () => {
        this.fetchAiBrief();
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
   * Requests authentic Earth observations from the FastAPI backend / NASA POWER API.
   * If an error occurs, displays authentic error diagnostics without simulating fake data.
   */
  async loadTelemetry(forceRefresh = false) {
    this.sonifier.stop();
    this.dom.fetchBtn.innerHTML = '<span class="btn-icon">⏳</span> Ingesting...';
    this.dom.fetchBtn.disabled = true;

    if (this.dom.errorBanner) {
      this.dom.errorBanner.classList.add("hidden");
    }

    let url = `${API_BASE_URL}/data?type=${this.activeMetric}&year=${this.activeYear}&force_refresh=${forceRefresh}`;
    if (this.customCoords) {
      url += `&lat=${this.customCoords.lat}&lon=${this.customCoords.lon}`;
    } else {
      url += `&city=${encodeURIComponent(this.activeCity)}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) errorDetail = errJson.detail;
        } catch (_) {}
        throw new Error(errorDetail);
      }
      const data = await response.json();

      // If metric is temperature and not custom coordinates, pre-fetch authentic rainfall for dual-track
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
      console.error("NASA POWER telemetry retrieval failed:", err);
      if (this.dom.errorBanner && this.dom.errorMessage) {
        this.dom.errorMessage.textContent = `NASA POWER Error: ${err.message}. Please verify coordinates, internet access, and ensure backend is running at ${API_BASE_URL.replace('/api', '')}.`;
        this.dom.errorBanner.classList.remove("hidden");
      }
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

    // Hide previous AI brief on new city load
    if (this.dom.aiBriefContainer) {
      this.dom.aiBriefContainer.classList.add("hidden");
    }

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
      ? "⚡ Authentic NASA POWER Telemetry (Cached)"
      : "🛰️ Live Ingested from NASA POWER API";

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
   * Fetch Climatological Analysis Briefing
   */
  async fetchAiBrief() {
    if (!this.currentData) return;
    this.dom.generateAiBriefBtn.innerHTML = "<span>⏳</span> Analyzing...";
    this.dom.generateAiBriefBtn.disabled = true;

    const city = this.activeCity || this.currentData.city;
    const year = this.activeYear;
    const type = this.activeMetric;

    try {
      const url = `${API_BASE_URL}/explain?city=${encodeURIComponent(city)}&year=${year}&type=${type}`;
      const res = await fetch(url);
      if (res.ok) {
        const payload = await res.json();
        this.dom.aiSourceBadge.textContent = payload.explanation.source;
        this.dom.aiBriefText.textContent = payload.explanation.summary;
        this.dom.aiBriefContainer.classList.remove("hidden");
      }
    } catch (e) {
      console.warn("Analysis brief fetch failed:", e);
    } finally {
      this.dom.generateAiBriefBtn.innerHTML = "<span>✨</span> Generate AI Brief";
      this.dom.generateAiBriefBtn.disabled = false;
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
    window.open(exportUrl, "_blank");
  }
}

// Boot application when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  window.earthJukebox = new EarthJukeboxApp();
});

