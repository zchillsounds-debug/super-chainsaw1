# Critter Clash: Handoff (after Round 130)

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
- **New target end: about 04:35 UTC on 2026-10-14.** Check `date -u`. Keep chaining until then, then stop and summarise. If a worker stalls, extend by the stall.
- Session 10b (02:52–04:35 UTC) sent the user the f427c6a APK (R113), then did Rounds 116–129 (Team Battle polish, a 16-critter balance pass, **Kindlekit** and **Squeakwing**, critters 17 and 18, trophy fireworks). This was the last planned session: the user's extra ~2.4 h ended at about 04:35 UTC on 2026-10-14.
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

Critter ids: cindermunch, bubbalotl, clovebun, voltferret, rolladillo, hootsy, pengsicle, emberfly, pricklepuff, woolt, pebblepup, whirlwhisk, lilypop, diggles, ripples, jiggawatt, kindlekit, squeakwing.
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

## Playtest session (the user's own chat, session_01N69mQniqCEkTvu2X5XzxtL, 01:58–04:20 UTC)
- **If `npm install` can't reach the registry** (this sandbox blocked registry.npmjs.org): the APK workflow now publishes `node_modules` to the orphan branch **`deps-critter-clash`** (split `nm.part.*`, rebuilt only when package-lock.json changes). Restore with: `git fetch --depth 1 origin deps-critter-clash && git archive FETCH_HEAD | tar x -C <scratch>/deps && cat <scratch>/deps/nm.part.* | tar xzf - -C games/critter-clash`.
- User report at 02:07 UTC: "The green instructions are too in the way." Cause: the tutorial prompt kept its green `done` colour on every step after the first. Now: slim cream pill at top 96 px (84 on short phones), fades to 55% after 3 s (`.coach.dim`), and the taught touch button pulses a yellow ring (`.tb.teach`, `Tutorial.teach()`). Training panel is one slim strip with `pointer-events: none` (only the dummy chip is tappable); input log hidden on touch.
- Settings: **Button size** (`save.settings.btnSize` s/m/l → CSS var `--bs` on `.btns`) and **Battle tips** (toggles `save.tutorialDone`; switching off mid-fight disposes the coach). `.seg` handler is now generic by `data-k`.
- VS screen auto-start is guarded (`this.vsToken` + `mode === 'vs'`): leaving the VS screen (back) no longer drops you into a fight over another screen.
- Pause menu **Restart** (`game.lastStart`), hidden in survival/bossrush/team. Android back on a Pecan dialog acts like tapping it (finish line → next → "Let's go!" runs its callback) instead of skipping it.
- Match chips are hidden during the intro close-ups, full size at the countdown, then (`.mod-chip.mini`) shrink to icons beside pause 2.5 s into each fight. Match/Sparring/Team setup sheets keep Back/FIGHT! in a sticky bottom row and are compact under 420 px tall.
- Tools: `tools/teamflow.mjs [WxH] [w/l pattern]` taps through a whole Team Battle; `cupflow.mjs` handles the finale and logs what covers a failed tap (failed taps on results/trophy buttons in headless are animation-stability waits, not real blockers); tapcheck opens `matchsetup`, `teampick`, `teamvs`.
- Checked by tapping on phones: Sky Cup → trophy → finale → title (740×360), Team Battle win and loss paths, first launch → battle (740×360, 360×640, 412×915), tap-check clean with 17 critters.

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
130. Results screens for the new critters checked (no code change).

## Critique backlog (known issues)
- The user hasn't yet confirmed the Round 32 character-pick fix on their phone. If they reply, prioritise whatever they report.
- Native photo Save/Share (Round 27) is untested on a real phone.
- Haptics (Round 72) are untested on a real phone.
- Last balance run (difficulty 0.8, small samples): Woolt ~61%, Whirlwhisk ~36-41% even after buffs. Re-run `tools/robin.mjs 2` after any combat change.
- The Sky Cup outro promises a picnic; Camp could have a sky-themed reward (e.g. a balloon prop) for clearing it.
- No localisation.

## Suggested next rounds
- The planned work ended at about 04:35 UTC on 2026-10-14. If the user asks for more, start by sending the newest APK (check `apk-critter-clash` names the latest SHA) and ask them to report anything that gets stuck.
- Balance: re-run `PORT=5181 node tools/robin.mjs 1` (build to scratch first) after any combat change; 18 critters take about 15 minutes. Keep everyone roughly within 40–65%.
- Run `node tools/tapcheck.mjs`, `node tools/cupflow.mjs 740x360 <cupIndex>` and `tools/teamflow.mjs` after UI changes. tapcheck runs screens back to back, so a timer from one step (e.g. VS → battle) can leak into the next.
- Ideas: Team Battle in the Daily rotation, localisation, more Camp interactions for the newest critters, per-arena second hazard pattern, a 19th critter (gust and fire now have 3 each like the other types).
- Keep doing critique passes on phone sizes (915×412, 412×915, 740×360).

## Chaining (do this at the end of each session)
1. Update this HANDOFF.md: rounds done, backlog, next steps, and the time used so far.
2. Commit and push to `ccr-4fc93d6e-suxlhd`.
3. Load the tool with `ToolSearch select:mcp__claude-code-remote__create_session`, then create the next session:
   - `source_url`: `https://github.com/zchillsounds-debug/super-chainsaw1`
   - `source_revision`: `ccr-4fc93d6e-suxlhd`
   - `outcome_branch`: `ccr-4fc93d6e-suxlhd`
   - `title`: "Critter Clash – rounds N+"
   - `prompt`: "Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it: run the critique loop round after round, commit and push each round to branch ccr-4fc93d6e-suxlhd, and chain to a fresh session about every 2 hours or near 300k context, until about 02:15 UTC on 2026-10-14 (the goal is ~10 hours of actual work; if a worker stalls, extend the end time rather than stopping). The user has approved continuous building; don't stop to ask questions."
4. Tell the user in one short message what was done and that the next session has started.
