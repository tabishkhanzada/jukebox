/**
 * NASA Earth Information Jukebox - Web Audio Sonification Engine
 * Module 3: Implements harmonic scale quantization, polyphonic tone generation,
 * percussive rainfall mapping, dual-track accompaniment, and audio track export using Tone.js.
 */

class EarthSonifier {
  constructor() {
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentIndex = 0;
    this.speedMultiplier = 1.0;
    this.baseStepDurationMs = 90; // ~33 seconds for 365 days at 1.0x
    this.data = null;
    this.secondaryData = null; // For dual-track accompaniment (e.g., rainfall rhythm under temp)
    this.dualTrackEnabled = false;
    this.stepTimer = null;

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
      console.log("Web Audio Context started successfully.");

      // Setup MediaStreamDestination for audio recording & download
      try {
        const rawCtx = Tone.getContext().rawContext;
        this.mediaStreamDest = rawCtx.createMediaStreamDestination();
      } catch (e) {
        console.warn("MediaStreamDestination not supported:", e);
      }

      // Master FX chain: Reverb + PingPong Delay -> Limiter -> Destination & Recorder
      this.limiter = new Tone.Limiter(-1);
      this.limiter.toDestination();

      if (this.mediaStreamDest) {
        // Tap master audio into recording stream
        Tone.getDestination().connect(this.mediaStreamDest);
      }
      
      this.reverb = new Tone.Reverb({
        decay: 2.5,
        preDelay: 0.05,
        wet: 0.25
      }).connect(this.limiter);
      await this.reverb.generate();

      this.delay = new Tone.FeedbackDelay({
        delayTime: "16n",
        feedback: 0.15,
        wet: 0.15
      }).connect(this.reverb);

      // 1. Melody Synthesizer for Temperature / Primary pitch
      this.buildMelodySynth(this.currentInstrumentKey);

      // 2. Percussion Synthesizer for Rainfall / Drum hits
      this.rainSynth = new Tone.MembraneSynth({
        pitchDecay: 0.04,
        octaves: 3,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.2,
          sustain: 0.01,
          release: 0.4
        }
      }).connect(this.limiter);
      this.rainSynth.volume.value = -4;

      // 3. Calendar Marker: Sub-bass for month starts
      this.bassDrone = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.05,
          decay: 0.6,
          sustain: 0.2,
          release: 0.8
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
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.0, release: 0.2 }
      }).connect(this.reverb);
      this.melodySynth.volume.value = -2;
    } else if (instrumentKey === "ambient_pad") {
      this.melodySynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.08, decay: 0.5, sustain: 0.6, release: 0.8 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -5;
    } else {
      // Default: "space_synth"
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.3 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -3;
    }
  }

  /**
   * Load primary dataset into the sonification engine.
   */
  loadDataset(earthData, secondaryData = null) {
    this.stop();
    this.data = earthData;
    this.secondaryData = secondaryData;
    this.currentIndex = 0;
  }

  /**
   * Set secondary dataset for simultaneous dual-track accompaniment.
   */
  setSecondaryDataset(secondaryData) {
    this.secondaryData = secondaryData;
  }

  setDualTrack(enabled) {
    this.dualTrackEnabled = enabled;
  }

  /**
   * Set musical scale for quantization.
   */
  setScale(scaleKey) {
    if (this.scales[scaleKey]) {
      this.currentScaleKey = scaleKey;
    }
  }

  /**
   * Maps normalized 0.0 - 1.0 value to a quantized musical note.
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
   * Begins or resumes playback.
   */
  async play() {
    if (!this.data || !this.data.dates || this.data.dates.length === 0) {
      console.warn("No data loaded to play.");
      return;
    }

    await this.initAudioContext();

    if (this.currentIndex >= this.data.dates.length) {
      this.currentIndex = 0;
    }

    this.isPlaying = true;
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(true);

    this.scheduleNextStep();
  }

  /**
   * Schedules next note event with high temporal accuracy.
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

    this.triggerStep(this.currentIndex);
    this.currentIndex++;

    const delay = Math.max(25, this.baseStepDurationMs / this.speedMultiplier);
    this.stepTimer = setTimeout(() => {
      this.scheduleNextStep();
    }, delay);
  }

  /**
   * Triggers audio synthesis for a specific single day.
   */
  triggerStep(idx) {
    if (!this.data) return;

    const date = this.data.dates[idx];
    const rawVal = this.data.values[idx];
    const normVal = this.data.normalized[idx];
    const dataType = this.data.data_type;

    // Detect month marker (e.g. "2024-05-01")
    const isFirstOfMonth = date.endsWith("-01");

    let playedNote = null;
    let playedFreq = null;

    try {
      if (dataType === "temperature") {
        // Temperature controls Pitch
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        const duration = "16n";
        const velocity = 0.5 + normVal * 0.45;
        this.melodySynth.triggerAttackRelease(playedNote, duration, undefined, velocity);

        // Dual-track accompaniment: If rainfall dataset is attached and enabled, trigger drum on rain days!
        if (this.dualTrackEnabled && this.secondaryData && this.secondaryData.values[idx] !== undefined) {
          const rainVal = this.secondaryData.values[idx];
          if (rainVal > 0.1) {
            const drumPitch = rainVal > 25.0 ? "C1" : rainVal > 10.0 ? "G1" : "C2";
            const drumVel = Math.min(0.9, 0.25 + (rainVal / 35.0) * 0.65);
            this.rainSynth.triggerAttackRelease(drumPitch, "16n", undefined, drumVel);
          }
        }

        // Soft calendar drone on 1st of month
        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("C2", "8n");
        }
      } else if (dataType === "rainfall") {
        // Rainfall controls percussion hits & volume
        if (rawVal > 0.1) {
          const drumPitch = rawVal > 25.0 ? "C1" : rawVal > 10.0 ? "G1" : "C2";
          const drumVel = Math.min(1.0, 0.3 + (rawVal / 30.0) * 0.7);
          this.rainSynth.triggerAttackRelease(drumPitch, "16n", undefined, drumVel);
          playedNote = `Rain ${drumPitch}`;
          playedFreq = Math.round(Tone.Frequency(drumPitch).toFrequency());
        } else {
          playedNote = "Dry (Rest)";
          playedFreq = 0;
        }

        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("G2", "8n");
        }
      } else {
        // Wind or other parameter
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);
        this.melodySynth.triggerAttackRelease(playedNote, "32n");
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
    this.triggerStep(this.currentIndex);
  }

  /**
   * Adjust playback speed multiplier (e.g. 0.5x, 1.0x, 2.0x).
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
   * Starts recording the sonified track from day 0.
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

    // Automatically begin playback to record the full piece
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
    console.log("Audio track downloaded successfully.");
  }
}

// Export singleton instance for app orchestration
window.earthSonifier = new EarthSonifier();
