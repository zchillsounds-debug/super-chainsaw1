# Critter Clash: Handoff (after Round 279, Adventure mode polish)

## 48-hour run
- **48-hour run end time: 2026-10-20 15:44 UTC** (started 2026-10-18 15:44 UTC by session 17a). Later sessions read this and do NOT reset it. If a worker stalls, push this end time back by the length of the stall.
- Each session builds ~100 minutes (or less near 300k context), then chains with the user's prompt word for word (see "Chaining"). Round numbers continue from the highest R in `git log`.
- **Session 17b (2026-10-18 16:40–~17:50 UTC, session_01BfaGLYCvgsBvybduPxRouW) did R379–R392 (see "Session 17b"); next round R393.**
- **Session 17a (2026-10-18 15:44–~16:45 UTC, session_014x9MnMjYZSE8f5qyX4KEM8) did R368–R378 (see "Session 17a"); next round R379.** It chained early at ~280k context.
- **Run checks against a build, not the dev server:** vite's hot reload kills a running headless check the moment you save a file. Build HEAD into a scratch worktree (`git worktree add <scratch>/wt HEAD --detach`, symlink node_modules, `npx vite build --outDir <scratch>/dist`, `npx vite preview --outDir <scratch>/dist --port 5181`) and run `PORT=5181 node tools/tapcheck.mjs ...` / `PORT=5181 node tools/advcup.mjs ...` (all adv* tools honour PORT now).

