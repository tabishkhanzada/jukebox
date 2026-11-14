/**
 * NASA Earth Information Jukebox - Web Audio Sonification Engine
 * Module 3: Authentic Sonification Architecture
 * - Zero-drift performance.now() high-precision scheduling
 * - True Planetary (Absolute °C) vs Local Seasonal pitch modes
 * - Expressive multi-timbral synthesis (Melody, Membrane Rain Percussion, Wind Resonator, Calendar Drones)
 * - Anti-clipping dynamic envelope articulation
 * - Direct Web Audio MediaRecorder capture to downloadable .webm
 */

class EarthSonifier {
  constructor() {
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentIndex = 0;
    this.speedMultiplier = 1.0;
    this.baseStepDurationMs = 90; // ~33 seconds for 365 days at 1.0x
    this.data = null;
    this.secondaryData = null; // Authentic rainfall data for dual-track
    this.dualTrackEnabled = false;
    this.pitchMode = "planetary"; // "planetary" (True absolute physical scale) or "seasonal" (Local dynamic range)

    // Safe direct audio handle for compatibility
    this.nativeAudio = {
      ensureContext: () => {},
      setVolume: () => {},
      playNote: () => {},
      playRain: () => {},
      playDrone: () => {}
    };

    // Drift-free scheduling timer state
    this.stepTimer = null;
    this.expectedNextTick = 0;

    // Audio recording nodes
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.mediaStreamDest = null;

    // Musical Scale Definitions across 3 octaves
    this.scales = {
      pentatonic_major: [
        "C3", "D3", "E3", "G3", "A3",
        "C4", "D4", "E4", "G4", "A4",
        "C5", "D5", "E5", "G5", "A5", "C6"
      ],
      lydian_celestial: [
        "F3", "G3", "A3", "B3", "C4", "D4", "E4",
        "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"
      ],
      minor_pentatonic: [
        "A2", "C3", "D3", "E3", "G3",
        "A3", "C4", "D4", "E4", "G4",
        "A4", "C5", "D5", "E5", "G5", "A5"
      ],
      akebono_meditative: [
        "C3", "D3", "Eb3", "G3", "Ab3",
        "C4", "D4", "Eb4", "G4", "Ab4",
        "C5", "D5", "Eb5", "G5", "Ab5", "C6"
      ],
      dorian_orbital: [
        "D3", "E3", "F3", "G3", "A3", "B3", "C4",
        "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"
      ]
    };

    this.currentScaleKey = "pentatonic_major";
    this.currentInstrumentKey = "space_synth";

    // Audio node references
    this.masterBus = null;
    this.melodySynth = null;
    this.rainSynth = null;
    this.windSynth = null;
    this.bassDrone = null;
    this.reverb = null;
    this.delay = null;
    this.limiter = null;

    // Callbacks for UI and visualizer
    this.onStepCallback = null;
    this.onPlaybackStateChange = null;
    this.onRecordingStateChange = null;
  }

