// make_videos.mjs — compresses the 4 source videos into public/samples/videos (no audio, 1024 wide, 12 fps,
// H.264, keyframe every 1 s so the browser can seek fast when it grabs 4 frames per second; Space is not
// seeked (its analysis uses the clean star image) so it keeps the default keyframe distance).
import { ffmpeg } from './lib.mjs';
const SRC = {
  'air-quality': 'source/videos/MC01_stage4_GMAO_pm25_2048x1024_en.mp4',
  weather: 'source/videos/MC02_stage3_GMAO_near_surface_wind_2048x1024_en.mp4',
  co2: 'source/videos/dyamondPointCloud_1-22-2025a_dyamond_co2_anim_globe_zoomwest_3x3hyperwall_1080p30_2.mp4',
  space: 'source/videos/Caldwell73_2K_Final.webm',
};
const OPT = { 'air-quality': ['-crf', '28', '-g', '12'], weather: ['-crf', '30', '-g', '12'], co2: ['-crf', '28', '-g', '12'], space: ['-crf', '28'] };
for (const [n, src] of Object.entries(SRC)) {
  ffmpeg(['-y', '-i', src, '-an', '-vf', 'scale=1024:-2', '-r', '12', '-c:v', 'libx264', ...OPT[n], '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `public/samples/videos/${n}.mp4`]);
  console.log('made', n);
}
