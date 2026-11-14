/**
 * NASA Earth Information Jukebox - Web Audio Sonification Engine
 * Module 3: Authentic Sonification Architecture
 * - Zero-drift performance.now() high-precision scheduling
 * - True Planetary (Absolute °C) vs Local Seasonal pitch modes
 * - Expressive multi-timbral synthesis (Melody, Thunder/Raindrops, Wind Resonator, Calendar Drones)
 * - Anti-clipping dynamic envelope articulation
 * - Direct Web Audio MediaRecorder capture to downloadable .webm
 */

/**
 * Direct Hardware Web Audio Engine (Zero-dependency, zero-hang, 100% reliable)
 * Directly drives hardware speakers via native AudioContext.
 */
class DirectAcousticAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolume(gainVal) {
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, gainVal)), this.ctx.currentTime, 0.05);
      } catch (_) {}
    }
  }

  playNote(freq, category, durationSeconds = 0.28, velocity = 0.7) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted || freq <= 10) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Timbre profiling matching authentic 3 categories
      if (category === "COLD") {
        // Frosted sine + warm sub-body
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Sub-octave anchor
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = "triangle";
        subOsc.frequency.setValueAtTime(freq * 0.5, now);
        subGain.gain.setValueAtTime(0.0001, now);
        subGain.gain.linearRampToValueAtTime(velocity * 0.35, now + 0.015);
        subGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds * 1.2);
        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + durationSeconds * 1.25);
      } else if (category === "MODERATE") {
        // Melodious crystal triangle chime
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
      } else if (category === "HOT") {
        // High solar sawtooth with bright chime overtone
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        // High shimmer sparkle
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = "sine";
        shimmerOsc.frequency.setValueAtTime(freq * 2.0, now);
        shimmerGain.gain.setValueAtTime(0.0001, now);
        shimmerGain.gain.linearRampToValueAtTime(velocity * 0.22, now + 0.008);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(this.masterGain);
        shimmerOsc.start(now);
        shimmerOsc.stop(now + 0.17);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
      }

      // Smooth attack and natural resonant acoustic decay
      const peakGain = Math.max(0.01, Math.min(0.85, velocity * 0.55));
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + durationSeconds + 0.02);
    } catch (_) {}
  }

  playRain(freq, mm, durationSeconds = 0.20, velocity = 0.6) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    try {
      const now = ctx.currentTime;
      // High-pitched crystal water chime note
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(velocity * 0.45, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + durationSeconds + 0.02);

      // Thunder for storm
      if (mm > 20.0) {
        const thOsc = ctx.createOscillator();
        const thGain = ctx.createGain();
        thOsc.type = "sine";
        thOsc.frequency.setValueAtTime(55, now);
        thOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);
        thGain.gain.setValueAtTime(0.0001, now);
        thGain.gain.linearRampToValueAtTime(0.4, now + 0.04);
        thGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        thOsc.connect(thGain);
        thGain.connect(this.masterGain);
        thOsc.start(now);
        thOsc.stop(now + 0.75);
      }
    } catch (_) {}
  }

  playDrone(freq = 65, duration = 0.4) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_) {}
  }
}

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

    // Direct hardware Web Audio engine (Fail-safe, zero-hang)
    this.nativeAudio = new DirectAcousticAudio();

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

    // 3-Category Thermal Sonification State
    this.lastCategory = null;
    this.activeCategory = null;

    // Audio node references
    this.melodySynth = null;
    this.compareSynth = null;
    this.sampler = null;
    this.isSamplerLoaded = false;

    // Category-specific acoustic signal processors
    this.coldFilter = null;
    this.coldGain = null;
    this.coldSubSynth = null;
    this.hotFilter = null;
    this.hotGain = null;
    this.heatShimmerSynth = null;
    this.transitionSynth = null;

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

    // 0. Ensure Native Direct Hardware Web Audio Engine is active
    if (this.nativeAudio) {
      try {
        this.nativeAudio.ensureContext();
      } catch (_) {}
    }

    if (window.Tone) {
      try {
        await Tone.start();
        if (Tone.context && Tone.context.state !== "running") {
          await Tone.context.resume();
        }
      } catch (err) {
        console.warn("Tone.start activation warning:", err);
      }
      console.log("Authentic Web Audio Context initialized, state:", Tone.context ? Tone.context.state : "unknown");

      // 1. Master Output Architecture: Direct to Destination for maximum clarity and zero loss
      this.masterBus = new Tone.Gain(1.0).toDestination();

      // Ensure Master Destination is unmuted and at 0 dB
      try {
        Tone.getDestination().mute = false;
        Tone.getDestination().volume.value = 0;
      } catch (_) {}

      // Setup MediaStreamDestination for authentic audio recording & download
      try {
        const rawCtx = Tone.getContext().rawContext;
        this.mediaStreamDest = rawCtx.createMediaStreamDestination();
        if (this.mediaStreamDest) {
          this.masterBus.connect(this.mediaStreamDest);
        }
      } catch (e) {
        console.warn("MediaStreamDestination not supported:", e);
      }

      // Master FX chain: Instantaneous, zero-hang Freeverb & FeedbackDelay connected into Master Bus
      this.reverb = new Tone.Freeverb({
        roomSize: 0.65,
        dampening: 3200,
        wet: 0.22
      }).connect(this.masterBus);

      this.delay = new Tone.FeedbackDelay({
        delayTime: "16n",
        feedback: 0.15,
        wet: 0.16
      }).connect(this.masterBus);

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
          },
          onerror: (err) => {
            console.warn("Sampler load fallback to synth:", err);
            this.isSamplerLoaded = false;
          }
        });
        this.sampler.connect(this.masterBus);
        this.sampler.connect(this.delay);
        this.sampler.volume.value = 0;
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
        this.rainPlayerGain.connect(this.masterBus);
      } catch (err) {
        console.warn("Rain player initialization fallback:", err);
      }

      // 3. Melody Synthesizer for Temperature / Primary pitch (Synthesizer Engine & Fallback)
      this.buildMelodySynth(this.currentInstrumentKey);

      // 3-Category Thermal Signal Architecture (Cold Chill, Moderate Comfort, Solar Shimmer)
      // A. Cold Frost Resonator & Deep Sub-Bass
      this.coldFilter = new Tone.Filter(850, "lowpass");
      this.coldGain = new Tone.Gain(0.9);
      this.coldFilter.connect(this.coldGain);
      this.coldGain.connect(this.masterBus);

      this.coldSubSynth = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.04, decay: 0.38, sustain: 0.05, release: 0.45 }
      }).connect(this.masterBus);
      this.coldSubSynth.volume.value = -6;

      // B. Solar Heat Shimmer & High-Frequency Shimmer Exciter
      this.hotFilter = new Tone.Filter(3200, "highpass");
      this.hotGain = new Tone.Gain(0.75);
      this.hotFilter.connect(this.hotGain);
      this.hotGain.connect(this.delay);

      this.heatShimmerSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.01,
        modulationIndex: 2.5,
        oscillator: { type: "sine" },
        modulation: { type: "triangle" },
        envelope: { attack: 0.003, decay: 0.22, sustain: 0.02, release: 0.25 }
      }).connect(this.masterBus);
      this.heatShimmerSynth.connect(this.delay);
      this.heatShimmerSynth.volume.value = -7;

      // C. Distinct Category Boundary Transition Flourish Synth
      this.transitionSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.35, sustain: 0.08, release: 0.4 }
      }).connect(this.masterBus);
      this.transitionSynth.connect(this.reverb);
      this.transitionSynth.volume.value = -4;

      // Comparative Synthesizer for Dual-City side-by-side sonification
      this.compareSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.1, release: 0.3 }
      }).connect(this.masterBus);
      this.compareSynth.volume.value = -2;

      // 2. Realistic Procedural Rain Acoustic Architecture:
      // A. Ambient Continuous Rain Sheet (Filtered Pink Noise with dynamic lowpass sweep)
      this.rainNoise = new Tone.Noise("pink");
      this.rainHighPass = new Tone.Filter(320, "highpass");
      this.rainLowPass = new Tone.Filter(1500, "lowpass");
      this.rainGain = new Tone.Gain(0); // Starts silent

      this.rainNoise.connect(this.rainHighPass);
      this.rainHighPass.connect(this.rainLowPass);
      this.rainLowPass.connect(this.rainGain);
      this.rainGain.connect(this.masterBus);

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
      this.dropletGain = new Tone.Gain(0.55);
      this.dropletSynth.connect(this.dropletFilter);
      this.dropletFilter.connect(this.dropletGain);
      this.dropletGain.connect(this.masterBus);

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
      }).connect(this.masterBus);
      this.thunderSynth.volume.value = -2;

      // D. Liquid Crystal Water Chime (Expressive FM acoustic water chime whose notes change with rain intensity)
      this.waterChimeSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1.5,
        modulationIndex: 1.4,
        oscillator: { type: "sine" },
        modulation: { type: "triangle" },
        envelope: { attack: 0.004, decay: 0.38, sustain: 0.03, release: 0.35 },
        modulationEnvelope: { attack: 0.002, decay: 0.18, sustain: 0.0, release: 0.15 }
      }).connect(this.masterBus);
      this.waterChimeSynth.connect(this.delay);
      this.waterChimeSynth.volume.value = -2;

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
      this.windGain.connect(this.masterBus);

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
      this.bassDrone.volume.value = -6;

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
      });
      this.melodySynth.volume.value = -2;
    } else if (instrumentKey === "crystal_celesta" || instrumentKey === "space_synth") {
      // 1. Crystal Celestial Chimes: Ethereal FM chime with shimmering high crystal overtones
      this.melodySynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2.01,
        modulationIndex: 1.8,
        oscillator: { type: "sine" },
        modulation: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.35, sustain: 0.08, release: 0.45 },
        modulationEnvelope: { attack: 0.002, decay: 0.2, sustain: 0.0, release: 0.2 }
      });
      this.melodySynth.volume.value = -2;
    } else if (instrumentKey === "acoustic_piano") {
      // 2. Grand Ambient Piano / Harp: Warm acoustic triangle/sine hybrid with gentle attack & natural decay
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.45, sustain: 0.05, release: 0.4 }
      });
      this.melodySynth.volume.value = -1;
    } else if (instrumentKey === "analog_warm_pad" || instrumentKey === "ambient_pad") {
      // 3. Cinematic Ambient Pad: Warm atmospheric dual-oscillator sweep
      this.melodySynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1.5,
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.06, decay: 0.45, sustain: 0.45, release: 0.65 }
      });
      this.melodySynth.volume.value = -3;
    } else if (instrumentKey === "organic_marimba" || instrumentKey === "marimba") {
      // 4. Acoustic Wooden Marimba / Kalimba: Snappy mallet strike with wooden resonance
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.002, decay: 0.2, sustain: 0.0, release: 0.16 }
      });
      this.melodySynth.volume.value = 0;
    } else {
      // Default: Resonant Hologram Synth
      this.melodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.015, decay: 0.22, sustain: 0.12, release: 0.25 }
      });
      this.melodySynth.volume.value = -2;
    }

    // Direct dry route to master bus + send to delay/reverb
    if (this.masterBus) {
      this.melodySynth.connect(this.masterBus);
    } else if (this.limiter) {
      this.melodySynth.connect(this.limiter);
    } else {
      this.melodySynth.toDestination();
    }
    if (this.delay) {
      try {
        this.melodySynth.connect(this.delay);
      } catch (_) {}
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
   * 3-Zone Thermal Classification matching authentic reference video:
   * 1. Cold / Sardi: <= 20.0°C (Deep blue, chilled low acoustic register C3-A3 + frost sub-bass)
   * 2. Moderate / Theek: 20.1°C - 26.0°C (Lush green, comfortable mid register C4-A4, warm plate reverb)
   * 3. Hot / Garmi: > 26.0°C (Solar red, shimmering high register C5-C6 + solar sizzle exciter)
   */
  getTemperatureCategory(tempC) {
    if (tempC <= 20.0) {
      return {
        key: "COLD",
        label: "SARDI • COLD",
        shortLabel: "SARDI",
        urdu: "سردی",
        range: "≤ 20°C",
        color: "#38bdf8",
        notes: ["C3", "D3", "E3", "G3", "A3"],
        baseFreq: 130.8,
        isExtreme: tempC <= 12.0
      };
    } else if (tempC <= 26.0) {
      return {
        key: "MODERATE",
        label: "THEEK • MODERATE",
        shortLabel: "THEEK",
        urdu: "ٹھیک",
        range: "21–26°C",
        color: "#22c55e",
        notes: ["C4", "D4", "E4", "G4", "A4"],
        baseFreq: 261.6,
        isExtreme: false
      };
    } else {
      const isExtreme = tempC >= 33.0;
      return {
        key: "HOT",
        label: isExtreme ? "GARMI • HEATWAVE" : "GARMI • HOT",
        shortLabel: isExtreme ? "HEATWAVE" : "GARMI",
        urdu: "گرمی",
        range: "> 26°C",
        color: isExtreme ? "#f43f5e" : "#ef4444",
        notes: ["C5", "D5", "E5", "G5", "A5", "C6"],
        baseFreq: 523.2,
        isExtreme: isExtreme
      };
    }
  }

  /**
   * Maps temperature into its category note with distinct intra-category pitch scaling,
   * guaranteeing that both the macro thermal category AND day-to-day warming/cooling are crystal clear by ear!
   */
  categoryValueToNote(tempC) {
    const cat = this.getTemperatureCategory(tempC);
    let note = cat.notes[0];
    let noteIndex = 0;

    if (cat.key === "COLD") {
      // Scale 8°C to 20°C across 5 cold notes
      const ratio = Math.max(0, Math.min(1, (tempC - 8.0) / 12.0));
      noteIndex = Math.min(Math.floor(ratio * cat.notes.length), cat.notes.length - 1);
      note = cat.notes[noteIndex];
    } else if (cat.key === "MODERATE") {
      // Scale 20.1°C to 26.0°C across 5 moderate notes
      const ratio = Math.max(0, Math.min(1, (tempC - 20.1) / 5.9));
      noteIndex = Math.min(Math.floor(ratio * cat.notes.length), cat.notes.length - 1);
      note = cat.notes[noteIndex];
    } else {
      // Scale 26.1°C to 42.0°C across 6 hot notes
      const ratio = Math.max(0, Math.min(1, (tempC - 26.1) / 15.9));
      noteIndex = Math.min(Math.floor(ratio * cat.notes.length), cat.notes.length - 1);
      note = cat.notes[noteIndex];
    }

    const freq = Tone.Frequency(note).toFrequency();
    return { note, freq, category: cat, noteIndex };
  }

  /**
   * Dynamic Rainfall Acoustic Note Architecture:
   * Maps mm/day precipitation into evolving musical water notes that climb and descend
   * precisely as rainfall increases and decreases:
   * - 0.1 to 3.0 mm (Light Drizzle): Delicate crystal droplets climbing through octave 6 (C6, D6, E6, G6, A6, C7)
   * - 3.1 to 15.0 mm (Steady Shower): Melodious liquid water chimes ascending through octave 5 (C5, D5, E5, G5, A5, C6)
   * - 15.1 to 40.0 mm (Heavy Downpour): Deep aqueous bells in octave 4 (C4, D4, E4, G4, A4, C5) + rolling thunder (E1)
   * - > 40.0 mm (Monsoon Deluge): Powerful multi-tone storm chords (Octave 3 & 4) + sub-bass thunder boom (C1)
   */
  getRainfallAcousticNotes(mm) {
    if (mm <= 0.05) return null;

    if (mm <= 3.0) {
      // Drizzle / Light Rain (0.1 - 3.0 mm)
      // Delicate, high-pitched crystal droplets that climb up as drizzle intensifies
      const scale = ["C6", "D6", "E6", "G6", "A6", "C7"];
      const ratio = Math.max(0, Math.min(1, (mm - 0.1) / 2.9));
      const idx = Math.min(Math.floor(ratio * scale.length), scale.length - 1);
      const primaryNote = scale[idx];
      const secondNote = scale[Math.min(scale.length - 1, idx + 1)];

      return {
        tier: "DRIZZLE",
        label: "LIGHT DRIZZLE",
        mm: mm,
        primaryNote: primaryNote,
        dropletPitches: [primaryNote, secondNote],
        dropCount: 2,
        volume: 0.18 + ratio * 0.14,
        filterCutoff: 1100 + ratio * 600,
        isThunder: false
      };
    } else if (mm <= 15.0) {
      // Moderate Steady Shower (3.1 - 15.0 mm)
      // Flowing, melodious liquid water chimes that rise through octave 5
      const scale = ["C5", "D5", "E5", "G5", "A5", "C6"];
      const ratio = Math.max(0, Math.min(1, (mm - 3.0) / 12.0));
      const idx = Math.min(Math.floor(ratio * scale.length), scale.length - 1);
      const primaryNote = scale[idx];
      const harmonyNote = scale[(idx + 2) % scale.length];
      const dropletPitches = [primaryNote, harmonyNote, scale[(idx + 4) % scale.length]];

      return {
        tier: "SHOWER",
        label: "STEADY SHOWER",
        mm: mm,
        primaryNote: primaryNote,
        dropletPitches: dropletPitches,
        dropCount: 4,
        volume: 0.35 + ratio * 0.25,
        filterCutoff: 1700 + ratio * 1300,
        isThunder: false
      };
    } else if (mm <= 40.0) {
      // Heavy Downpour (15.1 - 40.0 mm)
      // Deep aqueous bells & storm cascade climbing through octave 4
      const scale = ["C4", "D4", "E4", "G4", "A4", "C5"];
      const ratio = Math.max(0, Math.min(1, (mm - 15.0) / 25.0));
      const idx = Math.min(Math.floor(ratio * scale.length), scale.length - 1);
      const primaryNote = scale[idx];
      const harmonyNote = scale[(idx + 2) % scale.length];
      const dropletPitches = [primaryNote, harmonyNote, "E5", "G5"];

      return {
        tier: "DOWNPOUR",
        label: "HEAVY DOWNPOUR",
        mm: mm,
        primaryNote: primaryNote,
        dropletPitches: dropletPitches,
        dropCount: 6,
        volume: 0.62 + ratio * 0.20,
        filterCutoff: 3000 + ratio * 1500,
        isThunder: mm > 20.0,
        thunderPitch: "E1"
      };
    } else {
      // Monsoon Deluge / Flood (> 40.0 mm)
      // Deep resonant aqueous strikes, heavy chords & sub-bass thunder
      const scale = ["A3", "C4", "D4", "E4", "G4", "C5"];
      const ratio = Math.max(0, Math.min(1, (mm - 40.0) / 45.0));
      const idx = Math.min(Math.floor(ratio * scale.length), scale.length - 1);
      const primaryNote = scale[idx];
      const dropletPitches = ["C3", primaryNote, "G4", "C5", "E5"];

      return {
        tier: "DELUGE",
        label: "MONSOON DELUGE",
        mm: mm,
        primaryNote: primaryNote,
        dropletPitches: dropletPitches,
        dropCount: 8,
        volume: 0.85,
        filterCutoff: 4800,
        isThunder: true,
        thunderPitch: "C1"
      };
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

    try {
      await this.initAudioContext();
      if (window.Tone && Tone.context && Tone.context.state !== "running") {
        await Tone.context.resume();
      }
    } catch (err) {
      console.warn("Audio Context resumption warning:", err);
    }

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
    try {
      this.triggerStep(this.currentIndex, stepMs);
    } catch (stepErr) {
      console.warn("Playback step error:", stepErr);
    }
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
    let activeCat = null;
    let transitionType = null;
    let activeRainInfo = null;

    // Dynamic anti-clipping note duration: note releases cleanly before the next step
    const durationSeconds = Math.max(0.04, Math.min(0.24, (stepMs / 1000) * 0.85));

    try {
      const now = Tone.now();

      if (dataType === "temperature") {
        // Authentic 3-Zone Thermal Sonification Engine
        const noteInfo = this.categoryValueToNote(rawVal);
        activeCat = noteInfo.category;
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        // Fail-safe direct hardware Web Audio chime output (100% audible on all browsers)
        if (this.nativeAudio && playedFreq > 10) {
          const directVel = activeCat.key === "COLD" ? 0.70 : (activeCat.key === "MODERATE" ? 0.78 : 0.88);
          this.nativeAudio.playNote(playedFreq, activeCat.key, durationSeconds * 1.5, directVel);
        }

        // 1. Boundary Transition Audio Flourish: Detect macro thermal shifts
        if (this.lastCategory && this.lastCategory !== activeCat.key) {
          transitionType = `${this.lastCategory}_TO_${activeCat.key}`;
          if (this.transitionSynth) {
            try {
              if (transitionType === "COLD_TO_MODERATE") {
                this.transitionSynth.triggerAttackRelease(["E3", "A4"], 0.20, now);
              } else if (transitionType === "MODERATE_TO_HOT") {
                this.transitionSynth.triggerAttackRelease(["A4", "E5"], 0.16, now);
              } else if (transitionType === "HOT_TO_MODERATE") {
                this.transitionSynth.triggerAttackRelease(["E5", "A4"], 0.20, now);
              } else if (transitionType === "MODERATE_TO_COLD") {
                this.transitionSynth.triggerAttackRelease(["G4", "C3"], 0.26, now);
              }
            } catch (_) {}
          }
        }
        this.lastCategory = activeCat.key;
        this.activeCategory = activeCat;

        // 2. Category-Specific Acoustic Profiling
        if (activeCat.key === "COLD") {
          // SARDI (Cold Zone <= 20°C): Deep, frosted, grounded acoustic chime + sub-bass
          const coldVel = 0.65 + Math.min(0.20, noteInfo.noteIndex * 0.04);
          let noteSounded = false;
          if (this.currentInstrumentKey === "acoustic_chimes" && this.isSamplerLoaded && this.sampler) {
            try {
              this.sampler.triggerAttackRelease(playedNote, durationSeconds * 1.25, now, coldVel);
              noteSounded = true;
            } catch (_) {}
          }
          if (!noteSounded && this.melodySynth) {
            try {
              this.melodySynth.triggerAttackRelease(playedNote, durationSeconds * 1.25, now, coldVel);
            } catch (_) {}
          }

          // Subtle frosty sub-bass body anchor
          if (this.coldSubSynth) {
            try {
              const subPitch = noteInfo.noteIndex <= 1 ? "C2" : "E2";
              this.coldSubSynth.triggerAttackRelease(subPitch, 0.25, now, 0.45);
            } catch (_) {}
          }
        } else if (activeCat.key === "MODERATE") {
          // THEEK (Moderate Zone 21-26°C): Melodious, pleasant, comfortable warm crystal chime
          const modVel = 0.75 + Math.min(0.20, noteInfo.noteIndex * 0.04);
          let noteSounded = false;
          if (this.currentInstrumentKey === "acoustic_chimes" && this.isSamplerLoaded && this.sampler) {
            try {
              this.sampler.triggerAttackRelease(playedNote, durationSeconds, now, modVel);
              noteSounded = true;
            } catch (_) {}
          }
          if (!noteSounded && this.melodySynth) {
            try {
              this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, now, modVel);
            } catch (_) {}
          }
        } else {
          // GARMI (Hot Zone > 26°C): High register, bright, energetic solar chimes + heatwave sizzle
          const hotVel = 0.85 + Math.min(0.15, noteInfo.noteIndex * 0.03);
          let noteSounded = false;
          if (this.currentInstrumentKey === "acoustic_chimes" && this.isSamplerLoaded && this.sampler) {
            try {
              this.sampler.triggerAttackRelease(playedNote, durationSeconds * 0.85, now, hotVel);
              noteSounded = true;
            } catch (_) {}
          }
          if (!noteSounded && this.melodySynth) {
            try {
              this.melodySynth.triggerAttackRelease(playedNote, durationSeconds * 0.85, now, hotVel);
            } catch (_) {}
          }

          // Solar heat shimmer exciter
          if (this.heatShimmerSynth) {
            try {
              this.heatShimmerSynth.triggerAttackRelease(playedNote, 0.14, now, 0.40);
            } catch (_) {}
          }

          // Extreme heatwave anomaly sparkle (> 33°C)
          if (activeCat.isExtreme && this.melodySynth) {
            try {
              const sparkleNote = rawVal >= 36.0 ? "E6" : "C6";
              this.melodySynth.triggerAttackRelease(sparkleNote, 0.10, now + 0.03, 0.35);
            } catch (_) {}
          }
        }

        // Dual-track accompaniment: If authentic rainfall data is active, layer real rain acoustics & changing rain notes
        if (this.dualTrackEnabled && this.secondaryData && this.secondaryData.values[idx] !== undefined) {
          const rainVal = this.secondaryData.values[idx];
          if (rainVal > 0.1) {
            activeRainInfo = this.getRainfallAcousticNotes(rainVal);

            // Realistic ambient rain hiss proportional to mm/day
            if (this.rainLowPass) this.rainLowPass.frequency.rampTo(activeRainInfo.filterCutoff, 0.06);
            if (this.rainGain) this.rainGain.gain.rampTo(activeRainInfo.volume * 0.55, 0.06);

            // Layer authentic real rain recording
            if (this.rainPlayer && this.isRainPlayerLoaded) {
              if (this.rainPlayer.state !== "started") {
                try { this.rainPlayer.start(); } catch (e) {}
              }
              if (this.rainPlayerFilter) this.rainPlayerFilter.frequency.rampTo(activeRainInfo.filterCutoff, 0.06);
              if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(activeRainInfo.volume * 0.75, 0.06);
            }

            // Musical rain water chime that ascends/descends with rainfall intensity!
            if (this.waterChimeSynth) {
              try {
                const chimeVel = Math.min(0.85, 0.35 + (rainVal / 30.0) * 0.45);
                this.waterChimeSynth.triggerAttackRelease(activeRainInfo.primaryNote, durationSeconds * 0.85, now, chimeVel);
              } catch (_) {}
            }

            // Micro-droplet notes that change with rain tier
            const drops = activeRainInfo.dropletPitches;
            for (let d = 0; d < activeRainInfo.dropCount; d++) {
              const timeOffset = d * (stepMs / 1000 / (activeRainInfo.dropCount + 1)) + (Math.random() * 0.012);
              const dropPitch = drops[d % drops.length];
              const dropVel = Math.min(0.85, 0.30 + (rainVal / 35.0) * 0.55);
              if (this.dropletSynth) {
                try {
                  this.dropletSynth.triggerAttackRelease(dropPitch, 0.02, now + timeOffset, dropVel);
                } catch (_) {}
              }
            }

            // Distant rolling thunder if extreme storm (> 20 mm)
            if (activeRainInfo.isThunder && this.thunderSynth) {
              try {
                this.thunderSynth.triggerAttackRelease(activeRainInfo.thunderPitch, 0.5, now, 0.45);
              } catch (_) {}
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
        if (isFirstOfMonth) {
          if (this.nativeAudio) {
            try { this.nativeAudio.playDrone(65.4, 0.45); } catch (_) {}
          }
          if (this.bassDrone) {
            try {
              this.bassDrone.triggerAttackRelease("C2", "8n", now);
            } catch (_) {}
          }
        }
      } else if (dataType === "rainfall") {
        // PURE PROCEDURAL & AUTHENTIC REAL RAIN ENGINE WITH NOTES CHANGING ON INCREASE/DECREASE
        if (rawVal > 0.05) {
          activeRainInfo = this.getRainfallAcousticNotes(rawVal);
          playedNote = `${activeRainInfo.tier} [${rawVal.toFixed(1)}mm] • ${activeRainInfo.primaryNote}`;
          playedFreq = Math.round(Tone.Frequency(activeRainInfo.primaryNote).toFrequency());

          // Direct Hardware Web Audio rainfall acoustic chime
          if (this.nativeAudio && playedFreq > 10) {
            this.nativeAudio.playRain(playedFreq, rawVal, durationSeconds * 1.4, 0.75);
          }

          // Smoothly ramp the continuous rain sound & lowpass sweep
          if (this.rainLowPass) this.rainLowPass.frequency.rampTo(activeRainInfo.filterCutoff, 0.06);
          if (this.rainGain) this.rainGain.gain.rampTo(activeRainInfo.volume * 0.65, 0.06);

          // Layer authentic real rain recording loop
          if (this.rainPlayer && this.isRainPlayerLoaded) {
            if (this.rainPlayer.state !== "started") {
              try { this.rainPlayer.start(); } catch (e) {}
            }
            if (this.rainPlayerFilter) this.rainPlayerFilter.frequency.rampTo(activeRainInfo.filterCutoff, 0.06);
            if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(activeRainInfo.volume * 0.9, 0.06);
          }

          // Primary Musical Rain Note (FM Aqueous Chime & Sampler)
          const chimeVel = Math.min(0.95, 0.50 + (rawVal / 35.0) * 0.45);
          let rainSounded = false;
          if (this.currentInstrumentKey === "acoustic_chimes" && this.isSamplerLoaded && this.sampler) {
            try {
              this.sampler.triggerAttackRelease(activeRainInfo.primaryNote, durationSeconds, now, chimeVel);
              rainSounded = true;
            } catch (_) {}
          }
          if (!rainSounded && this.waterChimeSynth) {
            try {
              this.waterChimeSynth.triggerAttackRelease(activeRainInfo.primaryNote, durationSeconds, now, chimeVel);
            } catch (_) {}
          }

          // Pitter-patter water droplet notes that ascend/descend with rain volume
          const drops = activeRainInfo.dropletPitches;
          for (let d = 0; d < activeRainInfo.dropCount; d++) {
            const timeOffset = d * (stepMs / 1000 / (activeRainInfo.dropCount + 1)) + (Math.random() * 0.015);
            const dropPitch = drops[d % drops.length];
            const dropVel = Math.min(0.9, 0.30 + (rawVal / 30.0) * 0.60);
            if (this.dropletSynth) {
              try {
                this.dropletSynth.triggerAttackRelease(dropPitch, 0.02, now + timeOffset, dropVel);
              } catch (_) {}
            }
          }

          // Deep rolling thunder for heavy storm events (> 20mm)
          if (activeRainInfo.isThunder && this.thunderSynth) {
            try {
              const thunderVel = Math.min(1.0, 0.45 + (rawVal / 80.0) * 0.55);
              this.thunderSynth.triggerAttackRelease(activeRainInfo.thunderPitch, 0.65, now, thunderVel);
            } catch (_) {}
          }
        } else {
          // Dry day / Rest
          if (this.rainGain) this.rainGain.gain.rampTo(0, 0.08);
          if (this.rainPlayerGain) this.rainPlayerGain.gain.rampTo(0, 0.08);
          playedNote = "DRY REST";
          playedFreq = 0;
        }

        if (isFirstOfMonth) {
          if (this.nativeAudio) {
            try { this.nativeAudio.playDrone(65.4, 0.45); } catch (_) {}
          }
          if (this.bassDrone) {
            try {
              this.bassDrone.triggerAttackRelease("G2", "8n", now);
            } catch (_) {}
          }
        }
      } else if (dataType === "wind") {
        // Wind speed: Resonant airy velocity & howling wind filter sweep
        const noteInfo = this.valueToNote(normVal);
        playedNote = noteInfo.note;
        playedFreq = Math.round(noteInfo.freq);

        if (this.nativeAudio && playedFreq > 10) {
          this.nativeAudio.playNote(playedFreq, "MODERATE", durationSeconds * 1.2, 0.65);
        }

        if (this.melodySynth) {
          try {
            this.melodySynth.triggerAttackRelease(playedNote, durationSeconds, now, 0.65);
          } catch (_) {}
        }

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
      try {
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
          isTransition: transitionType !== null,
          transitionType: transitionType,
          rainTier: activeRainInfo ? activeRainInfo.tier : null,
          rainLabel: activeRainInfo ? activeRainInfo.label : null,
          rainNote: activeRainInfo ? activeRainInfo.primaryNote : null,
          rainMm: activeRainInfo ? activeRainInfo.mm : (dataType === "rainfall" ? rawVal : 0),
          rainThunder: activeRainInfo ? activeRainInfo.isThunder : false,
          isFirstOfMonth: isFirstOfMonth
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
    this.lastCategory = null;
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
    this.lastCategory = null;
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
    if (this.onStepCallback && this.data && this.data.dates.length > 0) {
      const firstVal = this.data.values[0];
      const firstCat = this.data.data_type === "temperature" ? this.getTemperatureCategory(firstVal) : null;
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
        isTransition: false,
        transitionType: null,
        isFirstOfMonth: false
      });
    }
  }

  /**
   * Jump playhead to specific day index (0 to 365).
   */
  async seek(index) {
    if (!this.data || index < 0 || index >= this.data.dates.length) return;
    this.currentIndex = index;
    if (!this.isInitialized) {
      try {
        await this.initAudioContext();
        if (window.Tone && Tone.context && Tone.context.state !== "running") {
          await Tone.context.resume();
        }
      } catch (_) {}
    }
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
    try {
      if (Tone.getDestination()) {
        Tone.getDestination().volume.value = db;
      }
    } catch (_) {}
    if (this.nativeAudio) {
      const linearGain = Math.max(0, Math.min(1.0, Math.pow(10, db / 20)));
      this.nativeAudio.setVolume(linearGain);
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
