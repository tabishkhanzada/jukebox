# 🎨 The Earth Information Jukebox — Design System & UI Specification

**Project:** NASA Space Apps Challenge  
**Target:** Visual Designers, UI/UX Engineers & Frontend Developers  
**Design Philosophy:** Precision Observatory Glassmorphism & High-Contrast Atmospheric Telemetry

---

## 1. Visual Identity & Aesthetic Principles

### The "Deep Space Observatory" Motif
The UI is inspired by modern space control consoles (NASA Goddard, James Webb Space Telescope control rooms) merged with accessible, modern consumer audio interfaces (Ableton, Teenage Engineering, Apple Music).

* **Atmospheric Depth:** Deep void backgrounds (`#060911`) layered with subtle cosmic radial glows.
* **Tactile Glassmorphism:** Translucent slate cards (`rgba(15, 23, 42, 0.75)`) with backdrop blur (`blur(14px)`) and fine border highlights (`rgba(255, 255, 255, 0.08)`).
* **Radiant Telemetry Accents:** High-contrast neon cyan (`#38bdf8`) for rainfall and telemetry indicators; glowing electric amber (`#f59e0b` / `#ea580c`) for heat and playhead indicators.
* **Strict Anti-Slop Discipline:** Every control has a purpose. No generic AI card clutter. Clear spatial hierarchy, clean typographic scale, and accessible contrast ratios (WCAG AAA compliant).

---

## 2. Design Tokens

### Color Palette

| Token Name | Hex / RGBA | Usage |
|---|---|---|
| `--bg-deep` | `#060911` | Primary viewport background |
| `--bg-card` | `rgba(15, 23, 42, 0.75)` | Glassmorphic card surfaces |
| `--bg-card-hover` | `rgba(30, 41, 59, 0.85)` | Active/hovered card states |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard card and separator borders |
| `--border-highlight`| `rgba(56, 189, 248, 0.3)` | Active input and selection borders |
| `--text-primary` | `#f8fafc` | Headings, active values, primary labels |
| `--text-secondary` | `#94a3b8` | Subtitles, parameter names, helper text |
| `--text-muted` | `#64748b` | Units, fine timestamps, footnotes |
| `--accent-cyan` | `#38bdf8` | Neon telemetry, precipitation, active pills |
| `--accent-amber` | `#f59e0b` | Temperature warm peaks, primary Play button |
| `--accent-warm` | `#ea580c` | Heatwave indicators, peak records |
| `--accent-emerald` | `#10b981` | Real-time live datastream status dot |
| `--accent-violet` | `#8b5cf6` | AI science brief button and container |

### Typography Scale

* **Display / Brand Font:** `Space Grotesk` (700 bold, 500 medium) — geometric, technical, space-grade.
* **Body / Interface Font:** `Inter` (400 regular, 500 medium, 600 semi-bold) — legible at small sizes.
* **Telemetry / Data Font:** `JetBrains Mono` (400 regular, 700 bold) — tabular, mono-spaced digits that do not shift width during live playback.

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: 'Space Grotesk', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

---

## 3. Screen Layout & Wireframe Grid

