// wav.js — writes and reads 16-bit stereo PCM WAV files (used for "Download audio (WAV)" and in tests).
export function encodeWav(left, right, sampleRate = 44100) {
  const n = left.length, bytes = 44 + n * 4, buf = new ArrayBuffer(bytes), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [left, right]) { const s = Math.max(-1, Math.min(1, ch[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  }
  return buf;
}

/** Parse the header of a WAV file. Returns {channels, sampleRate, bits, frames} or throws. */
export function readWavHeader(buf) {
  const v = new DataView(buf instanceof ArrayBuffer ? buf : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const tag = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE' || tag(12) !== 'fmt ' || tag(36) !== 'data') throw new Error('not a PCM WAV');
  const channels = v.getUint16(22, true), sampleRate = v.getUint32(24, true), bits = v.getUint16(34, true);
  return { channels, sampleRate, bits, frames: v.getUint32(40, true) / (channels * (bits / 8)) };
}
