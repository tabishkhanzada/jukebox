// caption.js — the live caption (aria-live="polite", at most one update per second so screen readers can keep
// up) and the "Show transcript" list of the last 20 captions of the data itself ("Strip …", "Radar …"); status
// messages such as "Ready" are spoken in the caption but kept out of the transcript (owner's request, 2026-11-15).
const el = () => document.getElementById('caption');
const list = () => document.getElementById('transcript');
let last = '', lastAt = -Infinity;

/** Say a caption. force = ignore the 1 s limit (e.g. "Ready", errors, mode change). */
export function say(text, { force = false, now = performance.now() } = {}) {
  if (text === last) return false;
  if (!force && now - lastAt < 1000) return false;
  last = text; lastAt = now;
  el().textContent = text;
  if (!/^(Strip|Radar)/.test(text)) return true;
  const li = document.createElement('li'); li.textContent = text; list().append(li);
  while (list().children.length > 20) list().firstElementChild.remove();
  return true;
}
export function resetCaption(text = 'Nothing is playing.') { last = ''; lastAt = -Infinity; el().textContent = text; list().innerHTML = ''; }
