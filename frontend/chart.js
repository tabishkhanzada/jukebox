/**
 * NASA Earth Information Jukebox - Synchronized Visualizer & Chart Engine
 * Module 4: High-performance Chart.js dual-axis telemetry timeline,
 * decoupled 60fps liquid sub-frame playhead interpolation, click/drag timeline scrubbing,
 * and audio-reactive particle visualizer.
 */

class ClimateChartEngine {
  constructor(canvasId, visualizerCanvasId) {
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    this.chart = null;

    // Timeline telemetry state
    this.currentDataset = null;
    this.secondaryDataset = null;
    this.dualAxisEnabled = false;

    // Playhead tracking & 60 FPS sub-frame interpolation
    this.currentStepIndex = 0;
    this.stepStartTime = performance.now();
    this.stepDurationMs = 90;
    this.isPlaying = false;
    this.activeCategoryColor = "#ff5722";
    this.smoothX = null;
    this.smoothY = null;

    // Dedicated high-performance 60fps overlay canvas
    this.overlayCanvas = null;
    this.overlayCtx = null;
    this.animFrameId = null;

    // Static Chart.js Guide Plugin (Thermal Boundaries)
    this.thresholdPlugin = {
      id: "thermalThresholdGuides",
      afterDraw: (chart) => {
        if (!this.currentDataset || this.currentDataset.data_type !== "temperature" || !chart.scales.y) return;
        const ctx = chart.ctx;
        const topY = chart.chartArea.top;
        const bottomY = chart.chartArea.bottom;
        const leftX = chart.chartArea.left;
        const rightX = chart.chartArea.right;

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.font = "9px 'JetBrains Mono', monospace";

        // 20°C Line: Sardi (Cold) Boundary
        const y20 = chart.scales.y.getPixelForValue(20);
        if (y20 >= topY && y20 <= bottomY) {
          ctx.beginPath();
          ctx.moveTo(leftX, y20);
          ctx.lineTo(rightX, y20);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.40)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "#38bdf8";
          ctx.fillText("20°C SARDI", rightX - 65, y20 - 3);
        }

        // 26°C Line: Garmi (Hot) Boundary
        const y26 = chart.scales.y.getPixelForValue(26);
        if (y26 >= topY && y26 <= bottomY) {
          ctx.beginPath();
          ctx.moveTo(leftX, y26);
          ctx.lineTo(rightX, y26);
          ctx.strokeStyle = "rgba(239, 68, 68, 0.40)";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = "#ef4444";
          ctx.fillText("26°C GARMI", rightX - 65, y26 - 3);
        }
        ctx.restore();
      }
    };
    Chart.register(this.thresholdPlugin);

    // Ambient Audio Pulse Visualizer Canvas
    this.visCanvas = visualizerCanvasId ? document.getElementById(visualizerCanvasId) : null;
    this.visCtx = this.visCanvas ? this.visCanvas.getContext("2d") : null;
    this.pulseEnergy = 0;
    this.visParticles = [];
    this.initVisualizer();

