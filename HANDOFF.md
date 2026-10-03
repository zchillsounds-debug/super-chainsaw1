# Sands of Baghdad: Handoff (after Round 11)

## Paste this into the new chat
> I'm continuing a game project called **Sands of Baghdad**: a Diablo-style 3D ARPG in Three.js set on the outskirts of Abbasid Baghdad just after the siege of 813 CE. I've attached `sands-round10-handoff.zip` (full source, git history as `repo.bundle`, and this HANDOFF.md).
>
> Please:
> 1. Unzip it and read HANDOFF.md fully.
> 2. Run `npm install && npx vite`.
> 3. Start **Round 11** as specified in the "Next" section.
>
> The goal is AAA studio quality, with Diablo IV as the bar. Run the critique loop (screenshot → critique → improve) every round, and ask me clarifying questions and confirm with me before building. I play on Android, so republish the game as a playable Artifact after each round; touch controls must keep working. Update the existing link https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c rather than making a new one. Push to the session's assigned branch on zchillsounds-debug/super-chainsaw1.

## Restore the code
```
unzip sands-round11-handoff.zip -d sands && cd sands
git clone repo.bundle game && cd game        # branch claude/build-all-rounds-8si5e6
npm install && npx vite --port 5173          # http://localhost:5173
```
If the session's repo is empty, run `git fetch <path>/repo.bundle 'refs/heads/*:refs/remotes/bundle/*'` and then `git checkout -B <session-branch> bundle/claude/build-all-rounds-8si5e6`.

URL flags:
- `?play` skips the title screen.
- `?mobile` forces the touch UI.
- `?q=low|high` sets quality; `?noadapt` turns off automatic quality.
- `?x=..&z=..` sets the spawn point.
- `?cls=faris|rami|naffat|ayyar` picks the class.
- `?tod=golden|dusk|night|dawn|underground` sets the time of day.
- `?perf` shows the performance overlay.

**GitHub now works.** The account was reconnected and the Claude GitHub App was installed in Round 11, and pushes succeed.

**Getting the APK to the user:**
- `.github/workflows/apk.yml` builds a debug APK on every push to `claude/**` (Capacitor 6 wrapper, `android/`, landscape).
- The Actions download host (blob.core.windows.net) is blocked in the cloud session, so the workflow also force-pushes the APK to the orphan branch **`apk-builds`**.
- To fetch it: `git fetch origin apk-builds && git show origin/apk-builds:sands-of-baghdad.apk > <scratchpad>/sands-of-baghdad.apk`. Wait until the commit message shows your short SHA, then send the file with SendUserFile.
- dl.google.com is blocked too, so you can't build the APK locally; always build it through CI.

## Non-negotiable design rules (from the user)
- **No religious buildings or symbols at all.** That means no mosques, minarets, mausoleums or graves, and no crescents, crosses or star sigils (8-point stars included). No Quranic text and no religious greetings. Kufic-style lettering is fine only with non-religious text.
- **No supernatural enemies.** All foes are human: brigands, deserters, mercenaries.
- **Authentic to 813 CE, not Western tropes.** Use straight sayf swords, qalansuwa or bayda headgear, qaba coats and black Abbasid dress. Use short single period names with no epithets.
- **Music in the Abbasid court style:** Rast/Bayati modes, played on oud, qanun and daff. No Hijaz cliché.
- **Ask clarifying questions and confirm before building.**

## Story bible
Round 11 rewrote the story around the Teacher's Pages, with Shia-inspired themes only; see `STORY.md`. Ziyad is now Farud, and Jabir is Salim's brother.

- **Characters:** the hero is Salim, a caravan guard. Ishaq is an astronomer of the House of Wisdom.
- **Acts:** Act 1 is Farud at the caravanserai. Act 2 is Hisham at the kiln yard. Act 3 is Ghassan at the ruined Persian arch.
- **Classes:** Faris, Rami, Naffat, 'Ayyar.
- **Hub NPCs:** Yusuf (merchant), Bishr (blacksmith), 'Amr (trainer).
- **Side quests:** The Lost Astrolabe, Sweet Water, 'Amr's Wager.

## What exists now (Rounds 1–10)
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

- **R9: stabilise and polish.**
  - Draw calls: placed props are merged into 40 m chunks, and plain materials that differ only in colour are pooled (colour baked into vertex colours). On low quality, or once adaptive quality drops, the sun's shadow map redraws at half rate. The village went from 448 to about 320 draws per frame on average (205 on frames that skip the shadow pass).
  - Camels are sculpted and skinned with the SDF system (`creatures.js`): pacing gait, grazing neck, painted saddle cloth.
  - Cloth: free particles are partly carried with the anchor's motion, so mantles trail at about 45° when running instead of streaming out.
  - Arabic for all story text (`story_ar.js` plus `t()` in `i18n.js`): dialogue, cutscene lines, title cards, tasks, codex and tutorial.
  - Codex fact-check: House of Wisdom dated to al-Ma'mun's return in 819; naft "siphons" softened; the paper mill attributed to al-Fadl the Barmakid "by later writers"; caravanserai layout generalised; Sawad located as central and lower Iraq.
  - Desktop HUD: minimap top-right, quest tracker stacked beneath it and capped.
  - The suq watchtower is now a squat gate tower so nothing reads as a minaret. Touch buttons are hidden on the title screen.
  - `.github/workflows/pages.yml` builds and deploys to GitHub Pages (approved by the user). One-time setup: Settings → Pages → Source: GitHub Actions.
- **R10: content and length (`content.js`).**
  - Six named field captains, two per act, each with an affix: Swift, Ironclad, Volley, Firebrand (telegraphed naft pools), Rallying (speeds up his guards). Slain captains persist in the save.
  - A new area per act, each with a style in `interior.js` and a named captain guarding the chest:
    - Act I: the Caravanserai Storerooms (Qays).
    - Act II: the Clay Pits (Thabit).
    - Act III: the Sasanian Vaults (Mundhir).
  - Three new side tasks:
    - The Courier's Satchel: new NPC Rafi', a barid courier in the suq.
    - Indian Steel: Bishr; the reward is a free tempering.
    - Ash for the Engines: 'Amr, from Act III. Burn three mangonels at the arch; doing so removes Ghassan's naft barrage and changes his phase-2 line.
  - Ghassan's final duel below 25% health: shield down, a cutscene line, a ring of fire 15 m around the arena (burns if you leave it) and telegraphed lunges.
  - New Game+ from the victory screen: keeps hero, gear, disciplines, stash and codex; the world resets, and foes get +4 levels, ×2.4 health and ×1.8 damage per cycle.
  - Epithets removed: Farud, Hisham and Ghassan go by their names only, and elites are shown as "Name · Role".
  - Three new codex entries: The Arch of Ctesiphon, Mangonels, Indian Steel.

## Test tools
- `shots/shot.mjs`: a single screenshot.
- `shots/multi.mjs <w> <h> <query> <outdir> <steps.json>`: one page load, many shots. `shots/close.js` adds close-up camera helpers.
- `shots/perf.mjs <query>`: average draw calls over 10 frames.
- `shots/draws.mjs <query>`: draw calls broken down by object, main pass and shadow pass.
- `shots/eval.mjs <query> <js>`: evaluate an expression in the page.
- `shots/ngtest.mjs`: New Game+ round trip.
- `shots/` is gitignored, so add new scripts with `git add -f`. `shots/regress.mjs` and its baseline were not in the Round 8 zip and are lost.
- Debug hooks: `__game`, `__sim(sec)`, `__director`, `__SCENES`, `__mk(level, rarity, slot)`.
- Headless SwiftShader is slow (about 1 fps). Don't run two captures at once. Frame-rate-dependent things (culling timers, CSS transitions) crawl in headless, so `__sim` runs the cull itself.

## Publishing
1. `npx vite build`
2. `node shots/inline.mjs out.html` inlines the JS and CSS and drops the PWA links. The script was rewritten in Round 10.
3. Publish with the Artifact tool to https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c. In a new chat, read the artifact first, then publish with `url`.
4. It is currently at about 1.06 MB, after the Round 10 publish.

## Round 11 (done)
- **Fluid combat (`game.js` updatePlayer, `classes.js` mobility, `mobile.js` attack hold):**
  - Holding attack (or auto-attack) keeps a target while you steer with the joystick.
  - Movement speed while an attack plays depends on the class: Faris 0.3 until the blow lands, Rami 0.92, Naffat 0.8, 'Ayyar 0.7.
  - Moving cancels an attack's recovery once the hit has landed.
  - Ranged classes keep facing their target while kiting; backpedalling is 0.8× speed.
- **Rename:** Ziyad is now Farud everywhere (Arabic فرود).
- **Story rewrite:** themes only (see `STORY.md`). The Teacher's Pages, Jabir's death in the prologue, the new briefing, Farud's confession, Hisham's betrayal, Ghassan fouling the water, the duel line, and the lamps-on-the-canal epilogue. All of it has Arabic in `story_ar.js`.
- **Class picker bug fixed:** taps fell through to the canvas because `#ui` has pointer-events:none.

## Known gaps (start Round 12 here)
**The user's playtest on Android (top priority):**
1. Menus and panels don't close when you tap outside them; you have to tap the menu button again, which is unintuitive.
2. Panels don't fit on a phone screen. The inventory and equipment can't be seen at all.
3. The mobile interface is "nowhere near" AAA mobile quality.

**Other gaps:**
4. Jabir slumps rather than lying fully down in the prologue, because the death fall doesn't finish in cutscenes. Farud's and Hisham's death shots and the boss intro still use the old camera work.
5. Combat feel hasn't been verified on a device. Walking sideways while keeping aim can look like gliding.
6. Named-captain labels aren't translated into Arabic. CC0 models are approved but kenney.nl and quaternius.com are blocked.

## Next: Round 12, mobile UI overhaul (confirm with the user before building)
Build a mobile-first UI at AAA mobile ARPG quality (Diablo Immortal is the reference).

**Panels and navigation:**
- Every panel (inventory, equipment, merchant, smith, stash, trainer, skill tree, journal and codex, settings) becomes a full-screen sheet with a big ✕. Tapping the dimmed backdrop, pressing the Android back button (history API) or swiping down also closes it.
- Only one panel is open at a time.

**Inventory:**
- Equipment paper-doll on the left, a scrollable bag grid on the right, all inside the safe area.
- Tap an item to open a detail card with Equip / Sell / Salvage / Compare.

**Layout and touch targets:**
- Use the safe area (`env(safe-area-inset-*)`, dvh units) and test at 360×640, 412×915 and 915×412 landscape, plus small tablets.
- Touch targets at least 44 px, no hover-only info, no text below 12 px. Pressed states, haptics (`navigator.vibrate`) and transitions.
- A radial menu button that opens a bottom sheet of icons instead of a text list.

**HUD:**
- Declutter: orbs and skills sized to the thumb arcs, the quest tracker collapsible, and the minimap tap-to-expand.

**Testing:**
- Run the critique loop with `shots/multi.mjs` and `hasTouch/isMobile` viewports at each size.
- Check that nothing overflows: compare `scrollWidth` with `clientWidth` on every panel.

## File map (src/)
- **Core:** main.js (boot, loop, wiring), game.js (gameplay, AI, combat), classes.js, entities.js, items.js, save.js, content.js (R10 captains, areas, tasks, engines, duel, NG+)
- **World:** world.js, terrain.js, buildings.js, props.js, vegetation.js, water.js, interior.js, zones.js, hub.js
- **Rendering:** graphics.js, lighting.js, lights.js, atmos.js, fx.js, perf.js
- **Characters:** sculpt.js, human.js, creatures.js (camels), charmats.js, cloth.js, anim.js, characters.js, geocache.js
- **Story:** cinema.js, scenes.js, narrative.js
- **Progression:** progression.js
- **Audio:** audio.js, audio2.js
- **UI:** ui.js, mobile.js, style.css (later rounds append their own sections), settings.js, i18n.js + story_ar.js, gamepad.js, tutorial.js