  /**
   * Initialize Tone.js audio graph after user interaction.
   */
  async initAudioContext() {
    if (this.isInitialized) return;

    if (window.Tone) {
      try {
        await Tone.start();
        if (Tone.context && Tone.context.state !== "running") {
          await Tone.context.resume();
        }
        console.log("Authentic Web Audio Context initialized.");
      } catch (err) {
        console.warn("Tone audio start:", err);
      }

      // Master FX chain: MasterBus -> Limiter -> Destination (Speakers) & Recorder
      this.masterBus = new Tone.Gain(1.0);
      this.limiter = new Tone.Limiter(-1.5);
      this.masterBus.connect(this.limiter);
      this.limiter.toDestination();

      try {
        Tone.getDestination().mute = false;
        Tone.getDestination().volume.value = 0;
      } catch (_) {}

      // Setup MediaStreamDestination for authentic audio recording & download
      try {
        const rawCtx = Tone.getContext().rawContext;
        this.mediaStreamDest = rawCtx.createMediaStreamDestination();
        if (this.mediaStreamDest) {
          this.limiter.connect(this.mediaStreamDest);
        }
      } catch (e) {
        console.warn("MediaStreamDestination not supported:", e);
      }

      // Master spatial acoustic environment
      this.reverb = new Tone.Reverb({
        decay: 2.2,
        preDelay: 0.04,
        wet: 0.22
      }).connect(this.masterBus);
      await this.reverb.generate();

      this.delay = new Tone.FeedbackDelay({
        delayTime: "16n",
        feedback: 0.12,
        wet: 0.12
      }).connect(this.reverb);

      // 1. Melody Synthesizer for Temperature / Primary pitch (Default: space_synth)
      this.buildMelodySynth(this.currentInstrumentKey);

      // 2. Percussion Synthesizer for Rainfall / Drum hits
      this.rainSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 3.5,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.22,
          sustain: 0.01,
          release: 0.35
        }
      }).connect(this.masterBus);
      this.rainSynth.volume.value = -3;

      // 3. Wind Atmospheric Synth: Filtered noise / breeze resonance
      this.windSynth = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: {
          attack: 0.05,
          decay: 0.15,
          sustain: 0.0
        }
      }).connect(this.reverb);
      this.windSynth.volume.value = -12;

      // 4. Calendar Marker: Sub-bass for month starts
      this.bassDrone = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.04,
          decay: 0.5,
          sustain: 0.1,
          release: 0.6
        }
      }).connect(this.masterBus);
      this.bassDrone.volume.value = -8;

      this.isInitialized = true;
    } else {
      console.error("Tone.js library not detected on window object.");
    }
  }

  /**
   * Configures timbre of primary melody synthesizer.
   */
  buildMelodySynth(instrumentKey) {
    if (this.melodySynth) {
      try {
        this.melodySynth.dispose();
      } catch (_) {}
    }

    this.currentInstrumentKey = instrumentKey || "space_synth";

    if (instrumentKey === "marimba" || instrumentKey === "organic_marimba") {
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.004, decay: 0.22, sustain: 0.0, release: 0.18 }
      }).connect(this.reverb || Tone.getDestination());
      this.melodySynth.volume.value = -2;
    } else if (instrumentKey === "ambient_pad" || instrumentKey === "analog_warm_pad" || instrumentKey === "celestial_pad") {
      this.melodySynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.06, decay: 0.4, sustain: 0.5, release: 0.6 }
      }).connect(this.delay || Tone.getDestination());
      this.melodySynth.volume.value = -5;
    } else if (instrumentKey === "crystal_piano" || instrumentKey === "acoustic_piano") {
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.002, decay: 0.28, sustain: 0.08, release: 0.9 }
      }).connect(this.delay || Tone.getDestination());
      this.melodySynth.volume.value = -2;
    } else {
      // Default: "space_synth" (Celestial Space Synth - clean, harmonious original default)
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.015, decay: 0.18, sustain: 0.15, release: 0.22 }
      }).connect(this.delay || Tone.getDestination());
      this.melodySynth.volume.value = -3;
    }
  }

  /**
   * Temperature classification helper for HUD display
   */
  getTemperatureCategory(temp) {
    if (typeof temp !== "number" || isNaN(temp)) {
      return {
        key: "MODERATE",
        label: "MODERATE REGIME",
        shortLabel: "THEEK",
        urdu: "THEEK",
        color: "#34d399",
        range: "15.1 – 28.0 °C",
        isExtreme: false
      };
    }
    if (temp <= 15.0) {
      return {
        key: "COLD",
        label: "COLD REGIME",
        shortLabel: "COLD",
        urdu: "SARDI",
        color: "#38bdf8",
        range: "≤ 15.0 °C",
        isExtreme: temp < 0.0
      };
    } else if (temp <= 28.0) {
      return {
        key: "MODERATE",
        label: "MODERATE REGIME",
        shortLabel: "THEEK",
        urdu: "THEEK",
        color: "#34d399",
        range: "15.1 – 28.0 °C",
        isExtreme: false
      };
    } else {
      return {
        key: "HOT",
        label: "HOT REGIME",
        shortLabel: "WARM",
        urdu: "GARMI",
        color: "#f97316",
        range: "≥ 28.1 °C",
        isExtreme: temp > 38.0
      };
    }
  }

  /**
   * Load authentic dataset into the sonification engine.
   */
  loadDataset(earthData, secondaryData = null) {
    this.stop();
    this.data = earthData;
    this.secondaryData = secondaryData;
    this.currentIndex = 0;
  }

  setSecondaryDataset(secondaryData) {
    this.secondaryData = secondaryData;
  }

  setDualTrack(enabled) {
    this.dualTrackEnabled = enabled;
  }

  setPitchMode(mode) {
    if (mode === "planetary" || mode === "seasonal") {
      this.pitchMode = mode;
    }
  }

  setScale(scaleKey) {
    if (this.scales[scaleKey]) {
      this.currentScaleKey = scaleKey;
    }
  }

  /**
   * Maps normalized value to a quantized musical note.
   */
  valueToNote(normValue) {
    const scale = this.scales[this.currentScaleKey] || this.scales.pentatonic_major;
    const clamped = Math.max(0, Math.min(1, normValue));
    const index = Math.min(Math.floor(clamped * scale.length), scale.length - 1);
    const note = scale[index];
    const freq = Tone.Frequency(note).toFrequency();
    return { note, freq, index };
  }

  /**
   * Begins or resumes playback with zero-drift synchronization.
   */
  async play() {
    if (!this.data || !this.data.dates || this.data.dates.length === 0) {
      console.warn("No authentic data loaded to play.");
      return;
    }

    await this.initAudioContext();

    if (this.currentIndex >= this.data.dates.length) {
      this.currentIndex = 0;
    }

    this.isPlaying = true;
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(true);

    this.expectedNextTick = performance.now();
    this.scheduleNextStep();
  }

  /**
   * Schedules next note event with wall-clock drift compensation.
   */
  scheduleNextStep() {
    if (!this.isPlaying) return;

    if (this.currentIndex >= this.data.dates.length) {
      this.stop();
      if (this.isRecording) {
        this.stopRecordingAndDownload();
      }
      return;
    }

    const stepMs = Math.max(25, this.baseStepDurationMs / this.speedMultiplier);
    this.triggerStep(this.currentIndex, stepMs);
    this.currentIndex++;

    // Zero-drift performance timing calculation
    this.expectedNextTick += stepMs;
    const now = performance.now();
    if (this.expectedNextTick < now - stepMs * 2) {
      this.expectedNextTick = now;
    }
    const delay = Math.max(0, this.expectedNextTick - now);

    this.stepTimer = setTimeout(() => {
      this.scheduleNextStep();
    }, delay);
  }

  /**
   * Triggers audio synthesis for a specific single day.
   */
  triggerStep(idx, stepMs = 90) {
    if (!this.data) return;

    const date = this.data.dates[idx];
    const rawVal = this.data.values[idx];
    // Select between True Planetary Pitch (Absolute physical scale) or Local Seasonal contrast
    const normVal = (this.pitchMode === "planetary" && this.data.normalized_planetary)
      ? this.data.normalized_planetary[idx]
      : this.data.normalized[idx];
    const dataType = this.data.data_type;

    // Detect month marker (e.g. "2024-05-01")
    const isFirstOfMonth = date ? date.endsWith("-01") : false;

    let playedNote = null;
    let playedFreq = null;
    let rainMm = 0;
    let rainNote = null;
    let isThunder = false;

    // Dynamic anti-clipping note duration: note releases cleanly before the next step
    const durationSeconds = Math.max(0.04, Math.min(0.24, (stepMs / 1000) * 0.85));

    try {
      const now = Tone.now();

      if (dataType === "temperature") {
        // Temperature controls Pitch
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        const velocity = 0.5 + normVal * 0.45;
        if (this.melodySynth) {
          this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, now, velocity);
        }

        // Dual-track accompaniment: If authentic rainfall data is active, trigger drum strikes
        if (this.dualTrackEnabled && this.secondaryData && this.secondaryData.values[idx] !== undefined) {
          const rainVal = this.secondaryData.values[idx];
          rainMm = rainVal;
          if (rainVal > 0.1 && this.rainSynth) {
            // Authentic physical rain scaling (based on actual mm/day)
            const drumPitch = rainVal > 25.0 ? "C1" : rainVal > 10.0 ? "G1" : "C2";
            const drumVel = Math.min(0.9, 0.25 + (rainVal / 35.0) * 0.65);
            this.rainSynth.triggerAttackRelease(drumPitch, durationSeconds, now, drumVel);
            rainNote = drumPitch;
            isThunder = rainVal > 25.0;
          }
        }

        // Soft calendar drone on 1st of month
        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("C2", "8n", now);
        }
      } else if (dataType === "rainfall") {
        // Rainfall controls drum strikes & velocity proportional to actual mm/day
        rainMm = rawVal;
        if (rawVal > 0.1) {
          const drumPitch = rawVal > 25.0 ? "C1" : rawVal > 10.0 ? "G1" : "C2";
          const drumVel = Math.min(1.0, 0.3 + (rawVal / 30.0) * 0.7);
          if (this.rainSynth) {
            this.rainSynth.triggerAttackRelease(drumPitch, durationSeconds, now, drumVel);
          }
          playedNote = `Rain ${drumPitch}`;
          playedFreq = Math.round(Tone.Frequency(drumPitch).toFrequency());
          rainNote = drumPitch;
          isThunder = rawVal > 25.0;
        } else {
          playedNote = "Dry (Rest)";
          playedFreq = 0;
        }

        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("G2", "8n", now);
        }
      } else if (dataType === "wind") {
        // Wind speed: Resonant airy velocity & pitch modulation
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        if (this.melodySynth) {
          this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, now, 0.6);
        }
        if (this.windSynth && rawVal > 3.0) {
          this.windSynth.triggerAttackRelease(Math.min(0.2, (rawVal / 15.0) * 0.2), now);
        }
      }
    } catch (err) {
      console.warn("Audio trigger error:", err);
    }

    // Fire synchronization callback to Chart and UI HUD
    if (this.onStepCallback) {
      try {
        const activeCat = this.getTemperatureCategory(rawVal);
        this.onStepCallback({
          index: idx,
          date: date,
          value: rawVal,
          normalized: normVal,
          unit: this.data.unit,
          note: playedNote || "--",
          frequency: playedFreq || 0,
          category: activeCat ? activeCat.key : null,
          categoryLabel: activeCat ? activeCat.label : null,
          categoryShort: activeCat ? activeCat.shortLabel : null,
          categoryUrdu: activeCat ? activeCat.urdu : null,
          categoryColor: activeCat ? activeCat.color : null,
          categoryRange: activeCat ? activeCat.range : null,
          isExtreme: activeCat ? !!activeCat.isExtreme : false,
          rainTier: rainMm > 25.0 ? "HEAVY" : (rainMm > 10.0 ? "MODERATE" : "LIGHT"),
          rainLabel: rainMm > 0.1 ? `${rainMm.toFixed(1)} mm` : "Dry",
          rainNote: rainNote,
          rainMm: rainMm,
          rainThunder: isThunder,
          isFirstOfMonth: isFirstOfMonth,
          stepMs: stepMs,
          isPlaying: this.isPlaying
        });
      } catch (cbErr) {
        console.warn("UI step callback error:", cbErr);
      }
    }
  }

  /**
   * Pauses the playback stream without resetting position.
   */
  pause() {
    this.isPlaying = false;
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
  }

  /**
   * Stops playback and resets playhead to start.
   */
  stop() {
    this.pause();
    this.currentIndex = 0;
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
    if (this.onStepCallback && this.data && this.data.dates && this.data.dates.length > 0) {
      const firstVal = this.data.values[0];
      const firstCat = this.getTemperatureCategory(firstVal);
      try {
        this.onStepCallback({
          index: 0,
          date: this.data.dates[0],
          value: firstVal,
          normalized: this.data.normalized[0],
          unit: this.data.unit,
          note: "--",
          frequency: 0,
          category: firstCat ? firstCat.key : null,
          categoryLabel: firstCat ? firstCat.label : null,
          categoryShort: firstCat ? firstCat.shortLabel : null,
          categoryUrdu: firstCat ? firstCat.urdu : null,
          categoryColor: firstCat ? firstCat.color : null,
          categoryRange: firstCat ? firstCat.range : null,
          isExtreme: firstCat ? !!firstCat.isExtreme : false,
          rainTier: null,
          rainLabel: null,
          rainNote: null,
          rainMm: 0,
          rainThunder: false,
          isFirstOfMonth: false,
          stepMs: 90,
          isPlaying: false
        });
      } catch (_) {}
    }
  }

  /**
   * Jump playhead to specific day index (0 to 365).
   */
  seek(index) {
    if (!this.data || index < 0 || index >= this.data.dates.length) return;
    this.currentIndex = index;
    const stepMs = Math.max(25, this.baseStepDurationMs / this.speedMultiplier);

    // Cancel pending timeout to avoid jitter or double-stepping
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }

    this.triggerStep(this.currentIndex, stepMs);

    // If currently playing, smoothly reschedule the next note from this moment
    if (this.isPlaying) {
      this.currentIndex++;
      this.expectedNextTick = performance.now() + stepMs;
      this.stepTimer = setTimeout(() => {
        this.scheduleNextStep();
      }, stepMs);
    }
  }

  /**
   * Adjust playback speed multiplier (0.5x to 3.0x).
   */
  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.25, Math.min(3.0, multiplier));
  }

  /**
   * Adjust master volume (-30 dB to +6 dB).
   */
  setMasterVolume(db) {
    try {
      if (Tone.getDestination()) {
        Tone.getDestination().volume.value = db;
      }
    } catch (_) {}
  }

  // --- AUDIO RECORDING & EXPORT (Web Audio MediaRecorder) ---

  /**
   * Starts recording the authentic sonified track from day 0.
   */
  async startRecording() {
    await this.initAudioContext();
    if (!this.mediaStreamDest) {
      alert("Audio recording is not supported in this browser version.");
      return;
    }

    this.stop();
    this.recordedChunks = [];

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, {
        mimeType: "audio/webm;codecs=opus"
      });
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.saveRecordedAudioFile();
    };

    this.mediaRecorder.start();
    this.isRecording = true;
    if (this.onRecordingStateChange) this.onRecordingStateChange(true);

    // Automatically begin playback to record the full authentic piece
    this.play();
  }

  /**
   * Stops recording and triggers instant browser download.
   */
  stopRecordingAndDownload() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    if (this.onRecordingStateChange) this.onRecordingStateChange(false);
  }

  /**
   * Creates a downloadable Blob URL and triggers download in browser.
   */
  saveRecordedAudioFile() {
    if (this.recordedChunks.length === 0) return;
    const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const city = this.data ? this.data.city : "Earth";
    const year = this.data ? this.data.year : "2024";
    const type = this.data ? this.data.data_type : "climate";

    a.href = url;
    a.download = `NASA_Sonification_${city}_${year}_${type}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Authentic audio track downloaded successfully.");
  }
}

// Export singleton instance for app orchestration
window.earthSonifier = new EarthSonifier();