## Start here (for a new chat)
- Short version for a new chat: `games/critter-clash/CONTINUE.md` (what is where, the paste-in prompt, open questions).
- **Session 16j (2026-10-18, 09:43–~10:45 UTC) did R359–R367 (see "Session 16j") and was the LAST session of the user's window (it ended at about 10:45 UTC on 2026-10-18). Nothing was chained after it: wait for the user before building more. Round numbering continues from R368.**
- **Session 16i (2026-10-18, 08:48–~10:45 UTC) did R339–R358 (see "Session 16i"); the next session continues from R359.** Session 16h (2026-10-18, 08:14–~08:50 UTC) did R324–R338 (see "Session 16h"); the next session continues from R339. Session 16g did R305–R323. Session 16f did R280–R304. The user's window, extended by a worker stall, ends at about 10:45 UTC on 2026-10-18.**
- Session 16e (02:51–~04:40 UTC on 2026-10-15) did R255–R279 and was the LAST session of the user's 5-hour Adventure window (it ended at 04:45 UTC). Nothing was chained after it: wait for the user before building more. Round numbering continues from R280.** Read "Session 16c", "16d" and "16e" below.
- Ask the user first: how do weather (rain), the clock of day, grass sway and the smoothie blender feel on their phone? Is the win screen right now (R244b/R277)?
- **CURRENT FOCUS (session 16+): Adventure mode**, a Pokémon Red/Blue style world with a story. Read "Session 16: ADVENTURE MODE" and "Session 16b" first. The user asked for 5 hours of chained sessions, ending at about **04:45 UTC on 2026-10-15**. The whole story (all 7 cups, 5 trials, Champion's Peak, the ending) is now playable; what's left is **polish** (see "Session 16b → next").
- Repo `zchillsounds-debug/super-chainsaw1`, branch **`ccr-4fc93d6e-suxlhd`**, folder `games/critter-clash/`. Clone with `--branch ccr-4fc93d6e-suxlhd`.
- Latest work (session 15, 2026-10-14 21:42–~22:20 UTC): finished session 14's "Modes & polish" time box with R198–R208 (see "Session 15"). The user's requested time ended at ~22:25 UTC, so **nothing was chained after session 15**; wait for the user before building more. Numbering continues from **R209**.
- Earlier (session 14, 2026-10-14 20:20–~21:40 UTC): the user confirmed the growing scene and new forms look right (APK 1.0.190), picked **"Modes & polish"** as the focus, and said: "Reach 300k tokens and start new chats for handoff". So keep building, and chain to a fresh session near 300k context with this file. Session 14 did R175–R197: a signature second hazard per stadium, the Daily Team Challenge, Daily streaks, Stadium Trials, the Stadium Mayhem modifier, a Quick Battle modifier chip, hazard practice in Training, hazard sounds and a jumbotron warning (see "Session 14").
- The user got APK **1.0.195** (R175–R182) mid-session. The last APK of session 14 is listed under "Session 14".
- Ask the user first: how do the new stadium tricks feel on a phone (the laser, the wave, the ice slick)? Is Stadium Trials 3★ too hard?
- Round numbering continues from **R221**.
- User preferences: ask clarifying questions and confirm before building; hand off near 300k context.
- **Branch note:** a new cloud session may be assigned its own `ccr-...` branch. The game lives on `ccr-4fc93d6e-suxlhd`, and the user approved pushing there (session 14). The APK workflow only builds from pushes that touch `games/critter-clash/**`.

## The brief (from the user)
- "Build me the coolest game with the best graphics." Run the critique loop (screenshot → critique → improve) round after round until it's a finished product at AAA studio quality. The user asked for about **10 hours** of loops in total.
- Pick: a **cute, funny animal fighting game like Pokémon**, played as a **real-time 3D arena brawler** (Pokkén-like), with a **collect + tournament** loop and an **anime/Pokémon look**. Single-player only for now.
- Platforms: Android APK plus the web.
- Location: `games/critter-clash/` on branch **`ccr-4fc93d6e-suxlhd`** of `zchillsounds-debug/super-chainsaw1`. Sands of Baghdad (repo root) is a different game; don't touch it.
- **Chaining:** to keep context small, each session hands off to a new cloud session. Do this about every 2 hours, or when context reaches ~300k tokens (the user's standing preference). Before handing off, write this file, commit, push, then start the next session with `create_session` (see "Chaining" below).
- The user said: "keep going, don't stop until the product is ready." Don't block on questions; make sensible calls and keep building. All creatures are original (no Pokémon IP).
- Commit/push after every round. Don't open a PR unless asked.

## Timeline
- Session 1 started at about **04:27 UTC on 2026-10-13**. Rounds 1–5 were done by 05:19 UTC.
- Session 2 (05:20–06:12 UTC) did Rounds 6–18 and chained because context was getting large.
- Session 3 (06:12–06:37 UTC) did Rounds 19–23 and chained near the context limit.
- Session 4 (06:36–07:05 UTC) did Rounds 24–31, then its worker stalled until 15:22 UTC. It wrongly stopped at the old 14:30 deadline; the user asked to continue.
- **The target is ~10 hours of actual work, not a fixed clock time.** About 2.6 hours were used by 07:05, so the new end is about **23:00 UTC on 2026-10-13**. If a worker stalls again, extend the end time by the stall rather than stopping.
- User playtest (15:30 UTC): "it wouldn't let me choose a character". Couldn't reproduce a hard failure in phone emulation; Round 32 makes every critter playable in Quick Battle/Training and hardens the name prompt. Ask the user to confirm it's fixed in the next APK.
- Session 5 (15:50–16:40 UTC) sent the user the Round 32 APK (asked them to confirm the character-pick fix; no reply yet), then did Rounds 33–44 and chained at ~190k context.
- Session 6 (16:35–17:35 UTC) sent the user the Round 44 APK (arena hazards + Camp) and asked again about the character-pick fix (no reply yet), then did Rounds 45–61 and chained to keep context small (~200k).
- Session 7 (17:31–18:35 UTC) sent the user the Round 59 APK (Pebblepup, Whirlwhisk, Camp fetch/activities, cup story beats) and asked a third time about the character-pick fix (no reply yet), then did Rounds 62–74 and chained to keep context small.
- Session 8 (18:31–19:22 UTC, then a worker stall until 22:32, then 22:32–22:45) sent the user the Round 74 APK (asked a 4th time about the character-pick fix; no reply yet), then did Rounds 75–90.
- Session 9 (22:43–23:45 UTC) sent the user the Round 90 APK, then the e99089f APK (with the user's Camp/cup-finish fixes from session 8's reply, plus Ripples). Asked again about the character-pick fix (no reply yet). Did Rounds 91–98 and chained near the context limit.
- Time used so far: about 7.6 hours of actual work (6.6 h before session 9 + ~1.0 h in session 9).
- The original ~10 h target ended at 02:15 UTC on 2026-10-14. At 02:09 the user asked for **about 2.4 more hours** (session 10a, 02:09–02:52 UTC, did Rounds 99 and 102–115).
- Session 10b ended at 04:19 UTC. At 04:41 the user asked to keep going in a fresh chat without naming a duration, so session 11 got a default of about 2 more hours.
- **New target end: about 06:45 UTC on 2026-10-14.** Check `date -u`. Keep chaining until then, then stop and summarise. If a worker stalls, extend by the stall.
- Session 10b (02:52–04:35 UTC) sent the user the f427c6a APK (R113), then did Rounds 116–131 (Team Battle polish, a 16-critter balance pass, **Kindlekit** and **Squeakwing**, critters 17 and 18, trophy fireworks). This was the last planned session: the user's extra ~2.4 h ended at about 04:35 UTC on 2026-10-14.
- Session 11 (04:42–~06:40 UTC on 2026-10-14) fixed the robin crash (R132), re-measured balance (full 18- and 19-critter runs, both error-free), sent the user the R135 APK partway and the final APK at the end, and did Rounds 133–148 (Snoozlo is critter 19). It ended at the 06:45 target; nothing was chained after it because the user's requested time was used up.
- Session 12 (07:03–~09:30 UTC on 2026-10-14, the user's own chat): the user asked for **growth** ("critters grow when they get stronger and change how they look, into huge or strong creatures depending on their profile, with more powerful moves, like Pokémon evolution"). Their choices: **don't call it evolve** (it's "grow/growth"), XP-based, **3 stages**, a **fixed path per critter**, **fully new models** for each form. Rounds 149–158 built it for all 19 critters (see "Growth" below).
- **A second session works on this branch at the same time:** `session_01N69mQniqCEkTvu2X5XzxtL` (the user's own Claude app chat). It handles the user's playtest reports (R99 tips out of the way, R100 mod chips, R101 cupflow, Settings "Battle tips" toggle and "Button size"). Before every push run `git fetch origin ccr-4fc93d6e-suxlhd && git merge --no-edit origin/ccr-4fc93d6e-suxlhd` (never rebase or force-push: the classifier blocks it and it would clobber their work). Its round numbers overlap ours (two R99s); just keep counting up from the highest number in `git log`. Stay away from the tutorial/HUD tips/Settings it is changing; prefer content, arenas, modes, balance.

## Run it
```
cd games/critter-clash && npm install
npx vite --port 5180 > tools/vite.log 2>&1 &     # http://localhost:5180
```
URL flags:
- `?play` jumps straight into a battle. Add `&p=<id>&c=<id>` to pick the critters, `&d=0..1` for difficulty, and `&arena=meadow|beach|volcano`.
- `?auto` makes the CPU play the player's side too (for screenshots).
- `?mobile` forces the touch UI.
- `?q=low|med|high` sets the quality.

- `&arena=frost`, `&arena=neon` and `&arena=sky` also work now, and `&mods=bighead,turbo,lowgrav,itemrain,supercharged` applies match modifiers.

Critter ids: cindermunch, bubbalotl, clovebun, voltferret, rolladillo, hootsy, pengsicle, emberfly, pricklepuff, woolt, pebblepup, whirlwhisk, lilypop, diggles, ripples, jiggawatt, kindlekit, squeakwing, snoozlo.
- Gotcha: `tools/multi.mjs` adds the `?` itself, so pass `play&p=...`, not `?play&p=...` (a double `??` silently shows the title).
Arenas: meadow, beach, volcano, frost, neon, sky, grove.
- `&train` starts a training match (e.g. `?play&train&p=woolt`).
- Force a win in tests: `(()=>{const b=__game.battle;for(let i=0;i<40&&b.phase!=='done';i++){if(b.phase==='fight')b.fighters[1].hp=1;__sim(1);}})()`, then `__sim(2)` and screenshot the results.

**Test gotchas (learned in session 2):**
- `window.__save` is the live save object. Set `__save.trainer = {name:'Sam', partner:'cindermunch'}` before calling `__game.screens.title()` in tests, or the first-launch welcome shows instead.
- Headless frames are very slow, so real-time things (CSS animations, `setTimeout` announcer/name-card/callout timers) often finish or vanish before a screenshot. Don't chase these as bugs. To inspect one, pause its animation (`el.getAnimations()[0].pause(); .currentTime = 400`) or check the DOM.
- `__ready` is now set after the boot/prewarm finishes (splash), so tools still work unchanged.
- Dynamic `import('/src/x.js')` in eval can get a separate module instance after HMR edits; use `__game`/`__save` instead.

## Test tools (`games/critter-clash/tools`, headless SwiftShader is slow)
- `node tools/multi.mjs <w> <h> "<query>" tools/out/<prefix> '[["<js>","name",waitMs],...]'` loads the page once and takes many shots. A name starting with `_` means no screenshot.
- `window.__sim(seconds)` steps the game deterministically without rendering. Use it before shots, because real time crawls in headless.
- `python3 tools/sheet.py out.png a.png b.png ...` makes a 2-column half-size contact sheet, which saves tokens when reviewing.
- `tools/eval.mjs "<query>" "<js>"` and `tools/evalm.mjs <w> <h> "<query>" "<js>"` evaluate JS and print the result plus console output.
- `tools/icon.mjs` regenerates `public/icon-512.png` from an in-game portrait.
- Draw calls in battle are about 207 (including shadow and bloom passes), about 510k triangles. Measure with `renderer.info` and `autoReset=false`.
- Phone sizes to test: 915×412 landscape (primary; battles show a rotate hint in portrait), 412×915 for menus.

## APK
- **Updates keep the save (session 13):** every APK is signed with the committed debug key `signing/debug.keystore` (PKCS12, store/key password `android`, alias `androiddebugkey`, SHA-256 A7:E7:61:DE:...:2C:07), patched into `android/app/build.gradle` by the workflow, and gets `versionCode 1000 + run number` / `versionName 1.0.<run>`. A CI step fails the build if the APK isn't signed with that key. Never change or delete the key, or the user has to uninstall (and loses their save) again. The user had to uninstall once to switch from the old random CI keys.
- **Save backup/restore:** Settings → Save → Back up (copy / Share / save `Documents/CritterClash/critter-clash-save.txt`) and Restore (paste the `CRITTERCLASH1:` code or pick the file; tap twice; reloads). `src/backup.js`.
- `.github/workflows/critter-apk.yml` runs on pushes touching `games/critter-clash/**`. It does `npx cap add android` in CI, forces landscape and fullscreen, copies `public/icon-512.png` as the launcher icon, then builds a debug APK.
- The APK is force-pushed to the orphan branch **`apk-critter-clash`**. Runs 1–2 succeeded.
- To fetch it: `git fetch origin apk-critter-clash && git show origin/apk-critter-clash:critter-clash.apk > <scratchpad>/critter-clash.apk`. Check that the commit message names your SHA, then send it with SendUserFile.

## Architecture (`src/`)
- **main.js:** Game class.
  - Renderer (NeutralToneMapping, PCFSoft shadows).
  - EffectComposer pipeline: MSAA half-float RT → UnrealBloom → OutputPass → GradeShader (saturation, vignette, anime impact frame `impactFrame(t)`).
  - `portrait(def)`: cached 256 px 3D head render, returned as a dataURL.
  - Showcase critters for menus.
  - `startBattle` / `endBattle` / `setArena` / `setQuality`, auto-quality watchdog `trackPerf`.
  - History-based Android back button `back()`, pause on hidden.
  - `__sim` and `__game` debug hooks.
- **toon.js:** `toon(color, {rim, env, uniforms, vertexColors, side, map})` is MeshToonMaterial with a stepped ramp and a view rim light; it is cached unless `uniforms` is passed. `inked(geo, mat, width)` adds an inverted-hull outline as a child. Also `canvasTex`.
- **critters.js:** `Critter(def)` builds a procedural chibi from sphere/capsule parts.
  - Face: decal eyes, mouth and blush on sphere patches. Emotions: eyes open/happy/hurt/dizzy/closed/angry; mouths smile/open/yell/o/wobbly/grin.
  - Parts are chosen from the data (`ears`, `tail`, `extra`: cheeks/sprout/mask/shell/owl).
  - Rig: `pose` targets (y, sx, sy, lean, roll, yaw, arm*, leg*, head*, ear, tail) are springs, substepped for stability. Also `emote()`, `flash()`.
- **data.js:** TYPES (fire/water/leaf/spark/stone/gust, each beats two), `typeMult`, CRITTERS (stats, moves), STARTERS, CUPS (matches with trainer, level, taunt; arena per cup), COMBO frame data.
- **fighter.js:** Fighter state machine.
  - States: idle/run/attack (3-hit combo, launch on hit 3), dodge (i-frames, cancels recovery), special, super, hit, launched (one comic bounce), down, getup, dizzy (mash to recover), win, lose, intro.
  - Specials: comet, bubble, leafrang, zipzap, rollout, gale. `SPECIALS` holds cooldowns and AI ranges.
  - `animate()` sets procedural poses per state.
- **battle.js:** Battle.
  - Rounds (best of 3, 60 s), intro camera, countdown.
  - `applyHit` handles type effectiveness, hitstop, shake, super meter gain, comic text, combo counter and KO slow-mo.
  - Projectiles: bubble, leafrang, gale (multi-hit pull).
  - Supers: meteor, tsunami, bloom, thunder, quake, cyclone. Each has a cut-in that freezes the world and hides the other fighter.
  - Camera: fixed-ish yaw, frames both fighters, clamped out of the stands.
  - Also the jumbotron feed, speed lines, confetti, wall splat.
- **ai.js:** CpuBrain (difficulty 0..1). Handles spacing, combos, specials in range, reactive dodges, supers.
- **arena.js:** themed stadiums (`ARENAS` meadow/beach/volcano). Includes the sky dome shader, painted field canvas, lathed stands with per-tier seat colours, instanced bouncing crowd, flags, merged scenery (trees/palms/rocks), jumbotron canvas `drawScreen()`, floodlight beams, lagoon and lava, clouds. `cheer()` drives crowd excitement.
- **fx.js:** two instanced billboard pools (additive and normal). Shapes are drawn in the shader: glow, star, spark, ring, puff, drop, leaf, bolt, burst, confetti. Helpers: `hit()`, `burst()`, `dust()`, `confetti()`, `shock()` (ground ring), and DOM comic text `text()`.
- **hud.js:** health bars with damage trail, super meter, round stars, timer, combo counter, announcer, super cut-in band, speed lines, pause button.
- **input.js:** keyboard (WASD, J attack, K special, L/Shift dodge, I super, Esc pause), floating touch joystick plus 4 buttons with cooldown rings, gamepad.
- **screens.js:** title (gear → settings), Tournament cups → select (locked cards with hints) → ladder (trainer card with taunt) → VS → battle → results (XP bar animation, level ups, recruit modal, trophy screen). Also quick battle and pause.
- **save.js:** localStorage save: unlocked critters, per-critter level and XP, cups, settings, stats, tutorialDone.
- **settings.js:** settings modal and `applySettings`.
- **tutorial.js:** first-battle coach.
- **audio.js:** all-synth SFX (hits, bonk, squeaky voices, per-type specials, cheers) and a chiptune sequencer with songs menu/battle/victory.
- **style.css:** all UI. Lilita One display font and Nunito, both bundled through @fontsource. The anime outline look comes from `-webkit-text-stroke` plus `paint-order`.
- **Gotcha:** don't add a body class that matches a component class. `body.touch` once hid the whole page, which is why it's now `is-touch`.

## New modules (session 2)
- **personality.js:** per-critter `INTRO`/`WIN` animations and `LINES` catchphrases; `sayLine(f, kind)` shows a speech bubble (`fx.say`).
- **items.js:** arena power-ups (berry heal, star super, shoe speed); `Items` owned by Battle; CPU seeks them.
- Battle now has `mods` (Set), `grav`, `superMult`, `speedMult`, `playerHp` carry, `anims` (game-time effect callbacks via `this.anim(fn)`), boss `enrage()`, `parry()`.
- Fighter has a `guard` state with a fresnel `shield` mesh, `guardHp`, `blockHit()`, `speedBoost`; per-critter combo flavour in `STRIKE`.
- data.js: `SHINY` palettes + `skinned(def, skin)`, `BADGES`, `MODS`, `dailyChallenge()`, 4 cups (Legend Cup added), trainer `style`/`skin`/`mods` fields.
- ai.js: `STYLES` (balanced/rushdown/zoner/turtle/trickster) and guard/item logic.
- audio.js: songs battle/beach/volcano/frost/boss/menu/victory with `inst` options, sidechain `synthBus`, `duck()`, `setIntensity()`, `sfx.fanfare(def)`, block/parry/pickup/jingle.
- screens.js: `welcome()` (Professor Pecan, name + partner), `challenges()` (Survival, Daily), `dex()`/`dexPick()`/`badgeModal()`, `infoCard()`.
- arena.js: `frost` arena (aurora/star sky shader, snowfall Points, pines), floor styles `sand`/`basalt`(+lava seams)/`snow`, `setDetail(q)` for low quality.
- index.html: inline splash; main.js `boot()` prewarms portraits + shaders.

## New modules (session 3)
- **training.js:** `Training` (owned by Battle when `opts.training`): dummy modes `DUMMY` (stand/guard/dodge/cpu, T key or tap the chip), KO guard (`guardKO` refills HP), combo damage readout, input display. `moveList(def, touch)` returns move-list HTML (used by `Screens.moveModal`, shown from the training pause menu and the Critterdex).
- **photo.js:** `PhotoMode` from the pause menu (`game.photo`, stepped in `main.step`). Orbit/pinch/wheel camera, focus chips, frames (Snapshot/Comic/Sparkle) drawn on a 2D canvas, CSS filters (applied live to the canvas and baked with `ctx.filter`), Save/Share preview. `sfx.shutter()`.
- Battle: `phase 'done'` now runs a results camera (winner close-up, offset left on landscape, top on portrait), hides the loser, and ramps `arena.fill` (a camera-side DirectionalLight that always exists with intensity 0 so the light count never changes). `stats.hpLeft` feeds the results rank (S/A/B/C stamp).
- New parts in critters.js: ears `floppy`, extras `wool` and `spines` (merged geometry via `mergeGeometries`). New specials `seedspray`, `fuzzball` (projectiles `seed`, `fuzz`), supers `bramble` (`Battle.thorns`) and `megafluff` (`Battle.fluffHop`, scales `f.root`; reset in `endSuper` and `Fighter.reset`). Supers that pose themselves are skipped in `Fighter.animate`.
- `MOVE_DESC` in data.js describes every special and super.

## New in session 4
- arena.js: `neon` arena (Neon Rooftop): `floor: 'neon'` glowing grid overlay (reuses `this.cracks` pulse), `buildCity()` (merged window-textured towers, blinking beacons, neon signs, wall/lip neon tubes, sweeping searchlights). Sky `uStars` uniform split from `uAurora`. Per-arena `fillI` (camera-side fill used in battle and menus) and `beam` colour. Jumbotron raised to y 12.
- audio.js: `neon` synthwave song. data.js: Midnight Cup (`requires: 'champion'`, boss `bossTitle: 'BOSS'`), Night Owl badge, `gearFor`/`withGear`.
- battle.js: round-one wide shot tilts up at the jumbotron (INTRO_FIRST 4.2); `finisher` on the match-deciding KO (long hitstop, burst, tilted low close-up via `roll` / `camRoll`); `clock` game time.
- hud.js/style.css: cut-in dim/flash, sunburst, type watermark. Compact portrait-HUD rules.
- photo.js: native Save/Share through `@capacitor/filesystem` + `@capacitor/share`.
- screens.js: training setup sheet (dummy + arena), title backdrop = newest unlocked cup arena, `skinOf` adds gear.
- critters.js: `buildGear(n)` scarf / star pin / crown; Emberfly `wingTexture()`.
- tools/wide.mjs: renders from a fixed camera after `__sim` (for arena overview shots).

## New in session 5
- **hazards.js:** `HAZARDS` per arena (volcano geyser / frost icicle / neon shock tile / beach coconut; meadow none). `Hazards` is owned by Battle (`battle.hazards`): warning ring → `fire()`. Hazards never KO (leave 1 HP), guard blocks them, no-op in training or when `save.settings.hazards === false`. `danger(x,z)` is used by ai.js to step out. Stats: `hazardsSeen`, `hazardHits`. `sfx.warn()` / `sfx.rumble()`.
- **camp.js:** `Camp` (owned by `Screens.campObj`, created in `Screens.camp()`, disposed in `Screens.update` when the mode isn't 'camp'). Wandering showcase critters (`c.camp` state; `main.updateShowcase` skips them), props built in `buildProps()` (no lights on purpose: a light would recompile every shader), tap picking by screen-space projection, pet (hearts, `pets` count, +10 XP once/day via `save.petDay`), feed (`save.berries`, +45 XP, `stats.fed`), daily gift (`save.giftDay`, +2 berries). Berries come from wins (+1, +2 on S rank). `camp` song in audio.js.
- data.js: `GEAR` list (names/icons per level), badges `friend`, `snack`, `hazard`. fx.js: `heart` particle shape (10).
- Screens: `gearGet()` results callout; Critterdex Gear row and friendship; VS screen hazard chip `.vs-hazard`; title Camp button with `.btn.dot`.
- Gotcha (again): `body.portrait` exists, so `.portrait img` styles leak into any `img` in portrait; reset margin on new image rules.

## New in session 6
- camp.js: steering around props (`keepOut`) and friends, idle shuffle-apart, portrait camera, fetch toy (`toss()`/`updateFetch()`, `.camp-toy` button), activity `spots` (fire/nap/picnic; `m.act`, `m.doing`).
- Best-friend perk: `battle.bestFriend` (pets >= 20) starts the player with 25 super meter; HUD shows a heart after Lv.
- hazards.js: `storm()` on boss enrage, `volley()` (staggered row of 3), `spawnAt(x, z, t0, quiet)`.
- critters.js: `buildGear(n)` is incremental (`gearN`), used by `Screens.gearGet` to dress the results winner. New parts: ears `pug`, tail `bushy`, extras `crystals`, `glider`.
- New critters: **Pebblepup** (stone; special `rocktoss` = lobbed `boulder` projectile with `boulderLand()`, super `avalanche`) and **Whirlwhisk** (gust; special `swoop`, super `jetstream` gust cone). Both are in the Thunder Cup (Gran Pebbles, Wren). Specials that pose themselves are skipped in `Fighter.animate`.
- Screens: `profTalk(lines, done)` Professor Pecan overlay (`PROF_SVG`), cup `intro`/`outro` lines in data.js (`save.cupIntro`), scroll-fade hint (`.more` via MutationObserver on `.dex-info, .modal, .move-list`), roster scrolls sideways in landscape and is 6-wide in portrait.
- fx.js: damage numbers fan out (`dmgSeq`). Results fill light is arena-relative.
- Testing a special/super directly: `b.brain.update=()=>{}; p.startSpecial()` or `b.startSuper(p)`, then `__sim(...)`. Setting `p.ctl.*` doesn't work (input overwrites it each frame).

## New in session 7
- **Cloudtop Gardens** (`sky` arena in arena.js): `floor: 'marble'`, `buildSky()` (stadium island base, blossom islets `this.islands`, cloud sea, hot-air `this.balloons`, animated in `update`). Arenas can now set `fogNear`/`fogFar` and `back` (back-wall colour). Hazard `sky` = updraft (hazards.js). Song `sky` in audio.js. Daily can roll it.
- **Sky Cup** (data.js, requires `champion`): Sora, Captain Puff, Gran Pebbles, then **Professor Pecan** (boss, `bossTitle: 'FINAL TEST'`, shiny Pricklepuff). Badge `sky` (Head in the Clouds). Taunts and parting lines may use `{name}`.
- Every cup trainer has `beat` / `gloat` lines shown as `.res-quote` (with the rival portrait) on the results screen.
- **haptics.js:** `buzz('light'|'medium'|'heavy')` uses `@capacitor/haptics` in the APK, `navigator.vibrate` on the web; throttled; honours `save.settings.vibrate`. Used for button taps, heavy hits on/by the player, player supers, KOs.
- `body.at-results` hides the portrait rotate hint on the results screen. `impactT` now counts down in `step()` (so `__sim` clears it).
- **tools/robin.mjs** `[reps] [id,id]`: CPU-vs-CPU round robin at difficulty 0.8, prints win rates. Run it against a production build so HMR reloads don't kill it: `npx vite build --outDir <scratch>/dist && npx vite preview --outDir <scratch>/dist --port 5181 &` then `PORT=5181 node tools/robin.mjs 2`. A full 2× run (528 matches) takes about 12 minutes. `window.__critters` is the CRITTERS list.
- Test gotcha: when you set `__game.paused = true` to freeze a frame, call `__game.fx.norm.update(0); __game.fx.add.update(0)` or freshly spawned particles won't be uploaded.

## New in session 8
- **Lilypop** (leaf frog, `extra: 'frog'`: eye domes with the eye decals on them, lily flower). Special `tongue` (Fighter.makeTongue, grabs and reels the rival in; `this.grabbed`), super `lilysplash` (leap → belly flop in `superLand` → expanding ring hit). Trainer Paddy (Thunder Cup, replaced Chef Bao; Legend Cup shiny).
- **Diggles** (stone miner mole, `extra: 'mole'`: hard hat with lamp, star nose). Special `burrow` (`digPhase` dive/tunnel/pop/land, `this.under` hides `root` and skips collisions; `setState`/`reset`/`endSpecial` restore it; a dirt `mound` mesh follows while under), super `molerush` (three pops). Trainer Dusty (Midnight Cup, now 5 matches).
- **Glowcap Grove** arena (`grove`: giant toadstools `scenery: 'mushrooms'`, `fireflies` Points, dusk sky), spore-puff hazard (adds dizzy), `grove` song. **Glowcap Cup** (requires thunder; Fern, Moss, Luma, boss Elder Oakley), badge Spore Sport, glowing toadstools in Camp.
- Camp: cup pennant bunting + Sky Cup balloon + grove toadstools (`buildProps(cups)`), type idle quirks (`quirk()`), wander targets clamped to the view.
- Hazards: `chase()` pattern (3 rings land on one fighter in turn; `spawnAt(..., follow)`).
- AI: punishes openings (dizzy/getup/hit/late special), supers more when low, keep-away when ahead late.
- UI: CLEARED ribbon on cups, `div.portrait > img` (fixed leaking styles), portrait roster/dex 7 columns, `stackAbove()` keeps info cards above lists in portrait, cup select/ladder show the cup's arena, Move List in every pause menu, Pecan news popups for returning players (`save.news`).
- Last balance run (1 rep, before small nerfs): Lilypop 73% → tongue stun 0.8 / cd 4.0; Whirlwhisk hp 1040; Woolt power 0.97. Re-run `tools/robin.mjs` (build first) to check.

## New in session 9
- **Ripples** (water river otter, `extra: 'otter'` muzzle/whiskers/scallop clip, `tail: 'otter'`). Special `puddle` (lobbed `splash` projectile → `splashLand()` → stationary `puddle` projectile, r 1.7, 4.5 s; one per owner; the rival inside gets `f.slick`, which cuts speed to 60% and traction to ~2, with flailing arms). Super `whirlpool` (stationary `whirl` projectile disc with a canvas swirl; the rival orbits inward, 4 small hits, then a geyser launch). Shared textures `getPuddleTex`/`getSwirlTex` in battle.js. Trainer Brook (Glowcap Cup, replaced Moss), Pecan news `otter`.
- **Jiggawatt** (spark jelly sprite, `extra: 'jelly'` translucent bell cap + frills + glow spots, `tail: 'tentacles'` swaying in `Critter.update`). Special `staticfield` (1.1 s aura, drifts at 45% speed, zaps every 0.34 s within 2.3, removes enemy non-big projectiles in range). Super `stormcloud` (a summon: `cloud` projectile follows the rival for 4.4 s at y 3.1, zaps every 0.62 s, a big final strike; the super state ends after 0.6 s so Jiggawatt keeps fighting). `lightning(x, z, big, top)` takes a start height. Trainer DJ Tumble (Midnight Cup, replaced Woolt), Pecan news `jelly`.
- ai.js: the CPU leaves a rival's puddle (only when the rival isn't in reach), runs from storm clouds, backs off static fields.
- **Boss Rush** (Challenges, needs the Champion Cup): `bossList()` in screens.js (unique `boss: true` matches by level: Oakley, Aurora, Madame Vee, Pecan), ctx `{ kind: 'bossrush', idx, hp }`, one round each, HP carries (+35%). `save.stats.bossBest`, `save.stats.bossRush`, badge `rush` (Boss Buster). Results show `opts.trainer`'s beat/gloat line for any trainer match.
- **Finale** (`Screens.finale()`): after the trophy screen when every cup is cleared and `!save.finaleSeen`: Pecan speech → parade (team in waves of 4, shifted left in landscape) + CSS credits roll. Badge `master` (Critter Master) and a title-foot tag.
- Balance after session 9 (focused round robins): Ripples 58%, Jiggawatt 35% (then +power). Full 15-critter run had most critters 43–68%; Emberfly 21% in that run (got +40 hp after). Re-run a full `tools/robin.mjs 1` with all 16 to confirm.
- `window.__cups` = CUPS (for tools).
- **tools/tapcheck.mjs** `[WxH ...]`: opens every screen/modal (incl. pause and results) and reports buttons that are OFF-screen, CLIPPED, or COVERED (only the topmost modal layer is checked). `SHOTS=1` saves screenshots. Portrait battle screens report "covered by rotate-hint", which is expected.
- **tools/cupflow.mjs** `[WxH] [cupIndex]`: taps through a whole cup like a player (wins forced via `onKO`) and prints the screen path or `STUCK at <mode>` + a screenshot.
- Professor Pecan dialogs: tapping anywhere finishes the line; a second tap advances.
- The previous session (session 8) answered a user bug report at 22:45: Camp back button covered by the tap layer, and the recruit popup's Yay button off-screen on short phones (blocking the cup finish). Both fixed in e63390e.
- APK CI can fail at the final `git push -f` with a GitHub 500; the next push rebuilds it.

## New in session 10a
- **Team Battle** (Challenges, needs 3 recruits): `Screens.teamSheet()` (pick 3; selected critter leads; `this.lastTeam` remembered), ctx `{ kind: 'team', team, foes, pi, fi, php, fhp, arena }`. Each fight is one round; the winner stays in with its HP (`Battle` now takes `cpuHp` as well as `playerHp`). `teamRow(ids, hp, cur)` portrait rows on VS (`.vs-team`) and results (`.team-vs`). `save.stats.teamWins`, badge `team` (Dream Team). Pecan news `team`, How to Play line.
- **Quick Battle Match Setup:** `Screens.matchSheet(train)` is shared with Training (Sparring Setup). Quick: rival + arena (or 🎲 random) → `this.quickPick` → `vs()`. `tools/flow.mjs`/`flow2.mjs` tap through it.
- **Arena ambience** (arena.js): `drift` config per arena (`buildDrift`: meadow `seeds`, volcano `embers`, sky `petals`; point size capped at 14 px in the shader so menu cameras don't show blobs), neon `rain` (LineSegments drizzle), beach `buildGulls()`. All handled in `setDetail` (low quality halves them) and `update`.
- **Stage title card** (`hud.stageCard(name, sub)`, `.stagecard`): arena name + hazard over the first intro shot.
- Fight camera pitch 0.3 / look y 1.25 (was 0.36 / 0.9): the crowd shows above the HUD.
- Colours: Whirlwhisk is now silver (0xbcc4d6), Jiggawatt aqua (0x62d8ec) with a pink shiny. Five lavender critters used to blur together.
- Balance (full 16-critter robin at 02:20 had Pengsicle 80%, Whirlwhisk 30%, Bubbalotl 33%): Pengsicle hp 960 + Ice Slide cd 4.8, Whirlwhisk power 1.13, Bubbalotl hp 1100, Jiggawatt hp 1020, Emberfly hp 970. Focused rerun: those five at 47–57%. Pricklepuff and Diggles were 20% in that small focused sample (only 10 games each), so check them in the next full run.
- Camp: landscape wander zone is much wider (16 critters no longer huddle). Critterdex tiles fit full names.
- `tools/tapcheck.mjs` also opens `quicksetup` and `teampick` (clean at 740×360 and 412×915).

## New in session 10b
- **Kindlekit** (fire ember fox kit; `tail: 'foxfire'` = fox brush with a flame tip whose flames use `userData.base`, `extra: 'fox'` cheek ruffs + nose). Special `flametrail` (dash at 15 u/s that drops `ember` projectiles every 0.065 s: stationary scorch + additive core, r 0.62, 2.0 s; one shared burn tick per owner via `owner.burnAt` / `battle.clock`). Super `fireworks` (8 lobbed `shell` projectiles that air-burst at `burstY` via `Battle.shellBurst()`, the last is big). Trainer **Fizz** (Sky Cup, 4th of 5 before Pecan), Pecan news `fox`, Camp quirk (chases its tail), shiny = blue flame. The CPU steps out of a rival's ember patches.
- **Squeakwing** (gust orchard bat; `ears: 'bat'`, `extra: 'bat'` = ShapeGeometry scalloped wings in `this.wings` with a polygon-offset ink edge, plus a fang; `colors.wing`). Special `squeak` and super `echoboom` both use `Battle.sonic(f, maxR, hit, big)`: a `sonic` projectile (two additive rings) centred on the owner that grows to `maxR` over `dur`, hits once as it sweeps past (`d` within the ring band) and deletes small enemy shots it crosses. Trainer **Nyx** (Glowcap Cup, 4th of 5 before Elder Oakley), Pecan news `bat` (after the Thunder Cup), Camp quirk (flutters up), golden shiny. The CPU sometimes dodges the squeak windup.
- Trophy screens (`trophy` and `teamwin` modes) pop fireworks in `Screens.update`, placed by unprojecting a random point in the upper screen about 10 m out.
- Team Battle: VS screen callout `.vs-go` ("Go, X!" / "Rival sends out X!", `ctx.sent`), stage card subtitle via the new Battle opt `stageSub`, `Screens.teamTrophy()` (mode `teamwin`, pulled-back trio camera in `update`), results team rows no longer inherit the 110 px `.res-card img` size.
- Balance (full 16 run at 02:55): Voltferret was 90% → power 0.93, hp 870, Zip Zap cd 4.9 (focused rerun ~67%); Bubbalotl hp 1150/power 1.05, Pricklepuff power 1.1, Whirlwhisk power 1.16.

## New in session 11
- **Robin crash fixed (R132):** `Battle.endSuper` cleared `superUser` unconditionally, so if one fighter started a super in the same frame the other's super ended, the next `update` read `null.critter`. `endSuper` now only clears its own super, and a cut-in without a user is dropped. Repro: `b.startSuper(b.fighters[1]); b.endSuper(b.fighters[0]); __sim(3)`. A full 612-match robin then ran clean.
- **Arena memory (R135):** `Arena.dispose()` now frees every `material.map` in the group and any light's shadow map. Before, each tour of the 7 arenas leaked ~20 GPU textures (the 1024 px field etc.). Check with `renderer.info.memory` while switching arenas with real frames rendered (`__sim` doesn't render).
- **Floors:** Glowcap Grove has `floor: 'moss'` (moss/clover/petal canvas + an additive glow overlay with a fairy ring of tiny glowing caps inside the boundary line, pulsing via `this.cracks`). Frostpeak's snow floor has glassy ice patches with cracks and a cooler rim.
- **Snoozlo** (leaf drowsy koala, critter 19; `extra: 'koala'` = big dark nose with a shine + eucalyptus sprig; koala ears are the `round` ears scaled up with white tufts). Special `powernap` (Fighter.updateSpecial): naps for 0.95 s; `Battle.applyHit` checks for a napping Snoozlo first: a non-super hit is negated (`napHit`, "COUNTER!", 0.55 s invuln) and answered with a lunge slam (105 × power, launch). If nobody bites, a yawn leaves it open until 1.2 s. Super `lullaby` (Battle.updateSuper): sings (heart notes drift at the rival), at 0.9 s puts the rival into `dizzy` for 1.8 s ("Zzz..."), then a 13 u/s rolling belly bump (165 × power). Trainer **Hazel** (Glowcap Cup, 1st match, replaced Fern/Clovebun), Pecan news `koala`, Camp quirk (nods off, jolts awake), shiny = honey tan with pink. The CPU backs off a napping Snoozlo (`ai.js`). `.fxtext.zz` style for snore z's.
- Ladder on phones ≤400 px tall: the Battle button sits beside the trainer card (`.trainer-card .go` absolute) so the rungs aren't hidden.
- Title tagline sits on a dark pill (`.logo-sub`).

## Playtest session (the user's own chat, session_01N69mQniqCEkTvu2X5XzxtL, 01:58–04:20 UTC)
- **If `npm install` can't reach the registry** (this sandbox blocked registry.npmjs.org): the APK workflow now publishes `node_modules` to the orphan branch **`deps-critter-clash`** (split `nm.part.*`, rebuilt only when package-lock.json changes). Restore with: `git fetch --depth 1 origin deps-critter-clash && git archive FETCH_HEAD | tar x -C <scratch>/deps && cat <scratch>/deps/nm.part.* | tar xzf - -C games/critter-clash`.
- User report at 02:07 UTC: "The green instructions are too in the way." Cause: the tutorial prompt kept its green `done` colour on every step after the first. Now: slim cream pill at top 96 px (84 on short phones), fades to 55% after 3 s (`.coach.dim`), and the taught touch button pulses a yellow ring (`.tb.teach`, `Tutorial.teach()`). Training panel is one slim strip with `pointer-events: none` (only the dummy chip is tappable); input log hidden on touch.
- Settings: **Button size** (`save.settings.btnSize` s/m/l → CSS var `--bs` on `.btns`) and **Battle tips** (toggles `save.tutorialDone`; switching off mid-fight disposes the coach). `.seg` handler is now generic by `data-k`.
- VS screen auto-start is guarded (`this.vsToken` + `mode === 'vs'`): leaving the VS screen (back) no longer drops you into a fight over another screen.
- Pause menu **Restart** (`game.lastStart`), hidden in survival/bossrush/team. Android back on a Pecan dialog acts like tapping it (finish line → next → "Let's go!" runs its callback) instead of skipping it.
- Match chips are hidden during the intro close-ups, full size at the countdown, then (`.mod-chip.mini`) shrink to icons beside pause 2.5 s into each fight. Match/Sparring/Team setup sheets keep Back/FIGHT! in a sticky bottom row and are compact under 420 px tall.
- Tools: `tools/teamflow.mjs [WxH] [w/l pattern]` taps through a whole Team Battle; `cupflow.mjs` handles the finale and logs what covers a failed tap (failed taps on results/trophy buttons in headless are animation-stability waits, not real blockers); tapcheck opens `matchsetup`, `teampick`, `teamvs`.
- Checked by tapping on phones: Sky Cup → trophy → finale → title (740×360), Team Battle win and loss paths, first launch → battle (740×360, 360×640, 412×915), tap-check clean with 17 critters.

## Growth (session 12, `src/growth.js`)
- **Stages:** Lv 1 base, **Lv 7 stage 2, Lv 14 stage 3** (`GROW_LV`, `stageFor`). Gear (Lv 5/10/15) is separate; stage 3 forms skip the scarf.
- **`grown(def, lv, shiny)`** returns the form for a level, keeping `id` (progress, personality, AI, quirks all still key on it). `withGear(def, lv)` in data.js now applies it, so `skinOf`, cup/boss trainers and (in `vs()`) **every rival** grow by their level. Roster, Critterdex tiles and info cards show the current form.
- **`FORMS[id] = { path, forms: [stage2, stage3] }`**: each form sets name, species, blurb, colours, `size` (overall scale via `Critter.sizeG`), `body` (or `bodyMul`: GROW2/GROW3 multipliers on the base body), `tailScale`, `earScale`, `portraitZoom`, `voice`, `moves` (new move names) and `parts`.
- **Parts** (`buildGrowth`, called from the Critter constructor): flamecrest, horns, brows, tusks, lavaplates, backfin (runs down the upright back), whiskers, pearl, leafmane, antlers (with blossoms), crystalridge (`colors.crystal`), stonearmor (shoulders + paw bracers), boltmane, cloudcrest, plumes, windring and orbs (both spun via `cr.spinners`), lotus, flowers. `body.limb` thickens arms/legs.
- **Paths:** Cindermunch → Blazemunch → Magmuncher (Brute), Bubbalotl → Tidalotl → Leviatotl (Mystic), Clovebun → Bramblehare → Jackalorn (Swift), Voltferret → Voltweasel → Stormstoat (Storm), Pebblepup → Cragmutt → Montiff (Colossus), Hootsy → Hootwind → Cyclowl (Sky), Pricklepuff → Thistlehog → Thornhulk (Fortress), Emberfly → Emberwing → Pyrolume, Lilypop → Lilyleap → Lotoad, Rolladillo → Bouldillo → Citadillo, Pengsicle → Pengsleet → Emperice, Kindlekit → Kindlefox → Solfox, Woolt → Wooltage → Thunderam, Whirlwhisk → Whirlglide → Tempestail, Diggles → Drillmole → Quarrymole, Ripples → Splashotter → Torrentide, Jiggawatt → Jigglevolt → Megawatt, Squeakwing → Shriekwing → Echowing, Snoozlo → Snoozalot → Slumberking. The first 9 lines have hand-set bodies; the last 10 use `bodyMul` with their own palettes (candidates for a signature part each). A generic type-themed fallback still exists for any critter without a FORMS entry.
- **Power:** `MOVE_POW` (special/super/projectile damage ×1.12 / ×1.25, applied in `Battle.applyHit`), `CD_MULT` (special cooldown ×0.92 / ×0.84), HP ×1.06 / ×1.12. Grown forms flare when they start a special.
- **Growing scene** `Screens.growUp(id, lv, done)`: "What? X is growing!", flickering white silhouettes speeding up (`sfx.shimmer`), flash, then a card with the new name, species, path, moves and boosts (`sfx.grown`, heavy buzz). Tap to hurry; Android back hurries, then closes. On the results screen it swaps the winner's model in place (`Fighter.regrow`) and updates the card portrait. If the player taps past results first, `pendingGrow` plays it on the next calm menu (`Screens.update`). In Camp, feeding into a new stage plays it and rebuilds Camp.
- Cameras (intro close-up, super cut-in, results) and `headPos`/`chestPos`/shield scale with `def.size`. Portrait cache key includes the stage.
- Critterdex **Growth** row: three stage chips (unreached forms are dark silhouettes named ???; tap a reached one to view it). Info card shows "Stage N" and "🌱 Grows at Lv X". Pecan news `grow` (names critters that already grew), How to Play line. Rematch rebuilds the def so it uses the grown form.
- Static growth parts are built into two groups (`SK` on the skull, `TO` on the torso) and `flatten()`ed into one mesh per material; animated bits (flames, pearl glow, `spinners`) stay separate. Add new static parts to `SK`/`TO`, not straight to `cr.skull`/`cr.torso`.
- Test hooks: `?play&p=..&pl=14&c=..&cl=7` (levels pick forms), `window.__grow(def, lv)`, `GROW=7 node tools/cupflow.mjs 740x360 0` (partner grows mid-cup; prints "growing scene showed"), tapcheck opens `grow`.

## Session 13 (2026-10-14, 16:05–~18:10 UTC, this chat: session_01Y2QsYyf7rBd5UC4wfqJZvo)
- The user sent the R161 APK and this file and asked to continue. Their answers: growing needs a screen when it happens; polish the growth lines; keep going ~2 hours; push to `ccr-4fc93d6e-suxlhd`.
- **Growing scene always plays (R162).** Before, it only fired from the results XP bar, so critters already past Lv 7/14 when growth shipped switched forms silently, and growths tapped past when going straight into the next fight could be lost. Now `save.seenStage[id]` records the stage whose scene the player saw. `Screens.owedGrowth()` lists unlocked critters whose level stage is above it; `Screens.update` plays one owed scene at a time on any calm screen (title, cups, ladder, select, dex, challenges, or results 1.6 s after the XP bar finishes: `this.resDone`). The scene starts from the last form the player saw, so 1 -> 3 jumps show base -> stage 3. `this.growing` guards re-entry; it resets if a screen change wipes the overlay (`this.growEl`). `pendingGrow` is gone.
- **New growth parts** (all in `buildGrowth`, `src/growth.js`): `drill` (spinning steel bit on the mole's hard hat; a spinner) and `claws` (Drillmole, Quarrymole); `nightcap` (one tapered TubeGeometry with vertex-colour stripes, pompom, brim; `capcrown` adds a gold crown band) (Snoozalot, Slumberking; Slumberking lost the lotus); `wave` (vertex-coloured curling wave behind with a foam lip) (Splashotter, Torrentide; Torrentide swaps the back fin for the wave plus water-drop `orbs`); `tornado` (two counter-spinning lathe funnels with a canvas streak texture and leaves; hides `cr.tail`) (Whirlglide, Tempestail; Tempestail lost the wind rings); `antennae` (tesla coils with glowing tips and a bolt arc spun around x) (Jigglevolt, Megawatt); `icecape` (curved jagged ice sheet, no ink hull, plus a frost collar) (Emperice, replacing its crystal ridge); `soundwaves` (additive arcs beside the ears; plus `earScale`) (Shriekwing, Echowing; Echowing lost the wind rings); `battlements` (crenellated wall, turret and pennant on the shell) (Citadillo); `sunmane` (flame corona round the face) (Solfox); Thunderam adds `cloudcrest` lifted by `cloudLift`.
- `flatten()` now keeps the `color` attribute for vertex-coloured materials (it used to strip it, which rendered them black).
- **Perf:** Jiggawatt's tentacle beads were full-res spheres (131k triangles); now 14×10 (Megawatt 219k -> 106k). Grown battles measure ~250–260 draw calls.
- **Tools:** `tools/lineup.sh <prefix> id...` renders base / stage 2 / stage 3 side by side (cropped close; `ROT=2.5` shows their backs). `LV=14 node tools/robin.mjs` runs the robin with both sides grown at that level.

## Session 14 (2026-10-14, 20:20–~21:40 UTC, session_013TphQ4j8zFYwCt2f8YuWoe)
- **Signature hazards (R175, `src/hazards.js`).** `SIGS[arena]` = {name, word (hit text), jumbo (jumbotron), tip (first-time callout)}. `Hazards.signature()` builds one `this.sig` at a time; `updateSig(dt)` runs it; `clearSig()` frees meshes (materials flagged `userData.own` are disposed; toon materials are cached and never disposed). The kinds:
  - volcano **fissure**: a glowing crack plus 5 staggered geyser rings in a line through a fighter.
  - frost **ice slick**: a strip with blue edges across the arena; standing on it sets `f.slick` (Ripples' puddle footing).
  - neon **laser**: a full-length beam through the centre sweeps half a turn in 3.2 s; it can't be outrun, only guarded or rolled through. `incoming(f)` tells the CPU to guard or dodge.
  - beach **rogue wave**: an extruded curl with vertex colours and a merged foam lip rolls down one lane; `danger()` steps the CPU out of the lane.
  - sky **crosswind**: shoves everyone one way for 4 s, with streaks and leaves; no damage.
  - grove **spore cloud**: lingers 5.5 s and adds dizzy while you're inside it.
  - `hurt(f, dirX, dirZ, H, word)` is the shared hazard hit (never a KO; a guard returns 'block').
  - Frequency: the first pattern in a match is 65% signature, after that 40%. The boss storm mixes signatures in (R186).
  - The VS screen and stage card name both hazards.
  - `tools/sigtest.mjs <arena> <prefix> [wide]` forces one and screenshots warn/live (`wide` = overhead camera).
- **Daily Team Challenge (R177).** `dailyChallenge()` adds `team: [foe, a, b]` about one day in three. These fields are rolled after the solo fields, and the modifier pool is pinned in R187, so every date keeps its old challenge.
  - With 3+ critters, a team day runs as `ctx = {kind:'team', daily}`: the day's arena and modifier, double XP, Try Again on a loss.
  - `DAILY=2026-10-15 node tools/teamflow.mjs` fakes the date. 2026-10-15, 18, 20, 21 and 22 are team days.
- **Daily streak (R182).** `Screens.dailyClear(key)` marks the day and extends `save.dailyStreak {last, n}` on back-to-back days, paying `min(5, n)` berries. `dailyStreakNow()` feeds the card. `save.stats.bestDaily` feeds the **Regular** badge (7 days).
- **Stadium Trials (R188, R193).** A Challenges card unlocks after the Sprout Cup and needs hazards on.
  - `TRIALS` in screens.js pairs each hazard stadium with a home critter. `trialSheet()` is the picker; `ctx = {kind:'trials', arena, foe}`.
  - Every trial runs under Stadium Mayhem. Stars: ★ win, ★★ no hazard hits, ★★★ also ≥70% health. They're saved in `save.trials[arena]`.
  - Results offer Try Again (below 3★), Next Trial and Trials. The **Trick Star** badge is for all 18 stars. `starRow(n)` renders stars as styled `<i>` because the font draws ☆ like ★.
- **Stadium Mayhem modifier (R187).** `MODS.mayhem` (`hazard: true`) makes hazards tick twice as fast. It's used by Survival (which then picks a hazard stadium), DJ Tumble in the Midnight Cup, every trial, and the Quick Battle chip. It's dropped when hazards are off (R190).
- **Quick Battle modifier chip (R191).** It sits in the Match Setup button row and cycles None plus every modifier; a toast describes each. Below 480 px wide it shows the icon only. Toasts now wrap (`max-width: 100vw - 32px`) instead of running off narrow phones.
- **Training hazards (R183).** Sparring Setup has a "⚠ Hazards: On/Off" chip. Battle `opts.hazards` → `battle.trainHazards`. Arena chips mark hazard stadiums with ⚠.
- **Polish:**
  - Sounds (R179): `sfx.laser/wave/wind/spores`. `noise()` now loops its 1 s buffer, and `osc/noise` take `hold: true` for sustained sounds.
  - First-trick callout with a tip (R180).
  - Jumbotron (R189): a hazard-tape WARNING plus the trick name while a signature runs (`drawScreen({alert, blink})`). Reduce flashing holds it and the laser steady (R194).
  - Badges: **Stadium Tamer** (win in all 6 hazard stadiums with hazards on; `save.stats.hazardArenas`), **Regular** and **Trick Star**.
  - Pecan news `tricks`. How to Play lines for Daily and hazard practice.
- **Checks run:**
  - Auto sweeps on all 7 arenas with Mayhem plus a second modifier: error-free.
  - CPU vs laser: about 60% of passes guarded or rolled at d 0.9.
  - Midnight Cup cupflow clears at 740×360.
  - Team-daily win and loss paths, and normal teamflow, pass.
  - tapcheck is clean at 740×360, 915×412, 412×915 and 360×640. Its only flag is the battle pause in portrait, which sits under the rotate hint by design.
  - Perf: the wave adds +7 draw calls, the laser +9.
- Balance was not re-run: hazards are symmetric and robin runs on the hazard-free default arena.
- **R195:** Camp shows a striped circus pedestal (`buildProps(cups, team, trials)` in camp.js) with a gold star for each trial at 3★. The results note says so.
- **R196:** a cleared Daily card previews tomorrow's challenge.
- **R197:** the Team Battle pick sheet has the modifier chip (`this.teamMod`, `ctx.mods`); daily team days keep their own modifier.
- Final gate (21:40 UTC): tapcheck clean at all 4 sizes, Sprout Cup cupflow clears, and teamflow normal and DAILY both finish.
- **Time:** the user asked for about 2 hours in session 14 (20:23 → ~22:25 UTC on 2026-10-14). Session 14 chained at ~230k context, about 21:45 UTC.

## Session 16: ADVENTURE MODE (2026-10-14 23:44 UTC →, the user's new direction)
- **The user's request (23:40 UTC):** "add a world around the battle arena, similar to pokemon, the arenas are the gym, and the critters travel around in the world and wild fighting others and going to certain arena tournaments for rewards to prove they are the strongest critter, should build a story around a critter who wants to be the best, but there are trials that critter must face along the way." They asked for **5 more hours of chained sessions**: from 23:44 UTC to about **04:45 UTC on 2026-10-15**.
- **Their answers:**
  - World like **Pokémon Red/Blue**: grid movement, towns, routes and tall grass, drawn as **3D top-down toon**.
  - Wild fights: **both** visible roaming critters and random tall-grass encounters.
  - The hero is **the critter the player chooses**.
  - A **new Adventure mode**; Tournament, Challenges and Camp stay as they are.
- **Code:**
  - `src/world.js` is the `World` class (owned by `Screens.worldObj`, mode `'world'`). It hides the arena's meshes but reuses its lights (no shader recompiles) and moves the sun's shadow box with the hero.
  - The map builder (`buildGround` canvas texture, merged `buildTrees`, `buildGrass`, `buildProps`, `buildBuildings` incl. `stadiumModel`) and actors (NPCs, trainers with sight lines, roaming wild critters) live there too, along with grid movement (`tryMove`/`arrive`), map edges (`edges` + `off`), the dialogue box `say()`, the `bubble()` "❗", `ambush()` (tall grass, `wild.rate`), `wildFight()` and the `fade`/`flash` transitions.
  - `src/worldmaps.js`: `MAPS` (ASCII tiles: `T . : " f ~ # R h`), buildings, signs, NPCs (`trainer`, `story`, `hideFlag`, `wander`, `$hero` critter = the hero's species), `wild: {list: [[id, lo, hi]], roam, rate}`. `rivalFor(hero)` returns Dash's species.
  - `src/story.js`: `storyIntro`, `storyStep` (after each step), `storyTalk`, `doorAction` (home and Berry Center set the respawn point, the stadium starts its cup with `ctx.adv`).
  - Screens: `adventure()`, `heroPick()`, `worldMenu()`, `worldFight(info)` (ctx `{kind: 'world', fight, flag, note}`), `worldCup()`, `leaveWorld()`. On results, a `world` kind sets flags, may recruit (45% for a new wild species) and offers **Continue**; a loss respawns at `save.adv.spawn`. A cup started from the world has `ctx.adv`, and its trophy and Give Up return to the world (`flags['cup_' + id]`).
  - `Arena.setOpen(on)` hides the stadium shell for wild and route fights; `endBattle` resets it.
  - Save: `save.adv = {hero, map, x, y, dir, flags, spawn, steps}`.
- **Story so far:**
  - Clashara; the Critter Crown on Champion's Peak; 7 stadiums.
  - Pecan gives the quest (a Pebblepup guard blocks Route 1 until then).
  - **Rival Dash** (Voltferret, or Kindlekit if the hero is a Voltferret) ambushes on Route 1 as the "Trial of Courage".
  - The Sprout Stadium in Bloom Town is gym 1.
- **Test hooks:**
  - Set `__save.adv = {hero, map, x, y, dir, flags: {intro: true, quest: true}, spawn}` and then call `__game.screens.adventure()`.
  - Walk with `__game.input.keys.add('KeyW')` plus `__sim`, or call `w.tryMove('n')`. `w = __game.screens.worldObj`.
  - Jump between maps with `w.load(map, x, y, dir)`. Start fights with `w.startWild(id, lv)` / `w.ambush()`.
  - The VS is skipped: a fight starts 0.9 s after the flash (a real-time timer, so wait about 3.5 s in headless).
- **Done in session 16 (R209–R212):**
  - The world engine and the first 3 maps (R209).
  - The portrait camera (R210).
  - Wild and route fights in the open meadow, with no stadium shell (R211).
  - **Route 2 and Seashell Town** (R212):
    - New tiles `s` sand, `P` palm, `=` bridge; per-map `arena` (the battle scenery for fights there), `outer` (ground colour beyond the map) and `border: 'palm'`.
    - A Sprout Cup gate on Bloom Town's east road.
    - The **Trial of Strength**: a sleeping Bouldillo on the bridge; story fights can `recruit`.
    - Dash's 2nd battle at the Thunder Stadium gate (`rival2`).
    - Post-cup scenes in `storyIntro` (`post_sprout`, `post_thunder`).
  - R213: the title shows Adventure and Tournament side by side (`.title-main`), so the menu fits 740×360.
  - Session 16 ran 23:44 to about 00:20 UTC and chained at about 230k context. It sent the user the APK built from its last commit.
  - `tools/advcup.mjs [WxH]` plays the Sprout Cup from the world's stadium and checks it lands back in the world (it passes).
- **Plan / next:**
  1. ~~Route 2 to Seashell Town~~ (done in R212).
  2. Glowcap forest route (a Trial of Friendship).
  3. The volcano road and the Champion Cup.
  4. The later towns for Midnight, Legend and Sky.
  5. Champion's Peak: Dash's final battle and the Crown boss.
  6. Polish: interiors, world music, wild-battle field paint, a mini-map, NPC variety.

## Session 16b (2026-10-15, 00:17–~01:05 UTC, session_01ANZ45uVgqvHmpmgKjHvGwJ): the rest of the Adventure story, R214–R220
- **World order now:** Sprout Village → Route 1 → Bloom Town (Sprout) → Route 2 → Seashell Town (Thunder) → north: **Glowcap Woods** → **Glowcap Hollow** (Glowcap Cup) → east: **Cinder Road** → **Cinder Town** (Champion Cup) → east: **Neon City** (Midnight Cup) → Captain Puff's balloon → **Cloudtop Gardens** (Sky Cup) → balloon → **Frostpeak** (Legend Cup) → north: **Champion's Peak** (Dash's last battle, King Snooze the Crown Keeper, the crowning, THE END). Map keys: `glowwood glowcap cinder ember neon cloudtop frostpeak peak`.
- **Gates** (storyStep, push the hero back a tile with a line): Seashell north needs `cup_thunder`; Glowcap east needs `cup_grove`; Cinder Town east needs `cup_champion`; the balloon to Cloudtop needs `cup_midnight` and to Frostpeak `cup_sky` (`dest[].need`); the Frostpeak trail needs all 7 cups.
- **Trials (all flags in save.adv.flags):** Courage (`rival1`), Strength (`trial_strength`), **Friendship** (`mama_asked`, `pip_saved` = beat the Thistlehog bully, `pip_found` = Pip follows you (`save.adv.follow`), `trial_friendship` = Pip home, brambles open, Squeakwing joins if new; then Dash's 3rd battle `dash3`), **Wisdom** (`trial_wisdom`: the Stone Sage asks 2 random type questions + 1 tactics question via `w.ask()`; a wrong answer = a battle with Montiff), **Heart** (`trial_heart`: beat Night Gang boss Vex (Solfox) to save Dash; `post_heart` thank-you scene), **Focus** (the Champion's Peak ice lake; no flag, the puzzle is the trial). Finale flags: `seven`, `dash5`, `crowned`, `ending`. Scene flags: `woods`, `cinder`, `neon`, `cloudtop`, `frostpeak`, `post_grove`, `post_champion`, `post_sky`.
- **New map fields (worldmaps.js):** `palette {a, b, tall, path, water, bank, ice, dark, lite}` (ground canvas colours), `trees [canopy, canopy2, trunk]`, `blades`, `mood {sun, sunI, sky, gnd, hemiI, fog}` (World.mood() re-tints the reused arena lights; restored on leave), `fireflies`, `pads` (lily pads), `bramble: flag`, `lava`, `city`, `snow`, `border: 'cloud'`. NPC fields: `showFlag`, `shiny`, `balloon: color` + `dest: [{map, x, y, dir, name, need}]`. Building fields: `shroom`, `tower: neonColor`, `altar`.
- **New tiles:** `m` giant glowing toadstool (solid), `g` little glowcaps (walkable), `B` bramble (solid until the map's `bramble` flag), `v` steam vent (solid), `l` street lamp (solid), `i` ice (slide until blocked). Ponds pull in from dry neighbours (a bank shows) — that applies to every map.
- **World engine additions (world.js):** `buildForest` (toadstools/glowcaps/brambles, `openBrambles()` shrink animation), `buildVolcano` (vents + lava embers; lava is a MeshBasicMaterial), `buildCity` (skyscraper blocks with a repeating window texture, coloured rooftops, lamps), `shroomHouse`, `towerModel`, `altarModel` (spinning crown, `crownScene()`), `balloonModel`, follower (`makeFollower`, `updateFollower`), ice sliding in `arrive()` (`this.sliding`), snowfall, `ask(q, opts, cb)` answer buttons (tap, or stick + A).
- **Story order of Professor Pecan's hints:** `WHERE` table in `storyTalk('pecan')` names the next cup's town.
- **Tools:** `tools/advshot.mjs <WxH> <prefix> <map> <x> <y> [flags] [js]` (drop in + screenshot; it does not check the tile is walkable), `tools/advstory.mjs <map> <x> <y> <dir> <flags> [WxH]` (press A there and play out dialogue/questions/forced-win battles; prints the log and flags), `tools/advtrial.mjs` (the whole Trial of Friendship), `tools/advcup.mjs [WxH] [map x y flags]` (any stadium; door fronts: bloom 8,7 · seashell 9,6 · glowcap 9,6 · ember 8,6 · neon 8,5 · cloudtop 9,6 · frostpeak 8,6). The ice puzzle solution from 9,20 is `nnwsenwswnen` (solver/generator scripts were scratch; the layout was checked for no soft-locks).
- **Checked:** all 7 cups play from their town and land back in the world (advcup), every trial and the ending play out error-free (advstory/advtrial), screenshots of each new map at 915×412 and some at 412×915.
- **Next (polish, plan item 5):** interiors (houses are still "Nobody seems to be home"), world music per map exists but Champion's Peak uses `boss`; a mini-map or town-map screen in the ☰ menu; NPC variety; wild-battle field paint per area; a world-map "fly" between visited Berry Centers; Pecan news `adventure` for returning players; a tapcheck pass on the world screens (ask buttons at 360 px tall); balance of story fights vs the hero's level (story fights use fixed levels until the Peak, which scales with the hero); Camp prop for the Critter Crown.

## Session 16c (2026-10-15, 01:01–~02:00 UTC, session_011kJnrLcnLSxeiY2bMLFS7Q): Adventure polish, R221–R243
- **Interiors (R221, `src/interiors.js`):** every non-stadium building can be entered. `getMap(key)` (use it instead of `MAPS[key]`) builds a room on demand for keys `in:<map>:<building id>` from `ROOMS` (house/center/lab/arcade ASCII layouts) and `PEOPLE` (residents per building, wall/rug colours, Berry Center visitors). Room tiles: `W` wall, `C` shelf, `X` machine, `Q` bed, `D` table, `O` plant, `K` counter (A talks across it), `Y` rug. Room maps have `indoor`, `exit` (outdoor door front), `enter`, `wall`, `rug`; furniture are hidden signs (`hide: true`, `act: 'rest'` for the home bed). Stepping on the doormat (bottom row) goes back out. `World.buildInterior()` draws walls/furniture; the camera holds the room (portrait follows the hero's x). Nurse Lilypop (`story: 'nurse'`) and the home bed (`'rest'`) set the respawn point. `tools/advroom.mjs` walks in/out of a Berry Center and naps at home.
- **Town Map (R222):** ☰ → 🗺️ Town Map (`Screens.worldMap`, layout `WMAP` at the top of screens.js). `save.adv.seen` records visited maps (set in `World.load`). Tap a visited town to fly to its Berry Center (`WMAP[k].fly`). **Bug fixed:** Neon City's Berry Center and tower doors were blocked by a stray `h` row.
- **R223:** trainer/story fights use `storyLevel(fixed, heroLv)` (exported from screens.js): over-levelled heroes meet foes halfway to their level; under-levelled ones never face more than hero+3. Wild levels unchanged. XP pacing checked: a full run gives about the XP to reach Lv 19 by the Legend Cup.
- **R224:** tapcheck has world steps (heropick, world, worldmenu, worldmap, worldask, worldroom); clean at 740x360 and 412x915 apart from the known portrait rotate hint in battles. The A button hides while answer buttons are up.
- **R225:** Pecan news `adventure` (returning players without an adventure); Camp shows the Critter Crown on a stump (`buildProps` 5th arg; badge `crown` or flag).
- **R226:** NPC `act` field: `sleep`, `dance`, `hop`, `cheer`, `wave`, `fan`, `fish` (rod + bobber) in `actPose()`.
- **R227 + R241:** open-field fights: stadium markings are a separate `marks` layer (`userData.stadium`), the padded wall is hidden, a hedge ring (`userData.openOnly`) shows, far scenery stops casting shadows, and the stage card names the map (`stageName` battle option).
- **R228:** title Adventure button shows place and cups; ☰ → New Adventure (tap twice) starts over via heroPick.
- **R229:** running (stick fully pushed on touch, or Shift): `stepLen` = STEP×0.62, dust puffs; rooms are walk-only.
- **R230:** hidden gift boxes: 2 per outdoor map (24), deterministic per map (`buildItems`, BFS-reachable, off paths, spread out), flags `it_<map>_<k>`; berries or a Power Snack (40% of a level's XP). ☰ shows 🎁 n/24.
- **R231:** portrait room camera; regression run of advcup (Sprout), advtrial, advstory (King Snooze → THE END): all clean.
- **R232:** post-game: Dash (`dashpost`, `showFlag: 'ending'`) by Pecan's lab offers a daily rematch at hero+2 for 3 berries (`berries` field on world fights; flag `dashday_<date>`).
- **R233:** shiny wild critters (`SHINY_RATE` 1/30) sparkle; beating one unlocks its shiny palette and always recruits it if new.
- **R234/R235/R238:** How to Play has an Adventure line; Pecan news `adv2` for Adventure players; the intro ends with a controls hint.
- **R236:** idle hero animations (looks around, stretches, yawns, dozes with z's).
- **R237:** ☰ badge case: 7 cup emblems in story order (+ crown).
- **R239/R240:** walking buddy: ☰ → 🐾 Buddy (`save.adv.buddy`; Pip's `save.adv.follow` wins), `World.refreshFollower()`; press A facing the buddy to pet it.
- **R242:** `sfx.door(bell)` on entering/leaving rooms. **R243:** arcade neon strips.
- **Next ideas:** more room furniture variety (stadium lobbies?), a day/evening tint, route-trainer rematches after the ending, Town Map gift counts per town, a footstep sound per terrain, a 2-rep robin balance run (combat untouched this session).

## User's playtest fixes (2026-10-15 ~02:15–02:35 UTC, the user's own chat session_01UPXMwf8USorUzs3NksZdTA, rounds suffixed "b")
- **User report:** "whenever winning a battle the next button is either not able to be pressed or only halfway shown"; "remove the instructions in the middle of the battle, takes too much space and it ruins the battle look".
- **R244 (results):** the `.results` column scrolls (`touch-action: pan-y`), `.res-btns` is sticky at the bottom, safe-area padding, and `Screens.fitResults()` adds `.tight`/`.tighter` (smaller title, compact gear callout, then hides quote and portrait) until it fits. It is called on render, after `gearGet`, and on resize. Toasts on results sit over the winner. Repro tool: `tools/winshot.mjs <WxH> <prefix> [trainer 0/1] [levelup+gear 0/1]` (it prints each button's top/bottom and a hit test). Before the fix, Continue was at 332–380 on a 340 px screen.
- **R244 (instructions):** no first-battle coach in Adventure fights (opening one marks `tutorialDone`). The lesson ends after any battle that reaches `done` (it used to repeat every fight until all 5 steps were done, which short wild fights never allowed). The coach is a small pill at the bottom. Hazard tip sentences ("Laser! Guard or roll through it!") are no longer shown as callouts.
- **R245b:** the results close-up rotates round a winner near the edge (`battle.resYaw`) so the camera is never inside the hedge or wall.
- **R246b:** pause → 🏃 Run Away in wild Adventure fights (back to the same tile, toast "Got away safely!"). The beaten wild critter's line fits the area (`HOME` table in screens.js, `ctx.arena`). `tools/advwins.mjs` runs a wild fight and win on several maps.
- **R247b:** on small landscape phones the rank stamp no longer covers Health left.
- APK 1.0.264 (66ed84b) was sent to the user. Ask whether the win screen and the battle look are right on their phone now.

## Session 16d (2026-10-15, 01:57–~03:00 UTC, session_01RW12a1ayFyRLwLWTM3X8Ud): Adventure polish, R244–R254
- **R244:** world stadiums have a sloped seat bank full of fans inside (the open cylinder's inside showed the black outline hull); house gable roofs get shingle bands and a ridge cap; lone `R`/`l`/`v` tiles take sand ground when sand surrounds them (no grass squares on the beach).
- **R245:** Berry Centers have a round pink-cross sign on the ridge (tipped toward the camera); `sfx.foot(kind)` footsteps per terrain (grass/sand/snow/wood/stone/ice) in `World.arrive()`. New `tools/advfight.mjs <WxH> <prefix> <map> <wildId> [lv]` screenshots an open-field wild fight (intro and mid-fight).
- **R246:** Town Map shows 🎁 next to visited places that still hide a gift (`it_<map>_0/1`); the map svg is a bit shorter on short phones so Close isn't clipped.
- **R247 + R251: clock of day.** `World.phase` is `day`/`evening` (17–20 h)/`night` (20–06 h) from the device clock (`save.adv.clock` overrides it for tests), only for outdoor maps without their own `mood`. `PHASES` in world.js re-tints the reused lights; house windows use the glowing `LIT` material at evening/night; fireflies drift at night. Wild/route fights call `Arena.tint(phase)` (sky dome colours, stars, sun, hemi), and `endBattle` calls `tint(null)`. **Headless Chrome runs on UTC, so screenshots after 20:00 UTC are night; pass `__save.adv.clock = 12` and `w.load(...)` for day shots.**
- **R248:** after `ending`, beaten route trainers offer a daily rematch at the hero's level (`re_<id>_<date>` flag, Yes/No `ask`, +1 berry).
- **R249:** portrait room camera backs off to fit the room's width; room `outer` is a warm dusk (0x3a2a2a), not black.
- **R250:** framed landscape pictures on room back walls; a pink cross behind the Berry Center nurse.
- **R251:** wild critters' name card says "Wild" (not "Rival"), via `HUD.nameCard(f, trainer, tag)`.
- **R252:** the ☰ menu shows a one-line next goal (`nextGoal(F)` in story.js).
- **R253/R254:** rounded outer corners on water/lava/bank and on tall-grass patches.
- Checked: tapcheck clean at 740×360 and 412×915; advcup Sprout (915×412) lands back in the world, advstory rematch with Hiker Gus, screenshots of all towns, rooms (landscape and portrait), night/evening world and fights.
- **Next ideas:** grass blades sway (needs a shader uniform), stadium lobbies, NPC variety per town, inner (concave) water corners, a night version of the Town Map, weather (rain on routes), shop for berries.

## Session 16e (2026-10-15, 02:51–~04:40 UTC, session_01CGnqFczuvcYh4pqEyaX1eN): Adventure polish, R255–R279
- **R255/R273/R274:** tall grass sways (CPU vertex offsets on the merged blade geometry, `World.swayGrass()`, shared by the ink hull) and parts around the hero, the buddy and roaming wild critters; every other frame on low quality (~0.4 ms/frame on desktop for 10k verts).
- **R256:** palms have arching folded leaves (`frond()` in `buildTrees`), coconut clusters and trunk rings.
- **R257:** chimney smoke (`this.chimneys`, thicker at night/snow; the Cinder Town forge throws sparks and has a rust roof).
- **R258/R259/R268/R270/R277: weather.** `World.rain` for grassy outdoor maps without `mood`/city/snow/lava/cloud, picked from the date and 3-hour slot (`hash(slot + key) % 5 === 0`); `save.adv.rain` overrides it for tests. `RAIN` light table, falling streaks (fx `spark`, stretch 0.05) and splash rings, 🌧️ on the map banner, water-type wild critters 50% of tall-grass encounters, NPC umbrellas, puddles on `:` paths (own rng), wild/route fights get `Arena.tint(phase, rain)` (grey sky, `arena.rainy` makes main.js spawn rain over the field), and the results line says the wild critter splashes off through the puddles (`ctx.rain`).
- **R260:** room tables get stools and table-top items (mug, books, plate of berries; beakers in the lab).
- **R261:** Berry Center blender (`act: 'smoothie'` sign in interiors.js, `storyTalk('smoothie')`): 1 berry → a quarter level of XP; Nurse Lilypop mentions it.
- **R262/R266:** inner (concave) corners of water/lava get a curved fillet (3D) and a bank fan (canvas); sand and ice round their outer corners; boulders in the Peak's ice lake sit on ice.
- **R263/R265:** route trainers wear role hats by name prefix (`HATS`/`roleHat(cr, name)` in critters.js), in the world and in their battle (`Battle` adds it when `trainer.name` matches).
- **R264:** meadow wild fights swap the field texture to an unmowed meadow (`Arena.wildField()`, swapped in `setOpen`) plus edge tufts.
- **R267:** footprints in snow and sand (`World.footprint()`, a pool of 24 flat decals; fx billboards clip into the ground, so don't use them for ground marks).
- **R269:** ☰ card shows ☀️/🌇/🌙/🌧️. **R271:** Town Map has evening and night colours (`.wd-map.evening/.night`, stars). **R272:** doorway lamplight on the ground at dusk/night.
- **R275:** starfish and shells on beach sand. **R276:** falling leaves/petals on maps whose `trees[0]` is warm (Cinder Road, Cinder Town, Cloudtop).
- **R279:** the giant toadstools (`m`) breathe out glowing spores in their cap colours (`this.shrooms`).
- **R278:** Pecan news `adv3` (weather, clock, smoothie) for Adventure players who saw `adv2`.
- **Ownership note:** the parent session asked (message delivered late, at 04:11) to keep to world.js/worldmaps.js/interiors.js/story.js, because the user's own chat (session_01UPXMwf8USorUzs3NksZdTA, rounds R245b+) owns Adventure battles: the open-field scene, results and the flow back to the world. Session 16e did touch that area in small additive ways, merged cleanly (no commits from that chat landed during 16e): **screens.js** `worldFight` (`rain` → `ctx.rain`, `tint(phase, rain)`), the wild results line (`W.rain`), the ☰ card clock chip, Town Map classes, Pecan news `adv3`; **arena.js** `tint(phase, rain)` + `rainy`, `wildField()`/tufts swapped in `setOpen`; **battle.js** `roleHat` on the trainer's critter; **main.js** rain particles during a battle when `arena.rainy`; **style.css** `.res-grid` padding-right 34px at max-height 480px landscape (rank stamp vs Health left), Town Map evening/night. The user's chat should review these.
- **Tools:** `advfight.mjs` takes a 6th arg (JS run first, e.g. `__save.adv.clock=12;__save.adv.rain=true;w.load(...)`); `RAIN=1 node tools/advwins.mjs ...`.
- **Checked at the end:** tapcheck clean at 740×360 and 412×915 (only the known portrait rotate hint in battle pause), advcup Sprout at 915×412 and 740×360 lands back in the world, advwins route1/cinder/frostpeak (+ rainy route1) error-free.
- **Next ideas:** a rainy-day sky/weather in cups? (cups stay dry now), stadium lobbies, NPC variety per town (more act poses), hero umbrella or shake-off after rain, a weather forecast line from Pecan, more beach/forest decor, re-measure world FPS on a real phone (grass sway + rain particles).

## Session 16f (2026-10-18, 02:54 UTC →, session_01KHxjCsquH7cLCB4heWxLGg): Adventure polish + new content, R280+
- The user asked for 5 hours (02:54 → 07:54 UTC on 2026-10-18). The worker stalled from about 03:30 to 06:19 UTC, so the end moved by the stall to about **10:45 UTC**. Branch `ccr-4fc93d6e-suxlhd` (the session was assigned `claude/critter-clash-adventure-polish-alinue`, but the user asked for the game branch).
- **R280:** Pecan's Lab roof: parapet, solar panels (shared `panelTex()`), skylight dome, a turning dish (`this.labDish`), a blinking aerial (`this.beacon`), and a name board over the door (also used by the Hat Shop).
- **R281: berry bushes.** `World.buildBush()` puts one bush per outdoor map (not the Peak) on a grass tile at a tree edge, near a path, with no tree right in front of it (it would hide it), and only where blocking that tile keeps every reachable tile reachable (BFS check). Placement is deterministic: it ignores the hero's tile and uses `this.itemSpots` (all gift spots, opened or not). A ON it → `shakeBush()`: 1–3 berries once a day (`save.adv.bush[map] = date`), and 15% of the time a wild critter from the map's list tumbles out. Mom mentions it.
- **R282/R283: Hat Shop** (Bloom Town, building `hats`, 15,10; Old Snoozlo moved to 20,12; the path reaches its door). It has a giant top hat on the roof, a striped awning, a name board, and a `shop` room with `H` hat stands, Milliner Mo (`story: 'hatshop'`; interior npc tuples take a 7th `story` field). `SHOP_HATS` / `shopHat()` / `hatModel()` in critters.js (roleHat now uses `hatModel`; new kinds beanie, party, flower, top). `save.adv.hats` owned, `save.adv.hat` worn; `World.wearHat()` puts it on the hero and hides the Lv 15 gear crown (`Critter.gearCrown`). `pickPaged()` in story.js pages long answer lists (3 + More + Bye); `.wd-ask.many` makes the buttons compact. **Not done (battle side, the user's chat):** the hat doesn't show in fights; `battle.js` could call `shopHat(fighters[0].critter, save.adv.hat)` for `ctx.kind === 'world'`.
- **R284:** the hero holds a yellow umbrella in the rain (`brolly()` shared with NPCs) and does a wet-dog shake (`this.shakeT`) on a room's doormat after coming in out of the rain.
- **R285:** Pecan gives a forecast for the visited places for the next 3-hour slot. `canRain(M)` / `rainAt(key, date)` are exported from world.js.
- **R286:** Frostpeak: rocks are snowmen, low snow drifts, glitter on the snow, darker path colour.
- **R287: fishing.** Fisher Finn (`story: 'fisher'`) gives the Old Rod (`flags.rod`). Face `~` water and press A: `cast()` → wait 1.4–4 s → ❗ bite, 0.85 s to press A (`updateFish`, `reel()`). 55% a wild water critter from the map list (or a water starter at hero−1), 30% berries, 15% junk. Pressing early or late loses it. `unload()` clears fishing and `busy`.
- **R288: stadium lobbies.** A stadium door now opens `in:<map>:<stadium id>` (`lobby` room, 15×8): Front Desk Hootsy (`story: 'cupdesk'`, the old cup sign-up lines plus a Yes/No ask; it sets `save.adv.map = M.exit.map` before `S.worldCup` so the cup returns to the stadium door), posters of the cup's trainers' critters (`World.poster()`, portraits as textures), two fans (`act` works on interior npcs), and seven `U` trophy cases (`CUP_ORDER` in interiors.js) that show a gold trophy for each won cup (`act: 'case:<cup>'`). Dash's Thunder Stadium ambush still fires at the door. `tools/advcup.mjs` now signs up at the desk.
- **Tools:** `tools/advtour.mjs <WxH> <prefix> '<json [[map,x,y,clock,rain,js],...]>'` takes many world shots in one page load (`w` is the World in the js).
- **R289:** Pecan news `adv4` (lobbies, bushes, Hat Shop, fishing). The test tools' news lists include `adv4`.
- **R290:** new NPC `act`s in `actPose()`: `water` (Gardener Rosa, Cloudtop), `read` (Elder Oakley), `skate` (Skater Ivy), `flex` (Big Boulder). The props are built once (`a.prop`).
- **R291/R292: Berry Center request board** (the `C` at x 1 in every Berry Center draws a cork board, `act: 'board'`). `requestBoard()` in story.js picks 3 of `REQUESTS` from the date (wins, steps, bush, fish needs `rod`, smoothie, wild). Progress is the delta from `save.adv.req.base`, kept in `save.adv.cnt` (`countUp(k)` exported from story.js; world.js imports it, which is a harmless import cycle). Each finished request pays 2 berries on the next visit; all three also give a Power Snack. The nurse mentions it, and the ☰ card shows `📋 n/3` or `new!`.
- **R293:** at night, roaming wild critters sleep (no wandering). Press A facing any roaming wild critter to start its fight.
- **R294:** fish leap out of open water (`buildFish`/`updateFish2`; `this.pond` = water tiles with water on all sides).
- **R295:** Neon City: soft additive neon pools on the streets (`glowTex()`, shared) and 3 delivery drones that circle near the hero (`this.drones`).
- **R296:** a wardrobe at home (the `C` tiles in `in:village:home`, `act: 'wardrobe'`) runs `wearMenu()`.
- **R297:** `World.load` calls `fx.clear()`, so smoke, rain and sparkles from the last map don't hang in rooms.
- **R298:** seagulls over beach maps (`M.arena === 'beach'`). **R299:** butterflies over `f` flower tiles on fine days.
- **R300:** portrait rooms show 9 tiles across and pan with the hero (`vw` in `updateCamera`).
- **R301:** at night, `hop`/`cheer` town kids doze (`World.dozing(n)`), don't wander, and only snore when you talk to them.
- **R302–R304: Trader Tock** (a Pebblepup in a tricorn, `story: 'trader'`) stands beside a path in one visited town a day (`traderTown()`, after the Sprout Cup), selling the trader-only Pirate Hat (10) and Wizard Hat (12) (`trader: true` in `SHOP_HATS`; new hat kinds `tricorn`, `wizard`). The Town Map marks that town with 🎩.
- **Checks (07:15 UTC):** tapcheck is clean at 740×360 and 412×915. advcup Sprout signs up at the lobby desk and lands back at the stadium door. advstory Dash at the Thunder door works. advwins route1/frostpeak run error-free.
- **Perf note:** with the new life, the world measures 277–361 draw calls (shadow pass included) at 915×412 on high quality. Re-measure on a phone if frame rate drops; butterflies (6) and gulls (3) are the easiest to trim.
- **Next ideas:** show the hero's hat in Adventure fights (battle.js, the user's chat); a Berry Center PC or a critter storage box; more trader stock that rotates by week; a lobby banner/confetti when you return with the trophy; night lanterns on town houses; the Town Map marking the Hat Shop and fishing spots.

## Session 16g (2026-10-18, 07:12–~08:15 UTC, session_01TDGxNUrdWbyYdcQxUeHRjd): Adventure polish + side quests, R305–R323
- Chained from 16f with the same plan; the user's window ends at about **10:45 UTC on 2026-10-18**. Chained at ~250k context (the user's 300k rule).
- **R305:** deeper blue nights (`PHASES.night` sunI 0.95, hemiI 0.82); every house (not the Hat Shop, whose awning is there) has a wall lantern by the door, lit with an additive glow sprite at dusk/night.
- **R306:** rooms follow the clock: `World.outPhase` (the real phase even indoors) makes room windows a starry night (stars + moon boxes) or an orange sunset; `lamp` mood and `roomLamp()` (warm additive floor pool) after dark; the arcade keeps its neon.
- **R307:** magma cracks on `lava` maps (Cinder Road, Cinder Town): an unlit additive canvas layer (`this.cracks`, forked jagged lines on `.` tiles, own rng), breathing opacity.
- **R308:** stadium pennants flap (`this.pennants`, hinged geometry); a won stadium spins a gold extruded star over its gate (`this.medals`) and flies gold pennants.
- **R309:** Trader Tock's bag rotates weekly (2 of 6 trader hats, `wk` from `Date.now()`); new trader hats Chef Hat, Ranger Hat, Horned Helm, Bunny Band (kinds `chef`, `ranger`, `helm`, `bunny`). Hat Shop stands only show hats it sells.
- **R310:** world ambience: `sfx.ambient(kind)` in audio.js (bird, cricket, surf, rain, wind, hum, bubble, pop) sprinkled by `World.ambience(dt)` per place, clock and weather.
- **R311:** night beaches: `this.glowTide` (blue sea-spark band on water tiles next to land, beach-arena maps only, pulsing); moonlit sand colours at night.
- **R312:** Frostpeak's pond is an oval (tiles changed) and ice fills its inner corners with a curve (canvas pass before the doormat).
- **R313:** ☰ → 📸 Photo: `World.snapshot()` renders a close, low shot of the hero, draws a snapshot frame (caption: hero · place · time icon; two lines on narrow screens) and reuses `PhotoMode.prototype.preview` for Save/Share. (screens.js `worldMenu` got the button.)
- **R314:** mist banks (`buildMist`, 14 drifting glow planes, `fog: false`) on `fireflies` maps (Glowcap Woods/Hollow).
- **R315:** 13 new townsfolk (Bloom 3, Seashell 2, Glowcap 2, Cinder Town 2, Cloudtop 2, Frostpeak 2), each with an `act` and a tip.
- **R316:** fishing lands measured fish per place (`kinds` in `reel()`), 25% of casts; `save.adv.fishLog = {n, best}`; a new record pays 2 berries; Fisher Finn reports your record.
- **R317:** `World.fireworks(b)` over the stadium the first time `storyIntro` runs in a town after its cup (`fw_<cup>` flag; old saves get one show too).
- **R318:** portrait rooms look down a bit more steeply.
- **R319–R323: townsfolk side quests (data-driven).** `LOST` in story.js (who, item, hint, home, ask/wait/found/done lines, reward `hat`/`berries`/`snack`) + `LOST_SPOTS` in world.js (map, solid tile to face) + models in `World.buildLost()`. NPCs with `story: 'lost:<id>'`; facing the spot runs `found:<id>`. Flags `<id>_asked/_found/_done`. Quests: kite (Gale, Cloudtop → Frostpeak tree 22,10; Aviator Cap), camera (Tourist Bo, Cinder Town → Cinder Road rock 28,2; berries + Power Snack), pearl (Mei, Seashell → Route 2 palm 27,7; Sailor Hat), carrot (Kip, Frostpeak → Cloudtop rock 16,9; Fluffy Earmuffs), binos (Wren, Glowcap → Glowcap Woods tree 11,10; berries + snack). Gift hats have `gift: true` (never sold). `questMarks()` floats a ! (favour to ask) or ? (found, return it) over the giver. The ☰ card shows the first open favour (`favourLine()`, small line under the goal).
- **Checks:** advcup Sprout lands back in the world (a first run failed only because another headless run was hogging the CPU; timings are real-time). Each quest played through with advtour JS. tapcheck at 740×360 ran at the end (see the commit/notes).
- **Next ideas:** more favours (Bloom's Pricklepuff, Neon City), a favour list page, fish album in the ☰ menu, cups in rain, re-measure world FPS on a phone (lanterns, mist, cracks, tide, ambience add a little), the hero's hat in fights (battle side, the user's chat).

## Session 16h (2026-10-18, 08:14–~08:50 UTC, session_01SN9QpidMuXPxrYkBkK6dRk): favours, Journal, hats grid, rooms, R324–R338
- Chained from 16g with the same plan; the user's window ends at about **10:45 UTC on 2026-10-18**. Chained at ~255k context (the user's 300k rule).
- **R324/R332:** three more favours (data in story.js `LOST` + world.js `LOST_SPOTS` + models in `buildLost()`): `can` (Gardener Bea, Bloom → Route 1 rock 4,21; Straw Hat), `phones` (DJ Tumble, Neon → Cinder Town rock 23,1; DJ Headphones, new hat kind `phones`), `ball` (Lilypop, Sprout Village → Route 1 rock 7,9; Propeller Cap, new kind `propeller`, its `spin` group turns in `World.update`, fast while walking, R333). 8 favours in total now.
- **R325:** ☰ → 📔 Journal (`screens.worldJournal(tab)`): Favours tab (`favourList()` in story.js: giver portrait, state found/open/done, hint, count of townsfolk not asked yet) and Fish tab (album from the exported `FISH` table in world.js; `save.adv.fishLog.sp = {name: best cm}`; old saves count `best`).
- **R326:** the Town Map marks open favours: 🔍 where the lost thing is, 📦 the giver's town (`favourList().rows[].at`; `LOST_SPOTS` is exported).
- **R327:** `World.buildChamp()`: a won stadium's lobby has bunting, a CHAMPION banner with the hero's name on the desk front, confetti + toast the first time back (`lb_<cup>` flag), and new fan lines.
- **R328:** new tiles `u` (striped beach umbrella + towel, solid) and `c` (sandcastle, solid) in `buildProps`; Seashell Town has two umbrellas and Diggles' sandcastle.
- **R329:** portrait rooms show 7.5 tiles across (`vw` in `updateCamera`).
- **R330/R331:** beach dig spots: `buildDig()` puts one X-marks-the-spot a day on reachable, visible `s` sand on `arena: 'beach'` maps (`save.adv.dig[map] = date`); A on it or facing it → `digUp()` (berries, a chest of 3, a Power Snack, or a wild Diggles 15%). Berry Center request `dig` (needs `cup_sprout`). Pecan news `adv5` (tools' news lists include it).
- **R334/R335:** `screens.hatGrid(q, hats, onWear, onDone, buy)`: a grid of the hero's portrait wearing each hat (`game.portrait(def, 128, false, hatId)` — main.js `portrait` takes a 4th `hat` arg, framed a bit higher; 'none' = bare head with the same framing). Used by the wardrobe, Hat Shop Wear/Buy and Trader Tock (buy mode shows prices, dims ones you can't afford). `w.busy` is held while it's open.
- **R336–R338: room kinds** in interiors.js (`P.kind`, `P.name`, `P.floor`): `forge` (Cinder Town: tile `F` brick furnace with glow pool + embers via `this.forgeFire`, `A` anvil, tool pegboards on `C`, stone floor), `lodge` (Frostpeak: `F` becomes a stone fireplace with mantel), `cabin` (Captain Coral's hut: portholes, ship's wheel, `b` barrels), glowcap `shroom*` houses (`M.shroom`: `O` = glowing mushroom lamps with spores + `lampPools`), Neon tower flat (`M.cityView`: skyline in the windows). Don't name a room flag `city` (that builds the outdoor Neon streets and drones).
- **Checks:** every round shot at 915×412 (and 412×915 / 740×360 where UI changed); no page errors. tapcheck/advcup not re-run this session (no battle/flow code touched; main.js `portrait` change is additive).
- **Next ideas:** more room kinds (Grandpa Woolt's cottage, Firefly Flo's house), a favour for Seashell/Cloudtop that isn't a lost item (a delivery between towns), dig spots on snow (Frostpeak) with ice gems, show favours count on the ☰ card, the hero's hat in fights (battle side, the user's chat), re-measure world FPS on a phone.

## Session 16i (2026-10-18, 08:48–~10:45 UTC, session_015gjFRVdpK7cv9rSxuSLCm1): rooms, deliveries, snowy nights, R339–R358
- Chained from 16h with the same plan; the user's window ends at about **10:45 UTC on 2026-10-18**. The local clone started on stale history; it was switched to `origin/ccr-4fc93d6e-suxlhd` (old local kept as branch `backup-old-local`, never pushed).
- **Checks at start:** tapcheck 740×360 / 412×915 clean (only the expected portrait rotate hint over the in-battle pause menu). advcup Sprout signs up at the desk and lands back in Bloom Town (the tool now waits for the lobby with `waitForFunction` instead of a fixed 2.5 s). advwins route1/frostpeak error-free after R349.
- **R339:** room kinds `cottage` (Grandpa Woolt: `G` grandfather clock with a swinging pendulum `this.pendulum`, `r` rocking chair, `k` yarn basket, timber beams) and `kidroom` (Firefly Flo: fairy lights on the back wall, `j` firefly jar (`this.jars` fx + floor glow), `t` toy chest). New ITEMS texts for G r k j t.
- **R340:** Frostpeak dig spot (`buildDig` on `M.snow` maps except the Peak, '.' tiles): ice gems (`save.adv.gems`, 3 berries; every 3rd gem 2 berries + Power Snack) or a wild Pengsicle 15%. The Lodge Keeper mentions it; the Journal Fish tab footer counts gems.
- **R341/R346: deliveries** (LOST entries with `to: {npc, map, name, home}`; the recipient is an outdoor npc id; `deliveryFor(npc)` / `deliveredLine(npc)` exported from story.js and used in `World.talk`; `deliver:<id>` story key; recipient gets a ? mark; reward from the recipient; `thanks` line for the giver afterwards, `after` lines for the recipient). seeds (Gardener Rosa, Cloudtop → Diggles, Seashell; Seedling Sprout hat, new kind `seedling`; a cloud flower grows on the sandcastle once `seeds_done`), cocoa (Smith Ash, Cinder Town → Cocoa Seller Cora, Frostpeak; Cocoa Bobble Hat, kind beanie), letter (Pricklepuff, Bloom → Old Snoozlo, Frostpeak; berries + snack). Journal/Town Map show deliveries with 📦.
- **R342:** the Peak's boulders (any `R` on `M.snow` maps that aren't snowmen) are frosted stone + snow cap + ice crystal clusters.
- **R343/R344:** snowy maps (`M.snow`) and Cloudtop (`M.border === 'cloud'`) follow the clock after daytime (`SNOWY` evening/night moods); `buildAurora()` (3 additive ribbons following the camera, placed per aspect) on snowy nights; shooting stars on snow/cloud nights.
- **R345:** each Berry Center has an `o` tile pair behind the counter with local decor (Seashell fish tank, Cinder Town (map key `ember`) lava lamps, Neon cacti, Frostpeak potted pines, Cloudtop cloud trees, Glowcap shroom lamps (`shroom` flag now also on its Berry Center), others blossoms) and is named "<Town> Berry Center". Gotcha: IcosahedronGeometry is non-indexed; never merge it with indexed geometry under one material key (mergeGeometries returns null).
- **R347:** Pecan news `adv6` (tools' news lists include it); the ☰ card shows time of day on snowy/cloud maps.
- **R348:** room kind `home` (hero's home): `S` trophy shelf (mini trophy per won cup, Crown on top; `act: 'shelf'` in story.js), a TV for the `X`.
- **R349:** Pecan Lab right-hand `X` is a growth chamber (glass tube, translucent `goo` key, critter shape, bubbles).
- **R350:** `buildLamps()`: street lamps on tile corners along straight path edges in towns with a Berry Center (not Neon), up to 6, lit with glow sprite + floor pool from dusk.
- **R351:** favour `blink` (Firefly Flo, indoor giver: interior npc 7th field `lost:blink`; LOST fields `giverMap`, `critter` let the Journal/Town Map find indoor givers); Blink glows on the Route 2 rock at 12,10.
- **R352–R354:** night polish on grassy maps: moonlit blue-green ground and tree canopies, gulls roost, deeper night water with star glints.
- **R355:** `sfx.ambient('owl')` on quiet nights (the `this.amb` timer object needs a starting value for every kind, or the NaN timer never fires).
- **R356/R357:** delivery `lamp` (Mushroom Fan Fen, Glowcap → Picnicker Puff, Cloudtop; Sleepy Nightcap, new hat kind `nightcap`); `World.buildThanks()` puts Puff's glowing pink glowcap by the blanket afterwards.
- **R358:** `World.stadiumLights()`: four floodlight masts and a glowing pitch after dusk.
- Chained to the next session at ~250k context (R359+), with about an hour left of the window.
- **Next ideas:** rocking chair/hammock animation, more deliveries (Neon City has none yet), lava gems in Cinder Town, an owl hoot ambience at night, the hero's hat in fights (battle side, the user's chat), re-measure world FPS on a phone (lamps, aurora and new rooms add a few draw calls).

## Session 16j (2026-10-18, 09:43–~10:45 UTC, session_012yuMPtQ3fEucWZwqKVzejU): deliveries, digs, volcano nights, R359–R367
- Chained from 16i with the same plan; the last session of the user's window (ends about **10:45 UTC on 2026-10-18**), so it did not chain. The local clone again started on stale history and was reset to `origin/ccr-4fc93d6e-suxlhd`.
- **R359:** Neon City's first delivery `fan`: new npc Tinker Volt (Voltferret, Neon 17,12, `story: 'lost:fan'`) → Pengsicle at the Cinder Town hot springs (`spa`, map `ember`); reward the Frosty Visor (new hat kind `visor`, gift). `buildThanks()` now also builds a whirring pocket fan beside Pengsicle once `fan_done` (`this.thanksFan`, blades spin in `update`, frosty sparkles blow at Pengsicle).
- **R360:** Grandpa Woolt's rocking chair (`r` tile) is built into its own group (`this.rocker`, a local `add`/`box` in that branch) and rocks gently; it rocks more while the hero stands near.
- **R361:** Cinder Town dig spot (`buildDig` `lava` = `this.key === 'ember'`, '.' tiles): ash heap, glowing orange X, glow sprite. `digUp` gives an ember gem (`save.adv.emberGems`, Smith Ash's berries, every 3rd adds a Power Snack) or a wild Kindlekit 15%. Smith Ash mentions it; the Journal Fish footer counts ember gems.
- **R362/R364:** `buildBonfire()`: Seashell Town (only) after dusk gets a bonfire at 13,15 (solid tile; stone ring, logs, leaning flame cones that flicker, sparks, warm floor pool). A facing it gives a cosy line and sparks.
- **R363:** volcano maps (`M.lava`: Cinder Road, Cinder Town) follow the clock after daytime (`LAVA` evening/night moods, like `SNOWY`); cracks glow steadier and brighter after dark; no owl hoots on lava maps.
- **R365:** Pecan news `adv7` (the tools' news lists include it).
- **R366:** Frostpeak gets a night campfire too (9,10, a melted wet ring in the snow; `buildBonfire` takes per-map spots `{ seashell, frostpeak }`), with its own snowy A lines.
- **R367:** the first A at a fire each day toasts a marshmallow (+15% of a level in XP; `save.adv.fire[map] = date`); a pink marshmallow bag sits by the fire until then.
- **Checks (10:05 UTC, after R365):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait). advcup Sprout signs up at the lobby desk, wins 3 matches, and lands back in Bloom Town with no errors. R366/R367 only add the Frostpeak fire and the marshmallow (world.js), shot and tested by themselves.
- **Next ideas:** a favour list/Town Map mark for dig spots, more bonfires (Frostpeak lodge fire pit?), Neon City night market, glowcap/neon moods following the clock, the hero's hat in fights (battle side, the user's chat), re-measure world FPS on a phone.

## Session 15 (2026-10-14, 21:42–~22:20 UTC)
- **Note for new sessions:** the cloud clone can be shallow and look "ahead 50, behind 50". Run `git fetch --unshallow origin ccr-4fc93d6e-suxlhd` and then `git merge --ff-only origin/ccr-4fc93d6e-suxlhd` before working.
- **R198:** the Full Team badge's id is now `roster`. It used to share the id `team` with Dream Team, so winning a 3-on-3 also marked Full Team as earned. No other duplicate ids exist in data.js arrays (checked).
- **R199: Survival Gatekeepers.** Every 5th challenger (`(streak + 1) % 5 === 0`) is shiny, +2 levels, +0.08 difficulty, with stage card `Gatekeeper #N`. Beating one pays `min(5, 1 + streak / 5)` berries and a full heal. New badge **Gatebreaker** (`streak10`, a 10-win streak).
- **R200:** Camp shows a ringmaster's top hat beside the trial pedestal once the player has Stadium Tamer. This is the 4th `buildProps` argument, `tamer`.
- **R201:** Survival ctx stores `best` (the best streak at run start). "NEW BEST!" now shows only when the run beats it, not on a tie, and also on the win that breaks it.
- **R202 and R203:** the Badges modal shows a count (`3/30`) and lists earned badges first. Locked counting badges show a progress bar from `BADGE_PROG` in `Screens.badgeModal`.
- **R204:** clearing the Boss Rush pays +5 berries the first time and +2 after.
- **R205:** How to Play has a Survival line.
- **R206:** the VS screen adds `.vs-side.gold` (gold nameplate and glow) for bosses, Boss Rush and Gatekeepers.
- **R207:** a jingle and a buzz when a Gatekeeper falls.
- **R208:** Pecan news `gate` for players with a Survival streak.
- **Checks run:** gatekeeper win and loss paths, the Boss Rush clear, and Camp with the hat were all screenshotted error-free. tapcheck is clean at 740×360 and 412×915. The Sprout Cup cupflow clears at 740×360 with no errors.
- **Test gotcha:** forcing a win needs `?auto` (the player's CPU does the hitting). Keep the player alive with `p.hp = p.maxHp` in the sim loop. Don't edit files while tapcheck runs: HMR reloads break it (`__game is not defined`).

## Rounds done
1. Core:
   - Toon renderer, 4 critters, combat, CPU, stadium.
   - HUD, menus, touch, audio.
   - APK CI.
2. Tournament and progression:
   - Tournament (3 cups, 11 trainers), XP and levels, recruiting.
   - Rolladillo and Hootsy with 2 new specials and 2 new supers.
3. Graphics pass:
   - Merged scenery, seat colours, grass detail.
   - Jumbotron, light beams, impact bursts, confetti, speed lines.
   - Closer camera.
4. Settings, auto quality, back button and pause-on-hide, first-battle tutorial.
5. Beach and Volcano arenas, mapped to cups.
6. Personality: signature intros/victories, intro close-up camera, name cards, speech bubbles, type hit sparks, announcer callouts.
7. Critterdex (spin model, stats, record), shiny palettes (cup rewards, golden rim), badges.
8. Guard + parry, power-ups, trainer AI styles, Aurora boss enrage, touch button labels.
9. Pengsicle (water penguin: Belly Slide / Blizzard Bash) and Emberfly (fire firefly: Wisp Swarm / Supernova).
10. Audio: per-arena themes, boss theme, sidechain pump, ducking, tension layer, victory fanfares.
11. Splash + shader prewarm, 512 px icon, game-time effect anims, select screen fits 8.
12. Challenges: Survival (streak, HP carry) and Daily Challenge (seeded rival/arena/modifier, 2× XP); 5 match modifiers.
13. Floor pass: beach sand ripples/shells, volcano basalt + glowing lava seams.
14. Frostpeak Dome arena (aurora, snow, pines, own theme) + Legend Cup (5 modded rematches).
15. Low-quality scaling (half crowd, less snow).
16. Tighter fight camera, bigger damage numbers.
17. Per-critter combo animations (kicks, headbutts, wing slaps, tail whips) + swipe arcs.
18. First-launch welcome: Professor Pecan, trainer name, partner pick.
19. Results screen: winner celebrates in a lit close-up beside the card, stat count-up, S/A/B/C rank stamp. Fixed NaN XP when cpuLevel was missing; Hootsy's win spin now pauses facing front.
20. Training mode (Challenges → Training): dummy modes, endless HP, combo readout, input display; move lists in training pause and the Critterdex.
21. Photo mode from pause: orbit cam, focus, frames, filters, shutter, save/share.
22. Pricklepuff (leaf hedgehog: Seed Spray / Bramble Rush) and Woolt (spark sheep: Fuzz Ball / Mega Fluff Slam), with intros, wins, lines and shinies. Marigold (Sprout Cup) now uses Pricklepuff; Stormy replaces the Volt Twins in the Champion Cup with Woolt. Portrait roster is 5 across.
23. Bug sweep: full auto battles with the new critters, mods and arenas run with no errors; Mega Fluff scale is reset on round reset; production build passes.
24. Neon Rooftop arena (night skyline, neon signs, searchlights, glowing grid floor), synthwave theme, Midnight Cup + Night Owl badge; daily can roll it.
25. Lighting polish: less orange Volcano light, brighter lava seams, camera fill in backlit arenas, bigger iridescent Emberfly wings, jumbotron in the intro wide shot.
26. Super cut-in art (flash, sunburst, type watermark, outlined portrait) and a FINAL K.O. finisher camera.
27. Photo Save/Share inside the Android app via Capacitor plugins.
28. Training setup sheet (pick dummy and arena); super-effective pill no longer repeats in training.
29. Portrait HUD fits on narrow windows; 5 full matches across all arenas error-free.
30. Menu polish: title backdrop follows progress, menu fill light, Critterdex grid no longer under the Badges button.
31. Level-up gear: scarf (Lv 5), star pin (Lv 10), crown (Lv 15) on player and trainer critters.
32. Character-pick fix: Quick Battle and Training let you play any critter as a "TRY" trial (Tournament/challenges still need recruits); name prompt accepts Android's Done key/blur and no longer auto-opens the keyboard on touch. `tools/flow.mjs` / `flow2.mjs` tap through first launch → select → battle on a fresh save.

33. Gear callout on the results screen ("New gear! Scarf") and a Gear row in the Critterdex.
34. FINAL K.O. camera locks to the impact spot and shows a three-quarter view of the winner's face.
35. Arena hazards (lava geysers, icicles, shock tiles, coconuts) with warning rings, CPU avoidance, VS-screen chip, Settings toggle.
36. Critter Camp: team wanders the meadow; pet for friendship, feed berries for XP; berries from wins.
37. Title menu wraps on portrait / fits small landscape; friendship hearts in the Critterdex.
38. Cosy Camp theme song.
39. Badges: Best Friends, Snack Time, Hot Feet.
40. Combo counter "HITS!" label no longer covered by the popping number.
41. Camp props (campfire, tent, picnic blanket + basket), daily berry gift, Camp button notification dot.
42. How to Play covers hazards and Camp.
43. Hazard warning chirp + geyser rumble; full auto matches on all 5 arenas with mods are error-free.
44. Pulsing selection ring in Camp.
45. Camp critters walk around props.
46. Best-friend perk (5 hearts → start with super meter).
47. Camp spacing fix (everyone used to walk to the centre) and portrait Camp camera.
48. Fetch toy in Camp.
49. Boss hazard storm (volleys of rings after enrage).
50. Results winner puts on new gear at once; crisper results lighting.
51. Scroll-fade hint on long panels.
52. Professor Pecan story beats for every cup (intro + trophy outro).
53. Build check + full auto matches on all arenas (no code change).
54. Camp activities: warm up at the fire, nap at the tent, picnic.
55. Combo damage numbers fan out.
56. Pebblepup (stone pug): Rock Toss / Avalanche.
57. Whirlwhisk (gust glider squirrel): Sky Swoop / Jet Stream; roster layout for 12.
58. Portrait Critterdex fits 12.
59. Jet Stream wind streaks.
60. Clovebun now appears in the Sprout Cup (its shiny was unobtainable).
61. Checked gear on the new critters (fine).
62. Roomier Camp for 12 critters (two starting rings, wider wander zone, higher camera, critters face you when they stop).
63. Pricklepuff joins the Champion Cup (Thistle, 2nd of 5 matches); tools/robin.mjs.
64. Jet Stream wind streaks you can see (crisp lines across the gap); smaller gust hit rings.
65. Balance: Pebblepup nerf, Whirlwhisk buff (round robin had them at 77% / 23%).
66. Small-phone (740×360) menu check; results quote groundwork.
67. Rival parting lines on the results screen.
68. Roster balance: Woolt nerf (Fuzz Ball paralysis 0.6 s), Pricklepuff and Whirlwhisk buffs.
69. Results screen works in portrait (no rotate hint); impact frame timed in game time.
70. Cloudtop Gardens arena + Sky Cup with Professor Pecan as the final test.
71. Six auto matches with mods in the new arena, error-free; +11 draw calls only.
72. Real haptics in the APK via @capacitor/haptics (hits, supers, KOs).
73. Ghost buttons readable on light arenas.
74. Rival portrait next to the parting line.
75. Camp trophies: cup pennant bunting and a Sky Cup hot-air balloon; portrait Camp uses the lower field.
76. Cup cards: rival faces no longer clipped in portrait; CLEARED ribbon.
77. Lilypop, the leaf frog (Tongue Lash / Lily Splash).
78. Diggles, the miner mole (Burrow Ambush / Mole Rush).
79. Portrait roster and Critterdex fit 14; info card stacks above the list.
80. Cup select and ladder preview the cup's stadium; readable rung names.
81. Professor Pecan tells returning trainers where to find the new critters.
82. Burrowing shows a rolling dirt mound with the hard hat poking out.
83. Lilypop's victory faces the camera; auto matches with mods pass.
84. Second hazard pattern: rings that chase one fighter.
85. Smarter CPU: punishes openings, desperate supers, keep-away when ahead.
86. Move List in every pause menu.
87. Camp idle quirks by type; wander zone matches the view; balance touch-ups.
88. Glowcap Grove arena with spore-puff hazard and forest theme.
89. Glowcap Cup (Elder Oakley boss, Spore Sport badge); ladder names readable on short phones.
90. Glowing toadstools in Camp for the Glowcap Cup; Pecan announces the new cup.
91. (session 8) Camp back button and stuck tournament finish fixed (user report).
91. Ripples, the river otter (Slick Puddle / Whirlpool), in the Glowcap Cup.
92. Tap-check sweep: Critterdex grid scrolls in landscape, results fit 360 px tall phones.
93. Balance pass with 15 critters (Voltferret, Diggles nerfs; Cindermunch, Bubbalotl, Hootsy, Emberfly buffs).
94. Tap anywhere to advance Pecan's dialog; tools/cupflow.mjs (Sprout and Thunder Cups clear by tapping at 740×360).
95. Jiggawatt, the jelly sprite (Static Field / Storm Cloud), in the Midnight Cup.
96. CPU escapes puddles, storm clouds and static fields; Storm Cloud no longer stun-locks; new-critter nerfs.
97. Finale for clearing every cup: Pecan's speech, team parade, credits roll, Critter Master badge.
98. Boss Rush challenge (all cup bosses back to back) + Boss Buster badge; trainer quotes on every trainer match.
99. Flatter fight camera shows the crowd (session 10a). (The parallel session's R99–R101 are user-report fixes: tips out of the way, mod chips, cupflow.)
102. 16-critter balance pass; Whirlwhisk/Jiggawatt recoloured.
103. Drifting seeds / embers / petals.
104. Neon drizzle.
105. Seagulls over Seashell Bay.
106. Quick Battle Match Setup (pick rival and arena).
107. Mote size cap for menu cameras.
108. Silver Whirlwhisk (was too close to aqua Jiggawatt).
109. Stage title card in the intro.
110. Team Battle 3-on-3 + Dream Team badge.
111. Team lineups on the VS screen; tapcheck covers the new sheets.
112. Pecan news + How to Play for Team Battle.
113. Camp spreads out in landscape.
114. Arena particle geometry disposed; 7-arena auto sweep clean.
115. Critterdex tile names fit.
116. Team Battle VS callout ("Go, Bubbalotl!" / "Rival sends out Hootsy!").
117. Team Victory trophy screen with the trio.
118. Team Battle stage card ("Your last critter!").
119. Team results rows fixed (portraits were 110 px).
120. Balance: Voltferret nerf; Bubbalotl, Pricklepuff, Whirlwhisk buffs.
121. Kindlekit, the ember fox kit (Flame Trail / Firework Finale), Fizz in the Sky Cup.
122. CPU escapes Flame Trail patches.
123. Kindlekit balance (was 66% in a focused robin).
124. Fireworks over the trophy screens.
125. Flame Trail sprint pose.
126. Kindlekit auto matches on all 7 arenas with mods, error-free (no code change).
127. Sky Cup ladder (5 rungs) and shiny Kindlekit checked (no code change).
128. Squeakwing, the orchard bat (Sonic Squeak / Echo Boom), Nyx in the Glowcap Cup.
129. 18-critter balance (Pengsicle, Voltferret nerfs; Squeakwing 9% -> 44%); VS timer guard (merged with the playtest session's identical fix).
130. Results screens for the new critters checked; teamflow follows the Team Victory screen.
131. Balance touch-ups from the final 18-critter run.
132. Fixed the rare crash when one super starts in the frame another ends (the robin crash).
133. Glowcap Grove mossy floor with a glowing fairy ring.
134. Title tagline readable over the crowd.
135. Arena textures and shadow maps freed on arena change (GPU memory leak).
136. Frostpeak ice patches and cooler rim.
137. Balance: Pricklepuff 24% → 46%, Bubbalotl 35% → 59% (focused rerun).
138. Ladder rungs visible on 360 px tall phones.
139. Snoozlo, the drowsy koala (Power Nap counter / Lullaby Bump), Hazel in the Glowcap Cup. Focused robin 63% after buffs (was 31%).
140. Snoozlo's victory nap keeps its face to the camera; bigger Lullaby notes.
141. In Camp, Snoozlo heads for the nap spot by the tent.
142. A rival sung to sleep by Lullaby slumps with closed eyes and z's instead of dizzy stars (`f.asleep`).
143. How to Play tip about the nap counter. Perf check: 211–216 draw calls, ≤530k triangles (unchanged).
144. Drifting cloud shadows over the field in Meadow, Seashell Bay and Cloudtop (`this.cloudShade`, one draw call).
149. Growth system: stages at Lv 7/14, first four lines (Cindermunch, Bubbalotl, Clovebun, Pebblepup), stronger specials/supers.
150. Growing scene, Critterdex growth line, grown forms in roster/Camp/rivals, cameras scale with size.
151. Back fin, antlers, Rematch uses the grown form, results card updates.
152. Growing in Camp, Pecan's growth news, How to Play.
153. Voltferret line; special flare for grown forms.
154. Skipped growing scenes play on the next menu; cupflow GROW=.
155. Hootsy line (Aurora's champion owl is now a giant Cyclowl).
156. Pricklepuff line (Pecan's final test is Thornhulk).
157. Emberfly and Lilypop lines.
158. Lines for the last ten critters.
159. Own palettes for the ten scaled lines.
160. Growing Up (Lv 7) and Fully Grown (Lv 14) badges.
161. Growth parts merged by material: a Thornhulk vs Jackalorn battle went from 430 to 243 draw calls (base game ~240).
162. Every growth gets its growing scene (old saves and tapped-past growths included).
163. Drillmole/Quarrymole: spinning hard-hat drill and digging claws.
164. Snoozalot/Slumberking: striped nightcaps, Slumberking's with a gold crown.
165. Splashotter/Torrentide ride a curling wave.
166. Whirlglide/Tempestail trail a spinning whirlwind.
167. Jigglevolt/Megawatt: tesla-coil antennae with a crackling arc.
168. Emperice: glacier-ice mantle and frost collar.
169. Jiggawatt tentacles low-poly (half the triangles).
170. Shriekwing/Echowing: bigger ears with sound waves.
171. Citadillo: castle battlements and a pennant.
172. Solfox flame corona; Thunderam thundercloud.
173. Growing scene shows the whole body.
174. Lv 14 balance run with grown forms; `statMul` (Thornhulk buff, Solfox trim).
175. Signature second hazard per stadium (fissure, ice slick, laser, rogue wave, crosswind, spore cloud); CPU sidesteps/guards/rolls.
176. First pattern of a match favours the signature.
177. Daily Team Challenge about one day in three.
178. Pecan news about the new tricks.
179. Hazard sounds; looping noise buffer; held envelopes.
180. First-trick callout with what to do.
181. Stadium Tamer badge.
182. Daily streak berries + Regular badge.
183. Hazard practice chip in Sparring Setup; ⚠ on arena chips.
184. How to Play: Daily, hazard practice.
185. Wave foam merged (+22 → +7 draw calls).
186. Boss storm mixes in the signature.
187. Stadium Mayhem modifier; Daily modifier pool pinned.
188. Stadium Trials + Trick Star badge.
189. Jumbotron hazard warning.
190. Mayhem dropped when hazards are off.
191. Quick Battle modifier chip; wrapping toasts.
192. Mayhem sweep on all 7 arenas (no code change).
193. Next Trial button.
194. Reduce flashing covers the jumbotron warning and laser.
195. Camp trick pedestal (a star per 3★ trial).
196. Tomorrow's Daily preview on a cleared card.
197. Modifier chip on the Team Battle pick sheet.
198. Full Team badge id fix.
199. Survival Gatekeepers + Gatebreaker badge.
200. Camp top hat for Stadium Tamer.
201. Survival NEW BEST only when beaten.
202. Badges count, earned first.
203. Badge progress bars.
204. Boss Rush berry basket.
205. How to Play: Survival.
206. Gold VS nameplate for bosses/Gatekeepers.
207. Gatekeeper jingle.
208. Pecan news about Gatekeepers.
209–213. Adventure mode: world engine, Sprout Village, Route 1, Bloom Town, Route 2, Seashell Town, title layout (session 16).
214. Glowcap Woods + Glowcap Hollow, Trial of Friendship (Pip), Dash's 3rd battle.
215. Pond banks and lily pads.
216. Cinder Road + Cinder Town (Champion Cup), Trial of Wisdom quiz.
217. Neon City (Midnight Cup), Trial of Heart.
218. Cloudtop Gardens (Sky Cup), Captain Puff's balloon.
219. Frostpeak (Legend Cup), Champion's Peak ice puzzle, Dash's last battle, King Snooze, the crowning, Critter Crown badge.
220. Professor Pecan points to the next cup's town.
255–279. Adventure polish (session 16e): grass sway, palms, chimney smoke, rain weather (world + fights), room details, smoothie blender, inner water corners, trainer hats, wild meadow field, footprints, clock chips, night Town Map, door light, beach decor, falling leaves, toadstool spores, Pecan weather news (see "Session 16e").
244–254. Adventure polish (session 16d): stadium seats, roofs, Berry Center signs, footsteps, clock-of-day lighting, trainer rematches, room camera/pictures, next-goal line, rounded water and grass (see "Session 16d").
221–243. Adventure polish (session 16c): interiors, Town Map + flying, story-fight level scaling, tapcheck world steps, Camp crown, NPC activities, open-field fight looks, title/New Adventure, running, gift boxes, Dash rematches, shinies, idle hero, badge case, walking buddy, door sounds (see "Session 16c").
L6. Meadow drift seeds read as dandelion fluff, not snowballs, on menu cameras (smaller, softer, per-kind `cap` on point size).

## Session 17a (2026-10-18, 15:44–~16:45 UTC, session_014x9MnMjYZSE8f5qyX4KEM8): the 48-hour run begins, R368–R378
- **Checks at start:** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout signs up at the desk, wins 3 matches and lands back in Bloom Town.
- **R368:** Champion's Peak lower slope is a last climb: frost-tipped snow grass (`"` rows 20–22, `blades: 0x8ab4d8`), wild list Lv 18–21 (Pengsicle, Woolt, Rolladillo, Ripples, Snoozlo), and two Ace Trainers (Nova/Emberfly Lv 19 at 6,21 facing e; Brook/Bubbalotl Lv 20 at 12,20 facing w; sight 3 onto the path). `trainer.diff` is now honoured, and route trainers default to `min(0.75, 0.22 + lv*0.03)` (was a flat 0.3). Role hat `/^Ace/` = white beanie.
- **R369:** street lamps rebuilt as stout Victorian lamps (stepped base, thicker post, collar, framed lantern, cap, finial).
- **R370:** Neon City noodle cart (`World.buildCart()`, tiles 8–9,15 solid; awning, swinging lanterns, steam, NOODLES sign) + Noodle Chef Rumi (Ripples, 10,15, `story: 'noodles'` → `noodleCart()` in story.js): Spark Noodles once a day (2 berries, +40% of a level, `save.adv.noodles = date`) and the cart-only **Neon Boppers** (new hat kind `boppers`, `market: true`; the Hat Shop and its stands skip `market` hats).
- **R371: world perf.** `castLite(cr)` in world.js: townsfolk, wild critters and the buddy keep `castShadow` only on their two biggest meshes. Cinder Road 424 → 239 draw calls, Bloom 374 → 316. `tools/advperf.mjs [WxH] [q] [maps]` prints update ms and draw calls/triangles per map (day and night). Towns still sit at ~330–400 calls on high (critters are ~40 main-pass draws each: parts + ink hulls).
- **R372: Adventure ending credits.** After the crowning dialogue, `World.credits(done)` rolls a credits column (journey stats, cast, every trainer and townsfolk name pulled from MAPS) while the camera "postcards" each visited town's stadium front (5.4 s each, `this.touring` keeps `busy` and plays the victory song; `fade()` now leaves `busy = !!this.touring`), then reloads the Peak and says THE END. Skip button; touch UI hidden (`.world-screen.touring`). `tools/advcredits.mjs [WxH]`.
- **R373:** Town Map ⛏️ on visited places whose dig spot is still waiting today (`digLeft(MAPS)` exported from world.js).
- **R374: playable arcade.** `src/arcade.js` `arcadeGame(root, face, onDone)`: CRITTER CLASH TURBO, a 30 s canvas catch game (drag or ←/→; berries 5, gold 25, ×2/×3 for streaks of 8/16; zap bombs cost a heart of 3). The Neon arcade `X` tiles are `act: 'arcade'` → `arcade()` in story.js: best score `save.adv.arcadeHi`; the first score of 60/150/300+ each day pays 1/2/3 berries (`save.adv.arcadeDay`). Test hook: `document.querySelector('.arcade-wrap').__arcade` (`step(sec)`, `close()`, `S`).
- **R375:** Pecan news `adv8` (noodles, arcade, dig marks, Peak Aces); tools' news lists include it.
- **R376: daily Alpha.** `alphaToday()` (world.js) picks one visited map with roaming wild critters and tall grass per day (after the Sprout Cup): species from its list, level = list max + 3. `buildActors` spawns it on a tall-grass tile (scale ×1.45, red aura sprite, pulsing ground ring, never wanders) with a toast. Its fight is `kind: 'wild'` with `flag: 'alpha_<date>'`, 3 berries, a note, and diff `min(0.85, 0.3 + lv*0.03)`; `save.adv.snackDue` pays a Power Snack (40% of a level) in `storyIntro` after the win. Town Map 💥. **Battle side (the user's chat):** the Alpha could look bigger in the fight too.
- **R377:** Sprout Village gets street lamps (`buildLamps` runs for towns with a Berry Center or `village`).
- **R378:** Journal → 🏅 Records tab (screens.js `worldJournal('rec')`): progress bars for cups, trainers beaten (12), gift boxes (24), favours, hats, fish kinds, critters on the team, plus Alphas beaten, wild met, arcade best, steps.
- **Next ideas:** the Alpha shown big in its battle and the hero's hat in fights (battle side, the user's chat); a Hat Shop mirror / more room decor; more arcade games (a second cabinet with a different game); glowcap/neon moods following the clock; a weekly post-game challenge on the Peak; reduce critter draw calls further (an LOD that hides tiny parts on far NPCs); re-measure on a phone.

## Session 17b (2026-10-18, 16:40–~17:50 UTC, session_01BfaGLYCvgsBvybduPxRouW): moods, SKY HOP, Gauntlet, perf, R379–R392
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start:** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town.
- **R379:** Glowcap Woods/Hollow (`WOODS`) and Neon City (`CITY`) follow the clock after daytime like `SNOWY`/`LAVA`; `this.phase` is now the clock phase on every outdoor map (only rooms stay 'day'), so lamps, lit windows, sleeping wild critters and fireflies follow too.
- **R380: SKY HOP**, a second arcade game (`skyHop()` in arcade.js): tap/Space to flap through neon pillars (10 a pillar, 5 a berry, speeds up; one bump ends it). The arcade's right-hand cabinets (`act: 'arcade:hop'`, cyan screens) run it; `arcade(S, w, hop)` in story.js keeps `save.adv.hopHi` / `hopDay` and pays 1/2/3 berries at 40/100/200+. Gotcha: an `ask()`/`say()` line with a colon in its first 20 characters is read as a speaker name ("SKY HOP! Top score:").
- **R381: Peak Gauntlet (post-game).** Keeper Orla (Hootsy, peak 4,5, `showFlag: 'ending'`, `story: 'gauntlet'`): five Ace battles a week (`gauntletWeek()` = weeks from Monday, `gauntletFoes(wk, hero)` exported from story.js), Lv hero+1..+5, diff 0.74–0.90, flags `gaunt_<wk>_<n>`, +2 berries each; the talk after the 5th win pays 8 berries (`gauntpay_<wk>`), `save.adv.gauntWins++`, and the first clear gives the **Golden Laurel** (new hat kind `laurel`). Flower Crown sits higher and tipped forward. `tools/advgauntlet.mjs [WxH]` plays battle 1 from the world and back.
- **R382/R383: world perf.** `bakeStatic(cr)` (world.js) merges each world critter's static parts per joint: plain toon parts become one vertex-coloured toon mesh (added to `cr.mats` so the hit flash still works), hulls one mesh with the new per-vertex-width `outlineMatW()` (toon.js; `outlineMat` now stores `userData.ow/oc`, `toon()` stores `userData.rimU/toon`). Parts referenced by the Critter (ears, flames, wings, eyes, lantern...), named or transparent ones are left alone. Used for townsfolk, wild critters, the buddy and the hero. Neon City critter meshes 439 → 260; draw calls Neon 468 → 376, Bloom 367 → 325, Glowcap 300 → 255.
- **R384:** Town Map ⚔️ on the Peak while this week's Gauntlet is open; the legend is now a short tip plus a row of icon chips (`.wm-key`), so Close fits at 740×360.
- **R385:** Hat Shop dressing mirror (`V`, `act: 'mirror'` → try on owned hats) and a hat-box tower (`Z`).
- **R386:** room kinds `toad` (Glowcap's two Toadstool Houses: `J` toadstool stools) and `flat` (Neon's Sky Flat: `N` telescope, `E` beanbag).
- **R387:** Pecan news `adv9` (tools' news lists include it).
- **R388:** Glowcap toadstool houses glow after dusk (halo sprite + floor pool in `shroomHouse`).
- **R389:** Orla shows a ! while the week's Gauntlet is open (`questMarks`).
- **R390:** Neon night market (`buildMarket()`): GLOW SNACKS and TRINKETS stalls at 14,6 / 17,6 after dusk under a bulb string; first candy floss a night +15% of a level (`save.adv.market`). `this.stalls` checked in `interact()`.
- **R391:** a PEAK GAUNTLET signpost at peak 3,4; Journal Records counts Gauntlets cleared and the SKY HOP best.
- **R392:** Cloudtop sky lanterns after dusk (`buildSkyLanterns()`, 7 rising/fading lanterns around the hero).
- **Checks (17:43 UTC, after R392, on a production build):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout lands back in Bloom Town with no errors; advstory route2 boulder and peak Gauntlet battle 1 both play out clean.
- **Next ideas:** a third Neon night thing (a DJ stage?), more Gauntlet flavour (Orla's weekly theme, e.g. all one type), the Alpha shown big in its battle and the hero's hat in fights (battle side, the user's chat); merge static parts of stadium crowds/props too; more room decor (Captain's hut, Lodge); Seashell/Frostpeak night events; re-measure on a phone.

## Critique backlog (known issues)
- The user hasn't yet confirmed the Round 32 character-pick fix on their phone. If they reply, prioritise whatever they report.
- (Fixed in R132.) A re-measure robin at 04:10 (production build of cccf6e6) died with `page.evaluate: TypeError: Cannot read properties of null (reading 'critter')` somewhere after 141+ matches. Only data.js stats changed since the previous clean full run, so it's a rare existing race. Unconfirmed guess: robin starts the next battle at once while the previous battle's `onEnd` → `screens.results()` timer (900 ms) fires mid-battle. A player can't start a battle that fast. Run robin against the dev server (port 5180) to get an unminified stack trace, and make robin call `__game.endBattle()` and wait 1 s between matches if the guess is right.
- Native photo Save/Share (Round 27) is untested on a real phone.
- Haptics (Round 72) are untested on a real phone.
- Full run at 05:40 (session 11, all 19 critters, 1 rep = 36 games each, no errors): Emberfly 67%, Bubbalotl 64%, Pebblepup and Snoozlo 61%, most 44–58%, Kindlekit 39%, Pengsicle 33%, Jiggawatt 25%, Squeakwing 22%. 1-rep runs swing ±15% (Pengsicle was 56% and Emberfly 41% in the previous run), so only buff critters that are low run after run: Squeakwing (21/44/38/22%) and Jiggawatt (38/25%) got buffs in R145.
- Full run at 04:45 (session 11, 18 critters, 1 rep): Pebblepup/Whirlwhisk/Lilypop/Kindlekit 62%, Voltferret/Diggles 59%, most 38–56%, Bubbalotl 35%, Pricklepuff 24% (both buffed in R137). Run a full `tools/robin.mjs 1` with all 19 next.
- Older: last full balance run (04:04, 18 critters, 1 rep = 34 games each): Voltferret, Pengsicle and Lilypop 68%, Pebblepup and Kindlekit 62%, most others 41–53%, Bubbalotl and Hootsy 35%, Squeakwing 21% (a focused run just before said 44%, so the sample is noisy). Small tweaks followed (top three power -0.02/-0.03, Bubbalotl/Hootsy/Squeakwing buffs) but were not re-measured. Re-run `tools/robin.mjs 2` first.
- The Sky Cup outro promises a picnic; Camp could have a sky-themed reward (e.g. a balloon prop) for clearing it.
- No localisation.

- Growth (session 12) is untested on a real phone; ask the user how the growing scene and the big forms feel. Balance was not re-measured with grown forms (both sides grow by level in cups, so it's symmetric, but hand-built bodies are bigger targets visually only; hit ranges are unchanged).
- The 10 `bodyMul` lines have new palettes and parts but share proportions; a signature part each would make them read as new creatures as strongly as the first nine.
## Suggested next rounds
- After session 15: ask the user how Survival Gatekeepers feel. Ideas: a Survival run summary (berries and XP earned this run), progress bars for more badges, a Camp prop for Gatebreaker, a 2-rep robin on a hazard arena, localisation.
- After session 14: ask how the stadium tricks and Stadium Trials feel on a phone. Ideas left from "Modes & polish": a Camp prop for Trick Star / Stadium Tamer, Team Battle with modifiers, a 2-rep robin on a hazard arena, localisation, a 20th critter (the user hasn't asked for one).
- After session 13: ask about the growing scene and the new forms; the growing scene could show the 3D model instead of portraits.
- Session 12 is done. Next, if the user asks: polish the 10 `bodyMul` growth lines, ask for playtest feedback on growing, carry on numbering from R162.
- Session 11 is done. If the user asks for more:
  1. Ask them whether Snoozlo's counter feels fair on a phone, and whether the R135/R145 APKs feel smoother over a long session (the arena texture leak fix).
  2. Run a 2-rep full robin (`tools/robin.mjs 2`, about 35 minutes for 19 critters) to get a less noisy picture; 1-rep runs swing ±15%.
  3. Carry on numbering from R149.
- The user has session 11's last APK (R148); earlier they got the R131 APK and a source zip. They also asked for the JSON files; they got package.json, capacitor.config.json and package-lock.json, and were offered `src/data.js` exported as JSON.
- Balance: re-run `PORT=5181 node tools/robin.mjs 1` (build to scratch first) after any combat change; 18 critters take about 15 minutes. Keep everyone roughly within 40–65%.
- Run `node tools/tapcheck.mjs`, `node tools/cupflow.mjs 740x360 <cupIndex>` and `tools/teamflow.mjs` after UI changes. tapcheck runs screens back to back, so a timer from one step (e.g. VS → battle) can leak into the next.
- Ideas: Team Battle in the Daily rotation, localisation, per-arena second hazard pattern, a 20th critter (leaf now has 4; the others have 3).
- Keep doing critique passes on phone sizes (915×412, 412×915, 740×360).

## Chaining (do this at the end of each session)
1. Update this HANDOFF.md: rounds done, backlog, next steps, and the time used so far.
2. Commit and push to `ccr-4fc93d6e-suxlhd` (merge `origin/ccr-4fc93d6e-suxlhd` first; never rebase or force-push).
3. Fetch the APK built from your last commit and send it to the user (see "APK").
4. Load the tool with `ToolSearch select:mcp__claude-code-remote__create_session`, then create the next session:
   - `source_url`: `https://github.com/zchillsounds-debug/super-chainsaw1`
   - `source_revision`: `ccr-4fc93d6e-suxlhd`
   - `outcome_branch`: `ccr-4fc93d6e-suxlhd`
   - `title`: "Critter Clash – rounds N+"
   - (Session 16e did not chain: the user's 5-hour window ended at 04:45 UTC on 2026-10-15.)
   - **48-hour run (from session 17a):** chain with the user's 48-hour prompt word for word (below), `source_revision` and `outcome_branch` `ccr-4fc93d6e-suxlhd`. The end time lives at the top of this file; never reset it.
   - 48-hour prompt (verbatim): "Continue building Critter Clash in a 48-hour chained build run. The goal is to keep developing the game until it's complete, at AAA quality.\nStart: run date -u. If HANDOFF.md doesn't already have a "48-hour run" end time, set one: now + 48 hours. Write it at the top of HANDOFF.md, then commit and push. Later sessions read that end time from HANDOFF.md and don't reset it. Post a one-line status to me when you start.\nRead first: games/critter-clash/CONTINUE.md, then games/critter-clash/HANDOFF.md fully. Begin with the newest "Session 16" sections (16i, 16j) and their "Next ideas" lists.\nFocus: move the game toward a finished product. ..." (the full text is in the session 17a transcript; each session passes on the exact prompt it received).
   - Session 16j did not chain: the user's window ended at about 10:45 UTC on 2026-10-18.
   - Session 16i chained to the next session at R359 with the same prompt (end ~10:45 UTC on 2026-10-18).
   - Session 16h chained to the next session at R339 with the same prompt (end ~10:45 UTC on 2026-10-18).
   - Session 16f chain prompt: the user's own prompt (read CONTINUE.md and HANDOFF.md, Session 16–16f; Adventure polish and new content; critique at 915x412, 740x360 and 412x915; commit and push each round to ccr-4fc93d6e-suxlhd, merging origin first; never rebase or force-push; the user's chat owns screens.js results/worldFight, battle.js, arena.js open mode and hud.js; keep world work in world.js, worldmaps.js, interiors.js and story.js), with the next round number, the remaining time and the end time.
   - `prompt` (session 16 chain): "Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it. Start with the "Session 16: ADVENTURE MODE", "Session 16b" and "Session 16c" sections. Focus: Adventure mode polish (see Session 16c → Next ideas, and keep critiquing screenshots). Run the critique loop (screenshot, critique, improve) round after round. Commit and push each round to branch ccr-4fc93d6e-suxlhd: merge origin first, and never force-push. Round numbering continues from R<next>. The user asked for 5 hours in total, until about 04:45 UTC on 2026-10-15. Chain to a fresh session about every 2 hours or near 300k context, following the HANDOFF chaining steps (use this same prompt, updating the round number). Send the user the APK at the end of each session. At 04:45 UTC, send the final APK, update HANDOFF.md, and stop with a short summary. The user approved this plan and continuous building, so don't stop to ask questions. Post a one-line status to the user when you start."
   - older prompt (sessions 14–15): "Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it. Focus: modes & polish. Run the critique loop round after round, and commit and push each round to branch ccr-4fc93d6e-suxlhd (merge origin first, never force-push). The user asked for about 2 hours (until ~22:25 UTC on 2026-10-14) and to chain to a new chat near 300k context. At the end of the time, send the final APK, update HANDOFF.md, and stop with a short summary unless the user asks for more. Post a one-line status to the user when you start."
5. Tell the user in one short message what was done and that the next session has started.
