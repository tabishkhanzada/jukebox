/**
 * NASA Earth Information Jukebox - Mission Orchestrator
 * High-End Planetary Mission Control Architecture
 * Orchestrates 3D Three.js Particle Globe, Tone.js Sonification Engine,
 * Chart.js Timeline, and NASA POWER Telemetry Systems.
 */

const API_BASE_URL = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
  ? `${window.location.origin}/api`
  : "http://127.0.0.1:8000/api";

/**
 * High-performance Sci-Fi Telemetry Matrix Glyph Decrambler
 * Delivers clean, Apple/NASA-grade character decryption on data ingest.
 */
class TelemetryScrambler {
  static scramble(element, targetText, duration = 400) {
    if (!element || !targetText) return;

    // Crisp NASA hex digits, math operators, and space telemetry glyphs
    const glyphs = "0123456789ABCDEF•°>∆∇µλ∑";
    const startTime = performance.now();
    const length = targetText.length;

    if (element._scrambleRaf) {
      cancelAnimationFrame(element._scrambleRaf);
      element._scrambleRaf = null;
    }

    element.classList.add("telemetry-scrambling");

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);
      // Smooth ease-out exponential curve
      const resolvedCount = Math.floor(Math.pow(progress, 0.75) * length);

      let output = "";
      for (let i = 0; i < length; i++) {
        const char = targetText[i];
        if (char === " " || char === "\n" || char === "/" || char === "•") {
          output += char;
        } else if (i < resolvedCount) {
          output += char;
        } else {
          output += glyphs[Math.floor(Math.random() * glyphs.length)];
        }
      }

      element.textContent = output;

      if (progress < 1.0) {
        element._scrambleRaf = requestAnimationFrame(update);
      } else {
        element.textContent = targetText;
        element._scrambleRaf = null;
        element.classList.remove("telemetry-scrambling");
        element.classList.add("telemetry-settled");
        setTimeout(() => element.classList.remove("telemetry-settled"), 320);
      }
    };

    element._scrambleRaf = requestAnimationFrame(update);
  }
}

window.TelemetryScrambler = TelemetryScrambler;

class EarthJukeboxApp {
  constructor() {
    this.currentData = null;
    this.secondaryData = null; // Rainfall dataset for dual-track
    this.activeMetric = "temperature";
    this.activeCity = "Karachi";
    this.activeYear = 2024;
    this.customCoords = null;
    this.isDualTrackActive = true;
    this.activeViewMode = "timeline"; // "timeline" or "scanner"

    // Subsystem instances
    this.chartEngine = null;
    this.sonifier = window.earthSonifier;
    this.globe = null;
    this.leafletMap = null;
    this.mapMarker = null;
    this.scanner = null;
    this.accessibility = null;

    // DOM Elements cache
    this.dom = {
      // Top Navigation & Modes
      stationDropdownBtn: document.getElementById("stationDropdownBtn"),
      toggleControlsBtn: document.getElementById("toggleControlsBtn"),
      toggleMapBtn: document.getElementById("toggleMapBtn"),
      exportCsvBtn: document.getElementById("exportCsvBtn"),
      recordAudioBtn: document.getElementById("recordAudioBtn"),
      recordDot: document.getElementById("recordDot"),
      recordText: document.getElementById("recordText"),
      viewTimelineBtn: document.getElementById("viewTimelineBtn"),
      viewScannerBtn: document.getElementById("viewScannerBtn"),
      toggleVoiceBtn: document.getElementById("toggleVoiceBtn"),
      keyboardHelpBtn: document.getElementById("keyboardHelpBtn"),
      closeAccModalBtn: document.getElementById("closeAccModalBtn"),
      accessibilityHelpModal: document.getElementById("accessibilityHelpModal"),

      // Error Banner
      errorBanner: document.getElementById("errorBanner"),
      errorMessage: document.getElementById("errorMessage"),

      // Hero Reticle & Floating Transport
      heroReticleTag: document.getElementById("heroReticleTag"),
      heroReticleSol: document.getElementById("heroReticleSol"),
      playBtn: document.getElementById("playBtn"),
      pauseBtn: document.getElementById("pauseBtn"),
      restartBtn: document.getElementById("restartBtn"),
      speedRange: document.getElementById("speedRange"),
      pitchModeSelect: document.getElementById("pitchModeSelect"),

      // Viewports
      heroChartContainer: document.getElementById("heroChartContainer"),
      globeCanvasContainer: document.getElementById("globeCanvasContainer"),
      eicScannerStage: document.getElementById("eicScannerStage"),
      eicDatasetSelect: document.getElementById("eicDatasetSelect"),
      eicCustomFileInput: document.getElementById("eicCustomFileInput"),
      eicUploadBtn: document.getElementById("eicUploadBtn"),
      eicInspectorCoords: document.getElementById("eicInspectorCoords"),
      eicInspectorChords: document.getElementById("eicInspectorChords"),

      // Bottom 5-Column Telemetry HUD (Matching NASA Reference Photo)
      hudSeason: document.getElementById("hudSeason"),
      hudDayOfYear: document.getElementById("hudDayOfYear"),
      hudValue: document.getElementById("hudValue"),
      hudPeakTrough: document.getElementById("hudPeakTrough"),
      hudDate: document.getElementById("hudDate"),
      hudThermalZone: document.getElementById("hudThermalZone"),
      thermalLegendDock: document.getElementById("thermalLegendDock"),
      hudNote: document.getElementById("hudNote"),
      hudFreq: document.getElementById("hudFreq"),
      hudScaleTag: document.getElementById("hudScaleTag"),
      hudAtmosphere: document.getElementById("hudAtmosphere"),
      hudRainDays: document.getElementById("hudRainDays"),
      hudStatus: document.getElementById("hudStatus"),
      cacheBadge: document.getElementById("cacheBadge"),

      // Slide-Out Drawer & Controls
      controlsDrawer: document.getElementById("controlsDrawer"),
      closeDrawerBtn: document.getElementById("closeDrawerBtn"),
      citySelect: document.getElementById("citySelect"),
      customCoordInputs: document.getElementById("customCoordInputs"),
      customLat: document.getElementById("customLat"),
      customLon: document.getElementById("customLon"),
      applyCoordsBtn: document.getElementById("applyCoordsBtn"),
      metricPills: document.querySelectorAll(".metric-pill"),
      yearSelect: document.getElementById("yearSelect"),
      fetchBtn: document.getElementById("fetchDataBtn"),

      // Audio Synthesis Controls
      scaleSelect: document.getElementById("scaleSelect"),
      instrumentSelect: document.getElementById("instrumentSelect"),
      dualTrackToggle: document.getElementById("dualTrackToggle"),
      volumeRange: document.getElementById("volumeRange"),
      volumeDisplay: document.getElementById("volumeDisplay"),

      // AI Science Analysis
      generateAiBriefBtn: document.getElementById("generateAiBriefBtn"),
      narrativeText: document.getElementById("narrativeText"),
      aiBriefContainer: document.getElementById("aiBriefContainer"),
      aiSourceBadge: document.getElementById("aiSourceBadge"),
      aiBriefText: document.getElementById("aiBriefText"),

      // Map Modal
      mapDrawer: document.getElementById("mapDrawer"),
      closeMapBtn: document.getElementById("closeMapBtn")
    };

    this.init();
  }

