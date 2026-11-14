/**
 * NASA Earth Information Jukebox - Synchronized Visualizer & Chart Engine
 * Module 4: High-performance Chart.js dual-axis telemetry timeline,
 * 60fps liquid playhead tracking with sound, click/drag timeline scrubbing,
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
    this.activeCategoryColor = "#ff7043";
    this.animFrameId = null;

    // Static Chart.js Guide Plugin (Thermal Boundaries for Temperature)
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

    // Chart.js High-Visibility Scrubber Plugin: Moves with sound across the year
    this.scrubberPlugin = {
      id: "verticalScrubber",
      afterDraw: (chart) => {
        if (!this.currentDataset || this.currentStepIndex === null || this.currentStepIndex === undefined) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || meta.data.length === 0 || !chart.chartArea) return;

        const totalPoints = meta.data.length;
        const idx0 = Math.max(0, Math.min(totalPoints - 1, this.currentStepIndex));
        const p0 = meta.data[idx0];
        if (!p0) return;

        const ctx = chart.ctx;
        const topY = chart.chartArea.top;
        const bottomY = chart.chartArea.bottom;
        const leftX = chart.chartArea.left;
        const rightX = chart.chartArea.right;

        let targetX = p0.x;
        let targetY = p0.y;

        // Sub-frame linear time interpolation when playing for 60fps butter-smooth glide
        if (this.isPlaying && this.stepDurationMs > 0) {
          const idx1 = Math.min(totalPoints - 1, idx0 + 1);
          const p1 = meta.data[idx1] || p0;
          const elapsed = performance.now() - this.stepStartTime;
          const progress = Math.min(1.0, Math.max(0.0, elapsed / this.stepDurationMs));
          targetX = p0.x + (p1.x - p0.x) * progress;
          targetY = p0.y + (p1.y - p0.y) * progress;
        }

        const currentX = Math.max(leftX, Math.min(rightX, targetX));
        const currentY = Math.max(topY, Math.min(bottomY, targetY));
        const activeColor = this.activeCategoryColor || (this.currentDataset.data_type === "rainfall" ? "#38bdf8" : "#ff7043");

        ctx.save();

        // 1. Glowing Vertical Scrubber Line moving with the sound across the year
        ctx.beginPath();
        ctx.moveTo(currentX, topY);
        ctx.lineTo(currentX, bottomY);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Crisp White Inner Core Line (Ultra visible & sharp)
        ctx.beginPath();
        ctx.moveTo(currentX, topY);
        ctx.lineTo(currentX, bottomY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.shadowBlur = 0;
        ctx.stroke();

        // 2. Audio-reactive expanding sonar pulse when playing
        if (this.isPlaying) {
          const pulsePhase = (performance.now() % 1000) / 1000;
          const rippleR = 5 + pulsePhase * 16;
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
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(currentX, currentY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 0;
        ctx.fill();

        // 4. Sleek Futuristic Floating Micro-Badge above playhead showing which part of year is playing
        if (this.currentDataset && this.currentDataset.dates && this.currentDataset.dates[idx0]) {
          const dateStr = this.currentDataset.dates[idx0]; // e.g. "2024-02-10"
          const dateParts = dateStr.split("-");
          const mNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const monthStr = mNames[parseInt(dateParts[1], 10) - 1] || dateParts[1];
          const dayStr = dateParts[2];
          const val = this.currentDataset.values[idx0];
          const unit = this.currentDataset.unit === "°C" ? "°" : " " + this.currentDataset.unit;
          const badgeText = `${dayStr} ${monthStr} • ${val !== undefined ? val.toFixed(1) : ''}${unit}`;

          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          const textWidth = ctx.measureText(badgeText).width;
          const badgeW = textWidth + 12;
          const badgeH = 16;
          const badgeX = Math.max(leftX, Math.min(rightX - badgeW, currentX - badgeW / 2));
          const badgeY = topY + 4;

          ctx.fillStyle = "rgba(6, 10, 20, 0.92)";
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
    };

    Chart.register(this.thresholdPlugin);
    Chart.register(this.scrubberPlugin);

    // Ambient Audio Pulse Visualizer Canvas
    this.visCanvas = visualizerCanvasId ? document.getElementById(visualizerCanvasId) : null;
    this.visCtx = this.visCanvas ? this.visCanvas.getContext("2d") : null;
    this.pulseEnergy = 0;
    this.visParticles = [];
    this.initVisualizer();

    this.attachEventListeners();
    this.startAnimationLoop();
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
      if (this.chart) {
        this.chart.draw();
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
          color: "rgba(56, 189, 248, 0.8)",
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          maxTicksLimit: 5,
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
        animation: false, // Instant zero-lag drawing
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
  }

  /**
   * Updates scrubber tracking state on each audio note step.
   * Directly redraws the line on the graph synchronized with the sound!
   */
  updateScrubber(index, note, frequency, categoryColor = null, stepMs = 90, isPlaying = true) {
    this.currentStepIndex = index;
    this.stepStartTime = performance.now();
    this.stepDurationMs = stepMs;
    this.isPlaying = isPlaying;

    if (categoryColor) {
      this.activeCategoryColor = categoryColor;
    }

    if (this.chart) {
      this.chart.draw();
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
    if (this.chart) {
      this.chart.draw();
    }
  }

  /**
   * Starts high-refresh requestAnimationFrame render loop for buttery 60+ FPS motion while playing.
   */
  startAnimationLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    const loop = () => {
      if (this.isPlaying && this.chart) {
        this.chart.draw();
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
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
      radius: Math.random() * 2.5 + 1.5,
      alpha: 1,
      color: `hsl(${Math.min(360, (freq / 1000) * 260 + 180)}, 90%, 65%)`
    });
  }

  renderVisualizerFrame() {
    if (!this.visCanvas || !this.visCtx) return;
    const ctx = this.visCtx;
    const w = this.visCanvas.width;
    const h = this.visCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.pulseEnergy > 0.01) {
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = 35;

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.3 + this.pulseEnergy * 0.7})`;
      ctx.lineWidth = 2 + this.pulseEnergy * 3;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 15;
      ctx.stroke();

      this.pulseEnergy *= 0.93;
    }

    for (let i = this.visParticles.length - 1; i >= 0; i--) {
      const p = this.visParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;

      if (p.alpha <= 0) {
        this.visParticles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

// Export singleton class
window.ClimateChartEngine = ClimateChartEngine;