```
+-----------------------------------------------------------------------------------------+
| [NASA Dot] NASA SPACE APPS CHALLENGE                       [🗺️ Map] [📥 CSV] [🔴 Audio] ● LIVE|
| The Earth Information Jukebox                                                           |
| Translating NASA Earth Observation satellite telemetry into dynamic music & charts      |
+-----------------------------------------------------------------------------------------+
| CONTROL DECK                                                                            |
| 📍 Target Location       📡 Climate Metric            📅 Observation Year    [⚡ Ingest]  |
| [ Karachi (Pakistan) ▼]  (●) Temp  ( ) Rain  ( ) Wind [ 2024 ▼ ]                        |
|                                                                                         |
| AUDIO SETTINGS                                                                          |
| Scale: [Major Pentatonic ▼]  Timbre: [Space Synth ▼]  Pitch: [Planetary True °C ▼]      |
| [x] Dual-Track (Layer Rain Beat)   Tempo: [====|===] 1.0x   Volume: [=======|] -3dB     |
+-----------------------------------------------------------------------------------------+
| TELEMETRY HUD (4 CARDS)                                                                 |
| +-----------------+  +-----------------+  +-----------------+  +----------------------+ |
| | CALENDAR DATE   |  | TELEMETRY VALUE |  | SYNTHESIZED NOTE|  | RESONANCE VISUALIZER | |
| | 2024-06-29      |  | 33.54 °C        |  | A5  (880 Hz)    |  |  ( ( ( ● ) ) )       | |
| | Day 181 / 366   |  | Extreme Heat    |  | Treble Register |  |  Orbital particles   | |
| +-----------------+  +-----------------+  +-----------------+  +----------------------+ |
+-----------------------------------------------------------------------------------------+
| MAIN TIMELINE & CHART VIEWPORT                                                          |
| Karachi — Daily Air Temperature (2024) [Arid / Subtropical]    [ ▶ PLAY ] [ ⏸ ] [ ⏮ ]  |
|                                                                                         |
|   40°C |                                   /\_/\                                        |
|   30°C |                 _/\__/\_         /     \                                       |
|   20°C |   ___/\_/\_/\__/        \_______/       \__/\                                  |
|   10°C | _/                                           \_____/\                          |
|    0°C |___________________________|___________________________                         |
|         Jan   Feb   Mar   Apr   May | Jun   Jul   Aug   Sep   Oct   Nov   Dec           |
|                                     ^ Glowing Playhead Needle                           |
| 💡 Click anywhere on the chart timeline to scrub audio and inspect specific calendar dates|
+-----------------------------------------------------------------------------------------+
| INTELLIGENCE & ANALYTICAL STORYBOARD                                                    |
| +--------------------------------------+ +--------------------------------------------+ |
| | 📊 Telemetry Statistics              | | 🧠 Climate Intelligence Story  [✨ AI Brief]| |
| | Mean: 26.6°C     Peak: 33.54°C       | | In 2024, Karachi experienced an average    | |
| | Min: 16.14°C     Range: 17.4°C       | | temperature of 26.6°C. The hottest day...  | |
| | Heat Days (>35C): 0  Dry Spell: 42d  | | Key: High Pitch = Hot | Drums = Rain       | |
| +--------------------------------------+ +--------------------------------------------+ |
+-----------------------------------------------------------------------------------------+
| FOOTER: NASA Langley Research Center POWER Project Credit | Space Apps | Shortcuts: [?] |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Micro-Interactions & Animation Specs

1. **Live Playhead Needle:**
   * Moves at **60 FPS** in hardware-accelerated canvas.
   * Glow effect: `shadowColor: #0ea5e9`, `shadowBlur: 14px`, stroke width `2.5px`.
   * Center ring: White dot with blue stroke pulsing on each note.

2. **Resonance Visualizer:**
   * Concentric orbital ring expanding by note velocity: `baseRadius = 28 + energy * 18`.
   * Emission particles radiating outward, decaying smoothly with alpha fade.

3. **Transport Play Button:**
   * Amber gradient in standby (`linear-gradient(135deg, #f59e0b, #ea580c)`).
   * Shifts to neon blue (`linear-gradient(135deg, #0284c7, #2563eb)`) when in active playback.

4. **Recording State:**
   * The audio download button displays a pulsing red recording dot (`@keyframes pulse-red`) while capturing the Web Audio buffer.

---

## 5. Responsive Breakpoint Rules

* **Desktop Wide ($\ge 1024\text{ px}$):** Full 4-column HUD, dual-column intelligence storyboard, wide 380px chart viewport.
* **Tablet ($768\text{ px} - 1023\text{ px}$):** 2x2 HUD grid, stacked intelligence storyboard cards, full-width controls.
* **Mobile ($< 768\text{ px}$):**
  * Controls deck stacks into vertical groups.
  * HUD displays 2 key metrics per row.
  * Chart viewport scales to 280px height with horizontal touch scrubbing.
  * Map drawer full width with touch pinch-to-zoom.

---

## 6. Accessibility (WCAG AAA) Standards

* **Screen Readers:** Telemetry values include live announcements (`aria-live="polite"`).
* **Keyboard Navigation:**
  * `Space`: Play / Pause.
  * `Left / Right Arrow`: Seek timeline by 5 days.
  * `R`: Reset to January 1st.
  * `M`: Toggle Global Map.
* **High-Contrast Ratio:** Text on glass card exceeds $7:1$ contrast against dark void background.

