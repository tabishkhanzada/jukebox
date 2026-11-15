STEP 12 DONE

(Owner's request on 2026-11-15: the Source switch (Sample / Upload) is not needed, because files can be chosen in the stage box.)

Did:
- Removed the Source fieldset (Sample / Upload radios) in both modes.
- No file chosen = the built-in sample (Play makes and plays it). A chosen file (stage "Choose video/picture", drag-and-drop, or "Change file") = upload.
- After a file is chosen, Controls show "Your file: name" with **Change file** and **Use sample instead**. "Use sample instead" clears the file and goes back to the sample.
- The hidden file inputs got their own names ("Choose your own video/picture file") for screen readers.
- The brightness note ("This picture is not a … map") is now a blue info box, not a red error box. Real errors stay red.
- Tests: the radio steps were replaced by the new file row and "Use sample instead". The "simplified page" test also checks that there are no Source radios.

Self-check:
- vitest 26/26 PASS.
- Playwright 26/26 PASS (6.0 min). The file row shows "Your file: weather.mp4" and the sound is an upload. A wrong file gives a friendly error, then "Use sample instead" makes the sample work again.
- axe: 0 critical, 0 serious, 0 moderate.
- `npm run build`: PASS.
- Screenshots: `reports/screens/step12-*.png`.

Still UNVERIFIED: how the sounds sound (LISTEN_CHECKLIST); Safari and Firefox.
