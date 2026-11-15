STEP 11 DONE

(Owner's request on 2026-11-15: remove the extra things: the Generate button, Crop, the 3 section links with "How it works" and "Datasets", the "Any picture (brightness)" menu option and its confusing text, and the status lines in the transcript. **Keep** the shortcuts strip and the live caption. Make the video box a little smaller. Make the UI more professional without breaking anything.)

Did:
- **Removed:**
  - the Generate button;
  - Crop (fields and code path);
  - the section links (Player / How it works / Datasets) and both info sections;
  - "Any picture (brightness)" from the Map layer menu;
  - the "Unit: L* (CIELAB lightness)…" text.
- **Kept on purpose:**
  - the shortcuts strip and the live caption (owner);
  - the footer NASA credit line and `CREDITS.md`, because the data needs credit;
  - the G key, which still makes the sound;
  - the brightness feature itself, now automatic.
- **How sound is made now:**
  - **Play** makes the sound first if there is none, then plays it.
  - Choosing or dropping a file makes the sound at once.
  - Changing a setting clears the old sound, and the next Play makes the new one.
- **Non-map pictures:** an uploaded picture that is not a map of the chosen layer is played by brightness. The menu stays on the chosen layer. The values panel says "Your picture (brightness)" with one plain sentence ("This picture is not a NASA map, so each part is played by its brightness: dark = low note, bright = high note.").
- **Transcript** lists only data lines ("Strip …", "Radar …"). Status messages ("Ready", "Settings changed", "File chosen…") are still spoken in the caption for screen readers, but kept out of the list.
- **Video box a little smaller:** in Video mode the page is at most 1320 px wide (was 1480), so the stage is about 13 % narrower at 1440 px.
- **More professional UI**, following the design guidance found by search (restraint, one accent colour, clear hierarchy, big targets, a real range input for the scrubber, Media Session for media keys):
  - one top bar: brand · Video|Picture switch · shortcuts;
  - the toolbar row is gone, and the top bar stays visible while scrolling (desktop);
  - blue is the only action colour (the orange button is gone); orange only marks the data line/cursor;
  - Play is the main action and is bigger (48 px);
  - "Choose video / Choose picture" is blue;
  - the active tab of the mode switch is a white card;
  - media keys and the lock screen can play and pause (Media Session API).
- Tests updated: a hook replaces the Generate button. Added a "simplified page" test: the removed items are gone, the kept items are there, Play-first works, and the transcript has data lines only. README and LISTEN_CHECKLIST updated.

Self-check:
- vitest **26/26** PASS.
- Playwright **26/26** PASS (6.1 min). This covers line vs audio clock, zig-zag order and cursor, drop zone, brightness fallback (dropdown stays "temperature", 96/96 notes), seek, export, errors, keyboard and 390 px.
- axe: 0 critical / 0 serious / 0 moderate in both modes at 1280 and 390 px. 390 px has no horizontal scroll.
- `npm run build`: PASS.
- Screenshots: `reports/screens/step11-*.png`.

Gaps fixed: the Download note still said "Generate a sound first"; it now says "Press Play or choose a file first".

Decisions:
- The shortcuts strip still shows "G generate". The owner asked to keep the strip unchanged, and G still works.
- The "How this sound is made" box, the 44.1 kHz tag and the mode tag were not removed, because the owner did not list them.

Still UNVERIFIED: how the sounds sound (LISTEN_CHECKLIST); Safari and Firefox; the ← → glyphs, which show as dashes in headless screenshots only.