  async init() {
    console.log("Booting NASA Science Earth Information Jukebox...");

    // 1. Initialize 3D Planetary Particle Horizon (Three.js)
    if (window.PlanetaryParticleGlobe) {
      this.globe = new window.PlanetaryParticleGlobe("globeCanvasContainer");
    }

    // 2. Initialize Minimalist Timeline Scrubber (Chart.js)
    this.chartEngine = new window.ClimateChartEngine("climateChart", null);

    // 3. Wire Sonification Engine Callbacks (Tone.js)
    this.sonifier.onStepCallback = (stepInfo) => this.handleAudioStep(stepInfo);
    this.sonifier.onPlaybackStateChange = (isPlaying) => this.handlePlaybackChange(isPlaying);
    this.sonifier.onRecordingStateChange = (isRec) => this.handleRecordingChange(isRec);

    // 4. Initialize NASA EIC Visual Frame Sonifier Engine
    if (window.EicFrameScanner) {
      this.scanner = new window.EicFrameScanner("eicScannerCanvas");
      this.scanner.onScanStep = (step) => this.handleScannerStep(step);
      this.scanner.onTransportChange = (isPlaying) => this.handleScannerPlaybackChange(isPlaying);
      this.scanner.loadFrame("sst");
    }

    // 5. Initialize Universal Accessibility Suite (WCAG 2.2 Level AAA)
    if (window.AccessibilitySuite) {
      this.accessibility = new window.AccessibilitySuite(this);
    }

    // 6. Setup UI Listeners & Leaflet Map
    this.bindEvents();
    this.initGlobalMap();

    // 7. Initial Telemetry Ingestion (Karachi default station)
    await this.loadTelemetry();
  }

