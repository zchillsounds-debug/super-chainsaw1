# Madinat al-Salam: Handoff (Round 21: tests and publish left)

## Paste this into the new chat
> I'm continuing a game project called **Madinat al-Salam**: a Diablo-style 3D ARPG in Three.js, set on the outskirts of Abbasid Baghdad just after the siege of 813 CE. The code is on branch `ccr-56d2fa55-vx1w3y` of zchillsounds-debug/super-chainsaw1 (it holds all of Round 21).
>
> **Round 21 is built and approved; only part of the test sweep and the Artifact publish are left. Don't re-plan it.** Please:
> 1. Fetch the branch (`git fetch origin ccr-56d2fa55-vx1w3y && git checkout -B <your session branch> FETCH_HEAD`) and read HANDOFF.md fully, especially "Round 21" → "Remaining".
> 2. Run `npm install`. Run tests with `shots/withvite.sh node shots/<test>.mjs ...` (it starts vite, runs the test, stops vite). The rest of the sweep: `shots/withvite.sh sh shots/sweep.sh` after deleting the lines that already passed.
> 3. Fix anything that fails, then ship.
>
> The goal is AAA mobile quality, with Diablo IV and Diablo Immortal as the bar. I play on Android. When Round 21 is done:
> - Republish the game as a playable Artifact, updating https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (read it first, then publish with `url`). Touch controls must keep working.
> - Push to the session's assigned branch.
> - Send me the APK that CI builds (see "Getting the APK to the user"; trigger `apk.yml` by hand if the branch isn't `claude/**`).
> - Then ask me what Round 22 should be, and confirm before building.

## Restore the code
```
unzip madinat-round19-handoff.zip -d madinat && cd madinat
git clone repo.bundle game && cd game        # Round 20 is on branch ccr-c97baf64-6kbn83 (Round 19: ccr-56d2fa55-vx1w3y)
npm install && npx vite --port 5173          # http://localhost:5173
```
If the session's repo is empty, run `git fetch <path>/repo.bundle 'refs/heads/*:refs/remotes/bundle/*'` and then `git checkout -B <session-branch> bundle/ccr-c97baf64-6kbn83`. If the repo has the branch, just `git fetch origin ccr-a81550d1-0nkldn && git checkout -B <session-branch> FETCH_HEAD` (Round 21 work; Round 20 alone is `ccr-c97baf64-6kbn83`).

URL flags:
- `?play` skips the title screen.
- `?mobile` forces the touch UI.
- `?q=low|high` sets quality; `?noadapt` turns off automatic quality.
- `?x=..&z=..` sets the spawn point.
- `?cls=faris|rami|naffat|ayyar` picks the class.
- `?tod=golden|dusk|night|dawn|underground` sets the time of day.
- `?perf` shows the performance overlay.
- `?region=sawad|marsh|karkh|docks` forces a map.
- Headless tests: use `shots/withvite.sh <cmd>` (starts vite, runs the test, stops it). A background server is killed after two hours.
- `?region=hamrin` forces the endgame map.

**GitHub now works.** The account was reconnected and the Claude GitHub App was installed in Round 11, and pushes succeed.

**Getting the APK to the user:**
- `.github/workflows/apk.yml` builds a debug APK on every push to `main` or `claude/**` (Capacitor 6 wrapper, `android/`, landscape). If the session branch has another name (Round 19's was `ccr-...`), trigger it by hand: GitHub MCP `actions_run_trigger` with method `run_workflow`, workflow `apk.yml`, ref = the branch.
- The Actions download host (blob.core.windows.net) is blocked in the cloud session, so the workflow also force-pushes the APK to the orphan branch **`apk-builds`**.
- To fetch it: `git fetch origin apk-builds && git show origin/apk-builds:sands-of-baghdad.apk > <scratchpad>/sands-of-baghdad.apk`. Wait until the commit message shows your short SHA, then send the file with SendUserFile.
- dl.google.com is blocked too, so you can't build the APK locally; always build it through CI.

## Non-negotiable design rules (from the user)
- **No religious buildings or symbols at all.** That means no mosques, minarets, mausoleums or graves, and no crescents, crosses or star sigils (8-point stars included). No Quranic text and no religious greetings. Kufic-style lettering is fine only with non-religious text.
- **No supernatural enemies.** All foes are human: brigands, deserters, mercenaries.
- **Authentic to 813 CE, not Western tropes.** Use straight sayf swords, qalansuwa or bayda headgear, qaba coats and black Abbasid dress. Use short single period names with no epithets.
- **Music in the Abbasid court style:** Rast/Bayati modes, played on oud, qanun and daff. No Hijaz cliché.
- **Ask clarifying questions and confirm before building.**

## Title
The game is called **Madinat al-Salam** (مدينة السلام, "the City of Peace"), Baghdad's official Abbasid name. The user renamed it from "Sands of Baghdad", which leaned on a Western desert cliché. The app id stays `com.zchill.sandsofbaghdad`, so installed saves carry over.

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

## Round 15 (done): Acts IV and V, two new maps
- **Separate maps (`region.js`):** the Sawad (Acts I–III), the Nahrawan marshes (Act IV) and al-Karkh (Act V). The region is chosen at load from the save's act (4 = marsh, 5 and 6 = Karkh). `?region=marsh|karkh` forces one (with `?play`, it also sets the act). `game.travel()` saves, sets `sob.autocontinue` and reloads; the first visit to a region plays `SCENES.arrival` (tracked in `save.arrived`). "New Chronicle" from a later region sets `sob.newgame` and reloads into the Sawad.
- **Per-region data:** `region.js` (hub corner positions, quest chain, banners) and `story15.js` (captain lines and cards, the boss kit and lines, Ishaq's talk). The `SITES` keys are the same everywhere: `village` = hub, `serai` = first captain, `kiln` = second, `arch` = last fight.
- **Terrain (`terrain.js`):** region height functions, roads (marsh causeways, Karkh lanes), shader palettes (`#define RG`), `waterDepth()` and `mapColor()`. Marsh: open water at `WATER_Y` -0.45. Ground below `DEEP_Y` -1.05 is blocked by edge colliders; shallows are wadeable at 0.62× speed, with splashes and the water footstep sound.
- **Dressing:** `regions.js` (`buildMarsh` / `buildKarkh`), `regionprops.js`, plus `tallReeds` in `vegetation.js` and `createLagoon` in `water.js`.
  - Marsh: mudhif reed halls, bitumen mashuf boats bobbing, fish racks, nets, reed stacks, the Sasanian weir, lily pads, a reed wall on the horizon.
  - Karkh: gutted houses (merged into 40 m chunks that keep the see-through hole), burned stalls, beam piles, the paper-sellers' shops, the khan with the scholars' shelves and table, the pyre, the Round City wall and gate on the skyline, smoke columns, falling ash and embers.
- **Foes (`entities.js`):** Slinger (stones lobbed onto a marked ring), Net-thrower (a spinning net that pins the hero for 1.5 s; an evade tears free), Reed Ambusher (hidden in the reeds), Hired Guard.
- **Bosses:**
  - Rawh (L9) at the weir: stone volleys, a three-net fan in phase 2 (below 50%), reed-men reinforcements.
  - 'Utba (L12) in the square: arrow fans, then naft pots below 65% (phase 2). Below 35% his shield goes down and the stalls burn in a ring with lunges (the duel, now generic: `kit.duelAt`).
  - `bossAI` reads `b.kit` (`volley` / `barrage` / `summon` / `phaseAt`).
- **Content (`content.js`):** field captains Zuhayr (Snaring) and Muhriz (Reed-born) in the marsh, Hammad (Rallying) and Shabib (Volley) in Karkh. Interiors: the Drowned Granary (`flood` style, captain Ghalib) and the Merchants' Cellars (`scorched`, Qutayba). The Sawad's side tasks (Rafi', ingots, engines) stay in the Sawad. Five codex entries (Nahrawan, Marsh Boats, Reed Halls, Al-Karkh, the Paper-Sellers), unlocked by place.
- **Story:**
  - The Ghassan epilogue now ends "the chest is light", naming Rawh, with the Act IV card.
  - Marwan → Sahl → Rawh ("sent the last bundle up the canal") → Act V.
  - 'Asim → Layth → 'Utba → finale: the Pages taken off the pyre, given to Hakam of the House of Wisdom in the khan, then lamps on the Sarat canal ("We keep the account"), then the closing card and the victory screen with NG+.
  - All of it has Arabic (end of `story_ar.js`).
- **Look:** lighting presets `mist` (Act IV) and `haze` (Act V) with their own grades (LUT ids 5 and 6); scores for acts 4–6 in `audio2.js`.
- **Fixes:** the boss could freeze if a cutscene gave him an action with no duration; the guide trail and Ishaq's marker now hide in cutscenes; props hidden by distance culling are now compiled at load (no hitch when you walk up to a site); the far Round City is merged into one mesh.
- **Tests:** `shots/r15test.mjs <region>` (systems smoke test) and `shots/traveltest.mjs` (Sawad → marsh → Karkh through reloads), both clean. Draws: Sawad hub 625; Karkh hub 710; marsh camp about 810; Karkh suq 848 (Sawad serai 809).

## Round 16 (done): side content
- **`sidequests.js`** (new) holds all Round 16 content.
- **12 side quests,** four per region, each with a new giver standing in the hub:
  - Sawad: The Potter's Tools (Zayd), The Scribe's Ledger (Nadr), The Camel Trader's String (Hudba, a camel escort), Jabir's Spear (from Ishaq: a quiet scene on the dune, no combat, rewarding the legendary amulet "Jabir's Spearhead").
  - Marshes: The Boatman's Son (Hilal; escort the boy Saqr), Cut Nets (Jamil), The Strayed Buffalo (Rabah; escort the buffalo), The Debt Ledger (Bashshar).
  - Al-Karkh: The Dyers' Vats ('Abbad), The Copyist's Pens (Sa'id), Lost in the Ruins (Ma'mar; escort two children, with an ambush on the way), The Bridge Toll (Nu'aym).
- **How quests are built:** steps are data, of these kinds: `kill` (a band at a spot), `take` (an object, often guarded), `escort` (followers trail the hero; forgiving, as they can't die and wait if left behind), `visit` (a place and a scene) and `return` (talk to the giver). Progress uses `p.side[id]` as before, and each step's spawns and objects are rebuilt on load (`game.restoreSide`). Rewards are gold, an item, Renown and sometimes a codex entry. Givers have a blue marker while they have something to offer or are waiting for you.
- **Water buffalo** (`creatures.js`): sculpted and skinned like the camel, with a diagonal gait, a low head and swept horns. Three graze in the marsh village.
  - Pitfall: the per-vertex material id is interpolated across the mesh, so two regions only meet cleanly if their ids are adjacent numbers (the buffalo uses 10, 11 and 12). Otherwise a stripe of the in-between colours shows along the seam.
- **Daily bounty board** in each hub ("Read the bounty board"; the panel is a `#shop` sheet).
  - Three bounties per day, seeded by the date plus the region. Types: hunt a named captain, recover stolen goods, escort a laden camel (a buffalo in the marshes), clear an interior and open its chest.
  - Rewards: gold, scrap, silk, gems and Renown (`p.renown`, which Round 17 spends).
  - State lives in `p.bounty[region] = { day, taken, done }`.
- **World events:** every 4–7 minutes (the first after about 2.5–4.5), when no boss fight or cutscene is running. There are two per region: a caravan under attack, a fouled well, an ambush on the water, burning reed stacks, a burning granary, a convoy ambush. They give you 150 seconds, show a countdown in the tracker and are auto-tracked on the trail. Winning drops a rare or legendary item, gold and Renown.
- **Tracker selection:** side tasks, bounties and events in the tracker can be tapped (touch: open the tracker, then tap a line; desktop: click) to put that task on the glowing trail. Tap it again to go back to the story. `game.trackTarget()` feeds the guide. This closes Known gap 2.
- **Arabic** for all of it (end of `story_ar.js`, plus bounty patterns in `i18n.js`).
- **Tests:** `shots/r16test.mjs <region>` plays every quest, bounty and an event to completion; all three regions are clean.

## Round 17 (done): dungeons and endgame
User decisions: Renown buys passives only (no cosmetics); Contracts are unlimited; all six dungeon styles; the level cap stays at 25 until R18.
- **`dungeons.js`** (new) holds all Round 17 content. `interior.js` has six new styles, and each room records hazard anchors in `I.hazards`.
- **Six new dungeons,** two per region, each with an entrance on the map, a named captain at the chest, and level scaling with the hero (`def.scale`):
  - Sawad: the Old Cistern (Wahb; the water rises every 14 s, with ripples and a toast 2 s ahead; stone landings stay dry, everyone else is slowed) and the Lower Kilns (Bujayr; floor vents glow, then blast; the smoke left behind hides the hero).
  - Marshes: the Granary Vaults (Hurayth; strike a grain stack and 0.6 s later it falls in a 3.2 m ring that hurts and staggers foes, and you too if you stay) and the Reed Warren (Sinan; huts smoke for 2 s, burn for 8 s, and spread fire to huts within 7 m).
  - Al-Karkh: the Salt Workings (Unays; narrow 2.2 m doors and salt pillars; roof-crack shafts flare on a 9 s cycle and dazzle the hero, a white screen at reduced strength under "reduce flashing", plus a slow) and the Palace Cellars (Habib; light cracked-tile pressure plates fire bolts 0.55 s after being stepped on, by the hero or by foes).
  - All of them are bounty "clear" targets. Interactables now carry `area`, and the tracker finds entrances by it.
- **Captain's Contracts:** a board next to Ishaq in every hub. Pick a captain you have slain (`p.slain`, recorded for named and area captains), a ground from this region's styles, and up to three MODS from the qanat pool. The run is level +1 per modifier, with extra chest loot, 60×level×(1+0.5n) dinars and 10+10n Renown. Unlimited.
- **Renown board:** 12 nodes with 2–3 ranks each, costing 20/40/60 (`p.rb`), opened from the ☰ menu tile "Renown" or the N key. Hooks: `p.potCap`, `p.evadeK`, `p.xpK`, `p.healK`, `game.hazSlow`, plus wraps of recalcStats, dropItem and dmgMod.
- Arabic for everything (end of `story_ar.js`).
- **Test:** `node shots/r17test.mjs <region> [shots]` enters each new dungeon, triggers its hazard, buys every Renown rank and runs a contract. All three regions are clean.

## Round 18 (done): loot and build depth
User decisions: alternate skills unlock by level; Bishr cuts sockets for a fee; stash tabs cost 500/1500/4000; the third new set is the Karkh paper-seller (warraq), not a House of Wisdom courier.
- **`build.js`** (new) holds most of Round 18. `g.slotDefs()` now comes from the loadout (`p.loadout[cls]`, slot → skill id).
- **Fifth skill slot `s4`** at level 15 (key 4; on touch it sits above the cluster as `.t-s4`). **Alternate skills** (`ALT_SKILLS` in `classes.js`) open at 15 and 20:
  - Faris: Rallying Cry, Sweeping Cut.
  - Rami: Pinning Shot, Scatter Volley.
  - Naffat: Naft Mortar, Burning Brand.
  - 'Ayyar: Death Mark, Blinding Powder.
  - Any skill can go in any slot from Disciplines (tap a slot, then a skill; picking a skill already slotted swaps the two).
- **Aspects: 8 → 20.** Twelve discipline aspects (`cls` field) only drop for that discipline: bulwark, unbroken, onset / split, hawk, quiver / spill, cinder, bellows / shade, alley, edge. Hooks wrap useSkill, onKill, onHit, dmgMod, playerShot and spawnZone.
- **Sets: 2 → 5.** New: Panoply of the Abna', Outfit of the Basra Nakhuda, Tools of the Warraq.
- **Gems** (`p.gems`, keys like `ruby2`): ruby, lapis and carnelian, in three grades. Effects differ in a weapon and in other gear (see `GEMS`). One per dungeon chest, more from contracts, sometimes from captains. Bishr's new Gems tab cuts a socket, sets or removes a gem, and combines 3 into 1.
- **Level cap 30** (`MAX_LEVEL` in `game.js`). **Stash tabs:** 3 extra pages (`p.stashTabs`, `p.stashPages`).
- **Save fix:** Round 17's Renown board and slain captains were never saved. `save.js` now saves an `EXTRA` key list.
- **Test:** `node shots/r18test.mjs <cls> [shots]` is clean for all four classes; `r17test` is still clean.

## Round 19 (done): camera, map travel, AAA graphics
User decisions this round: full Round 19 plus a long graphics critique loop; looks above all (High is now the default on phones, adaptive quality only sheds below ~24 fps); ship once at the end.
- **Camera (`travel.js`, `game.js` updateCamera):** pinch / mouse wheel zoom 0.5–1.7, saved in `sob.zoom`. Close in, the camera drops toward over-the-shoulder; out, it rises high. It eases back when 3+ foes are alerted nearby, more for a captain. Enemy view culling widens with zoom.
- **Map travel (`travel.js`):** M key, the ☰ Map tile or a tap on the minimap opens a full-screen painted map (terrain colour + hill shading + walls inked from the nav grid). Pan with one finger, pinch to zoom. Tap the ground to walk there along an A* path (`g.walkTo`, `g.walk`; the guide trail follows it; the joystick, attacking or a target cancels it). Waypoints (hub, captain sites, dungeon entrances, qanat shaft, contract board) are discovered within 16 m (`p.visited[region]`, saved). Tap a found waypoint for Walk there / Fast travel. Fast travel is blocked underground, in a fight (alerted foe within 22 m) or with a captain engaged. A long tap-to-move on the ground also pathfinds around walls.
- **Ground (`groundtex.js`, `terrain.js`):** four seamless materials are baked on the GPU at load (sand with pebbles, cracked earth, flagstones, packed road): brightness/feature/height plus normal and cavity. The terrain shader colours them per region, blends them by height (pebbles and stone tops poke through, sand settles in joints and drifts over paving), and fights tiling with a rotated second lookup. Marsh ground has dark wet mud and glossy puddles. Dungeon floors (`interior.js` floorMat) use the same bakes, with puddles in the cistern, qanat and flooded granary.
- **Light (`volume.js`, `lighting.js`):** a half-res ray-marched volumetric pass reads the sun shadow map, so dust glows in sunlight and stays dark in shadow (real god rays through palms and arches). Density per preset (`vol`), thicker in sandstorms. Depth comes from the GTAO G-buffer, which now skips transparent/additive meshes (they were muddying AO). The old sun-shaft slabs are hidden where the volume runs. Hero fill light per preset (`hero`), which in cutscenes becomes a soft key beside the camera. Character rim tinted by time of day (`RIM_G`), cloth sheen on fabric. Night is desaturated moonlight; dusk is teal shadows and amber light; the grade keeps highlights saturated.
- **Water (`reflect.js`, `water.js`):** planar reflections at 0.4× resolution, every other frame, only when water is in the view frustum (marsh always). Reflected: terrain, sky, buildings, palms, characters. Physically based fresnel, darker water, sharp sun glints. Wading spawns ripple rings (8 slots, `REFL.uRip`).
- **Buildings (`triplanar.js`, `game.js`):** sand settles on every upward face, salt bloom at the wall foot, rain streaks. Diablo-style cutaway: walls between camera and hero are cut above head height over a wide radius (also in the AO pass), plus the old dither hole.
- **Combat (`combatfx.js`, `fx.js`):** blade light trails (pooled ribbons, arc-interpolated; colour per discipline; torch trails burn), crescent impact slashes, crit flash plus shockwave, dust on knockback and stagger, ground cracks under heavy blows. Fire and smoke particles are now shaded (hot core, torn edges; rolling smoke billows). Rings are shockwaves with a leading edge. Brazier and campfire coals are a pulsing ember shader (`ember.js`).
- **Life (`ambient.js`, `vegetation.js`):** gusting wind (lean, travelling gust fronts, flutter; `wind.uWindK`); footprints in sand (72 pooled, 25 s fade); wind-blown sand streaks (GPU-animated); birds feeding on the ground that flush when you come near, in a fight or a storm; sandstorms every ~6–10 min in the Sawad and al-Karkh (never in cutscenes, boss fights or underground): thick sandy fog, dimmer sun, driven dust, foes see 45% less far (`g.sightK`).
- **Rules kept:** no lights added at runtime (hero light made at load); pooled effects start hidden, so main.js now shows every hidden object during the load-time compile and hides them again.
- **Draws:** Sawad hub 648 (High), marsh camp 717, Low 341.
- **Tests:** `shots/crit.mjs <out> [names]` (the critique set: hub, fight, kiln dusk, night arch, hero close-up, marsh, Karkh, portrait), `shots/skills.mjs <out> <cls>` (skill effects), `shots/dung.mjs <out> <region> <ids>` (dungeon rooms), `shots/bakedump.mjs` (ground bakes as PNG), `shots/console.mjs <query>` (console errors and warnings). r17test and r18test still pass.
- **Headless note:** the main loop only advances when a screenshot forces a frame; use `__sim` for time-based effects.

## Round 20 (done): improve and expand
User decisions: everything on the menu, shipped once at the end; Act VI at the Tigris docks; the companion is a hired guard; the camel is for travel only; overhead camera by default with more zoom-out; fix the Naffat's robe.
- **Camera (`game.js` updateCamera, `travel.js`):** default zoom 1.25 = a steep ~60° overhead view; zoom out to 2.4 (`ZOOM_MAX`); the saved zoom key changed to `sob.zoom2` so the new default shows. Shadow box and prop culling widen with zoom (`main.js`).
- **Naffat fix (`cloth.js`, `human.js`, `anim.js`):** cloth `maxSwing` keeps long robes from swinging up like a flag (a striding leg pushed the hem up in front of him); long robes are carried with the legs (`carry` 0.8) and split wider at the front; the torch is carried upright.
- **Animation (`anim.js`):** three-move chains per weapon (`VARIANTS`: sword, dagger stabs, spear thrust/high/sweep, bow quick/kneel, naft side/underhand throws); flinches away from the blow (`st.hitFrom`); three deaths (`st.deathKind`: knocked back, crumple to the knees and fall forward, twist). Captains always fall on their backs.
- **Faces and bodies (`human.js`, `charmats.js`):** relaxed lids, larger iris with a lid shadow, closed lips under the beard, arched brows, a broader male torso; cloth folds deepen as elbows and knees bend (`uJ`/`uBend` uniforms). Geometry cache `VERSION` is now `r20.0`.
- **Faction armour (`human.js` armourPrims):** `armour: leather | lamellar | scale | reed | heavy`, one extra sculpted piece; lamellar lacing is painted (`armourPaint`). Material ids that touch in one sculpt must be neighbours (see the comment). Marsh men wear reed hats (`hat`).
- **Captains (`entities.js` captainLook):** heavy lacquered lamellar in their own colour plus a crest (plume, mantle, felt cap, pennant, great shoulders), fixed for the six lieutenants (`NAMED`).
- **Cutscenes (`scenes.js`, Known gap 3 closed):** lieutenants: Salim walks up and kneels, a low shot over the fallen man, Salim's reaction, then the crane-up card; nearby guards are hidden for the scene. Boss intro: Salim's look, then a low-angle card shot.
- **New foes (`foes20.js`):** crossbowman (kneeling aim with a red line on the ground, `aimLines` pool, heavy bolt that shoves), siege engineer (runs to open ground and raises a mangonel, `TYPES20.mangonel`, which shells a wide ring until broken), camel raider (charge passes; thrown at half health, fights on as 'Unhorsed Raider'). Types with `T.ai` return `'skip'` when they handle themselves.
- **Hired guard (`companion.js`):** Kathir in every hub hires out Ma'n (spear) or Dirar (bow); one fee; can't be killed; travels with you; orders Follow / Hold / Attack (button or G). Saved as `p.companion`.
- **Camel mount (`mount.js`):** button or V; 1.65× pace; dismounts when foes come near, on attack/skill/evade, underground and in cutscenes. Rider pose: `st.mounted` in `anim.js`.
- **Dungeons (`interior.js`):** half-cone torch light and warm floor pools, daylight shafts through roof grates (shown only near the hero), wall props for every style (`dressProp`). `buildInterior` takes `styles` (a style per room).
- **Act VI, the river quays (`region.js` 'docks', `terrain.js` docksHeight/`DECKS`, `regions.js` buildDocks, `docksprops.js`):** the Tigris as a wide opaque river along a stone quay; walkable jetties; barges; warehouses with cranes; boatyard; the bridge of boats cut mid-river. Captains Bilal and Mus'ab, boss Ghanim (`TYPES.ghanim`: bolt volleys, mangonel stones from the far bank, fire-ring duel). Field captains Kulayb and Dhuhl, the Customs Vaults area, dungeons Flooded Undercroft and Wharf Vaults, four side quests, two world events, four codex entries. Acts: 6 = docks, 7 = chronicle finished. Al-Karkh's finale now ends with the Act VI card and travels on; the lamps scene moved to `SCENES.docksFinale`, which ends in victory and NG+. Lighting `golden` for act 6.
- **Siege Trials (`trials.js`, the "Siege Rift"):** board beside Ishaq; 5 mixed-style rooms + captain; 4 minutes; 10 tiers; foes = your level + 2×tier − 1; best time per tier and last runs in `p.rift`.
- **Side content:** four more quests each in the marshes and al-Karkh (`sidequests.js`), codex Sluices and Channels, Bread in Baghdad.
- **Loot (`items.js`, `craft.js`):** belt slot (sherbet healing, flasks carried, resource on drinking; legendary Girdle of the Water-Carrier). Bishr's Craft tab forges a rare of a chosen slot with a chosen property rolled high.
- **Benchmark (`bench.js`):** Settings → Graphics → Run benchmark (30 s): fps, slowest 1%, frame time, draw calls, a suggestion it can apply. Ask the user to run it on their phone and send the result line.
- **Keys:** E is the right-hand skill (4 used to fire two slots), V camel, G guard orders.
- **Arabic** for all new text (end of `story_ar.js`).
- **Tests (all clean):** `r15test` (all four regions), `r16test` (all four), `r17test docks`, `r18test` (four classes), `ngtest`, `traveltest` (Sawad → marsh → Karkh → docks), `finaletest <region>`, `trialtest`, `crafttest`, `benchtest`, `errs.mjs <query>` (page errors without waiting for ready).
- **Draws:** Sawad hub 781 High / 409 Low (was 648/341: wider default view, more characters); docks hub 860.
- **Known issue (also in Round 19):** in the marshes four standard-material programs (some with the wall-cutaway `occ` variant) compile during the Rawh fight; investigate with a programs diff like the one used this round.

## Round 21: approved plan and status
The user approved the full plan: everything on the Round 20 menu, a **post-game region** (the Hamrin ravines: an endgame hub plus four endgame dungeons), and the **Black Myth: Wukong close action camera** inside those dungeons, with **campfires** as rest points (no shrines). It ships **once at the end**: the Artifact, the push and the APK.

### Done (committed, tested)
- **Performance (`human.js`, `characters.js`, `main.js`).**
  - Each character's sculpted pieces are merged into one skinned mesh. The merged copy is packed to 28 bytes a vertex, and its CPU arrays are dropped after upload.
  - Both eyeballs are one mesh, as are both upper lids and both lower lids. They are kept out of the AO pass.
  - The three contact-shadow blobs are one dynamic mesh (`blobSync`).
  - Weapons are merged by material and share their geometry.
  - Small gear stays out of the AO pass, and crowds' gear casts no shadow.
  - Sawad hub went from 781 to 572 draws on High, and from 409 to 317 on Low. Geometry cache is now `r21.0`.
  - Adaptive quality steps down in four stages, with hysteresis and recovery (`QSTEPS`).
  - Shader warm-up: compile against `composer.readBuffer` and the reflection target, then draw one real frame of the whole map while the loader is up (culling paused, everything shown, a wide shadow box). Lights are on the reflection layer, because the reflection shares light state with the shadow pass.
  - The Rawh fight went from 7 programs compiled mid-fight to 1 small depth shader. Tools: `shots/progdiff.mjs`, `shots/progwho.mjs`, `shots/rigdraws.mjs`.
- **Companion (`companion.js`).**
  - Spare melee foes (`e.onGuard`) attack the guard.
  - He has health at 80% of Salim's. He gets knocked down instead of dying: stand beside him to help him up, or he gets up by himself 14 s after foes leave.
  - A health bar sits on his order button.
  - New hires: Tamim (naft-thrower) and Talha (an 'ayyar who slips round to a foe's back).
  - He rides his own camel, or a horse in the city. Test: `r21comp.mjs`.
- **Faces and mounts.**
  - New face bones: `browL/R` and `mouthL/R`, appended last. There are 12 expressions in `EXPR` (`anim.js`).
  - The cutscene director sets the speaker's expression from `line.expr`, or reads it from the words (`moodOf` in `cinema.js`). Listeners react (`line.react`).
  - Hair styles: crop, long, locks, tied. A trimmed beard. Crowds get them at random.
  - A horse (`creatures.js`) in al-Karkh and the docks, at 1.9× speed.
  - The `whistle` clip calls the mount, which trots in. Also new clips: `point` and `shove`.
  - A saluki sculpt (`saluki()` with `SALUKI_COATS`) for Hub life.
  - Tests: `faces.mjs` (keep the camera at least 1.2 m away: the near plane is 0.5), `r21mount.mjs`.
- **Rival and lieutenants (`rivals.js`).**
  - Zubayr, the bowman who shot Jabir, ambushes in Acts II, IV and VI (`RIVAL`) and escapes at 30% health. The last time he names the Hamrin hills. Saved as `p.rival`.
  - Hisham: a shove, then a hooked chain that pulls Salim in.
  - Layth: smoke, he vanishes (`e.ghost`), then lunges from behind with a glint.
  - Lieutenants show the boss bar. Test: `r21rival.mjs <region>`.
- **Hamrin (`hamrin.js`, `region.js`, `terrain.js`).**
  - Region `hamrin`. `regionForAct(7)` goes there when `localStorage['sob.endgame'] === 'hamrin'`.
  - In the docks hub after act 7: "Ride north to the Hamrin hills". In the Hamrin camp: "Ride back to the river quays".
  - Terraced badland cliffs (`hamrinHeight`, `HAMRIN_WALK`), with colliders ringing the walkable gorge floors. Palette `RG 4`.
  - The camp hub, four hold mouths, overworld packs (`spawnHamrin`, rescaled to Salim's level), field captains Asbagh and Kahmas, two events, codex entries.
  - Lighting presets `highland` and `gorge`; music act 8.
  - **The overworld look still needs a critique pass:** earlier shots looked washed out. The terraces and darker rock were changed but have not been re-shot.
- **Holds (`holds.js`).**
  - Four tile maps in `MAPS`: quarry, fort, gorge, rivalhold. 3 m tiles; the legend is in the file header.
  - `buildHold` makes rock, chasms (river or rubble floor, mist), plank bridges with ropes, low walls, rock columns, cracked walls, gates (open from the far side, worked out by BFS), campfires, chests and braziers.
  - Eight captains in `BOSS`, each with a `TYPES['hb_<id>']` look. They share the `MOVES` set: swing, slam, crack, rockfall, charge (stunned by walls), sweep, stomp (holes), arrows, fireline, firepots, net, summon, shrink (arena ring), vanish. Phase two is `p2`.
  - Zubayr's last stand: `rivalAI` plus moves. Final scene: `lieutenantFalls`.
  - Campfire rest: heal, refill, respawn his men, travel between lit fires, leave. Dying wakes Salim at the last fire. The guide trail follows `I.objective()`. Saved as `p.holds`.
  - The close camera is `game.actionCamera` (`g.camAction`): yaw follows, lock-on via `#lockbtn` or Tab/F with a reticle, the camera pulls in at walls, fov 52, and `joyWorld()` makes the joystick camera-relative. Test: `r21holds.mjs <id> [out]`. Quarry and gorge pass end to end.

### Done this session (items 1–4, all committed and tested)
1. **Holds and Hamrin critique.** `r21holds.mjs` passes for all four holds (quarry, fort, gorge, rivalhold).
   - Hamrin cliffs are shaded as bedded limestone and mudstone (`terrain.js` RG 4): lit ledge lips, undercuts, side-on grain, and no stretched top-down detail.
   - Terrace risers are steeper.
   - Bedded slabs jut from the faces with talus below (`hamrin.js`).
   - Rocks are smooth everywhere (`mergeVertices` in `vegetation.js` rocks).
   - Holds: Salim arrives a tile inside (`I.start`). The action camera rises over his shoulder when pulled in by rock, instead of entering his head.
   - `shots/crit.mjs` has Hamrin scenes: hamrin, hamrinwide, hamringorge, hamrinfort.
2. **Rift seasons and crafting** (`trials.js`, `craft.js`, `items.js`, `progression.js`).
   - `season()`: two of eight `SEASON_MODS`, seeded by ISO week, with a season best in `p.rift.season`.
   - Four trial-only legendaries (`TRIAL_UNIQUES`, `makeTrialUnique`), each with its own aspect: breach, lastgate, clock, sapper. They are guaranteed on the first clear of tiers 4, 7 and 10 (`p.rift.won`), with a chance from tier 3.
   - Recipe scrolls (`g.dropRecipe`, a green set beam) drop from captains (8%), hold and boss masters (35%) and dungeon chests (15%). Learned recipes go in `p.recipes`, and set pieces are forged from Bishr's Craft tab.
   - Test: `r21rift.mjs`.
3. **Hub life** (`hublife.js`, new).
   - Kennel and mews beside the trainer:
     - The saluki costs 250 and comes in 4 coats. He follows, sits, keeps back from fights and fetches gold.
     - The falcon costs 600. She sits on Salim's arm (on the shoulder for Faris and Rami). Outside camp she circles and marks hidden foes and archers within 32 m every 9 s.
   - Fishing: 3 marsh bank spots and the 4 docks jetty ends. Wait, strike within 0.95 s, then 3 good pulls on the timing bar (2 misses lose the fish).
     - Fish: himri, bunni, shilig, shabbut. Eating one gives a 5-minute buff (`p.food`); Yusuf buys them (`g.merchantExtra`).
   - Camp upgrades from "The camp's needs" ledger beside Ishaq, each with a before and after prop in every camp:
     - Well: +1 sherbet, +15% heal.
     - Stalls: −10% prices.
     - Forge: `HUBK.forge` 0.75.
   - State is restored after load through `restoreSide`. No new shader programs are compiled at runtime (checked).
   - Test: `r21hub.mjs <marsh|docks> [out]`.
4. **Arabic** for all of the above plus the Hamrin, hold and boss text (`AR21`). Remaining English: the set-piece names (Courier's Qaba, Khurasani Jawshan, etc., from R6/R18) and the R19 "Walking: " prefix. Both are older gaps.

5. **Long robes fixed (`cloth.js`, `human.js`, `anim.js`), user request.** The Naffat's legs strode out through the robe's front split while the robe swung off to one side and trailed behind; Round 20's `maxSwing` clamp also ran after the leg collision and pulled cloth back into the legs.
   - Long robes (hem below 0.3, i.e. not a qaba) are now a closed tube (`closed`, with a duplicated seam column at the back so the texture wraps cleanly and the seam shares one normal).
   - `slack` 1.9: the cloth around the body only resists stretching, so the hem gathers as it hangs and spreads when a leg pushes it. `shape` 0.06 pulls each particle gently back toward the drape so the robe stays centred.
   - `outside`: each column stays outside any leg in its own direction (out from the hips through its pin), however far a stride or a kicked-up heel reaches. This replaces the plain push-out for leg capsules.
   - The swing clamp now runs before collision. The hem is cut fuller (flare 0.15) and deeper at the back so the seat stays inside. Steps are 0.82× as long in a long robe.
   - Checked front, side and back on High (simulated) and Low (kinematic).

### Remaining
1. **Test sweep: done, all clean** (Round 21 close-out session). Every test in `shots/sweep.sh` passed, plus traveltest and r18test naffat rerun after the robe fix. r21hub marsh failed once when the hooked fish got away before the reel step; the test now handles that (it passed on rerun). Perf: High Sawad hub 679 draws, Low 372, Hamrin 460, docks 623.
2. **Artifact published** (version 18 of https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c), touch UI checked on the inlined build.
3. **APK:** built by CI from the `claude/artifact-session-2nd2ew` push.
4. Optional polish:
   - The falcon is small and blobby on the shoulder.
   - The forge prop sits right behind Bishr.
   - The set craft section is below the fold in the Craft tab.
   - Translate the old set-piece names.

### Notes
- Naming rule: avoid names of religious figures (no Hamza, 'Ali, etc.).
- The holds' interior lives at x 160–280. `g.interior.hold` is true there; the sky stays visible (`userData.sky`).
- `game.killEnemy` is wrapped by `rivals.js`: a non-final Zubayr never dies.

## Roadmap (R15 done)
The goal is about 8–12 hours for a first playthrough, up from about 1.5 today, plus a repeatable endgame. It is split into rounds so each one ships playable.

**R15: two new acts (main story about 2× longer)**
- **Act IV, The Nahrawan Marshes.** Reed beds, flooded canals and fishing villages. The last Pages were carried off by Ghassan's paymaster, Rawh. New foes: slingers, net-throwers, reed ambushers.
- **Act V, Al-Karkh.** Baghdad's great market suburb, southwest of the Round City walls. It was historically burned in the 812–813 siege. Rawh's buyer's men hold the ruined suq lanes; the buyer stays unnamed. The finale is a two-phase street fight, then the Pages are delivered to the House of Wisdom scholars. The building itself is never shown as anything religious.
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



## Known gaps
1. Verify on a device: immersive mode, Smooth sharpness frame rate, the trail's readability in sunlight, and Back.
2. (Fixed in Round 16: tap a tracker entry to put it on the trail.)
3. (Fixed in Round 20: new camera work for the lieutenants' last words and the boss intro.)

## File map (src/)
- **Round 21:** rivals.js, hamrin.js, holds.js, hublife.js, story21_ar.js
- **Round 20:** foes20.js, companion.js, mount.js, trials.js, craft.js, bench.js, docksprops.js
- **Core:** main.js (boot, loop, wiring), game.js (gameplay, AI, combat), classes.js, entities.js, items.js, save.js, content.js (R10 captains, areas, tasks, engines, duel, NG+), region.js + story15.js (R15 regions, quest chains, boss kits), sidequests.js (R16 side quests, bounties, world events, tracking)
- **World:** world.js, regions.js + regionprops.js (R15 marsh and Karkh), terrain.js, buildings.js, props.js, vegetation.js, water.js, interior.js, zones.js, hub.js
- **Rendering:** graphics.js, lighting.js, lights.js, atmos.js, fx.js, perf.js
- **Characters:** sculpt.js, human.js, creatures.js (camels, water buffalo), charmats.js, cloth.js, anim.js, characters.js, geocache.js
- **Story:** cinema.js, scenes.js, narrative.js
- **Progression:** progression.js
- **Audio:** audio.js, audio2.js
- **UI:** guide.js (objective trail), ui.js, sheets.js (sheet manager, haptics), mobile.js, style.css (later rounds append their own sections), settings.js, i18n.js + story_ar.js, gamepad.js, tutorial.js
