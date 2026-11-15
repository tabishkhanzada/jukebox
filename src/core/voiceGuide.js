// voiceGuide.js — spoken audio navigation guide for blind and low-vision users.
// Uses native Web Speech API (speechSynthesis) to speak controls, keyboard shortcuts, and channel descriptions.
// Activated via Voice Guide button in the topbar or pressing shortcut key 'H'.

const SCRIPT = `Welcome to Earth Information Jukebox, an accessible audio observatory for NASA satellite data.
Here is how to navigate this software with your keyboard:
Press Space to play or pause the audio sonification.
Press G to generate and reload the soundscape.
Press M to mute or unmute the audio.
Press Left or Right Arrow keys while paused to step across the 32 spatial scan strips.
Press number keys 1 through 4 to switch video channels: 1 for Air Quality, 2 for Near-surface Wind, 3 for Carbon Dioxide, and 4 for Deep Space Stars.
Press number keys 5 through 8 to switch satellite map layers: 5 for Sea Surface Temperature, 6 for Precipitation Rain and Snow, 7 for Aerosol Optical Depth, and 8 for Vegetation Index.
Press H at any time to pause or replay this voice guide.
Press Space now to start listening to the planet.`;

export class VoiceGuide {
  constructor({ onStateChange } = {}) {
    this.speaking = false;
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.onStateChange = onStateChange;
  }

  get isSupported() {
    return !!this.synth;
  }

  toggle() {
    if (!this.synth) return false;
    if (this.speaking || this.synth.speaking) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  start() {
    if (!this.synth) return;
    this.synth.cancel();
    const utt = new SpeechSynthesisUtterance(SCRIPT);
    utt.rate = 0.95;
    utt.pitch = 1.0;
    utt.lang = 'en-US';

    this.speaking = true;
    this.onStateChange?.(true);

    utt.onstart = () => {
      this.speaking = true;
      this.onStateChange?.(true);
    };

    utt.onend = () => {
      this.speaking = false;
      this.onStateChange?.(false);
    };

    utt.onerror = () => {
      this.speaking = false;
      this.onStateChange?.(false);
    };

    this.synth.speak(utt);
  }

  speak(text) {
    if (!this.synth) return;
    this.synth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0;
    utt.pitch = 1.0;
    utt.lang = 'en-US';
    this.synth.speak(utt);
  }

  stop() {
    if (!this.synth) return;
    this.synth.cancel();
    this.speaking = false;
    this.onStateChange?.(false);
  }
}

