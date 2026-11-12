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
    this.compareData = null; // Authentic City 2 data for comparative sonification
    this.compareMode = false;
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
      ],
      dorian_orbital: [
        "D3", "E3", "F3", "G3", "A3", "B3", "C4",
        "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"
      ]
    };

    this.currentScaleKey = "pentatonic_major";
    this.currentInstrumentKey = "acoustic_chimes";

    // Audio node references
    this.melodySynth = null;
    this.compareSynth = null;
    this.sampler = null;
    this.isSamplerLoaded = false;

    // Real Rain Player & Procedural Synthesis Nodes
    this.rainPlayer = null;
    this.isRainPlayerLoaded = false;
    this.rainPlayerFilter = null;
    this.rainPlayerGain = null;

    this.rainNoise = null;
    this.rainHighPass = null;
    this.rainLowPass = null;
    this.rainGain = null;
    this.dropletSynth = null;
    this.dropletFilter = null;
    this.dropletGain = null;
    this.thunderSynth = null;
    this.waterChimeSynth = null;

    // Procedural Wind Resonator Nodes
    this.windNoise = null;
    this.windFilter = null;
    this.windGain = null;

    // Master FX & Calendar Drone
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
        decay: 2.8,
        preDelay: 0.04,
        wet: 0.25
      }).connect(this.limiter);
      await this.reverb.generate();

      this.delay = new Tone.FeedbackDelay({
        delayTime: "16n",
        feedback: 0.14,
        wet: 0.14
      }).connect(this.reverb);

      // 1. Authentic Acoustic Chime Sampler (Sampled directly from user reference audio)
      this.isSamplerLoaded = false;
      try {
        this.sampler = new Tone.Sampler({
          urls: {
            "C4": "audio_samples/C4.wav",
            "D4": "audio_samples/D4.wav",
            "A4": "audio_samples/A4.wav",
            "D5": "audio_samples/D5.wav"
          },
          baseUrl: "",
          onload: () => {
            console.log("Authentic Acoustic Chimes loaded from audio_samples.");
            this.isSamplerLoaded = true;
          }
        }).connect(this.delay);
        this.sampler.volume.value = -1;
      } catch (err) {
        console.warn("Sampler initialization fallback:", err);
      }

      // 2. Authentic Real Rain Audio Player (Sampled directly from user real rain audio)
      this.isRainPlayerLoaded = false;
      try {
        this.rainPlayer = new Tone.Player({
          url: "audio_samples/real_rain_loop.wav",
          loop: true,
          autostart: false,
          onload: () => {
            console.log("Real rain audio loop loaded from audio_samples.");
            this.isRainPlayerLoaded = true;
          }
        });
        this.rainPlayerFilter = new Tone.Filter(2400, "lowpass");
        this.rainPlayerGain = new Tone.Gain(0);
        this.rainPlayer.connect(this.rainPlayerFilter);
        this.rainPlayerFilter.connect(this.rainPlayerGain);
        this.rainPlayerGain.connect(this.reverb);
      } catch (err) {
        console.warn("Rain player initialization fallback:", err);
      }

      // 3. Melody Synthesizer for Temperature / Primary pitch (Synthesizer Engine & Fallback)
      this.buildMelodySynth(this.currentInstrumentKey);

      // Comparative Synthesizer for Dual-City side-by-side sonification
      this.compareSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.1, release: 0.3 }
      }).connect(this.reverb);
      this.compareSynth.volume.value = -3.5;

      // 2. Realistic Procedural Rain Acoustic Architecture:
      // A. Ambient Continuous Rain Sheet (Filtered Pink Noise with dynamic lowpass sweep)
      this.rainNoise = new Tone.Noise("pink");
      this.rainHighPass = new Tone.Filter(320, "highpass");
      this.rainLowPass = new Tone.Filter(1500, "lowpass");
      this.rainGain = new Tone.Gain(0); // Starts silent

      this.rainNoise.connect(this.rainHighPass);
      this.rainHighPass.connect(this.rainLowPass);
      this.rainLowPass.connect(this.rainGain);
      this.rainGain.connect(this.reverb);

      // B. Micro-Droplet Granular Resonator ("Pitter-Patter" water droplets)
      this.dropletSynth = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 1.2,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.035,
          sustain: 0,
          release: 0.02
        }
      });
      this.dropletFilter = new Tone.Filter(2600, "bandpass");
      this.dropletGain = new Tone.Gain(0.40);
      this.dropletSynth.connect(this.dropletFilter);
      this.dropletFilter.connect(this.dropletGain);
      this.dropletGain.connect(this.reverb);

      // C. Deep Rolling Thunder Synth (for deluge storm events > 20 mm/day)
      this.thunderSynth = new Tone.MembraneSynth({
        pitchDecay: 0.14,
        octaves: 4.5,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.02,
          decay: 0.85,
          sustain: 0.04,
          release: 1.2
        }
      }).connect(this.limiter);
      this.thunderSynth.volume.value = -3;

      // D. Liquid Crystal Water Chime (Harmonic musical accompaniment in rain mode)
      this.waterChimeSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.003, decay: 0.35, sustain: 0.02, release: 0.4 }
      }).connect(this.delay);
      this.waterChimeSynth.volume.value = -6;

      // 3. Realistic Procedural Wind Resonator (Resonant Bandpass Noise)
      this.windNoise = new Tone.Noise("pink");
      this.windFilter = new Tone.Filter({
        frequency: 450,
        type: "bandpass",
        Q: 3.5
      });
      this.windGain = new Tone.Gain(0);
      this.windNoise.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.reverb);

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

    if (instrumentKey === "acoustic_chimes") {
      // 0. Authentic Acoustic Chimes (Tone.Sampler plays real recordings; FM chime is dynamic fallback)
      this.melodySynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.01,
        modulationIndex: 1.8,
        oscillator: { type: "sine" },
        modulation: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.35, sustain: 0.08, release: 0.45 },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.0, release: 0.2 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -3;
    } else if (instrumentKey === "crystal_celesta" || instrumentKey === "space_synth") {
      // 1. Crystal Celestial Chimes: Ethereal FM chime with shimmering high crystal overtones
      this.melodySynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.01,
        modulationIndex: 1.8,
        oscillator: { type: "sine" },
        modulation: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.35, sustain: 0.08, release: 0.45 },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.0, release: 0.2 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -4;
    } else if (instrumentKey === "acoustic_piano") {
      // 2. Grand Ambient Piano / Harp: Warm acoustic triangle/sine hybrid with gentle attack & natural decay
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.45, sustain: 0.05, release: 0.4 }
      }).connect(this.reverb);
      this.melodySynth.volume.value = -2;
    } else if (instrumentKey === "analog_warm_pad" || instrumentKey === "ambient_pad") {
      // 3. Cinematic Ambient Pad: Warm atmospheric dual-oscillator sweep
      this.melodySynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.06, decay: 0.45, sustain: 0.45, release: 0.65 }
      }).connect(this.delay);
      this.melodySynth.volume.value = -5;
    } else if (instrumentKey === "organic_marimba" || instrumentKey === "marimba") {
      // 4. Acoustic Wooden Marimba / Kalimba: Snappy mallet strike with wooden resonance
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 0.2, sustain: 0.0, release: 0.16 }
      }).connect(this.reverb);
      this.melodySynth.volume.value = -1.5;
    } else {
      // Default: Resonant Hologram Synth
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.015, decay: 0.22, sustain: 0.12, release: 0.25 }
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

  setCompareData(compareData, enabled = true) {
    this.compareData = compareData;
    this.compareMode = enabled && compareData !== null;
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

    // Start background noise generators safely
    if (this.rainNoise && this.rainNoise.state !== "started") {
      try { this.rainNoise.start(); } catch (e) {}
    }
    if (this.windNoise && this.windNoise.state !== "started") {
      try { this.windNoise.start(); } catch (e) {}
    }

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
        // Temperature controls Pitch & Harmonics
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        const velocity = 0.5 + normVal * 0.45;

        // Play authentic sampled crystal chimes when active and loaded, or synth fallback
        if (this.currentInstrumentKey === "acoustic_chimes" && this.isSamplerLoaded && this.sampler) {
          this.sampler.triggerAttackRelease(playedNote, durationSeconds, undefined, velocity);
        } else {
          this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, undefined, velocity);
        }

        // Dual-track accompaniment: If authentic rainfall data is active, layer real rain acoustics
        if (this.dualTrackEnabled && this.secondaryData && this.secondaryData.values[idx] !== undefined) {
          const rainVal = this.secondaryData.values[idx];
          if (rainVal > 0.1) {
            // Realistic ambient rain hiss proportional to mm/day
            const rainVol = Math.min(0.35, 0.06 + (rainVal / 25.0) * 0.28);
            const cutoff = Math.min(4200, 1100 + (rainVal / 25.0) * 2000);
            if (this.rainLowPass) this.rainLowPass.frequency.rampTo(cutoff, 0.06);
            if (this.rainGain) this.rainGain.gain.rampTo(rainVol, 0.06);

            // Layer authentic real rain recording
            if (this.rainPlayer && this.isRainPlayerLoaded) {
              if (this.rainPlayer.state !== "started") {
                try { this.rainPlayer.start(); } catch (e) {}
              }
              if (this.rainPlayerFilter) this.rainPlayerFilter.frequency.rampTo(cutoff, 0.06);
              if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(rainVol * 0.9, 0.06);
            }

            // Micro-droplet pitter-patter
            const numDrops = rainVal > 15.0 ? 3 : rainVal > 3.0 ? 2 : 1;
            const now = Tone.now();
            const dropPitches = ["E6", "A6", "C7"];
            for (let d = 0; d < numDrops; d++) {
              const p = dropPitches[d % dropPitches.length];
              if (this.dropletSynth) {
                this.dropletSynth.triggerAttackRelease(p, 0.015, now + d * 0.025, 0.35);
              }
            }

            // Distant rolling thunder if extreme storm (> 20 mm)
            if (rainVal > 20.0 && this.thunderSynth) {
              this.thunderSynth.triggerAttackRelease("C1", 0.5, undefined, 0.45);
            }
          } else {
            if (this.rainGain) this.rainGain.gain.rampTo(0, 0.08);
            if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(0, 0.08);
          }
        } else {
          if (this.rainGain) this.rainGain.gain.rampTo(0, 0.08);
          if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(0, 0.08);
        }

        // Soft calendar drone on 1st of month
        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("C2", "8n");
        }
      } else if (dataType === "rainfall") {
        // PURE PROCEDURAL & AUTHENTIC REAL RAIN ENGINE (Low to High realistic physical sound)
        if (rawVal > 0.05) {
          let rainVol = 0;
          let filterCutoff = 1200;
          let rainDesc = "";

          if (rawVal <= 3.0) {
            // Light drizzle: Soft cozy rustle + delicate droplet taps
            rainVol = 0.10 + (rawVal / 3.0) * 0.10; // 0.10 - 0.20
            filterCutoff = 1100 + (rawVal / 3.0) * 400; // 1100 - 1500 Hz
            rainDesc = "DRIZZLE";
          } else if (rawVal <= 15.0) {
            // Moderate steady rain: Rich open shower hiss + frequent drops
            rainVol = 0.22 + ((rawVal - 3.0) / 12.0) * 0.22; // 0.22 - 0.44
            filterCutoff = 1600 + ((rawVal - 3.0) / 12.0) * 1200; // 1600 - 2800 Hz
            rainDesc = "SHOWER";
          } else {
            // Heavy monsoon storm / deluge: Wide stereo rush + rolling thunder
            rainVol = Math.min(0.80, 0.42 + ((rawVal - 15.0) / 50.0) * 0.38); // 0.42 - 0.80
            filterCutoff = Math.min(5000, 3000 + ((rawVal - 15.0) / 50.0) * 2000); // 3000 - 5000 Hz
            rainDesc = "DELUGE";
          }

          // Smoothly ramp the continuous rain sound
          if (this.rainLowPass) this.rainLowPass.frequency.rampTo(filterCutoff, 0.06);
          if (this.rainGain) this.rainGain.gain.rampTo(rainVol * 0.65, 0.06);

          // Layer authentic real rain recording loop
          if (this.rainPlayer && this.isRainPlayerLoaded) {
            if (this.rainPlayer.state !== "started") {
              try { this.rainPlayer.start(); } catch (e) {}
            }
            if (this.rainPlayerFilter) this.rainPlayerFilter.frequency.rampTo(filterCutoff, 0.06);
            if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(rainVol * 0.9, 0.06);
          }

          // Pitter-patter droplet burst
          const dropletCount = rawVal <= 3.0 ? 2 : rawVal <= 15.0 ? 4 : 7;
          const dropPitches = ["C5", "E5", "G5", "B5", "D6", "G6", "A6"];
          const now = Tone.now();

          for (let d = 0; d < dropletCount; d++) {
            const timeOffset = d * (stepMs / 1000 / (dropletCount + 1)) + (Math.random() * 0.015);
            const dropPitch = dropPitches[Math.floor(Math.random() * dropPitches.length)];
            const dropVel = Math.min(0.9, 0.25 + (rawVal / 30.0) * 0.65);
            if (this.dropletSynth) {
              this.dropletSynth.triggerAttackRelease(dropPitch, 0.02, now + timeOffset, dropVel);
            }
          }

          // Deep rolling thunder for heavy deluge (> 20mm, e.g. Dubai, Karachi, Tokyo floods)
          if (rawVal > 20.0 && this.thunderSynth) {
            const thunderPitch = rawVal > 60.0 ? "C1" : "E1";
            const thunderVel = Math.min(1.0, 0.45 + (rawVal / 80.0) * 0.55);
            this.thunderSynth.triggerAttackRelease(thunderPitch, 0.65, undefined, thunderVel);
          }

          // Acoustic Chime note accompaniment
          const noteInfo = this.valueToNote(normVal);
          playedNote = `${rainDesc} • ${noteInfo.note}`;
          playedFreq = Math.round(noteInfo.freq);

          if (this.isSamplerLoaded && this.sampler) {
            this.sampler.triggerAttackRelease(noteInfo.note, durationSeconds, undefined, 0.6);
          } else if (this.waterChimeSynth) {
            this.waterChimeSynth.triggerAttackRelease(noteInfo.note, durationSeconds, undefined, 0.5);
          }
        } else {
          // Dry day / Rest
          if (this.rainGain) this.rainGain.gain.rampTo(0, 0.08);
          if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(0, 0.08);
          playedNote = "DRY REST";
          playedFreq = 0;
        }

        if (isFirstOfMonth && this.bassDrone) {
          this.bassDrone.triggerAttackRelease("G2", "8n");
        }
      } else if (dataType === "wind") {
        // Wind speed: Resonant airy velocity & howling wind filter sweep
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, undefined, 0.6);

        if (this.windFilter && this.windGain) {
          if (rawVal > 1.0) {
            const windCutoff = Math.min(1800, 300 + (rawVal / 15.0) * 1200);
            const windVol = Math.min(0.35, 0.05 + (rawVal / 15.0) * 0.3);
            this.windFilter.frequency.rampTo(windCutoff, 0.06);
            this.windGain.gain.rampTo(windVol, 0.06);
          } else {
            this.windGain.gain.rampTo(0, 0.08);
          }
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
    if (this.rainGain) {
      this.rainGain.gain.rampTo(0, 0.05);
    }
    if (this.rainPlayerGain) {
      this.rainPlayerGain.gain.rampTo(0, 0.05);
    }
    if (this.windGain) {
      this.windGain.gain.rampTo(0, 0.05);
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
