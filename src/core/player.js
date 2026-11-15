// player.js — plays the made sound with the Web Audio API and is the one clock everything follows.
// AudioBuffer → AudioBufferSourceNode → GainNode (mute only; no volume slider since 2026-11-15) → speakers, and the source also feeds a fixed
// "record tap" → MediaStreamDestination, so recordings never depend on Mute.
// play / pause / seek / volume / mute; `time` = seconds into the sound (the overlay line is drawn from this).
export class Player {
  constructor() {
    this.ctx = null; this.buffer = null; this.src = null;
    this.offset = 0; this.startedAt = 0; this.playing = false;
    this.volume = 1; this.muted = false; this.onended = null; this.loop = false;
  }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ sampleRate: 44100 });
      this.gain = this.ctx.createGain(); this.gain.connect(this.ctx.destination);
      this.dest = this.ctx.createMediaStreamDestination();
      this.recTap = this.ctx.createGain(); this.recTap.connect(this.dest);
      this.applyGain();
    }
    return this.ctx;
  }
  load({ left, right, sampleRate }) {
    this.stop();
    const ctx = this.ensure();
    const b = ctx.createBuffer(2, left.length, sampleRate);
    b.copyToChannel(left, 0); b.copyToChannel(right, 1);
    this.buffer = b; this.offset = 0;
  }
  get duration() { return this.buffer ? this.buffer.duration : 0; }
  get time() {
    if (!this.buffer) return 0;
    if (!this.playing) return this.offset;
    return Math.min(this.duration, this.ctx.currentTime - this.startedAt);
  }
  async play() {
    if (!this.buffer || this.playing) return;
    const ctx = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.offset >= this.duration - 0.01) this.offset = 0;
    const src = ctx.createBufferSource(); src.buffer = this.buffer; src.connect(this.gain); src.connect(this.recTap);
    src.onended = () => { if (this.src === src) { this.playing = false; this.offset = this.duration; this.src = null; this.onended?.(); } };
    this.startedAt = ctx.currentTime - this.offset;
    src.start(0, this.offset);
    this.src = src; this.playing = true;
  }
  pause() {
    if (!this.playing) return;
    this.offset = this.time; this.stop(true);
  }
  stop(keepOffset = false) {
    if (this.src) { const s = this.src; this.src = null; try { s.onended = null; s.stop(); } catch { /* already stopped */ } }
    this.playing = false; if (!keepOffset) this.offset = 0;
  }
  seek(t) {
    const was = this.playing; this.pause();
    this.offset = Math.max(0, Math.min(this.duration, t));
    if (was) this.play();
  }
  setVolume(v) { this.volume = v; this.applyGain(); }
  setMuted(m) { this.muted = m; this.applyGain(); }
  applyGain() { if (this.gain) this.gain.gain.value = this.muted ? 0 : this.volume; }
}