  initGlobalMap() {
    if (!window.L || !document.getElementById("earthMap")) return;

    try {
      this.leafletMap = L.map("earthMap", {
        center: [24.86, 67.01],
        zoom: 2.2,
        minZoom: 1.5,
        maxZoom: 9
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO | NASA POWER',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(this.leafletMap);

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
          fillColor: "#ff5722",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(this.leafletMap);

        marker.bindPopup(`<b>${p.name}</b><br>NASA Observation Station`);
        marker.on("click", () => {
          this.dom.citySelect.value = p.name;
          this.activeCity = p.name;
          this.customCoords = null;
          this.dom.customCoordInputs.classList.add("hidden");
          this.dom.mapDrawer.classList.add("hidden");
          this.loadTelemetry();
        });
      });

      this.leafletMap.on("click", (e) => {
        const lat = parseFloat(e.latlng.lat.toFixed(2));
        const lon = parseFloat(e.latlng.lng.toFixed(2));

        if (this.mapMarker) {
          this.mapMarker.setLatLng(e.latlng);
        } else {
          this.mapMarker = L.marker(e.latlng).addTo(this.leafletMap);
        }
        this.mapMarker.bindPopup(`<b>Target Pin</b><br>Lat: ${lat}, Lon: ${lon}`).openPopup();

        this.customCoords = { lat, lon };
        this.activeCity = null;
        this.dom.citySelect.value = "custom";
        this.dom.customCoordInputs.classList.remove("hidden");
        this.dom.customLat.value = lat;
        this.dom.customLon.value = lon;
        this.dom.mapDrawer.classList.add("hidden");

        this.loadTelemetry();
      });
    } catch (err) {
      console.warn("Leaflet map init warning:", err);
    }
  }

