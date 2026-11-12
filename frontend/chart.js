/**
 * NASA Earth Information Jukebox - Synchronized Visualizer & Chart Engine
 * Module 4: High-performance Chart.js dual-axis rendering, zero-lag playhead tracking,
 * click-to-seek timeline scrubbing, and audio-reactive particle visualizer.
 */

class ClimateChartEngine {
  constructor(canvasId, visualizerCanvasId) {
    this.canvas = document.getElementById(canvasId);
    this.chart = null;
    this.activeIndex = 0;
    this.activeCategoryColor = "#ff5722";
    this.currentDataset = null;
    this.secondaryDataset = null;
    this.dualAxisEnabled = false;

    // Ambient Audio Pulse Visualizer Canvas
    this.visCanvas = visualizerCanvasId ? document.getElementById(visualizerCanvasId) : null;
    this.visCtx = this.visCanvas ? this.visCanvas.getContext("2d") : null;
    this.pulseEnergy = 0;
    this.visParticles = [];
    this.initVisualizer();

    // Chart.js Custom Scrubber Plugin
    this.scrubberPlugin = {
      id: "verticalScrubber",
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const topY = chart.chartArea.top;
        const bottomY = chart.chartArea.bottom;
        const leftX = chart.chartArea.left;
        const rightX = chart.chartArea.right;

        // Draw 3-Zone Thermal Category Threshold Guides for Temperature
        if (this.currentDataset && this.currentDataset.data_type === "temperature" && chart.scales.y) {
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.font = "9px 'JetBrains Mono', monospace";

          // 20°C Line: Sardi (Cold) Boundary
          const y20 = chart.scales.y.getPixelForValue(20);
          if (y20 >= topY && y20 <= bottomY) {
            ctx.beginPath();
            ctx.moveTo(leftX, y20);
            ctx.lineTo(rightX, y20);
            ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
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
            ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = "#ef4444";
            ctx.fillText("26°C GARMI", rightX - 65, y26 - 3);
          }
          ctx.restore();
        }

        if (this.activeIndex === null || this.activeIndex === undefined) return;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || !meta.data[this.activeIndex]) return;

        const point = meta.data[this.activeIndex];
        const x = point.x;
        const activeColor = this.activeCategoryColor || "#ff5722";

        ctx.save();
        // 1. Draw glowing vertical playhead line
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 12;
        ctx.stroke();

        // 2. Draw glowing tracking ring at data point
        ctx.beginPath();
        ctx.arc(x, point.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.restore();
      }
    };

    Chart.register(this.scrubberPlugin);
    this.attachEventListeners();
  }

  /**
   * Initializes interactive click seeking on the canvas.
   */
  attachEventListeners() {
    if (!this.canvas) return;

    this.canvas.addEventListener("click", (evt) => {
      if (!this.chart || !this.currentDataset) return;
      const points = this.chart.getElementsAtEventForMode(evt, "index", { intersect: false }, true);
      if (points.length > 0) {
        const targetIndex = points[0].index;
        if (window.earthSonifier) {
          window.earthSonifier.seek(targetIndex);
        }
      }
    });
  }

  /**
   * Render or update dataset inside Chart.js with authentic Dual-Axis overlay.
   */
  renderDataset(earthData, secondaryData = null, showDual = false) {
    this.currentDataset = earthData;
    this.secondaryDataset = secondaryData;
    this.dualAxisEnabled = showDual && secondaryData !== null;
    this.activeIndex = 0;

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
        animation: { duration: 400 },
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
   * Update active playhead scrubber position with zero-lag animation override.
   */
  updateScrubber(index, note, frequency, categoryColor = null) {
    this.activeIndex = index;
    if (categoryColor) {
      this.activeCategoryColor = categoryColor;
    }
    if (this.chart) {
      // Direct draw without re-triggering entrance animations
      this.chart.update("none");
    }

    // Trigger visualizer ripple
    if (frequency > 0) {
      this.pulseEnergy = Math.min(1.0, this.pulseEnergy + 0.35);
      this.emitParticle(frequency);
    }
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
