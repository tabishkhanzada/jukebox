// valuesPanel.js — the right-hand "Values" panel, shown in Picture mode only: a real <table> (swatch + colour
// name, value range, note) for the chosen map layer, the playing band highlighted, and a "Now playing" line.
// (Video mode has no values table since 2026-11-15: the owner removed it because users bring their own videos.)
const $ = (id) => document.getElementById(id);

function row(cells, key) {
  const tr = document.createElement('tr'); if (key) tr.dataset.key = key;
  cells.forEach((c, i) => {
    const td = document.createElement(i === 0 ? 'th' : 'td');
    if (i === 0) td.scope = 'row';
    if (Array.isArray(c)) { const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = c[0]; sw.setAttribute('aria-hidden', 'true'); td.append(sw, document.createTextNode(c[1])); }
    else td.textContent = c;
    tr.append(td);
  });
  return tr;
}
function head(cols) {
  const thead = $('values-table').tHead; thead.innerHTML = '';
  const tr = document.createElement('tr');
  cols.forEach((c) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = c; tr.append(th); });
  thead.append(tr);
}

export function showPictureTable(layer) {
  $('values-h').textContent = `Values — ${layer.title}`;
  const approx = layer.approx ? '≈ approximate. ' : '';
  $('values-sub').textContent = layer.id === 'any' ? `${layer.approxNote} Instrument: ${layer.instrumentName}.`
    : `Unit: ${layer.unit} (${layer.unitName}). Instrument: ${layer.instrumentName}. Low note = low value, high note = high value. ${approx}${layer.approxNote}`;
  $('values-caption').textContent = `Legend bands for ${layer.title}: colour, value range in ${layer.unit}, and note`;
  head(['Colour', `Value (${layer.unit})`, 'Note']);
  const tb = $('values-table').tBodies[0]; tb.innerHTML = '';
  layer.bands.forEach((b) => {
    const name = b.kind ? `${b.kind === 'rain' ? 'Rain' : 'Snow'}: ${b.name}` : b.name;
    tb.append(row([[b.swatch, name], b.text, b.note], (b.kind || '') + b.band));
  });
  setNow('—');
}

/** Highlight one row (key from showPictureTable) or none. */
export function highlight(key) {
  for (const tr of $('values-table').tBodies[0].rows) {
    const on = key != null && tr.dataset.key === String(key);
    tr.classList.toggle('active', on);
    if (on) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current');
  }
}
let lastNow = '';
export function setNow(text) { text = text.replace(/^Now: /, ''); if (text !== lastNow) { $('now-line').textContent = text; lastNow = text; } }
