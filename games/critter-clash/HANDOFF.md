# Critter Clash: Handoff (after Round 31, effort wrapped up)

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
- Session 4 (06:36–07:05 UTC) did Rounds 24–31. Its worker was then restarted and only resumed at 15:22 UTC, past the 14:30 target, so it finished Round 31 and stopped without chaining. **The planned ~10-hour effort is over**; only resume if the user asks for more.
- Target end of the whole effort: about **14:30 UTC on 2026-10-13**. Check `date -u`. Keep chaining sessions until then, then stop and summarise.

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

- `&arena=frost` and `&arena=neon` also work now, and `&mods=bighead,turbo,lowgrav,itemrain,supercharged` applies match modifiers.

Critter ids: cindermunch, bubbalotl, clovebun, voltferret, rolladillo, hootsy, pengsicle, emberfly, pricklepuff, woolt.
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

## Critique backlog (known issues)
- Results screen does not yet announce newly earned gear ("New gear: Scarf!").
- The finisher's tilted close-up can frame the attacker from behind when the KO knocks the loser far away.
- Native photo Save/Share (Round 27) is untested on a real phone; check the APK on Android 10+ and 9.
- No localisation.
- Not verified on a real phone; APK CI runs through Round 26 succeeded (check the later runs).

## Suggested next rounds (only if the user asks to continue)
- Gear callout on the results screen and a gear row in the Critterdex.
- Real-phone check of the latest APK, especially photo Save/Share.
- Localisation, a second boss cup, or arena hazards.

## Chaining (do this at the end of each session)
1. Update this HANDOFF.md: rounds done, backlog, next steps, and the time used so far.
2. Commit and push to `ccr-4fc93d6e-suxlhd`.
3. Load the tool with `ToolSearch select:mcp__claude-code-remote__create_session`, then create the next session:
   - `source_url`: `https://github.com/zchillsounds-debug/super-chainsaw1`
   - `source_revision`: `ccr-4fc93d6e-suxlhd`
   - `outcome_branch`: `ccr-4fc93d6e-suxlhd`
   - `title`: "Critter Clash – rounds N+"
   - `prompt`: "Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it: run the critique loop round after round, commit and push each round to branch ccr-4fc93d6e-suxlhd, and chain to a fresh session about every 2 hours or near 300k context, until about 14:30 UTC on 2026-10-13. The user has approved continuous building; don't stop to ask questions."
4. Tell the user in one short message what was done and that the next session has started.
