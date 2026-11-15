STEP 7 DONE

Did:
- `src/core/recorder.js`: `canvas.captureStream(30)` + the player's MediaStreamDestination audio track → MediaRecorder; real time, from the start to the end of the sound, finishes by itself; progress callback; Cancel. MIME order: `video/mp4;codecs=avc1,mp4a.40.2` → `video/mp4;codecs=avc1` → `video/webm;codecs=vp9,opus` → `video/webm`.
- `src/ui/exportBar.js`: **Download video** (records with a progress bar, saves `earth-jukebox-<type>-<YYYY-MM-DD>.<mp4|webm>`; clicking during recording = cancel; a second click re-saves the same file instantly) and **Download audio (WAV)** (instant, `src/core/wav.js`). If MediaRecorder is missing, the video button is hidden and the note says why.
- Player: the source also feeds a fixed-gain "record tap", so Volume/Mute never change the recording. Play/Generate/mode switch are locked while recording.
- Tests: `tests/e2e.spec.js` block "Step 7" (3 recordings + 1 no-MediaRecorder test); probing with ffprobe-static (`tools/lib.mjs` `probe`, `mediaDuration`).

Self-check:
- Air Quality recording: PASS — `earth-jukebox-air-quality-2026-11-15.mp4`, **1.41 MB** (> 200 KB), video h264 1280×720 + audio aac, duration **30.95 s** vs expected 31.00 s (±1.5).
- WAV: PASS — header 2 ch / 44100 Hz / 16-bit, **1 367 100 frames = rendered buffer length**.
- One picture (Temperature): PASS — 0.74 MB, h264 + aac, 16.95 s vs 17.00 s; WAV 749 700 frames = buffer.
- Space: PASS — 1.06 MB, h264 + aac, 23.93 s vs 24.00 s; WAV 1 058 400 frames = buffer.
- Download works twice in a row: PASS for all three (second video and second WAV have identical sizes).
- No MediaRecorder: PASS — button hidden, WAV enabled, note: "Video download is not possible in this browser (no MediaRecorder). Use “Download audio (WAV)”; Chrome or Edge can record video."
- No console errors.

Gaps fixed:
- File names used the UTC date (said 2026-11-14 after local midnight) → local date.
- The first run produced MP4 with **Opus** audio, which many Windows/Apple players cannot play → added `avc1,mp4a.40.2` (AAC) first in the MIME order; now h264 + aac.

Decisions:
- The recording is 1280×720 (the stage canvas), 4 Mbit/s video, 128 kbit/s audio.
- The recording plays the sound out loud once (real time); the user can mute the speakers without affecting the file.

Next: Step 8 — accessibility and quality pass.
