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

## Round 12 (done): mobile UI overhaul
- **Sheets (`sheets.js`):** inventory, suq panels, qanat panel, skills, journal/codex, settings and the menu are all sheets over a dimmed backdrop. Each closes from its 44 px ✕, a backdrop tap, Android Back, or a swipe down on its header. Opening one closes any other. Open sheets are found in the DOM (MutationObserver), so modules keep building their panels as before. One history entry (`{sheet:1}`) stands for "a sheet is open" and is reused rather than popped, because popping it from code raced the next open.
- **Layout:** on touch, sheets fill the screen inside the safe area with a 10 px margin. On desktop they are centred, at most 980 px wide. Bodies scroll inside the sheet (`.sbody`, `.jbody`, `.sgrid2`, `.invbody`).
- **Inventory:** paper-doll grid (weapon tall on the left) and a stats block on the left; the pack grid (auto-fill, cells at least 54 px) on the right; in portrait they stack. ▲ marks upgrades. Tapping any item opens the **item card** (`ui.itemCard`): full details, Compare (side by side with what's worn, plus a damage/armour delta), and Equip / Sell / Salvage, or Unequip for worn items. Sell and Salvage work anywhere.
- **Suq on touch:** a tap opens the item card with the panel's action (Buy · price, Sell · price, Salvage, Take, Store). Desktop keeps hover tooltips and click-to-act. Merchant and stash use two columns in landscape.
- **Menu:** ☰ (48 px) opens a bottom sheet of six icon tiles: Inventory, Disciplines, Journal, Codex, Map, Settings. The old Controls popup is gone; button size and opacity are now in Settings → Controls (touch only).
- **HUD:** 62 px orbs at bottom centre showing the current value; potion and evade buttons enlarged to 58 px; the quest tracker shows ▾/▴; the minimap expands on tap and closes on tap or backdrop; touch controls hide while a sheet is open.
- **Feel:** haptics (`navigator.vibrate`) on sheet open, buttons and skills; pressed states on all tappable things; no touch text below 12 px.
- **Extras:**
  - Death falls always finish. A cutscene that sets `st.deadT` snaps to lying, and lying bodies are raised to rest on the ground. In the prologue Jabir is turned to lie along the dune's contour, and his line is now framed over Salim's shoulder.
  - Strafing gait (`anim.js`): shorter, quicker side-steps, a wider stance, and hips and feet turned into the step while the chest stays on the target.
  - Arabic for "Name · Role/Affix · Lv n" labels (i18n pattern) and for the new sheet buttons.
- **Rule fixes:** the Ward icon's two overlapping squares (an 8-point star) became a dashed ring; the amulet gem lost its 4-point star. Gauntlet captains are now single names (Malik, Sa'd, 'Ubayd, Hani, Mukhariq · Role) instead of "Farud's Shade" or "the Unbroken", and qanat captains are "Name · Captain". `ui.curCls` is now set, so "X weapon" only warns for other classes.
- **Testing:** `shots/multi.mjs` at 915×412, 360×640, 412×915, 1024×600 (touch) and 1440×900 (desktop) showed no horizontal overflow and no sheet off-screen. Inject a `*{animation-duration:0s;transition:none}` style first, because headless capture otherwise catches the sheets mid-fade.

## Round 13 (done): full screen, smooth image, plain story, guidance
- **Immersive APK:** `MainActivity.java` hides the status and navigation bars (an edge swipe shows them briefly), draws into the camera cutout, and keeps the screen on. The viewport has `viewport-fit=cover`.
- **Smoother image:**
  - Film grain removed; only a sub-1/255 dither remains to stop banding.
  - Chromatic aberration reduced to a third.
  - New **Sharpness** setting (Settings → Graphics): Smooth (native resolution up to 2×, the default), Balanced (1.5×) or Fast (1×). Adaptive quality never drops Smooth below 1.5×.
  - The see-through dither hole is off in cutscenes; on walls it read as grain.
- **Plain story:** every cutscene line was rewritten short and plain (`scenes.js`, `game.js`, Arabic in `story_ar.js`). The briefing now says who, what and where: Ishaq, the Pages, Ghassan, and "start with Farud". Lines and captions hold until tapped, with a "Tap to continue ▸" cue, and move on by themselves after 20 s. Act cards say what to do ("Hisham is burning the Pages in the kilns. Stop him.").
- **Guidance (`guide.js`):** glowing chevrons flow along an A* path (`findPath`) from the hero to the current objective, re-pathed every 0.6 s and showing about 46 m ahead. They fade near the goal, in fights and in cutscenes. Underground they lead to the chest, then to the way out. The tracker shows the active objective and its distance (`ui.objective`), and on touch it replaces the story title.
- **Mobile polish:**
  - Death and victory hide the HUD and touch controls (`body.overlay`), and victory fits 412 px tall screens.
  - Toasts sit above the orbs on touch, clear of the area banners.
  - The dialogue box has larger text.
  - The title-screen control hint sits on a pill.
- **Rule fixes:** the skyline palace lost its pointed dome and finial; it is now a stepped hall with a low green roof. The small rooftop domes on village houses (they read like tombs) are now wind-catchers.

## Round 14 (done): playtest fixes
- **Auto-pickup:** walking within 1.6 m picks up gold, sherbet and any item above common. White items wait for a tap. A full pack shows one "Pack full" toast per item.
- **Ghassan freezes fixed:** lights are never added at runtime now. The 3 fx flash lights and the boss light are created dark at startup, because a new light changes the light count and recompiles every lit shader. In a test the shader program count stayed flat (92 to 93) through boss spawn, phase 2 and the duel. Decals are capped at 40 and their geometry is disposed.
- **Class picker:** fits one screen and never scrolls (it has an explicit 100dvh height). On short screens it uses compact cards with icon-only kits.
- **Intro without violence:** a title card, then Jabir ("Two more days to Baghdad"), then Salim ("Too quiet"), then riders standing on the dunes seen from afar, then a fade to black ("Bandits attacked the caravan at dusk"), then Salim kneeling by Jabir (his last words), then Salim's promise, then a closing caption. No arrows, blows or deaths are on screen. The intro uses the pre-made boss light as its lantern. Lieutenant deaths are no longer slow-motion orbits (a calm over-the-shoulder shot at normal speed), and the epilogue's first shot is no longer in slow motion.

## Next: Round 15+, content expansion (proposed; confirm with the user before building)
The goal is about 8–12 hours for a first playthrough, up from about 1.5 today, plus a repeatable endgame. It is split into rounds so each one ships playable.

**R15: two new acts (main story about 2× longer)**
- **Act IV, The Nahrawan Marshes.** Reed beds, flooded canals and fishing villages. The last Pages were carried off by Ghassan's paymaster, Rawh. New foes: slingers, net-throwers, reed ambushers.
- **Act V, The Kufa Gate Suburb.** Burned market streets outside the Round City walls. Rawh's buyer's men hold the gate yards; the buyer stays unnamed. The finale is a two-phase street fight, then the Pages are delivered to the House of Wisdom scholars. The building itself is never shown as anything religious.
- Each act gets a hub corner, two named captains, one new interior, a lieutenant fight and calm, non-violent cutscenes. All lines are short and tap-to-continue, with Arabic.

**R16: side content (about +3 h)**
- **12 new side quests** in short 2–3-step chains across new and old NPCs. Examples: a potter's stolen kiln tools, a boatman's missing son held by bandits, a scribe's ledger, a horse trader's herd.
- **Bounty board in the suq:** 3 rotating bounties per act (slay a captain, clear an interior, escort a mule cart, recover goods), paying gold, materials and Renown.
- **Ambient world events:** a caravan under attack on the road, a well being fouled, a burning granary. These are timed field events that the trail points to.

**R17: dungeons and endgame (repeatable)**
- **Six new interior styles:** cistern, granary vaults, salt mine, brick-kiln tunnels II, palace cellars and a reed-hut warren. Each has its own room kit and hazards (flooding floor, collapsing stacks, smoke).
- **Captain's Contracts:** pick a captain, a region and modifiers; scaled rewards. This joins the qanat tiers and the Gauntlet.
- **Renown:** account-wide points after the level cap, spent on a small passive board.

**R18: loot and build depth**
- Legendary aspects go from 8 to 20 (5 per class) and item sets from 2 to 5. Socketed gems (ruby, lapis, carnelian) arrive with the blacksmith.
- A fifth skill slot unlocks at level 15, with 2 alternate skills per class.
- Level cap 30, with stash tabs.

**Constraints for every round:** human foes only; no religious buildings or symbols; 813 CE authentic names, dress and weapons; Rast/Bayati music; no violence on screen in cutscenes; mobile first; and no lights or new shader variants created at runtime (create them at load).

**Questions for the user before R15:** the order of rounds; the names and setting of Acts IV and V; whether Rawh and the unnamed buyer are right; whether bounties should reset daily (real time) or per act.

## Known gaps
1. Verify on a device: immersive mode, Smooth sharpness frame rate, the trail's readability in sunlight, and Back.
2. Side-quest objectives are not on the trail yet (main quest and interiors only); tapping a tracker entry to pick the target was offered but not chosen.
3. Farud's and Hisham's death shots and the boss intro still use the old camera work.

## File map (src/)
- **Core:** main.js (boot, loop, wiring), game.js (gameplay, AI, combat), classes.js, entities.js, items.js, save.js, content.js (R10 captains, areas, tasks, engines, duel, NG+)
- **World:** world.js, terrain.js, buildings.js, props.js, vegetation.js, water.js, interior.js, zones.js, hub.js
- **Rendering:** graphics.js, lighting.js, lights.js, atmos.js, fx.js, perf.js
- **Characters:** sculpt.js, human.js, creatures.js (camels), charmats.js, cloth.js, anim.js, characters.js, geocache.js
- **Story:** cinema.js, scenes.js, narrative.js
- **Progression:** progression.js
- **Audio:** audio.js, audio2.js
- **UI:** guide.js (objective trail), ui.js, sheets.js (sheet manager, haptics), mobile.js, style.css (later rounds append their own sections), settings.js, i18n.js + story_ar.js, gamepad.js, tutorial.js
