# Critter Clash: Handoff (after Round 5)

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

Critter ids: cindermunch, bubbalotl, clovebun, voltferret, rolladillo, hootsy.

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

## Critique backlog (known issues)
**Visual and feel:**
- The jumbotron is rarely in view.
- Portraits are 256 px, so the icon is soft. Render the icon at 512.
- Two "super effective!" pills can overlap.
- The super cut-in band (CSS) runs on real time, which is fine on device.
- Touch buttons have no text labels; the tutorial refers to them by colour.
- Hootsy's and Rolladillo's faces haven't had a close-up check. Verify ear and shell placement in a close-up shot.
- The rock ring and lightning animate with rAF (real time), so they don't advance under `__sim`.

**Game feel:**
- No blocking or guard yet.
- The CPU can be samey.
- No per-critter intro or victory animations; they all share one.

**Audio:**
- One battle song for every arena.
- No announcer.

**Menus:**
- No collection ("Critterdex") screen.
- No loading screen; the first frame compiles shaders and may hitch.

## Suggested next rounds (adjust after critique)
- **R6, character personality:**
  - Unique idle, intro and victory animations and taunts per critter.
  - Expression variety.
  - Per-type hit sparks.
  - Announcer callouts (synth jingles plus big text).
- **R7, Critterdex/Team screen:**
  - Rotate the 3D model, view stats and moves.
  - Unlockable colour variants ("shiny" palettes) as cup rewards.
  - A titles/badges system.
- **R8, combat depth:**
  - Guard with a shield bubble, or a perfect-guard parry.
  - Arena power-ups: a berry heals, a star charges super, a speed shoe.
  - Smarter CPU personalities per trainer; boss phases for the champion Aurora.
- **R9, roster:** two more critters (for example a frost/water penguin and a spark/fire firefly) with new specials and supers. Add them to cups or a bonus cup.
- **R10, audio:**
  - A theme per arena.
  - Better mix and sidechain feel.
  - Victory jingles per critter.
- **R11, production polish:**
  - Loading/splash screen with shader prewarm (`renderer.compile`).
  - Splash/icon in the APK.
  - Performance on low-end devices.
  - Final bug sweep and playtest checklist.
- After R11, if time remains: daily challenge mode, survival mode, a second boss cup, or photo mode.
- Consider offering the user a playable Artifact build (inline the Vite build into one HTML file) so they can play in the browser too. Ask once; they chose the APK and branch pushes as delivery.

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
