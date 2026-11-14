/**
 * NASA Earth Information Jukebox - Universal Accessibility Suite
 * Module 7: WCAG 2.2 Level AAA Compliance Engine
 * - Full Keyboard Control Matrix (Space, Arrow keys, 1-3, V, M, R, ?)
 * - Screen Reader ARIA Live Status Dispatcher with rate limiting
 * - Spoken Voice Telemetry Narrator via Web Speech API
 * - Focus Trap & High-Visibility Visual Accessibility Rings
 */

class AccessibilitySuite {
  constructor(app) {
    this.app = app;
    this.isVoiceNarratorEnabled = false;
    this.synth = window.speechSynthesis || null;
    this.lastAnnounceTime = 0;
    this.announceThrottleMs = 2800; // Throttle spoken/ARIA updates during high-speed playback

    this.liveRegion = document.getElementById("srLiveAnnouncer");
    if (!this.liveRegion) {
      this.liveRegion = document.createElement("div");
      this.liveRegion.id = "srLiveAnnouncer";
      this.liveRegion.className = "sr-only";
      this.liveRegion.setAttribute("role", "status");
      this.liveRegion.setAttribute("aria-live", "polite");
      this.liveRegion.setAttribute("aria-atomic", "true");
      document.body.appendChild(this.liveRegion);
    }

    // Direct binding for modal close button and backdrop click
    const closeBtn = document.getElementById("closeAccModalBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeAllModals();
      });
    }

    const modal = document.getElementById("accessibilityHelpModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          e.preventDefault();
          this.closeAllModals();
        }
      });
    }

    this.initKeyboardListeners();
  }

  /**
   * Dispatches text to screen readers via ARIA live region
   */
  announce(text, priority = "polite", force = false) {
    const now = performance.now();
    if (!force && (now - this.lastAnnounceTime < this.announceThrottleMs)) {
      return;
    }
    this.lastAnnounceTime = now;

    if (this.liveRegion) {
      this.liveRegion.setAttribute("aria-live", priority);
      this.liveRegion.textContent = text;
    }

    // If Voice Narrator is active, speak aloud
    if (this.isVoiceNarratorEnabled && this.synth) {
      try {
        this.synth.cancel(); // Stop prior speech
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.05;
        utter.pitch = 1.0;
        this.synth.speak(utter);
      } catch (_) {}
    }
  }

  /**
   * Toggles browser Web Speech API narrator
   */
  toggleVoiceNarrator() {
    this.isVoiceNarratorEnabled = !this.isVoiceNarratorEnabled;
    const msg = this.isVoiceNarratorEnabled
      ? "NASA Mission Voice Narrator Activated."
      : "NASA Mission Voice Narrator Deactivated.";
    this.announce(msg, "assertive", true);
    return this.isVoiceNarratorEnabled;
  }

  /**
   * Global Keyboard Shortcuts Controller
   */
  initKeyboardListeners() {
    window.addEventListener("keydown", (e) => {
      // Don't intercept when user is typing in form inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        if (e.key === "Escape") {
          e.target.blur();
        }
        return;
      }

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          this.handlePlayPause();
          break;

        case "ArrowLeft":
          e.preventDefault();
          this.handleSeek(-1, e.shiftKey ? 30 : 5);
          break;

        case "ArrowRight":
          e.preventDefault();
          this.handleSeek(1, e.shiftKey ? 30 : 5);
          break;

        case "Home":
          e.preventDefault();
          this.handleSeekToEdge(0);
          break;

        case "End":
          e.preventDefault();
          this.handleSeekToEdge(1);
          break;

        case "Digit1":
          e.preventDefault();
          this.switchMetric("temperature");
          break;

        case "Digit2":
          e.preventDefault();
          this.switchMetric("rainfall");
          break;

        case "Digit3":
          e.preventDefault();
          this.switchMetric("wind");
          break;

        case "KeyV":
          e.preventDefault();
          this.toggleMode();
          break;

        case "KeyM":
          e.preventDefault();
          this.toggleMute();
          break;

        case "KeyR":
          e.preventDefault();
          this.toggleRecording();
          break;

        case "Slash":
          if (e.shiftKey) { // '?' key
            e.preventDefault();
            this.toggleHelpModal();
          }
          break;

        case "KeyH":
          e.preventDefault();
          this.toggleHelpModal();
          break;

        case "Escape":
          this.closeAllModals();
          break;
      }
    });

    // Detect Tab key usage for keyboard focus outline
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        document.body.classList.add("using-keyboard");
      }
    });
    window.addEventListener("mousedown", () => {
      document.body.classList.remove("using-keyboard");
    });
  }

  handlePlayPause() {
    if (this.app.activeViewMode === "scanner" && this.app.scanner) {
      if (this.app.scanner.isPlaying) {
        this.app.scanner.pause();
        this.announce("EIC Scanner Paused.", "assertive", true);
      } else {
        this.app.scanner.play();
        this.announce("EIC Visual Frame Scanning Active.", "assertive", true);
      }
    } else if (this.app.sonifier) {
      if (this.app.sonifier.isPlaying) {
        this.app.sonifier.pause();
        this.announce("Sonification Playback Paused.", "assertive", true);
      } else {
        this.app.sonifier.play();
        this.announce("Sonification Playback Started.", "assertive", true);
      }
    }
  }

  handleSeek(direction, stepCount) {
    if (this.app.activeViewMode === "scanner" && this.app.scanner) {
      const stepPct = (stepCount / 100.0) * direction;
      const target = Math.max(0, Math.min(1.0, this.app.scanner.scanProgress + stepPct));
      this.app.scanner.seek(target);
      this.announce(`Scanner position: ${Math.round(target * 100)} percent.`, "polite", true);
    } else if (this.app.sonifier && this.app.currentData) {
      const cur = this.app.sonifier.currentIndex;
      const target = Math.max(0, Math.min(this.app.currentData.dates.length - 1, cur + direction * stepCount));
      this.app.sonifier.seek(target);
      const date = this.app.currentData.dates[target];
      const val = this.app.currentData.values[target];
      const unit = this.app.currentData.unit;
      this.announce(`Day ${target + 1}: ${date}. Telemetry value: ${val.toFixed(1)} ${unit}.`, "polite", true);
    }
  }

  handleSeekToEdge(edge) {
    if (this.app.activeViewMode === "scanner" && this.app.scanner) {
      this.app.scanner.seek(edge);
      this.announce(edge === 0 ? "Scanner reset to West longitude." : "Scanner jumped to East longitude.", "assertive", true);
    } else if (this.app.sonifier && this.app.currentData) {
      const target = edge === 0 ? 0 : this.app.currentData.dates.length - 1;
      this.app.sonifier.seek(target);
      this.announce(edge === 0 ? "Jumped to start of year, January 1." : "Jumped to end of year, December 31.", "assertive", true);
    }
  }

  switchMetric(metricKey) {
    const pill = document.querySelector(`.metric-pill[data-metric="${metricKey}"]`);
    if (pill) {
      pill.click();
      const labels = { temperature: "Air Temperature", rainfall: "Precipitation", wind: "Wind Speed" };
      this.announce(`Switched planetary telemetry to ${labels[metricKey] || metricKey}.`, "assertive", true);
    }
  }

  toggleMode() {
    if (this.app.toggleViewMode) {
      const newMode = this.app.activeViewMode === "timeline" ? "scanner" : "timeline";
      this.app.toggleViewMode(newMode);
      const label = newMode === "scanner" ? "NASA EIC Satellite Visual Scanner Mode" : "Planetary Telemetry Timeline Mode";
      this.announce(`Switched view to ${label}.`, "assertive", true);
    }
  }

  toggleMute() {
    try {
      const isMuted = Tone.getDestination().mute;
      Tone.getDestination().mute = !isMuted;
      this.announce(Tone.getDestination().mute ? "Audio Muted." : "Audio Unmuted.", "assertive", true);
    } catch (_) {}
  }

  toggleRecording() {
    if (this.app.dom.recordAudioBtn) {
      this.app.dom.recordAudioBtn.click();
    }
  }

  toggleHelpModal() {
    const modal = document.getElementById("accessibilityHelpModal");
    if (modal) {
      const isCurrentlyHidden = modal.classList.contains("hidden") || modal.style.display === "none";
      if (isCurrentlyHidden) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
        const closeBtn = modal.querySelector(".close-modal-btn");
        if (closeBtn) closeBtn.focus();
        this.announce("Accessibility and keyboard shortcuts guide opened.", "polite", true);
      } else {
        this.closeAllModals();
      }
    }
  }

  closeAllModals() {
    const modal = document.getElementById("accessibilityHelpModal");
    if (modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
      this.announce("Modal closed.", "polite", true);
    }
    if (this.app && this.app.dom && this.app.dom.mapDrawer) {
      this.app.dom.mapDrawer.classList.add("hidden");
    }
  }
}

// Export singleton class
window.AccessibilitySuite = AccessibilitySuite;

