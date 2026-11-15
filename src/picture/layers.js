// layers.js — the 4 picture layers: legend bands (colour name, value range, note), unit, instrument, sample.
// Colours and value ranges come from the OFFICIAL GIBS colormaps (legend-data.js, generated); band names and
// notes come from the build guide (Section 5A). "approx" marks value text that is not exact.
// "any" = brightness mode: 8 brightness bands (CIELAB L*), no legend. Not in the menu: used automatically when an
// uploaded picture is not a NASA map of the chosen layer, so every picture makes sound (2026-11-15).
// Instruments were changed on 2026-11-15 after the owner said the picture sounds were strange (see reports/step10.md).
import { LEGENDS } from './legend-data.js';

export const NOTES = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25, D5: 587.33, E5: 659.25 };
const SIX = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'];

function fmt(v) {
  const a = Math.abs(v);
  return a >= 10 ? v.toFixed(1).replace(/\.0$/, '') : a >= 1 ? v.toFixed(2).replace(/0$/, '') : v.toFixed(2);
}
/** Value text for band i of n, e.g. "< 0.10", "0.10–0.22", "≥ 18.8". */
function rangeText(r, i, n, { firstLess = true } = {}) {
  if (i === 0 && firstLess) return `< ${fmt(r.hi)}`;
  if (i === n - 1) return `≥ ${fmt(r.lo)}`;
  return `${fmt(r.lo)}–${fmt(r.hi)}`;
}
function bands(key, names, notes, opts = {}) {
  const L = LEGENDS[key];
  return names.map((name, i) => {
    const r = L.ranges[i];
    let text = rangeText(r, i, names.length, opts);
    if (i === 0 && opts.firstText) text = opts.firstText;
    return { band: i + 1, name, note: notes[i], freq: NOTES[notes[i]], swatch: `rgb(${r.swatch.join(',')})`, lo: r.lo, hi: r.hi, text, kind: opts.kind || null };
  });
}
const ramp = (key) => LEGENDS[key].ramp.map(([r, g, b, band, kind]) => ({ rgb: [r, g, b], band, kind }));

export const LAYERS = {
  temperature: {
    id: 'temperature', title: 'Temperature (Sea Surface)', unit: '°C', unitName: 'degrees Celsius', instrument: 'piano', instrumentName: 'soft piano',
    accent: 'var(--l-temperature)', sample: 'samples/pictures/temperature.png',
    gibs: 'GHRSST_L4_MUR_Sea_Surface_Temperature', date: '2026-11-06',
    approx: true, approxNote: 'Legend ends (below 0 °C, 32 °C and above) are official; the band edges inside are approximate (read from the legend picture).',
    bands: bands('temperature', ['Maroon', 'Purple', 'Blue', 'Cyan', 'Green', 'Yellow', 'Orange', 'Red'], ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5']).map((b) => ({ ...b, text: '≈ ' + b.text })),
    ramp: ramp('temperature'),
  },
  precipitation: {
    id: 'precipitation', title: 'Precipitation (Rain & Snow)', unit: 'mm/hr', unitName: 'millimetres per hour', instrument: 'rain/snow', instrumentName: 'water drop (rain) and music-box bell (snow)',
    accent: 'var(--l-precipitation)', sample: 'samples/pictures/precipitation.png',
    gibs: 'IMERG_Precipitation_Rate', date: '2026-11-06',
    approx: false, approxNote: 'Value ranges read from the official colour table (log scale). Grouping of colours into 6 bands is ours.',
    bands: [
      ...bands('rain', ['Green', 'Lime', 'Yellow', 'Orange', 'Red', 'Dark red'], SIX, { kind: 'rain', firstText: `${fmt(LEGENDS.rain.ranges[0].lo)}–${fmt(LEGENDS.rain.ranges[0].hi)}` }),
      ...bands('snow', ['Light cyan', 'Sky blue', 'Blue', 'Violet', 'Purple', 'Dark purple'], SIX, { kind: 'snow', firstText: `${fmt(LEGENDS.snow.ranges[0].lo)}–${fmt(LEGENDS.snow.ranges[0].hi)}` }),
    ],
    ramp: [...ramp('rain'), ...ramp('snow')],
  },
  aerosol: {
    id: 'aerosol', title: 'Aerosol (Air Quality)', unit: 'AOD', unitName: 'aerosol optical depth (no unit)', instrument: 'pad', instrumentName: 'warm pad',
    accent: 'var(--l-aerosol)', sample: 'samples/pictures/aerosol.png',
    gibs: 'VIIRS_NOAA21_AOD_Deep_Blue_Land_Ocean', date: '2026-11-06',
    approx: false, approxNote: 'Value ranges read from the official colour table. Most of the planet is below 0.25, so low notes dominate: that is correct.',
    bands: bands('aerosol', ['Pale yellow', 'Yellow / amber', 'Orange', 'Red-orange', 'Red', 'Dark red'], SIX),
    ramp: ramp('aerosol'),
  },
  vegetation: {
    id: 'vegetation', title: 'Vegetation (NDVI)', unit: 'NDVI', unitName: 'vegetation index (no unit)', instrument: 'marimba', instrumentName: 'soft marimba',
    accent: 'var(--l-vegetation)', sample: 'samples/pictures/vegetation.png',
    gibs: 'VIIRS_NOAA21_NDVI_8Day', date: '2026-11-06',
    approx: false, approxNote: 'Value ranges read from the official colour table. Brown → green switch at 0.30.',
    bands: bands('vegetation', ['White / pink-grey', 'Light tan', 'Brown', 'Light green', 'Green', 'Dark green'], SIX),
    ramp: ramp('vegetation'),
  },
  any: {
    id: 'any', title: 'Your picture (brightness)', unit: 'brightness', unitName: '0 = black, 100 = white', instrument: 'kalimba', instrumentName: 'kalimba',
    accent: 'var(--primary)', sample: 'samples/pictures/temperature.png',
    approx: false, approxNote: 'This picture is not a NASA map, so each part is played by its brightness: dark = low note, bright = high note.',
    bands: ['Black', 'Very dark', 'Dark', 'Dim', 'Medium', 'Light', 'Very light', 'White'].map((name, i) => {
      const lo = i * 12.5, hi = lo + 12.5, note = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'][i], g = greyOf(lo + 6.25);
      return { band: i + 1, name, note, freq: NOTES[note], swatch: `rgb(${g},${g},${g})`, lo, hi, text: `${Math.round(lo)}–${Math.round(hi)}`, kind: null };
    }),
    ramp: [],
  },
};

/** sRGB grey level (0..255) for a CIELAB lightness L*. */
function greyOf(L) {
  const Y = L > 8 ? ((L + 16) / 116) ** 3 : L / 903.3;
  const c = Y <= 0.0031308 ? 12.92 * Y : 1.055 * Y ** (1 / 2.4) - 0.055;
  return Math.round(255 * c);
}

/** Find the band object for a classified region {band, kind}. */
export function bandOf(layer, region) {
  if (!region || !region.band) return null;
  return layer.bands.find((b) => b.band === region.band && (b.kind || null) === (region.kind || null)) || null;
}
