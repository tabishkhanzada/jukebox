// stage.js — draws the centre stage canvas: the video frame or picture (fitted inside 16:9) plus the overlay:
// Video = a glowing orange vertical scan line with end dots; Space = radar line with a faint 30° trail;
// Picture = the zig-zag path (/\/\/\, one diagonal per strip; Straight = top→bottom every strip), the part already
// travelled, the lit north/middle/south region and a round cursor. Empty stage = a quiet decorative background.
// The line core is solid ACCENT so tests can find it in the pixels; the region outline is solid HILITE.
import { STRIPS } from '../core/scan.js';

export const ACCENT = '#38BDF8';
export const HILITE = '#5BD1FF';
const GLOW = (a) => `rgba(56,189,248,${a})`;

export function createStage(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width, H = canvas.height;
  let source = null; // {el, w, h}
  const rect = { x: 0, y: 0, w: W, h: H };

  function setSource(el, w, h) {
    source = el ? { el, w, h } : null;
    if (!source) return;
    const s = Math.min(W / w, H / h);
    rect.w = Math.round(w * s); rect.h = Math.round(h * s);
    rect.x = Math.round((W - rect.w) / 2); rect.y = Math.round((H - rect.h) / 2);
  }

  function dot(x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = fill; ctx.fill(); }

  function vline(x) {
    const px = Math.round(rect.x + x * (rect.w - 1));
    ctx.save();
    ctx.fillStyle = GLOW(0.2); ctx.fillRect(px - 7, rect.y, 15, rect.h);
    ctx.fillStyle = GLOW(0.45); ctx.fillRect(px - 3, rect.y, 7, rect.h);
    ctx.fillStyle = ACCENT; ctx.fillRect(px - 1, rect.y, 3, rect.h);
    dot(px + 0.5, rect.y + 9, 7, ACCENT);
    dot(px + 0.5, rect.y + rect.h - 9, 7, '#9FD4FF');
    ctx.restore();
    return px;
  }

  /** Cursor position (0..1, 0..1) on the zig-zag / straight path for progress u (0..1) of the sweep. */
  function pathPoint(u, pattern) {
    const s = Math.min(STRIPS - 1, Math.floor(u * STRIPS)), f = Math.min(1, u * STRIPS - s);
    return { x: u, y: pattern === 'zigzag' && s % 2 === 1 ? 1 - f : f };
  }
  const PAD = 8;
  const toPx = (p) => [rect.x + p.x * rect.w, rect.y + PAD + p.y * (rect.h - 2 * PAD)];

  function drawPath(pattern, u0, u1, style, width) {
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    let started = false;
    for (let s = 0; s < STRIPS; s++) {
      const a = Math.max(u0, s / STRIPS), b = Math.min(u1, (s + 1) / STRIPS - 1e-9);
      if (b <= a) continue;
      const [xa, ya] = toPx(pathPoint(a, pattern)), [xb, yb] = toPx(pathPoint(b, pattern));
      if (!started || pattern !== 'zigzag') ctx.moveTo(xa, ya); else ctx.lineTo(xa, ya);
      ctx.lineTo(xb, yb); started = true;
    }
    ctx.stroke();
  }

  function drawEmpty() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b2745'); g.addColorStop(1, '#141c33');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let x = 0; x < W; x += 64) ctx.fillRect(x, 0, 1, H);
    for (let y = 0; y < H; y += 64) ctx.fillRect(0, y, W, 1);
    const hs = [0.28, 0.42, 0.22, 0.6, 0.48, 0.35, 0.26, 0.4, 0.3, 0.2];
    const bw = W / hs.length;
    hs.forEach((h, i) => { ctx.fillStyle = i === 3 ? 'rgba(56,189,248,0.28)' : 'rgba(120,150,210,0.18)'; ctx.fillRect(i * bw + 10, H * (0.95 - h * 0.5), bw - 20, H * h * 0.5); });
    ctx.fillStyle = GLOW(0.5); ctx.fillRect(W / 2 - 1, 0, 3, H);
    dot(W / 2 + 0.5, 12, 7, ACCENT); dot(W / 2 + 0.5, H - 12, 7, '#9FD4FF');
  }

  function draw(overlay = null) {
    if (!source) { drawEmpty(); return null; }
    ctx.fillStyle = '#0f1628'; ctx.fillRect(0, 0, W, H);
    try { ctx.drawImage(source.el, rect.x, rect.y, rect.w, rect.h); } catch { /* video not ready yet */ }
    if (!overlay) return null;
    if (overlay.type === 'line') return { x: vline(overlay.x) };
    if (overlay.type === 'picture') {
      const u = overlay.u, pat = overlay.pattern;
      ctx.save();
      drawPath(pat, Math.min(u, 1), 1, 'rgba(255,255,255,0.22)', 1.5);
      if (u > 0) drawPath(pat, 0, Math.min(u, 1), GLOW(0.8), 3);
      if (overlay.region) {
        const { strip, part } = overlay.region;
        const x0 = rect.x + (strip * rect.w) / STRIPS, y0 = rect.y + (part * rect.h) / 3;
        ctx.fillStyle = 'rgba(91,209,255,0.18)'; ctx.fillRect(x0, y0, rect.w / STRIPS, rect.h / 3);
        ctx.strokeStyle = HILITE; ctx.lineWidth = 3; ctx.strokeRect(x0 + 1.5, y0 + 1.5, rect.w / STRIPS - 3, rect.h / 3 - 3);
      }
      const [cx, cy] = toPx(pathPoint(Math.min(u, 1), pat));
      dot(cx, cy, 15, GLOW(0.3)); dot(cx, cy, 9, '#ffffff'); dot(cx, cy, 6.5, ACCENT);
      ctx.restore();
      return { x: cx, y: cy };
    }
    if (overlay.type === 'radar') {
      const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2, R = Math.min(rect.w, rect.h) / 2;
      const a = overlay.frac * 2 * Math.PI - Math.PI / 2; // 0 = 12 o'clock, clockwise on screen
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a - Math.PI / 6, a); ctx.closePath();
      const g = ctx.createConicGradient ? ctx.createConicGradient(a - Math.PI / 6, cx, cy) : null;
      if (g) { g.addColorStop(0, GLOW(0)); g.addColorStop(1 / 12, GLOW(0.22)); g.addColorStop(1, GLOW(0)); ctx.fillStyle = g; }
      else ctx.fillStyle = GLOW(0.12);
      ctx.fill();
      ctx.strokeStyle = GLOW(0.45); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.stroke();
      ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.stroke();
      ctx.restore();
      return { angle: a, cx, cy, R };
    }
    return null;
  }
  return { ctx, rect, setSource, draw, get hasSource() { return !!source; } };
}
