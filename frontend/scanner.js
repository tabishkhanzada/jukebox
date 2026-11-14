/**
 * NASA Earth Information Jukebox - EIC Visual Frame Sonification Engine
 * Module 6: Sight-to-Sound Real-Time Parameter Mapping Scanner
 * - 2D Satellite Image matrix downsampling & spatial column binning
 * - ITU-R BT.709 colorimetric luminance-to-gain & hue-to-timbre extraction
 * - Consonant harmonic pentatonic scale chord quantization (Zero chaotic noise)
 * - Real-time 60fps laser raster scan, radial sweeps, and interactive reticle exploration
 */

class EicFrameScanner {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    // Off-screen canvas for high-speed pixel matrix ingestion
    this.offCanvas = document.createElement("canvas");
    this.offCtx = this.offCanvas.getContext("2d", { willReadFrequently: true });

    // Curated NASA EIC Visual Frames Library
    this.frames = {
      sst: {
        id: "sst",
        title: "Sea Surface Temperature & Coral Thermal Stress",
        mission: "NASA EIC • MODIS / VIIRS Sensor Blend",
        src: "assets/eic_frames/sst_thermal_stress.png",
        param: "Sea Surface Temperature Anomaly",
        unit: "°C",
        range: "0°C to +32°C",
        description: "Equatorial Pacific warm pool anomaly, Kuroshio current thermal plumes, and high coral bleaching risk zones."
      },
      sea_level: {
        id: "sea_level",
        title: "Dynamic Sea Level Rise & Ocean Mass Variations",
        mission: "NASA EIC • GRACE-FO & Jason-3 Radar Altimetry",
        src: "assets/eic_frames/sea_level_anomaly.png",
        param: "Dynamic Ocean Mass Anomaly",
        unit: "cm",
        range: "-10 cm to +25 cm",
        description: "Western Pacific water column expansion and Indian Ocean mass redistribution captured via satellite gravimetry."
      },
      wildfire: {
        id: "wildfire",
        title: "Wildfire Smoke & Aerosol Optical Depth (AOD)",
        mission: "NASA EIC • Aqua MODIS & OMPS Atmospheric Sensors",
        src: "assets/eic_frames/wildfire_aerosol.png",
        param: "Aerosol Optical Depth",
        unit: "AOD",
        range: "0.0 to 2.0 AOD",
        description: "Intense boreal smoke corridors across Canada and Siberia, Amazon basin biomass burning, and trans-oceanic drift."
      },
      arctic: {
        id: "arctic",
        title: "Polar Cryosphere & Arctic Sea Ice Minimum",
        mission: "NASA EIC • ICESat-2 Spaceborne Lidar",
        src: "assets/eic_frames/arctic_cryosphere.png",
        param: "Sea Ice Thickness & Extent",
        unit: "% Pack Ice",
        range: "0% (Open Ocean) to 100% (Glacial Pack)",
        description: "September Arctic minimum pack ice margins, multi-year glacial ice cap, and Antarctic shelf thermal dynamics."
      }
    };

    this.currentFrameKey = "sst";
    this.currentImage = null;
    this.isImageLoaded = false;
    this.pixelMatrix = null;
    this.matrixW = 256;
    this.matrixH = 64;
    this.numBins = 16; // 16 vertical latitude bins mapped across 3 octaves

    // Transport & Scanning state
    this.isPlaying = false;
    this.scanProgress = 0.0; // 0.0 to 1.0 (Left to Right)
    this.scanDurationMs = 24000; // 24 seconds per full planetary sweep at 1.0x
    this.speedMultiplier = 1.0;
    this.stepTimer = null;
    this.animFrameId = null;
    this.lastTickTime = performance.now();

    // Interactive pointer reticle
    this.hoverPoint = null;
    this.isPointerDown = false;

    // Harmonic Scale Definition (consistant with EarthSonifier)
    this.scale = [
      "C3", "D3", "E3", "G3", "A3",
      "C4", "D4", "E4", "G4", "A4",
      "C5", "D5", "E5", "G5", "A5", "C6"
    ];

    // Audio synthesizer nodes
    this.synth = null;
    this.shimmerSynth = null;
    this.warmSynth = null;
    this.filter = null;
    this.reverb = null;
    this.delay = null;
    this.limiter = null;
    this.isAudioReady = false;

    // Callbacks
    this.onScanStep = null;
    this.onTransportChange = null;

