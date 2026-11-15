# LISTEN CHECKLIST

Claude Code cannot hear audio. Everything below needs a human ear. Use headphones first, then a phone speaker.

**How:** run the site (`npm run dev`), press **Play** (or **Choose video / Choose picture** in the middle of the player, then **Play**). Or use **Download audio (WAV)**.

**Answer each with:** Good / Too loud / Too harsh / Too weak / Confusing, plus a short note.

| # | What to play | Question | Answer | Note |
|---|---|---|---|---|
| 1 | Video → Air Quality (sample) | Does heavier dust sound rougher and louder? Is it comfortable on a phone speaker? | | |
| 2 | Video → Weather (sample) | Does the whistle follow strong wind? Does the left-most storm area stand out? | | |
| 3 | Video → Carbon Dioxide (sample) | Is the rumble audible on a phone? Is the crackle too much or too little? | | |
| 4 | Video → Space (sample) | Are the "tinks" understandable, not mush? Is 12 s per turn right? (The star cluster is dense, so tinks run at the 25-per-second maximum almost all the time.) | | |
| 5 | Picture → Temperature (new **soft piano**, 2026-11-15) | Is it pleasant now? Can you tell cold from hot by pitch? Zig-zag vs Straight: which is easier? | | |
| 6 | Picture → Precipitation (new **water drop** + **music-box bell**) | Can you tell rain (drops) from snow (bell)? (The sample has very little snow: about 1 % of regions.) | | |
| 7 | Picture → Aerosol (**warm pad**) and Vegetation (**soft marimba**) | Are they pleasant and easy to tell apart? | | |
| 8 | Picture → upload your own photo (not a map): played by brightness on a **kalimba** | Does dark → low, bright → high make sense? Is it pleasant? | | |
| 9 | Picture: the room echo (reverb) | Too much, too little, or right? | | |
| 10 | All | Is the speed right (video 4 s per sweep, picture 32 s)? | | |

Extra things worth noting (measured, not heard):
- The wind "gusts" in Air Quality and Weather are very gentle (as in the original Python recipes). Say so if you would like more gusting.
- Every sound is peak-normalised to about 0.91, so the types may differ in loudness. Note any that feel much louder or softer (there is no volume slider any more).
- Picture notes ring for 0.8–1.8 s, so 3–6 notes overlap at the default speed. They are all from one scale (C D E G A), so the overlaps should not clash, but this is UNVERIFIED by ear.

Write the answers into `reports/LISTEN_RESULTS.md` and turn them into parameter changes.
