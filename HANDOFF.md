# Sands of Baghdad: Handoff (after Round 8)

## Paste this into the new chat
> I'm continuing a game project called **Sands of Baghdad**: a Diablo-style 3D ARPG in Three.js set on the outskirts of Abbasid Baghdad just after the siege of 813 CE. I've attached `sands-round8-handoff.zip` (full source, git history as `repo.bundle`, and this HANDOFF.md).
>
> Please:
> 1. Unzip it and read HANDOFF.md fully.
> 2. Run `npm install && npx vite`.
> 3. Start **Round 9** as specified in the "Next" section.
>
> The goal is AAA studio quality, with Diablo IV as the bar. Run the critique loop (screenshot → critique → improve) every round, and ask me clarifying questions and confirm with me before building. I play on Android, so republish the game as a playable Artifact after each round; touch controls must keep working. Update the existing link https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c rather than making a new one. Push to the session's assigned branch on zchillsounds-debug/super-chainsaw1.

## Restore the code
```
unzip sands-round8-handoff.zip -d sands && cd sands
git clone repo.bundle game && cd game        # branch claude/rounds-4-8-continuation-gmkypl
npm install && npx vite --port 5173          # http://localhost:5173
```
If the session's repo is empty, run `git fetch <path>/repo.bundle 'refs/heads/*:refs/remotes/bundle/*'` and then `git checkout -B <session-branch> bundle/claude/rounds-4-8-continuation-gmkypl`.

URL flags:
- `?play` skips the title screen.
- `?mobile` forces the touch UI.
- `?q=low|high` sets quality; `?noadapt` turns off automatic quality.
- `?x=..&z=..` sets the spawn point.
- `?cls=faris|rami|naffat|ayyar` picks the class.
- `?tod=golden|dusk|night|dawn|underground` sets the time of day.
- `?perf` shows the performance overlay.

**GitHub push has failed with a 403 in three sessions.** Reconnect GitHub at https://claude.ai/connect-github and install the Claude GitHub App on the repo before you start. Until that works, keep a git bundle as the backup.

## Non-negotiable design rules (from the user)
- **No religious buildings or symbols at all.** That means no mosques, minarets, mausoleums or graves, and no crescents, crosses or star sigils (8-point stars included). No Quranic text and no religious greetings. Kufic-style lettering is fine only with non-religious text.
- **No supernatural enemies.** All foes are human: brigands, deserters, mercenaries.
- **Authentic to 813 CE, not Western tropes.** Use straight sayf swords, qalansuwa or bayda headgear, qaba coats and black Abbasid dress. Use short single period names with no epithets.
- **Music in the Abbasid court style:** Rast/Bayati modes, played on oud, qanun and daff. No Hijaz cliché.
- **Ask clarifying questions and confirm before building.**

## Story bible
- **Characters:** the hero is Salim, a caravan guard. Ishaq is an astronomer of the House of Wisdom.
- **Acts:** Act 1 is Ziyad at the caravanserai. Act 2 is Hisham at the kiln yard. Act 3 is Ghassan at the ruined Persian arch.
- **Classes:** Faris, Rami, Naffat, 'Ayyar.
- **Hub NPCs:** Yusuf (merchant), Bishr (blacksmith), 'Amr (trainer).
- **Side quests:** The Lost Astrolabe, Sweet Water, 'Amr's Wager.

## What exists now (Rounds 1–8, one commit per round)
- **R1–2: base game.**
  - Mobile HUD.
  - SDF-sculpted skinned characters with IK and cloth.
  - A cinematic director with 7 scenes.
  - A maqam score.
  - Act saves.
- **R3: classes and combat.**
  - Four classes are defined in `classes.js`. Each has its own look, attack, skills and loot weapons, and you pick one before the prologue.
  - Hit feel: hit-stop and camera kick scaled by weapon weight, knockback, and a stagger/poise meter.
  - Evade gives i-frames. Evading as an enemy blade glints is a parry.
  - Enemy AI:
    - Three attack tokens; the other melee foes orbit toward the hero's back.
    - Archers hold range.
    - Shields block frontal hits.
  - Sculpted geometry is cached in IndexedDB (`geocache.js`).
- **R4: hub and world.**
  - `hub.js`:
    - Merchant (buy/sell, sherbet).
    - Blacksmith (temper +1..+5, salvage into materials).
    - Stash.
    - Trainer (change class).
  - `lighting.js` has time-of-day presets per act.
  - Interiors (`interior.js`): random-walk layouts on a flat floor at x>150, with their own collision and nav. They are reached through `zones.js`, which also owns the context prompt. The kiln tunnels are the first interior.
  - Torch light pool (`lights.js`).
  - Instanced clutter, soot decals, and kiln smoke and glow.
  - Distance culling of placed props.
- **R5: rendering.**
  - Shadow texel snapping and a per-act colour grade.
  - `atmos.js`: ground haze and sun shafts.
  - Hair strand highlights (Kajiya-Kay) and cloth wrinkle normals.
  - A far LOD sculpt for crowds.
  - Vegetation split into 36 m tiles so off-screen tiles are culled.
  - Animation throttling for distant rigs.
  - Performance overlay (`perf.js`, F3).
- **R6: progression and endgame (`progression.js`).**
  - Skill trees (K): three branches per class, some nodes set flags that change skills.
  - 8 legendary aspects, 2 item sets, and enchanting (reroll a property, imprint an aspect).
  - Ruined qanats under the village well:
    - Each descent rolls two modifiers.
    - Six difficulty tiers, unlocked by clearing the deepest gallery.
    - A captain at the end.
  - Gauntlet of Captains boss rush.
- **R7: audio and narrative.**
  - `audio2.js`:
    - Score varies by act.
    - Positional SFX with an occlusion low-pass.
    - Footsteps by surface.
    - Suq crowd and underground ambience.
  - `narrative.js`:
    - Dialogue with choices.
    - 3 side quests with cutscenes (`SCENES.conversation`).
    - Journal (J).
    - Codex of 15 secular history entries.
- **R8: production.**
  - `settings.js` (Esc): graphics, volume, controls, accessibility (subtitle size, colour-vision daltonization, reduce flashing) and language.
  - Controller support (`gamepad.js`).
  - Arabic right-to-left UI (`i18n.js`). It translates interface text through a MutationObserver; story dialogue and the codex are still in English.
  - First-run tutorial hints (`tutorial.js`).
  - PWA (`public/`).
  - `PLAYTEST.md` checklist.

## Test tools
- `shots/shot.mjs`: a single screenshot.
- `shots/multi.mjs <w> <h> <query> <outdir> <steps.json>`: one page load, many shots. `shots/close.js` adds close-up camera helpers.
- `shots/regress.mjs`: seeded regression scenes diffed against `shots/baseline` (`--update` refreshes the baseline). Its baseline was all clear at the end of Round 8.
- Debug hooks: `__game`, `__sim(sec)`, `__director`, `__SCENES`, `__mk(level, rarity, slot)`.
- Headless SwiftShader is slow (about 1 fps). Don't run two captures at once. Frame-rate-dependent things (culling timers, CSS transitions) crawl in headless, so `__sim` runs the cull itself.

## Publishing
1. `npx vite build`
2. `node shots/inline.mjs out.html` inlines the JS and CSS and drops the PWA links.
3. Publish with the Artifact tool to https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c. In a new chat, read the artifact first, then publish with `url`.
4. It is currently **Version 5**, at about 1 MB.

## Known gaps (start Round 9 here)
1. Nothing from R3–R8 has been played on a real Android device. Ask the user for playtest results (`PLAYTEST.md`) first.
2. Cloth (skirt and mantle) and foot sliding haven't been verified in motion.
3. Camels are still primitives. Sculpt them with the same SDF system.
4. Nobody has listened to the score; the levels were lowered blind.
5. Phone performance: about 530 draw calls per frame. Merge static props by material per culling chunk.
6. Translate the dialogue and codex into Arabic.
7. Fact-check the codex entries; they were written from memory.
8. The quest tracker can grow into the minimap on desktop.
9. Rendering compromises to revisit on high quality:
   - No true screen-space reflections on water.
   - SMAA instead of TAA.
   - A single stabilised shadow map rather than cascades.

## Next (proposed, confirm with the user)
- **Round 9: stabilise and polish.** The known gaps above, plus whatever the playtest finds.
- **Round 10: content and length.** Target 3 acts and 30–45 minutes:
  - More side quests and named elites per act.
  - A new area per act.
  - A full final-fight sequence against Ghassan.
  - New game plus.
- **Needs the user's approval:**
  - CC0 rigged characters and animations (Quaternius, Kenney).
  - A hosted standalone build (for example GitHub Pages) so the game can install as an app on Android.

## File map (src/)
- **Core:** main.js (boot, loop, wiring), game.js (gameplay, AI, combat), classes.js, entities.js, items.js, save.js
- **World:** world.js, terrain.js, buildings.js, props.js, vegetation.js, water.js, interior.js, zones.js, hub.js
- **Rendering:** graphics.js, lighting.js, lights.js, atmos.js, fx.js, perf.js
- **Characters:** sculpt.js, human.js, charmats.js, cloth.js, anim.js, characters.js, geocache.js
- **Story:** cinema.js, scenes.js, narrative.js
- **Progression:** progression.js
- **Audio:** audio.js, audio2.js
- **UI:** ui.js, mobile.js, style.css (later rounds append their own sections), settings.js, i18n.js, gamepad.js, tutorial.js
