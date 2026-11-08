/**
 * NASA Earth Information Jukebox - Web Audio Sonification Engine
 * Module 3: Authentic Sonification Architecture
 * - Zero-drift performance.now() high-precision scheduling
 * - True Planetary (Absolute °C) vs Local Seasonal pitch modes
 * - Expressive multi-timbral synthesis (Melody, Thunder/Raindrops, Wind Resonator, Calendar Drones)
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
      ]
    };

    this.currentScaleKey = "pentatonic_major";
    this.currentInstrumentKey = "space_synth";

    // Audio node references
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
      await Tone.start();
      console.log("Authentic Web Audio Context initialized.");

      // Setup MediaStreamDestination for authentic audio recording & download
      try {
        const rawCtx = Tone.getContext().rawContext;
        this.mediaStreamDest = rawCtx.createMediaStreamDestination();
      } catch (e) {
        console.warn("MediaStreamDestination not supported:", e);
      }

      // Master FX chain: Reverb + PingPong Delay -> Limiter -> Destination & Recorder
      this.limiter = new Tone.Limiter(-1.5);
      this.limiter.toDestination();

      if (this.mediaStreamDest) {
        Tone.getDestination().connect(this.mediaStreamDest);
      }
      
      this.reverb = new Tone.Reverb({
        decay: 2.2,
        preDelay: 0.04,
        wet: 0.22
      }).connect(this.limiter);
      await this.reverb.generate();

      this.delay = new Tone.FeedbackDelay({
        delayTime: "16n",
        feedback: 0.12,
        wet: 0.12
      }).connect(this.reverb);

      // 1. Melody Synthesizer for Temperature / Primary pitch
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
      }).connect(this.limiter);
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
      }).connect(this.limiter);
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
      this.melodySynth.dispose();
    }

    this.currentInstrumentKey = instrumentKey;

    if (instrumentKey === "marimba") {
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.004, decay: 0.22, sustain: 0.0, release: 0.18 }
      }).connect(this.reverb);
      this.melodySynth.volume.value = -2;
    } else if (instrumentKey === "ambient_pad") {
      this.melodySynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.06, decay: 0.4, sustain: 0.5, release: 0.6 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -5;
    } else {
      // Default: "space_synth"
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.015, decay: 0.18, sustain: 0.15, release: 0.22 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -3;
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
    const scale = this.scales[this.currentScaleKey];
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
    const isFirstOfMonth = date.endsWith("-01");

    let playedNote = null;
    let playedFreq = null;

    // Dynamic anti-clipping note duration: note releases cleanly before the next step
    const durationSeconds = Math.max(0.04, Math.min(0.24, (stepMs / 1000) * 0.85));

    try {
      if (dataType === "temperature") {
        // Temperature controls Pitch
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        const velocity = 0.5 + normVal * 0.45;
        this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, undefined, velocity);

        // Dual-track accompaniment: If authentic rainfall data is active, trigger drum strikes
        if (this.dualTrackEnabled && this.secondaryData && this.secondaryData.values[idx] !== undefined) {
          const rainVal = this.secondaryData.values[idx];
          if (rainVal > 0.1) {
            // Authentic physical rain scaling (based on actual mm/day)
            const drumPitch = rainVal > 25.0 ? "C1" : rainVal > 10.0 ? "G1" : "C2";
            const drumVel = Math.min(0.9, 0.25 + (rainVal / 35.0) * 0.65);
            this.rainSynth.triggerAttackRelease(drumPitch, durationSeconds, undefined, drumVel);
          }
        }

        // Soft calendar drone on 1st of month
        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("C2", "8n");
        }
      } else if (dataType === "rainfall") {
        // Rainfall controls drum strikes & velocity proportional to actual mm/day
        if (rawVal > 0.1) {
          const drumPitch = rawVal > 25.0 ? "C1" : rawVal > 10.0 ? "G1" : "C2";
          const drumVel = Math.min(1.0, 0.3 + (rawVal / 30.0) * 0.7);
          this.rainSynth.triggerAttackRelease(drumPitch, durationSeconds, undefined, drumVel);
          playedNote = `Rain ${drumPitch}`;
          playedFreq = Math.round(Tone.Frequency(drumPitch).toFrequency());
        } else {
          playedNote = "Dry (Rest)";
          playedFreq = 0;
        }

        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("G2", "8n");
        }
      } else if (dataType === "wind") {
        // Wind speed: Resonant airy velocity & pitch modulation
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, undefined, 0.6);
        if (this.windSynth && rawVal > 3.0) {
          this.windSynth.triggerAttackRelease(Math.min(0.2, (rawVal / 15.0) * 0.2));
        }
      }
    } catch (err) {
      console.warn("Audio trigger error:", err);
    }

    // Fire synchronization callback to Chart and UI HUD
    if (this.onStepCallback) {
      this.onStepCallback({
        index: idx,
        date: date,
        value: rawVal,
        normalized: normVal,
        unit: this.data.unit,
        note: playedNote || "--",
        frequency: playedFreq || 0,
        isFirstOfMonth: isFirstOfMonth
      });
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
    if (this.onStepCallback && this.data && this.data.dates.length > 0) {
      this.onStepCallback({
        index: 0,
        date: this.data.dates[0],
        value: this.data.values[0],
        normalized: this.data.normalized[0],
        unit: this.data.unit,
        note: "--",
        frequency: 0,
        isFirstOfMonth: false
      });
    }
  }

  /**
   * Jump playhead to specific day index (0 to 365).
   */
  seek(index) {
    if (!this.data || index < 0 || index >= this.data.dates.length) return;
    this.currentIndex = index;
    const stepMs = Math.max(25, this.baseStepDurationMs / this.speedMultiplier);
    this.triggerStep(this.currentIndex, stepMs);
  }

  /**
   * Adjust playback speed multiplier (0.5x to 2.5x).
   */
  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.25, Math.min(3.0, multiplier));
  }

  /**
   * Adjust master volume (-30 dB to +6 dB).
   */
  setMasterVolume(db) {
    if (Tone.getDestination()) {
      Tone.getDestination().volume.value = db;
    }
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