  bindEvents() {
    // 0. Chrome & Web Audio Autoplay Unlock on first user gesture
    const unlockUserAudio = async () => {
      if (window.Tone) {
        try {
          await Tone.start();
          if (Tone.context && Tone.context.state !== "running") {
            await Tone.context.resume();
          }
          console.log("Web Audio Context unlocked by user gesture.");
        } catch (_) {}
      }
    };
    window.addEventListener("pointerdown", unlockUserAudio, { once: true });
    window.addEventListener("click", unlockUserAudio, { once: true });
    window.addEventListener("keydown", unlockUserAudio, { once: true });

    // Drawer open / close triggers
    const toggleDrawer = () => {
      this.dom.controlsDrawer.classList.toggle("hidden");
    };

    if (this.dom.toggleControlsBtn) this.dom.toggleControlsBtn.addEventListener("click", toggleDrawer);
    if (this.dom.stationDropdownBtn) this.dom.stationDropdownBtn.addEventListener("click", toggleDrawer);
    if (this.dom.closeDrawerBtn) this.dom.closeDrawerBtn.addEventListener("click", toggleDrawer);

    // Map Modal Triggers
    if (this.dom.toggleMapBtn && this.dom.mapDrawer) {
      this.dom.toggleMapBtn.addEventListener("click", () => {
        this.dom.mapDrawer.classList.remove("hidden");
        if (this.leafletMap) {
          setTimeout(() => this.leafletMap.invalidateSize(), 200);
        }
      });
    }

    if (this.dom.closeMapBtn && this.dom.mapDrawer) {
      this.dom.closeMapBtn.addEventListener("click", () => {
        this.dom.mapDrawer.classList.add("hidden");
      });
    }

    // City Selection
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

    // Custom Coordinates Apply
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

    // Mode Switching: Timeline vs EIC Visual Scanner
    if (this.dom.viewTimelineBtn) {
      this.dom.viewTimelineBtn.addEventListener("click", () => this.toggleViewMode("timeline"));
    }
    if (this.dom.viewScannerBtn) {
      this.dom.viewScannerBtn.addEventListener("click", () => this.toggleViewMode("scanner"));
    }

    // Voice Mission Narrator (Web Speech API)
    if (this.dom.toggleVoiceBtn && this.accessibility) {
      this.dom.toggleVoiceBtn.addEventListener("click", () => {
        const isActive = this.accessibility.toggleVoiceNarrator();
        this.dom.toggleVoiceBtn.classList.toggle("active", isActive);
      });
    }

    // Keyboard Shortcuts Modal Triggers
    if (this.dom.keyboardHelpBtn) {
      this.dom.keyboardHelpBtn.addEventListener("click", () => {
        if (this.accessibility) {
          this.accessibility.toggleHelpModal();
        } else {
          const m = document.getElementById("accessibilityHelpModal");
          if (m) {
            m.classList.remove("hidden");
            m.style.display = "flex";
          }
        }
      });
    }

    if (this.dom.closeAccModalBtn) {
      this.dom.closeAccModalBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.accessibility) {
          this.accessibility.closeAllModals();
        } else {
          const m = document.getElementById("accessibilityHelpModal");
          if (m) {
            m.classList.add("hidden");
            m.style.display = "none";
          }
        }
      });
    }

    if (this.dom.accessibilityHelpModal) {
      this.dom.accessibilityHelpModal.addEventListener("click", (e) => {
        if (e.target === this.dom.accessibilityHelpModal) {
          if (this.accessibility) {
            this.accessibility.closeAllModals();
          } else {
            this.dom.accessibilityHelpModal.classList.add("hidden");
            this.dom.accessibilityHelpModal.style.display = "none";
          }
        }
      });
    }

    // EIC Visual Frame Selection & Custom Upload
    if (this.dom.eicDatasetSelect && this.scanner) {
      this.dom.eicDatasetSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "custom") {
          if (this.dom.eicCustomFileInput) this.dom.eicCustomFileInput.click();
        } else {
          this.scanner.loadFrame(val);
          if (this.accessibility) {
            const title = this.scanner.frames[val]?.title || val;
            this.accessibility.announce(`Loaded NASA EIC Dataset: ${title}`, "polite", true);
          }
        }
      });
    }

    if (this.dom.eicUploadBtn && this.dom.eicCustomFileInput) {
      this.dom.eicUploadBtn.addEventListener("click", () => {
        this.dom.eicCustomFileInput.click();
      });
    }

    if (this.dom.eicCustomFileInput && this.scanner) {
      this.dom.eicCustomFileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            this.scanner.loadCustomImage(re.target.result, file.name);
            if (this.accessibility) {
              this.accessibility.announce(`Uploaded and scanned custom NASA frame: ${file.name}`, "assertive", true);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Dual-Mode Audio Transport Controls (Timeline & EIC Scanner)
    this.dom.playBtn.addEventListener("click", async () => {
      if (window.Tone) {
        try {
          await Tone.start();
          if (Tone.context && Tone.context.state !== "running") {
            await Tone.context.resume();
          }
        } catch (_) {}
      }

      if (this.activeViewMode === "scanner" && this.scanner) {
        this.scanner.togglePlay();
      } else if (this.sonifier) {
        if (this.sonifier.isPlaying) {
          this.sonifier.pause();
        } else {
          await this.sonifier.play();
        }
      }
    });

    this.dom.pauseBtn.addEventListener("click", () => {
      if (this.activeViewMode === "scanner" && this.scanner) {
        this.scanner.pause();
      } else if (this.sonifier) {
        this.sonifier.pause();
      }
    });

    this.dom.restartBtn.addEventListener("click", async () => {
      if (this.activeViewMode === "scanner" && this.scanner) {
        this.scanner.stop();
        await this.scanner.play();
      } else if (this.sonifier) {
        this.sonifier.stop();
        await this.sonifier.play();
      }
    });

    // Tempo Speed Selector (Unified)
    this.dom.speedRange.addEventListener("input", (e) => {
      const speed = parseFloat(e.target.value);
      if (this.sonifier) this.sonifier.setSpeed(speed);
      if (this.scanner) this.scanner.setSpeed(speed);
    });

    // Pitch Mode Selector
    this.dom.pitchModeSelect.addEventListener("change", (e) => {
      this.sonifier.setPitchMode(e.target.value);
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

    // Soundscape settings
    this.dom.scaleSelect.addEventListener("change", (e) => {
      this.sonifier.setScale(e.target.value);
      this.dom.hudScaleTag.textContent = `${e.target.options[e.target.selectedIndex].text.toUpperCase()} • ${this.dom.instrumentSelect.options[this.dom.instrumentSelect.selectedIndex].text.toUpperCase()}`;
    });

    this.dom.instrumentSelect.addEventListener("change", (e) => {
      this.sonifier.buildMelodySynth(e.target.value);
      this.dom.hudScaleTag.textContent = `${this.dom.scaleSelect.options[this.dom.scaleSelect.selectedIndex].text.toUpperCase()} • ${e.target.options[e.target.selectedIndex].text.toUpperCase()}`;
    });

    this.dom.volumeRange.addEventListener("input", (e) => {
      const db = parseInt(e.target.value, 10);
      this.dom.volumeDisplay.textContent = `${db} dB`;
      this.sonifier.setMasterVolume(db);
      // Map -36..0 to 0..1 for scanner
      const normVol = Math.max(0, (db + 36) / 36);
      if (this.scanner) this.scanner.setVolume(normVol);
    });

    // Export CSV
    if (this.dom.exportCsvBtn) {
      this.dom.exportCsvBtn.addEventListener("click", () => {
        this.exportDataCsv();
      });
    }

    // Record Audio
    if (this.dom.recordAudioBtn) {
      this.dom.recordAudioBtn.addEventListener("click", () => {
        if (this.sonifier.isRecording) {
          this.sonifier.stopRecordingAndDownload();
        } else {
          this.sonifier.startRecording();
        }
      });
    }

    // AI Brief Generator
    if (this.dom.generateAiBriefBtn) {
      this.dom.generateAiBriefBtn.addEventListener("click", () => {
        this.fetchAiBrief();
      });
    }
  }

  /**
   * Telemetry Ingestion from FastAPI & NASA POWER API
   */
  async loadTelemetry(forceRefresh = false) {
    this.sonifier.stop();
    this.dom.fetchBtn.textContent = "INGESTING...";
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

      // Pre-fetch authentic rainfall data if temperature is active (for dual-track)
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
      console.error("NASA POWER telemetry retrieval error:", err);
      if (this.dom.errorBanner && this.dom.errorMessage) {
        this.dom.errorMessage.textContent = `NASA POWER Error: ${err.message}. Please verify internet access and ensure backend is running.`;
        this.dom.errorBanner.classList.remove("hidden");
      }
    } finally {
      this.dom.fetchBtn.textContent = "INGEST";
      this.dom.fetchBtn.disabled = false;
    }
  }

  /**
   * Applies authentic NASA dataset across 3D Globe, Chart, Audio, and HUD
   */
  processDataSuccess(data) {
    this.currentData = data;

    // 1. Orient 3D Particle Globe to station coordinates
    if (this.globe && data.location) {
      this.globe.setTargetCoordinates(data.location.lat, data.location.lon, data.city);
    }

    // 2. Load into Tone.js Audio Engine
    this.sonifier.loadDataset(data, this.secondaryData);
    this.sonifier.setDualTrack(this.isDualTrackActive);

    // 3. Render Minimalist Synchronized Timeline (Chart.js)
    this.chartEngine.renderDataset(data, this.secondaryData, this.isDualTrackActive);

    // 4. Update HUD Statistics & 5 Columns with Holographic Scramble Decryption
    const ins = data.insights;
    this.dom.hudPeakTrough.innerHTML = `${ins.max}° <span class="sub-dim">HIGH</span>  ${ins.min}° <span class="sub-dim">LOW</span>`;
    this.dom.cacheBadge.textContent = data.cached
      ? "AUTHENTIC SATELLITE TELEMETRY (CACHED)"
      : "LIVE INGESTED FROM NASA POWER API";

    const atmosphereText = data.data_type === "rainfall"
      ? `${ins.total_rainfall} mm TOTAL`
      : (ins.days_above_35c > 0 ? "HEATWAVE ANOMALIES" : "TEMPERATE CONDITIONS");
    TelemetryScrambler.scramble(this.dom.hudAtmosphere, atmosphereText, 450);

    if (data.data_type === "rainfall") {
      this.dom.hudRainDays.textContent = `PEAK: ${ins.peak_record.value} mm • ${ins.rain_days_count} RAIN DAYS`;
    } else {
      this.dom.hudRainDays.textContent = `RANGE: ${ins.temp_range}°C • CDD: ${ins.cooling_degree_days || 0}`;
    }

    TelemetryScrambler.scramble(this.dom.hudStatus, "100% NASA POWER", 380);

    // Narrative text
    this.dom.narrativeText.textContent = data.narrative;
    if (this.dom.aiBriefContainer) {
      this.dom.aiBriefContainer.classList.add("hidden");
    }

    // Reset HUD to day 0 with Scramble Decryption
    if (data.dates.length > 0) {
      this.dom.hudDate.textContent = data.dates[0];
      this.dom.hudDayOfYear.textContent = `SOL ${data.year} • DAY 1 OF ${data.dates.length}`;
      
      const valStr = `${data.values[0]}${data.unit === '°C' ? '°' : ' ' + data.unit}`;
      TelemetryScrambler.scramble(this.dom.hudValue, valStr, 400);

      this.dom.hudNote.textContent = "--";
      this.dom.hudFreq.textContent = "0 Hz";

      const seasonStr = this.calculateSeason(data.dates[0], data.location.lat);
      TelemetryScrambler.scramble(this.dom.hudSeason, seasonStr, 460);

      // Initialize Thermal Category Badge
      if (data.data_type === "temperature") {
        this.updateThermalCategoryBadge(null, data.values[0]);
      } else {
        if (this.dom.hudThermalZone) this.dom.hudThermalZone.style.display = "none";
        if (this.dom.thermalLegendDock) this.dom.thermalLegendDock.style.display = "none";
      }
    }
  }

  /**
   * Updates HUD Thermal Category Badge (Sardi, Theek, Garmi) matching reference video
   */
  updateThermalCategoryBadge(category, tempVal, categoryColor = null, isExtreme = false) {
    if (!this.dom.hudThermalZone) return;

    if (this.currentData && this.currentData.data_type !== "temperature") {
      this.dom.hudThermalZone.style.display = "none";
      if (this.dom.thermalLegendDock) this.dom.thermalLegendDock.style.display = "none";
      return;
    }

    this.dom.hudThermalZone.style.display = "inline-flex";
    if (this.dom.thermalLegendDock) this.dom.thermalLegendDock.style.display = "flex";

    let catKey = category;
    if (!catKey && typeof tempVal === "number" && this.sonifier.getTemperatureCategory) {
      const c = this.sonifier.getTemperatureCategory(tempVal);
      catKey = c.key;
      isExtreme = c.isExtreme;
    }

    // Reset chip active state in the legend
    const chips = this.dom.thermalLegendDock ? this.dom.thermalLegendDock.querySelectorAll(".legend-chip") : [];
    chips.forEach(c => c.classList.remove("active"));

    if (catKey === "COLD") {
      this.dom.hudThermalZone.className = "thermal-zone-badge badge-cold font-mono";
      this.dom.hudThermalZone.textContent = `❄️ SARDI [${tempVal}°]`;
      if (chips[2]) chips[2].classList.add("active");
    } else if (catKey === "MODERATE") {
      this.dom.hudThermalZone.className = "thermal-zone-badge badge-moderate font-mono";
      this.dom.hudThermalZone.textContent = `🌱 THEEK [${tempVal}°]`;
      if (chips[1]) chips[1].classList.add("active");
    } else {
      if (isExtreme) {
        this.dom.hudThermalZone.className = "thermal-zone-badge badge-heatwave font-mono";
        this.dom.hudThermalZone.textContent = `🚨 HEATWAVE [${tempVal}°]`;
      } else {
        this.dom.hudThermalZone.className = "thermal-zone-badge badge-hot font-mono";
        this.dom.hudThermalZone.textContent = `🔥 GARMI [${tempVal}°]`;
      }
      if (chips[0]) chips[0].classList.add("active");
    }
  }

  /**
   * Invoked on every note tick
   */
  handleAudioStep(stepInfo) {
    this.dom.hudDate.textContent = stepInfo.date;
    this.dom.hudDayOfYear.textContent = `SOL ${this.currentData.year} • DAY ${stepInfo.index + 1} OF ${this.currentData.dates.length}`;
    this.dom.hudValue.textContent = `${stepInfo.value}${stepInfo.unit === '°C' ? '°' : ' ' + stepInfo.unit}`;
    this.dom.hudNote.textContent = stepInfo.note;
    this.dom.hudFreq.textContent = stepInfo.frequency > 0 ? `${stepInfo.frequency} Hz` : "--";

    // Dynamic Season calculation
    this.dom.hudSeason.textContent = this.calculateSeason(stepInfo.date, this.currentData.location.lat);

    // Dynamic Atmosphere & Rain Note Synchronizer (Notes evolve as rain increases/decreases)
    if (this.currentData.data_type === "rainfall") {
      if (stepInfo.value > 0.05) {
        this.dom.hudAtmosphere.textContent = `${stepInfo.rainTier || 'RAIN'} [${stepInfo.value.toFixed(1)} mm]`;
        this.dom.hudAtmosphere.className = "col-value text-cyan";
        this.dom.hudRainDays.textContent = `AQUEOUS NOTE: ${stepInfo.rainNote || '--'} ${stepInfo.rainThunder ? '• ⚡ THUNDER' : ''}`;
      } else {
        this.dom.hudAtmosphere.textContent = "DRY REST";
        this.dom.hudAtmosphere.className = "col-value";
        this.dom.hudRainDays.textContent = "0.0 mm/day • CLEAR SKIES";
      }
    } else if (this.currentData.data_type === "temperature") {
      if (stepInfo.rainMm > 0.1) {
        this.dom.hudAtmosphere.textContent = `🌧️ ${stepInfo.rainTier || 'RAIN'} [${stepInfo.rainMm.toFixed(1)} mm]`;
        this.dom.hudAtmosphere.className = "col-value text-cyan";
        this.dom.hudRainDays.textContent = `RAIN NOTE: ${stepInfo.rainNote || '--'} ${stepInfo.rainThunder ? '• ⚡ THUNDER' : ''}`;
      } else {
        this.dom.hudAtmosphere.textContent = "TEMPERATE CONDITIONS";
        this.dom.hudAtmosphere.className = "col-value";
        this.dom.hudRainDays.textContent = "0.0 mm/day • CLEAR SKIES";
      }
    }

    // Dynamic 3-Category Thermal Badge & Rang Legend Sync
    if (stepInfo.category) {
      this.updateThermalCategoryBadge(stepInfo.category, stepInfo.value, stepInfo.categoryColor, stepInfo.isExtreme);
    }

    // Reticle MSL counter update (matching photo's `SOL 3039 MSL / 00:02:12:00`)
    const sec = stepInfo.index % 60;
    const min = Math.floor((stepInfo.index / 60) % 60);
    const hr = Math.floor(stepInfo.index / 3600);
    this.dom.heroReticleSol.textContent = `SOL ${this.currentData.year} • MSL ${String(hr).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;

    // Dynamic 3D Globe audio pulse & thermal category tone
    if (this.globe) {
      this.globe.triggerAudioPulse(stepInfo.frequency);
      this.globe.setThermalTone(stepInfo.value, stepInfo.normalized);
    }

    // Update 60fps playhead scrubber with category color and sub-frame glide
    this.chartEngine.updateScrubber(
      stepInfo.index,
      stepInfo.note,
      stepInfo.frequency,
      stepInfo.categoryColor,
      stepInfo.stepMs || 90,
      stepInfo.isPlaying !== undefined ? stepInfo.isPlaying : this.sonifier.isPlaying
    );

    // Screen reader & Voice Narrator dispatch (WCAG 2.2 AAA rate-limited)
    if (this.accessibility && (stepInfo.index % 25 === 0 || stepInfo.isExtreme)) {
      const seasonName = this.dom.hudSeason.textContent || "Active season";
      const valStr = `${stepInfo.value.toFixed(1)}${stepInfo.unit === '°C' ? '°C' : ' ' + stepInfo.unit}`;
      const msg = stepInfo.isExtreme
        ? `Climate anomaly detected on ${stepInfo.date}: ${valStr}. Acoustic frequency ${stepInfo.frequency} Hertz.`
        : `${seasonName}. ${stepInfo.date}. ${valStr}, note ${stepInfo.note}.`;
      this.accessibility.announce(msg, stepInfo.isExtreme ? "assertive" : "polite");
    }
  }

  calculateSeason(dateStr, lat = 30) {
    const month = parseInt(dateStr.split("-")[1], 10);
    const isNorth = lat >= 0;

    if (month >= 3 && month <= 5) {
      return isNorth ? "Spring / Vernal Equinox" : "Autumn / Equinox";
    } else if (month >= 6 && month <= 8) {
      return isNorth ? "Summer / Solstice" : "Winter / Solstice";
    } else if (month >= 9 && month <= 11) {
      return isNorth ? "Autumn / Equinox" : "Spring / Vernal Equinox";
    } else {
      return isNorth ? "Winter / Solstice" : "Summer / Solstice";
    }
  }

  handlePlaybackChange(isPlaying) {
    const playText = this.dom.playBtn.querySelector(".play-text");
    const playIcon = this.dom.playBtn.querySelector(".play-icon-shape");

    if (this.chartEngine) {
      this.chartEngine.setPlaybackState(isPlaying);
    }

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

  handleRecordingChange(isRec) {
    if (isRec) {
      this.dom.recordDot.classList.add("recording");
      this.dom.recordText.textContent = "REC...";
    } else {
      this.dom.recordDot.classList.remove("recording");
      this.dom.recordText.textContent = "AUDIO";
    }
  }

  toggleViewMode(mode) {
    if (mode === this.activeViewMode) return;
    this.activeViewMode = mode;

    if (mode === "scanner") {
      // Pause timeline sonifier if playing
      if (this.sonifier && this.sonifier.isPlaying) {
        this.sonifier.pause();
      }
      if (this.dom.heroChartContainer) this.dom.heroChartContainer.classList.add("hidden");
      if (this.dom.globeCanvasContainer) this.dom.globeCanvasContainer.classList.add("hidden");
      if (this.dom.eicScannerStage) this.dom.eicScannerStage.classList.remove("hidden");
      if (this.dom.viewScannerBtn) this.dom.viewScannerBtn.classList.add("active");
      if (this.dom.viewTimelineBtn) this.dom.viewTimelineBtn.classList.remove("active");

      if (this.scanner) {
        this.scanner.resize();
        this.handleScannerPlaybackChange(this.scanner.isPlaying);
      }
      if (this.accessibility) {
        this.accessibility.announce("Switched to NASA EIC Visual Frame Sonifier mode.", "assertive", true);
      }
    } else {
      // Pause scanner if playing
      if (this.scanner && this.scanner.isPlaying) {
        this.scanner.pause();
      }
      if (this.dom.eicScannerStage) this.dom.eicScannerStage.classList.add("hidden");
      if (this.dom.heroChartContainer) this.dom.heroChartContainer.classList.remove("hidden");
      if (this.dom.globeCanvasContainer) this.dom.globeCanvasContainer.classList.remove("hidden");
      if (this.dom.viewTimelineBtn) this.dom.viewTimelineBtn.classList.add("active");
      if (this.dom.viewScannerBtn) this.dom.viewScannerBtn.classList.remove("active");

      if (this.chartEngine && this.chartEngine.chart) {
        this.chartEngine.chart.resize();
        this.chartEngine.chart.draw();
      }
      this.handlePlaybackChange(this.sonifier ? this.sonifier.isPlaying : false);
      if (this.accessibility) {
        this.accessibility.announce("Switched to 1-Year Planetary Telemetry Timeline mode.", "assertive", true);
      }
    }
  }

  handleScannerPlaybackChange(isPlaying) {
    if (this.activeViewMode !== "scanner") return;
    const playText = this.dom.playBtn.querySelector(".play-text");
    const playIcon = this.dom.playBtn.querySelector(".play-icon-shape");
    if (isPlaying) {
      this.dom.playBtn.classList.add("playing");
      if (playText) playText.textContent = "PAUSE";
      if (playIcon) playIcon.textContent = "⏸";
    } else {
      this.dom.playBtn.classList.remove("playing");
      if (playText) playText.textContent = "PLAY";
      if (playIcon) playIcon.textContent = "▶";
    }
  }

  handleScannerStep(step) {
    if (this.activeViewMode !== "scanner") return;
    const lonDeg = Math.round(step.progress * 360 - 180);
    const lonStr = lonDeg < 0 ? `${Math.abs(lonDeg)}°W` : `${lonDeg}°E`;
    const density = (step.features && step.features.density !== undefined) ? step.features.density : 0;
    const brightness = (step.features && step.features.brightness !== undefined) ? step.features.brightness : 0;
    const notes = step.notes || [];
    const noteStr = notes.length > 0 ? notes.join(" • ") : "Rest";

    // Update Top Scanner Reticle Readout
    if (this.dom.eicInspectorCoords) {
      this.dom.eicInspectorCoords.textContent = `${lonStr} • ${brightness}% BRI • ${density}% DENS`;
    }
    if (this.dom.eicInspectorChords) {
      this.dom.eicInspectorChords.textContent = `CHORD: ${noteStr}`;
    }

    // Update Bottom 5-Column Telemetry HUD with Live Computer Vision Metrics
    if (this.dom.hudDate) {
      this.dom.hudDate.textContent = `LON ${lonStr} [${Math.round(step.progress * 100)}%]`;
    }
    if (this.dom.hudDayOfYear) {
      this.dom.hudDayOfYear.textContent = `RASTER COLUMN ${step.column + 1} OF 256`;
    }
    if (this.dom.hudValue) {
      this.dom.hudValue.textContent = `${brightness}%`;
    }
    if (this.dom.hudPeakTrough) {
      this.dom.hudPeakTrough.textContent = `LUMINANCE (BT.709)`;
    }
    if (this.dom.hudThermalZone) {
      this.dom.hudThermalZone.textContent = step.frame ? (step.frame.title || "EIC SATELLITE").toUpperCase() : "EIC SATELLITE";
    }
    if (this.dom.hudNote) {
      this.dom.hudNote.textContent = noteStr;
    }
    if (this.dom.hudFreq) {
      this.dom.hudFreq.textContent = `${notes.length} VOICES [${density}% DENSITY]`;
    }
    if (this.dom.hudAtmosphere && step.frame) {
      this.dom.hudAtmosphere.textContent = `FEATURE DENSITY: ${density}%`;
      this.dom.hudAtmosphere.className = density > 40 ? "col-value text-solar" : "col-value text-cyan";
    }
    if (this.dom.hudRainDays) {
      this.dom.hudRainDays.textContent = `${step.features && step.features.dominantRgb ? step.features.dominantRgb : 'RGB'} • ITU-R BT.709`;
    }

    // Screen reader & Voice Narrator dispatch for significant feature clusters
    if (this.accessibility && (step.column % 32 === 0 || density > 75)) {
      const msg = `Longitude ${lonStr}: ${step.frame ? step.frame.title : 'Satellite frame'}. Feature density ${density} percent, brightness ${brightness} percent. Chord: ${noteStr}.`;
      this.accessibility.announce(msg, density > 75 ? "assertive" : "polite");
    }
  }

  async fetchAiBrief() {
    if (!this.currentData) return;
    this.dom.generateAiBriefBtn.textContent = "ANALYZING...";
    this.dom.generateAiBriefBtn.disabled = true;

    const city = this.activeCity || this.currentData.city;
    const year = this.activeYear;
    const type = this.activeMetric;

    try {
      const url = `${API_BASE_URL}/explain?city=${encodeURIComponent(city)}&year=${year}&type=${type}`;
      const res = await fetch(url);
      if (res.ok) {
        const payload = await res.json();
        this.dom.aiSourceBadge.textContent = payload.explanation.source.toUpperCase();
        this.dom.aiBriefText.textContent = payload.explanation.summary;
        this.dom.aiBriefContainer.classList.remove("hidden");
      }
    } catch (e) {
      console.warn("Analysis fetch failed:", e);
    } finally {
      this.dom.generateAiBriefBtn.textContent = "✨ ANALYZE";
      this.dom.generateAiBriefBtn.disabled = false;
    }
  }

  exportDataCsv() {
    const city = this.activeCity || "Observation_Point";
    const year = this.activeYear;
    const exportUrl = `${API_BASE_URL}/export?city=${encodeURIComponent(city)}&year=${year}&format=csv`;
    window.open(exportUrl, "_blank");
  }
}

// Boot NASA mission control application
window.addEventListener("DOMContentLoaded", () => {
  window.earthJukebox = new EarthJukeboxApp();
});
