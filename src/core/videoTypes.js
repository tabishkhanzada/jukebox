// videoTypes.js — the 4 video types: names, sample files, line timing, caption words and the
// "Colour → number → meaning" rows (build guide, Section 5B; used for caption words — the video values table was
// removed from the page on 2026-11-15).
import { airQualityWords } from '../dsp/airQuality.js';
import { weatherWords } from '../dsp/weather.js';
import { co2Words } from '../dsp/co2.js';

export const VIDEO_TYPES = {
  airQuality: {
    id: 'airQuality', title: 'Air Quality (PM2.5)', sound: 'Wind + Dust', sample: 'samples/videos/air-quality.mp4', file: 'air-quality',
    words: airQualityWords, mask: true,
    sub: 'Darker colour = more fine dust (PM2.5) = louder, rougher wind. Numbers are relative to this video (0 = cleanest, 1 = dustiest).',
    rows: [
      ['#FFF3C8', 'Pale cream', '0.00–0.15', 'clean air'],
      ['#FDD98A', 'Light yellow-orange', '0.15–0.40', 'light haze'],
      ['#F5A54E', 'Orange', '0.40–0.65', 'moderate dust'],
      ['#D7692A', 'Dark orange', '0.65–0.85', 'heavy dust'],
      ['#8A3A12', 'Brown', '0.85–1.00', 'very heavy dust'],
    ],
    swatchNote: 'Swatches are approximate colours of this video; the number is how dark the strip is.',
  },
  weather: {
    id: 'weather', title: 'Weather (Near-surface wind)', sound: 'Wind + Whistle', sample: 'samples/videos/weather.mp4', file: 'weather',
    words: weatherWords, mask: true,
    sub: 'Wind colour strength: dark = calm, blue → cyan → green → yellow → orange → red = strongest. Land (grey/white) is silent.',
    rows: [
      ['#0A1030', 'Dark navy / black', '0', 'calm'],
      ['#2050FF', 'Blue', '≈ 0.17', 'light breeze'],
      ['#00E0FF', 'Cyan', '≈ 0.33', 'light breeze'],
      ['#20E040', 'Green', '≈ 0.56', 'windy'],
      ['#FFE020', 'Yellow', '≈ 0.78', 'strong wind'],
      ['#FF8A00', 'Orange', '≈ 0.89', 'strong wind'],
      ['#FF2010', 'Red', '1', 'storm-force wind'],
      ['#C8C8C8', 'Grey / white (land)', '—', 'ignored (silent)'],
    ],
    swatchNote: 'Number = colour strength before scaling to this video (2nd–98th percentile).',
  },
  co2: {
    id: 'co2', title: 'Carbon Dioxide (CO2)', sound: 'CO2 Hum', sample: 'samples/videos/co2.mp4', file: 'co2',
    words: (a, hh) => co2Words(a, hh), mask: false,
    sub: 'Golden haze = CO2 (thicker and brighter = more) → deeper, louder hum. Orange/red patches = high CO2 → soft crackle. Snow and space are silent.',
    rows: [
      ['#000000', 'Black (space)', '0', 'no CO2 in view (silent)'],
      ['#E8E8E8', 'White / grey (snow, land)', '0', 'not CO2 (silent)'],
      ['#6B5528', 'Dim golden-brown haze', '0.15–0.35', 'thin CO2'],
      ['#C9A040', 'Bright golden haze', '0.35–0.60', 'moderate CO2'],
      ['#FF5A1E', 'Orange / red patches', '0.65–1.00', 'dense CO2, hotspots'],
    ],
    swatchNote: 'Numbers are per pixel before scaling to this video (98th percentile).',
  },
  space: {
    id: 'space', title: 'Space (Stars)', sound: 'Star Twinkle', sample: 'samples/pictures/space-stars-clean.png', file: 'space',
    words: null, mask: false, radar: true,
    sub: 'A radar line turns from the centre. Each star it touches makes a short "tink": higher = farther from the centre, louder = brighter, left/right = where the star is. (New sound, not yet checked by a listener.)',
    rows: [
      ['#FFFFFF', 'Bright star', 'brightness ≥ 0.8', 'loud tink'],
      ['#9AA6C8', 'Faint star', 'brightness 0.5–0.8', 'soft tink'],
      ['#0A0A18', 'Dark sky', '< 0.5', 'silent'],
      ['#4CC9F0', 'Near the centre', 'radius 0', 'low tink (400 Hz)'],
      ['#4CC9F0', 'Far from the centre', 'radius 1', 'high tink (1600 Hz)'],
    ],
    swatchNote: 'Pitch changes smoothly with distance from the centre (not musical notes).',
  },
};