    this.attachEvents();
  }

  /**
   * Initializes Tone.js visual synthesizer graph
   */
  async initAudio() {
    if (this.isAudioReady) return;
    if (!window.Tone) return;

    try {
      await Tone.start();
      if (Tone.context && Tone.context.state !== "running") {
        await Tone.context.resume();
      }

      this.limiter = new Tone.Limiter(-1.5).toDestination();

      this.reverb = new Tone.Reverb({
        decay: 3.2,
        preDelay: 0.05,
        wet: 0.35
      }).connect(this.limiter);
      await this.reverb.generate();

      this.delay = new Tone.FeedbackDelay({
        delayTime: "8n",
        feedback: 0.15,
        wet: 0.18
      }).connect(this.reverb);

      // 1. Primary Celestial PolySynth (Crystalline Sine/Triangle Chimes for Mid-High Frequencies)
      this.synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.02, decay: 0.28, sustain: 0.18, release: 0.45 }
      }).connect(this.delay);
      this.synth.volume.value = -4;

      // 2. Warm Resonant Synth for Infrared / Wildfire Heat Zones
      this.warmSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.04, decay: 0.35, sustain: 0.25, release: 0.6 }
      }).connect(this.reverb);
      this.warmSynth.volume.value = -8;

      // 3. Shimmer High-Glacial Synth for Polar & Ice regions
      this.shimmerSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.8 }
      }).connect(this.delay);
      this.shimmerSynth.volume.value = -6;

      this.isAudioReady = true;
      console.log("EIC Visual Frame Audio Synthesizer initialized.");
    } catch (e) {
      console.warn("EIC audio init error:", e);
    }
  }

  /**
   * Loads a NASA EIC visual frame by key or custom URL
   */
  loadFrame(frameKey, customSrc = null, customTitle = null) {
    this.stop();
    this.currentFrameKey = frameKey;

    const frameInfo = this.frames[frameKey] || {
      id: "custom",
      title: customTitle || "Custom NASA Satellite Imagery",
      mission: "User Ingested Satellite Telemetry Frame",
      src: customSrc,
      param: "Colorimetric Visual Radiance",
      unit: "RF",
      range: "0.0 to 1.0 Relative Flux",
      description: "Direct optical raster scan of user-provided NASA Earth observation visual frame."
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this.currentImage = img;
      this.isImageLoaded = true;
      this.processImageMatrix();
      this.render();
      if (this.onScanStep) {
        this.onScanStep({
          progress: 0.0,
          column: 0,
          notes: [],
          frame: frameInfo,
          activeNotesCount: 0
        });
      }
    };
    img.src = customSrc || frameInfo.src;
  }

  /**
   * Downsamples the image into a 256x64 analytical matrix for O(1) instant audio lookups
   */
  processImageMatrix() {
    if (!this.currentImage) return;

    this.offCanvas.width = this.matrixW;
    this.offCanvas.height = this.matrixH;
    this.offCtx.drawImage(this.currentImage, 0, 0, this.matrixW, this.matrixH);

    try {
      const imgData = this.offCtx.getImageData(0, 0, this.matrixW, this.matrixH);
      this.pixelMatrix = imgData.data;
    } catch (e) {
      console.warn("Canvas ImageData extraction restricted:", e);
    }
  }

  /**
   * Mathematical Sight-to-Sound Feature Extraction
   * Extracts 16 spatial latitude bins for column X, computing Luminance and Hue
   */
  extractColumnFeatures(colIdx) {
    if (!this.pixelMatrix) return [];

    const col = Math.max(0, Math.min(this.matrixW - 1, colIdx));
    const binHeight = this.matrixH / this.numBins;
    const activeChords = [];

    for (let b = 0; b < this.numBins; b++) {
      const startY = Math.floor(b * binHeight);
      const endY = Math.floor((b + 1) * binHeight);

      let totalLum = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let y = startY; y < endY; y++) {
        const idx = (y * this.matrixW + col) * 4;
        const r = this.pixelMatrix[idx];
        const g = this.pixelMatrix[idx + 1];
        const bCol = this.pixelMatrix[idx + 2];

        // ITU-R BT.709 relative perceptual luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bCol;
        totalLum += lum;
        totalR += r;
        totalG += g;
        totalB += bCol;
        count++;
      }

      if (count > 0) {
        const avgLum = totalLum / count / 255.0; // 0.0 to 1.0
        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;

        // Dynamic Noise Gate: Filter out dark oceans / space backdrop
        if (avgLum > 0.08) {
          // Bin 0 (Top of image = North Pole = High pitch) to Bin 15 (Bottom = South Pole = Low pitch)
          const scaleIdx = (this.numBins - 1) - b;
          const note = this.scale[scaleIdx] || "C4";

          // Calculate Hue in degrees (0 to 360)
          const maxC = Math.max(avgR, avgG, avgB);
          const minC = Math.min(avgR, avgG, avgB);
          let hue = 0;
          if (maxC !== minC) {
            const d = maxC - minC;
            if (maxC === avgR) hue = ((avgG - avgB) / d + (avgG < avgB ? 6 : 0)) * 60;
            else if (maxC === avgG) hue = ((avgB - avgR) / d + 2) * 60;
            else hue = ((avgR - avgG) / d + 4) * 60;
          }

          // Velocity scaled proportionally to intensity
          const velocity = Math.min(0.95, 0.25 + avgLum * 0.70);

          activeChords.push({
            bin: b,
            note: note,
            luminance: avgLum,
            velocity: velocity,
            hue: Math.round(hue),
            rgb: `rgb(${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)})`,
            // Categorize by physical wavelength
            isThermalHot: (hue >= 0 && hue <= 45) || (avgR > 180 && avgB < 100),
            isGlacialIce: (avgR > 200 && avgG > 220 && avgB > 220) || (hue >= 180 && hue <= 220)
          });
        }
      }
    }

    // Calculate column-wide active feature density & brightness
    const colDensity = Math.round((activeChords.length / this.numBins) * 100);
    const colBrightness = activeChords.length > 0
      ? Math.round((activeChords.reduce((acc, c) => acc + c.luminance, 0) / activeChords.length) * 100)
      : 0;

    // Sort by intensity and limit to top 4 consonant voices to prevent acoustic clutter
    activeChords.sort((a, b) => b.luminance - a.luminance);
    const result = activeChords.slice(0, 4);
    result.density = colDensity;
    result.brightness = colBrightness;
    result.dominantRgb = result.length > 0 ? result[0].rgb : "rgb(0, 0, 0)";
    return result;
  }

  /**
   * Triggers audio synthesis for active column features
   */
  sonifyFeatures(features, durationSec = 0.18) {
    if (!this.isAudioReady || features.length === 0) return;

    try {
      const now = Tone.now();
      for (const feat of features) {
        if (feat.isThermalHot && this.warmSynth) {
          this.warmSynth.triggerAttackRelease(feat.note, durationSec, now, feat.velocity * 0.75);
        } else if (feat.isGlacialIce && this.shimmerSynth) {
          this.shimmerSynth.triggerAttackRelease(feat.note, durationSec * 1.3, now, feat.velocity * 0.85);
        } else if (this.synth) {
          this.synth.triggerAttackRelease(feat.note, durationSec, now, feat.velocity);
        }
      }
    } catch (_) {}
  }

  /**
   * Transport Play
   */
  async play() {
    await this.initAudio();
    this.isPlaying = true;
    this.lastTickTime = performance.now();
    if (this.onTransportChange) this.onTransportChange(true);
    this.startScanLoop();
  }

  /**
   * Transport Pause
   */
  pause() {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.onTransportChange) this.onTransportChange(false);
  }

  /**
   * Transport Toggle Play/Pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Sets master synthesis volume (normalized 0.0 to 1.0)
   */
  setVolume(normalizedVal) {
    if (normalizedVal <= 0.01) {
      if (this.synth) this.synth.volume.value = -Infinity;
      if (this.warmSynth) this.warmSynth.volume.value = -Infinity;
      if (this.shimmerSynth) this.shimmerSynth.volume.value = -Infinity;
      return;
    }
    const db = 20 * Math.log10(Math.max(0.01, normalizedVal));
    if (this.synth) this.synth.volume.value = Math.max(-40, db - 4);
    if (this.warmSynth) this.warmSynth.volume.value = Math.max(-40, db - 8);
    if (this.shimmerSynth) this.shimmerSynth.volume.value = Math.max(-40, db - 6);
  }

  /**
   * Loads custom user uploaded NASA satellite image frame
   */
  loadCustomImage(dataUrl, fileName = "Custom NASA Frame") {
    this.frames.custom = {
      id: "custom",
      title: fileName,
      mission: "User Ingested Frame • Local Telemetry",
      src: dataUrl,
      param: "Colorimetric Radiance Matrix",
      unit: "RF",
      range: "0.0 to 1.0",
      description: "Direct optical raster scan of user uploaded satellite observation frame."
    };
    this.loadFrame("custom", dataUrl, fileName);
  }

  /**
   * Transport Stop & Reset
   */
  stop() {
    this.pause();
    this.scanProgress = 0.0;
    this.render();
  }

  /**
   * Seek to specific longitude / percentage (0.0 to 1.0)
   */
  seek(progress) {
    this.scanProgress = Math.max(0.0, Math.min(1.0, progress));
    const colIdx = Math.floor(this.scanProgress * (this.matrixW - 1));
    const features = this.extractColumnFeatures(colIdx);
    this.sonifyFeatures(features, 0.25);
    this.render();

    if (this.onScanStep) {
      this.onScanStep({
        progress: this.scanProgress,
        column: colIdx,
        notes: features.map(f => f.note),
        features: features,
        frame: this.frames[this.currentFrameKey]
      });
    }
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.25, Math.min(3.0, multiplier));
  }

  /**
   * Real-time 60fps scanning loop
   */
  startScanLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const loop = (now) => {
      if (!this.isPlaying) return;

      const delta = now - this.lastTickTime;
      this.lastTickTime = now;

      const effectiveDuration = this.scanDurationMs / this.speedMultiplier;
      this.scanProgress += delta / effectiveDuration;

      // Loop or stop at end of planetary sweep
      if (this.scanProgress >= 1.0) {
        this.scanProgress = 0.0;
      }

      const colIdx = Math.floor(this.scanProgress * (this.matrixW - 1));
      const features = this.extractColumnFeatures(colIdx);

      // Periodically trigger audio chords based on speed
      this.sonifyFeatures(features, Math.max(0.06, (effectiveDuration / this.matrixW) / 1000 * 1.5));

      this.render();

      if (this.onScanStep) {
        this.onScanStep({
          progress: this.scanProgress,
          column: colIdx,
          notes: features.map(f => f.note),
          features: features,
          frame: this.frames[this.currentFrameKey]
        });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Renders the NASA satellite visual frame and overlays the glowing laser scan beam
   */
  render() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w <= 0 || h <= 0) return;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw satellite image
    if (this.currentImage && this.isImageLoaded) {
      this.ctx.drawImage(this.currentImage, 0, 0, w, h);
    } else {
      // Placeholder NASA starry grid
      this.ctx.fillStyle = "#040810";
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      this.ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }
    }

    // 2. Draw Glowing Laser Scanner Playhead
    const scanX = this.scanProgress * w;
    this.ctx.save();

    // Outer Neon Glow
    this.ctx.beginPath();
    this.ctx.moveTo(scanX, 0);
    this.ctx.lineTo(scanX, h);
    this.ctx.lineWidth = 3.5;
    this.ctx.strokeStyle = "#38bdf8";
    this.ctx.shadowColor = "#0ea5e9";
    this.ctx.shadowBlur = 16;
    this.ctx.stroke();

    // Sharp White Core Line
    this.ctx.beginPath();
    this.ctx.moveTo(scanX, 0);
    this.ctx.lineTo(scanX, h);
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.shadowBlur = 0;
    this.ctx.stroke();

    // Scanner Head Beads (Top & Bottom Reticle Marks)
    this.ctx.beginPath();
    this.ctx.arc(scanX, 18, 5, 0, Math.PI * 2);
    this.ctx.arc(scanX, h - 18, 5, 0, Math.PI * 2);
    this.ctx.fillStyle = "#38bdf8";
    this.ctx.shadowColor = "#38bdf8";
    this.ctx.shadowBlur = 10;
    this.ctx.fill();

    // 3. Interactive Hover Reticle
    if (this.hoverPoint) {
      const hx = this.hoverPoint.x;
      const hy = this.hoverPoint.y;

      this.ctx.beginPath();
      this.ctx.arc(hx, hy, 16, 0, Math.PI * 2);
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(hx, hy, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = "#ff7043";
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * Event listeners for interactive mouse click, dragging, and hover reticle
   */
  attachEvents() {
    if (!this.canvas) return;

    const handlePointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const progress = x / rect.width;

      this.hoverPoint = { x, y };
      if (this.isPointerDown) {
        this.seek(progress);
      }
    };

    this.canvas.addEventListener("pointerdown", (e) => {
      this.isPointerDown = true;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (_) {}
      handlePointer(e);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      handlePointer(e);
      if (!this.isPointerDown) {
        this.render();
      }
    });

    const endPointer = (e) => {
      this.isPointerDown = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    this.canvas.addEventListener("pointerup", endPointer);
    this.canvas.addEventListener("pointerleave", () => {
      this.hoverPoint = null;
      this.isPointerDown = false;
      this.render();
    });

    window.addEventListener("resize", () => {
      this.resizeCanvas();
    });
  }

  resize() {
    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (parent) {
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = Math.min(420, Math.max(260, Math.round(w * 0.45)));

      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);

      if (this.ctx) {
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      this.render();
    }
  }
}

// Export singleton instance
window.EicFrameScanner = EicFrameScanner;