    // Setup high-refresh overlay canvas and event handlers
    this.setupOverlayCanvas();
    this.attachEventListeners();
    this.startAnimationLoop();
  }

  /**
   * Builds or binds dedicated transparent overlay canvas directly on top of Chart.js.
   */
  setupOverlayCanvas() {
    let overlay = document.getElementById("climateChartOverlay");
    if (!overlay && this.canvas && this.canvas.parentElement) {
      overlay = document.createElement("canvas");
      overlay.id = "climateChartOverlay";
      overlay.className = "hero-chart-overlay";
      this.canvas.parentElement.appendChild(overlay);
    }
    this.overlayCanvas = overlay;
    if (this.overlayCanvas) {
      this.overlayCtx = this.overlayCanvas.getContext("2d");
      this.syncOverlaySize();
    }
  }

  /**
   * Synchronizes overlay canvas dimensions and DPI with Chart.js canvas.
   */
  syncOverlaySize() {
    if (!this.canvas || !this.overlayCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w <= 0 || h <= 0) return;

    this.overlayCanvas.style.left = `${this.canvas.offsetLeft}px`;
    this.overlayCanvas.style.top = `${this.canvas.offsetTop}px`;
    this.overlayCanvas.style.width = `${w}px`;
    this.overlayCanvas.style.height = `${h}px`;

    this.overlayCanvas.width = Math.round(w * dpr);
    this.overlayCanvas.height = Math.round(h * dpr);

    if (this.overlayCtx) {
      this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /**
   * Attaches interactive click-to-seek and smooth scrub-drag listeners.
   */
  attachEventListeners() {
    if (!this.canvas) return;

    let isDragging = false;

    const seekToPoint = (evt) => {
      if (!this.chart || !this.currentDataset) return;
      const chartArea = this.chart.chartArea;
      if (!chartArea) return;

      const rect = this.canvas.getBoundingClientRect();
      const clientX = evt.clientX - rect.left;

      const clampedX = Math.max(chartArea.left, Math.min(chartArea.right, clientX));
      const width = chartArea.right - chartArea.left;
      if (width <= 0) return;

      const ratio = (clampedX - chartArea.left) / width;
      const totalPoints = this.currentDataset.dates.length;
      const targetIndex = Math.max(0, Math.min(totalPoints - 1, Math.round(ratio * (totalPoints - 1))));

      // Zero-lag visual snap
      this.currentStepIndex = targetIndex;
      this.stepStartTime = performance.now();
      const meta = this.chart.getDatasetMeta(0);
      if (meta && meta.data && meta.data[targetIndex]) {
        this.smoothX = meta.data[targetIndex].x;
        this.smoothY = meta.data[targetIndex].y;
      }

      if (window.earthSonifier) {
        window.earthSonifier.seek(targetIndex);
      }
    };

    this.canvas.addEventListener("pointerdown", (evt) => {
      isDragging = true;
      try { this.canvas.setPointerCapture(evt.pointerId); } catch (_) {}
      seekToPoint(evt);
    });

    this.canvas.addEventListener("pointermove", (evt) => {
      if (isDragging) {
        seekToPoint(evt);
      }
    });

    const stopDragging = (evt) => {
      if (isDragging) {
        isDragging = false;
        try { this.canvas.releasePointerCapture(evt.pointerId); } catch (_) {}
      }
    };

    this.canvas.addEventListener("pointerup", stopDragging);
    this.canvas.addEventListener("pointercancel", stopDragging);

    window.addEventListener("resize", () => {
      this.syncOverlaySize();
    });
  }

  /**
   * Render or update dataset inside Chart.js with authentic Dual-Axis overlay.
   */
  renderDataset(earthData, secondaryData = null, showDual = false) {
    this.currentDataset = earthData;
    this.secondaryDataset = secondaryData;
    this.dualAxisEnabled = showDual && secondaryData !== null;
    this.currentStepIndex = 0;
    this.stepStartTime = performance.now();
    this.smoothX = null;
    this.smoothY = null;
    this.isPlaying = false;

    const ctx = this.canvas.getContext("2d");
    const isRainfall = earthData.data_type === "rainfall";
    const canvasHeight = this.canvas.clientHeight || 350;

    // Setup color gradients
    let gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    if (isRainfall) {
      gradient.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      gradient.addColorStop(1, "rgba(2, 132, 199, 0.01)");
    } else {
      gradient.addColorStop(0, "rgba(255, 87, 34, 0.45)");
      gradient.addColorStop(0.5, "rgba(234, 88, 12, 0.15)");
      gradient.addColorStop(1, "rgba(255, 87, 34, 0.00)");
    }

    // Chart.js labels (Clean month tags)
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const formattedLabels = earthData.dates.map((d, i) => {
      if (d.endsWith("-01") || i === 0 || i === earthData.dates.length - 1) {
        const parts = d.split("-");
        const mIdx = parseInt(parts[1], 10) - 1;
        return monthNames[mIdx] || parts[1];
      }
      return "";
    });

    // Primary Dataset
    const datasets = [
      {
        type: isRainfall ? "bar" : "line",
        label: `${earthData.parameter_name} (${earthData.unit})`,
        data: earthData.values,
        borderColor: isRainfall ? "#38bdf8" : "#ff5722",
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "#ffffff",
        pointHoverBorderColor: "#ff5722",
        yAxisID: "y"
      }
    ];

    // Optional Secondary Dataset (Dual-Axis)
    if (this.dualAxisEnabled && this.secondaryDataset) {
      datasets.push({
        type: "bar",
        label: `${this.secondaryDataset.parameter_name} (${this.secondaryDataset.unit})`,
        data: this.secondaryDataset.values,
        backgroundColor: "rgba(56, 189, 248, 0.35)",
        borderColor: "rgba(56, 189, 248, 0.75)",
        borderWidth: 1,
        yAxisID: "y1",
        pointRadius: 0
      });
    }

    const minVal = Math.min(...earthData.values);
    const maxVal = Math.max(...earthData.values);
    const valRange = Math.max(5, maxVal - minVal);
    const padding = valRange * 0.15;

    const scalesConfig = {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
          drawBorder: false
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.6)",
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          maxRotation: 0,
          autoSkip: false
        }
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        suggestedMin: Math.floor(minVal - padding),
        suggestedMax: Math.ceil(maxVal + padding),
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
          drawBorder: false
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          maxTicksLimit: 6,
          callback: (val) => `${val}${earthData.unit === '°C' ? '°' : ' ' + earthData.unit}`
        }
      }
    };

    if (this.dualAxisEnabled && this.secondaryDataset) {
      scalesConfig.y1 = {
        type: "linear",
        display: true,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: {
          color: "#38bdf8",
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          maxTicksLimit: 6,
          callback: (val) => `${val} mm`
        }
      };
    }

    const chartConfig = {
      type: isRainfall ? "bar" : "line",
      data: {
        labels: formattedLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 250,
          onComplete: () => {
            this.syncOverlaySize();
          }
        },
        interaction: {
          intersect: false,
          mode: "index"
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: "rgba(10, 10, 14, 0.95)",
            titleColor: "#ff7043",
            titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
            bodyColor: "#ffffff",
            bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
            borderColor: "rgba(255, 87, 34, 0.4)",
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return `UTC DATE: ${earthData.dates[idx]}`;
              }
            }
          }
        },
        scales: scalesConfig
      }
    };

    if (this.chart) {
      this.chart.destroy();
    }
    this.chart = new Chart(ctx, chartConfig);
    this.syncOverlaySize();
  }

  /**
   * Updates scrubber tracking state on each audio note step without invoking chart.update()!
   * The decoupled 60fps rAF loop glides smoothly between steps with zero main-thread lag.
   */
  updateScrubber(index, note, frequency, categoryColor = null, stepMs = 90, isPlaying = true) {
    this.currentStepIndex = index;
    this.stepStartTime = performance.now();
    this.stepDurationMs = stepMs;
    this.isPlaying = isPlaying;

    if (categoryColor) {
      this.activeCategoryColor = categoryColor;
    }

    // Trigger visualizer ripple
    if (frequency > 0) {
      this.pulseEnergy = Math.min(1.0, this.pulseEnergy + 0.35);
      this.emitParticle(frequency);
    }
  }

  /**
   * Sets transport playback state for pause/resume interpolation.
   */
  setPlaybackState(isPlaying) {
    this.isPlaying = isPlaying;
    if (!isPlaying) {
      this.stepDurationMs = 0;
    } else {
      this.stepStartTime = performance.now();
    }
  }

  /**
   * Starts high-refresh requestAnimationFrame render loop for buttery 60+ FPS motion.
   */
  startAnimationLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    const loop = () => {
      this.renderScrubberFrame();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Decoupled 60 FPS Sub-Frame Playhead Interpolator.
   * Renders vertical glowing laser beam, luminous tracking bead, and pulse ripples.
   */
  renderScrubberFrame() {
    if (!this.overlayCtx || !this.overlayCanvas || !this.chart) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w <= 0 || h <= 0) return;

    // Keep overlay canvas matching device pixels
    if (this.overlayCanvas.width !== Math.round(w * (window.devicePixelRatio || 1))) {
      this.syncOverlaySize();
    }

    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, w, h);

    const meta = this.chart.getDatasetMeta(0);
    const chartArea = this.chart.chartArea;
    if (!meta || !meta.data || meta.data.length === 0 || !chartArea) return;

    const topY = chartArea.top;
    const bottomY = chartArea.bottom;
    const leftX = chartArea.left;
    const rightX = chartArea.right;

    const totalPoints = meta.data.length;
    const idx0 = Math.max(0, Math.min(totalPoints - 1, this.currentStepIndex));
    const p0 = meta.data[idx0];
    if (!p0) return;

    let targetX = p0.x;
    let targetY = p0.y;

    // Sub-frame linear time interpolation between point[i] and point[i+1]
    if (this.isPlaying && this.stepDurationMs > 0) {
      const idx1 = Math.min(totalPoints - 1, idx0 + 1);
      const p1 = meta.data[idx1] || p0;
      const elapsed = performance.now() - this.stepStartTime;
      const progress = Math.min(1.0, Math.max(0.0, elapsed / this.stepDurationMs));

      targetX = p0.x + (p1.x - p0.x) * progress;
      targetY = p0.y + (p1.y - p0.y) * progress;
    }

    // Direct continuous glide
    this.smoothX = targetX;
    this.smoothY = targetY;

    const currentX = Math.max(leftX, Math.min(rightX, this.smoothX));
    const currentY = Math.max(topY, Math.min(bottomY, this.smoothY));
    const activeColor = this.activeCategoryColor || "#ff5722";

    ctx.save();

    // 1. Glowing Laser Vertical Scrubber Beam
    ctx.beginPath();
    ctx.moveTo(currentX, topY);
    ctx.lineTo(currentX, bottomY);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Crisp White Inner Core Line
    ctx.beginPath();
    ctx.moveTo(currentX, topY);
    ctx.lineTo(currentX, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.shadowBlur = 0;
    ctx.stroke();

    // 2. Audio-reactive expanding sonar pulse when playing
    if (this.isPlaying) {
      const pulsePhase = (performance.now() % 1000) / 1000;
      const rippleR = 5 + pulsePhase * 18;
      const rippleAlpha = Math.max(0, 1 - pulsePhase);

      ctx.beginPath();
      ctx.arc(currentX, currentY, rippleR, 0, 2 * Math.PI);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = activeColor;
      ctx.globalAlpha = rippleAlpha * 0.7;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // 3. Glowing Tracking Bead on the telemetry curve
    // Outer halo
    ctx.beginPath();
    ctx.arc(currentX, currentY, 6.5, 0, 2 * Math.PI);
    ctx.fillStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 14;
    ctx.fill();

    // Inner bright white nucleus
    ctx.beginPath();
    ctx.arc(currentX, currentY, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "#ffffff";
    ctx.fill();

    // 4. Sleek Futuristic Floating Micro-Badge above playhead
    if (this.currentDataset && this.currentDataset.values && this.currentDataset.values[idx0] !== undefined) {
      const val = this.currentDataset.values[idx0];
      const unit = this.currentDataset.unit === "°C" ? "°" : " " + this.currentDataset.unit;
      const badgeText = `${val.toFixed(1)}${unit}`;

      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 10;
      const badgeH = 15;
      const badgeX = Math.max(leftX, Math.min(rightX - badgeW, currentX - badgeW / 2));
      const badgeY = Math.max(topY + 2, Math.min(bottomY - badgeH - 2, currentY - 22));

      ctx.fillStyle = "rgba(10, 14, 24, 0.88)";
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 1;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 0;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
    }

    ctx.restore();
  }

  // --- Ambient Particle & Frequency Visualizer ---
  initVisualizer() {
    if (!this.visCanvas || !this.visCtx) return;

    const resizeVis = () => {
      this.visCanvas.width = this.visCanvas.offsetWidth * window.devicePixelRatio;
      this.visCanvas.height = this.visCanvas.offsetHeight * window.devicePixelRatio;
    };
    window.addEventListener("resize", resizeVis);
    resizeVis();

    const animate = () => {
      this.renderVisualizerFrame();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  emitParticle(freq) {
    if (!this.visCanvas) return;
    const w = this.visCanvas.width;
    const h = this.visCanvas.height;
    this.visParticles.push({
      x: w / 2 + (Math.random() - 0.5) * 40,
      y: h / 2,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      radius: Math.max(2, (freq / 600) * 8),
      alpha: 1.0,
      hue: Math.floor((freq % 400) + 160)
    });

    if (this.visParticles.length > 50) {
      this.visParticles.shift();
    }
  }

  renderVisualizerFrame() {
    if (!this.visCanvas || !this.visCtx) return;
    const ctx = this.visCtx;
    const w = this.visCanvas.width;
    const h = this.visCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = 28 + this.pulseEnergy * 18;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 + this.pulseEnergy * 0.7})`;
    ctx.lineWidth = 2 + this.pulseEnergy * 3;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 15;
    ctx.stroke();

    this.pulseEnergy *= 0.92;

    for (let i = this.visParticles.length - 1; i >= 0; i--) {
      const p = this.visParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha *= 0.95;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
      ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.alpha})`;
      ctx.shadowColor = `hsl(${p.hue}, 90%, 65%)`;
      ctx.shadowBlur = 8;
      ctx.fill();

      if (p.alpha < 0.05) {
        this.visParticles.splice(i, 1);
      }
    }
    ctx.restore();
  }
}

window.ClimateChartEngine = ClimateChartEngine;
