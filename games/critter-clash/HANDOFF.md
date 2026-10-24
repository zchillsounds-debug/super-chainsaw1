# Critter Clash: Handoff

## Completion run (C1–C8; read `ROADMAP.md` → "Completion roadmap" first)
- **Completion run: next is session C4 (do milestone C6, audio and game feel; C1–C5 are done, see ROADMAP.md status). Session C3 (2026-10-24 05:28–~07:05 UTC, session_01Peyg2coA3B6H1NqJSezMPh) did R738–R741 and finished C5; next round R742.** Each later session: do the first C-milestone not marked done, then update this line. (Session names C1, C2... count sessions, milestones C1–C8 count work: they no longer line up.)
- The run's prompt said the C1–C8 plan was agreed with the user, but no copy was on any branch, so C1 drafted it in ROADMAP.md from the open threads. If the user posts their own plan, it replaces the draft.
- Work branch `ccr-4fc93d6e-suxlhd`. Before every push: `git fetch origin ccr-4fc93d6e-suxlhd && git merge --no-edit origin/ccr-4fc93d6e-suxlhd`. Never rebase or force-push. Round numbers continue from the highest R in `git log`.
- **Builds for checks:** the scratchpad's `build.sh` (`P=<port>`: a git worktree of **HEAD** → `vite build` → `vite preview`; it does NOT include uncommitted edits) and `wbuild.sh` (`P=<port>`: builds the **working tree** into `wdist` and serves it, for quick iteration). Recreate them from the "Session C1" section below in a fresh container.

## Note for the user's chat (battle-side edits from the completion run, please review)
- **Session C1, R725 (battle.js `updateSuper`):** the cyclone super kept its twister in `this.cyclone` (on the battle), so when both fighters used a cyclone super at once, the first to finish set it to null and the other crashed on `cy.x = ...` (found by a full robin: `TypeError: Cannot set properties of null (setting 'x')`). It is now `f.cyclone` (per fighter) with a null guard that ends the super. The tsunami's ring radius `this.waveR` became `f.waveR` the same way (no crash, but a mirror tsunami shared one ring). No other battle.js, arena.js, hud.js or results/worldFight edits.

- **Session C3: no battle.js, arena.js, hud.js or results/worldFight edits.** main.js only gained a test hook (`window.__hats = SHOP_HATS`, used by `tools/uishots.mjs`). screens.js `toast()` adds a `.low` class when a modal is open (the toast sits at the bottom edge), and all toasts are `pointer-events: none` now; that also applies over the pause menu.

## (Older top section, kept)

## NEW (2026-10-21): Chapter 2 roadmap and a new 48-hour run
- The first 48-hour run is over. It ended at 2026-10-20 21:52 UTC, and session 17r (R655–R671) was its last session.
- The user then agreed a roadmap: **read `games/critter-clash/ROADMAP.md` first.** It covers new critters, a Chapter 2 region and story, deeper side content and post-game challenges, with about 80% new content.
- **The new run's end time is set by its first session (start + 48 h), on the line below.** Later sessions never reset it.
- **New 48-hour run end time: 2026-10-23 16:49 UTC** (started 2026-10-21 16:49 UTC by session 18a; never reset it; push it back by the length of any worker stall)
- Round numbers continue from the highest R in `git log`.
- **Session 18d (2026-10-21 23:40–~00:50 UTC, session_01JkygnyfnFio7oFRNAVRJbS) did R701–R712 (see "Session 18d"); next round R713.** **M4 is done** (all four roadmap milestones are done); the session then added post-game content and polish. It wrapped up early at ~240k context.
- **Session 18c (2026-10-21 22:43–~23:55 UTC, session_01W7Pdfri5qPxnMP2dsnCvLL) did R692–R700 (see "Session 18c"); next round R701.** M3 is done; M4 is in progress (the Battle Tower, both legendaries, the weekly Sunscatter Masters and harder island rematches are in). It wrapped up early at ~330k context and chained to session_01JkygnyfnFio7oFRNAVRJbS (18d).
- **Session 18b (2026-10-21 21:18–~22:45 UTC, session_01Tf8Jp2QEVnMxbjMJYVpJ9c) did R681–R691 (see "Session 18b"); next round R692.** M2 is done; M3 is in progress (the Ember Grotto cave, the Sunstone Festival quest chain and rare island finds are in).
- **Session 18a (2026-10-21 16:49–~18:20 UTC) did R672–R680 (see "Session 18a"); next round R681. It could not chain (no create_session tool in that chat): the user starts the next session by hand with the same prompt.** Milestone M1 is done; M2 is in progress (Port Coral, Palm Path, the ferry and the Coral Cup are in).

## Note for the user's chat (battle-side edits from the new run, please review)
- **Session 18d: no battle.js, arena.js, hud.js, fighter.js or results/worldFight edits.** The Rival Showdown and Dash's island rematch use the existing `S.worldFight({ kind: 'story', flag, berries })` path unchanged. data.js: Moonwhal stats (hp 920, speed 6.0, power 0.9; robin 63%), Solmoth `wingTex: 'sun'`, Moonwhal `starfreckles` part. critters.js: a moth wing texture (`mothTexture`, used when `def.wingTex === 'sun'`), a 'halo' hat kind, hats `rivalband`, `halo`, `surfvisor`, `nightwatch`, `dexcrown` (`extra: true` hats and maps don't count towards Clashara %). growth.js: the `starfreckles` part. world.js: `shinyRate()` replaces the `SHINY_RATE` constant (doubled by the Shiny Charm, `flags.shinycharm`). arcade.js: a new mini-game `waveRider`. screens.js (outside results/worldFight): the Journal 🏆 Champ tab, Records rows (island favours, WAVE RIDER), a Today row, Pecan news adv30.
- **Session 18c: no battle.js, arena.js, hud.js, fighter.js or results/worldFight edits.** The Battle Tower and the legendary bosses use the existing `S.worldFight({ kind: 'story', flag, berries, recruit })` path unchanged (the Tower reads `flags.tower_win` back on the next talk to Morra, so a loss needs no hook). data.js: two new critters (Solmoth, Moonwhal: `legend: true`, existing special/super ids `swoop`/`supernova` and `iceslide`/`whirlpool`), Pumicub buff (hp 1290, speed 6.7, power 1.27), Moonwhal stats tuned down twice after robins. critters.js: `def.wingMul` (bigger 'wings'), a new 'crown' hat kind, role hats for Gloom Gulls/Morra/Hana/Ash/Ama. growth.js: forms for the two legendaries and a new `narhorn` part. screens.js (outside results/worldFight): the '★ Legendary' tag on the info card, unlockHint for legends, Records rows (pearls, Tower), Pecan news adv29.
- **Session 18b: no battle-side edits** (no battle.js, arena.js, hud.js or results/worldFight changes). data.js: Blowfin stats buffed again (hp 1300, speed 6.6, power 1.22) after a robin put it at 38%. screens.js (outside results/worldFight): Journal Records (an island section; Clashara's % counts mainland only), the reef-fish heading, the isles Town Map ferry line, Pecan news adv28. The new story fights (Gloom Gull Skua, Dash on Ember Isle, Captain Morra) use the existing `S.worldFight({ kind: 'story', ... })` path unchanged.
- **fighter.js** (not on the ownership list, but battle code): six new specials in `updateSpecial` (`eruption`, `puffup`, `lariat`, `beakbeam`, `pound`, `skimloop`), their `SPECIALS` cooldown/AI ranges, `burstN`/`popFired` reset in `startSpecial`, the six ids added to the "posed frame by frame" list in `animate`, and `STRIKE` combo flavours for the new ids. Hits go through `Battle.applyHit`; visuals use `B.fx` only. **No battle.js, arena.js, hud.js or results/worldFight edits.** The new critters' supers reuse existing super ids (`meteor`, `tsunami`, `bramble`, `thunder`, `quake`, `cyclone`) with new names.
- **screens.js** (outside results/worldFight): unlock/shiny hint texts for island critters, `cupOfShiny` searches `ALL_CUPS()`, the isles Town Map (`IMAP`, `ILINKS`, `ISLE_LAND`, `ISLE_DECOR`; the Clashara map is unchanged), Pecan news adv27. **style.css:** the Match/Sparring Setup rival grid is 35 px under `max-height: 420px` so 26 critters fit in two rows.
- Island cups live in `ISLE_CUPS` (data.js), not `CUPS`, so the main story, Tournament mode and "every cup" checks are unchanged. Look cups up by id with `cupById(id)`. The results code already records `save.cups[id]` and `flags['cup_' + id]` from `cup.cup.id`, so island cups needed no results change.

## 48-hour run (the first one, finished)
- **48-hour run end time: 2026-10-20 21:52 UTC** (started 2026-10-18 15:44 UTC by session 17a; pushed back 88 min by a worker stall in session 17g, 22:45–00:13 UTC, 4 h 17 min by a worker stall in session 17n, ~10:00–14:17 UTC on 2026-10-19, and 23 min by a worker restart in session 17r, ~19:08–19:31 UTC on 2026-10-19). Later sessions read this and do NOT reset it. If a worker stalls, push this end time back by the length of the stall.
- Each session builds ~100 minutes (or less near 300k context), then chains with the user's prompt word for word (see "Chaining"). Round numbers continue from the highest R in `git log`.
- **Session 17r (2026-10-19 18:18–~19:45 UTC, a worker restart ~19:08–19:31, session_01XNLHQuvCA3bwuJZLRkhYe5) did R655–R671 (see "Session 17r"); next round R672. It could not chain (session lineage depth limit, 8): **the user must start the next session by hand** with the 48-hour prompt in "Chaining".**
- **Session 17q (2026-10-19 17:10–~18:20 UTC, session_01AXYQttiHJUdTzqAKd8dsAy) did R637–R654 (see "Session 17q"); next round R655.**
- **Session 17p (2026-10-19 15:53–~17:15 UTC, session_0136aYRsjLRmRKTEKj7yUeBs) did R629–R636 (see "Session 17p"); next round R637.**
- **Session 17o (2026-10-19 14:38–~15:50 UTC, session_01A4ZY5wCmnYjfYmT3T4J1by) did R615–R628 (see "Session 17o"); next round R629.**
- **Session 17n (2026-10-19 09:26–~10:00 UTC, a worker stall until 14:17, then 14:17–~14:50 UTC, session_01HUFkoLzTnjRxbWJxdvt8CV) did R605–R614 (see "Session 17n"); next round R615.**
- **Session 17m (2026-10-19 08:16–~09:45 UTC, session_01V4diccGXVCBukrvNKiZbpZ) did R586–R604 (see "Session 17m"); next round R605.**
- **Session 17l (2026-10-19 07:00–~08:20 UTC, session_012Xz8agju9ofeQ4h5JvJknc) did R559–R585 (see "Session 17l"); next round R586.**
- **Session 17k (2026-10-19 06:04–~07:05 UTC, session_01T4Ppdv8eks7xiYBZHXjX4g) did R543–R558 (see "Session 17k"); next round R559.** It chained early at ~200k context.
- **Session 17j (2026-10-19 04:45–~06:20 UTC, session_01DQ35cJzhCn4DLxt8ufnCuy, started by hand) did R532–R542 (see "Session 17j"); next round R543.**
- **Session 17i (2026-10-19 02:20–~03:55 UTC, session_01GCkeeKc9vfEuRH9UvU8ayy) did R514–R531 (see "Session 17i"); next round R532. It could not chain (session lineage depth limit reached): **the user must start the next session by hand** with the 48-hour prompt in "Chaining".**
- **Session 17h (2026-10-19 00:59–~02:30 UTC, session_01CpYgjF7gfPegFE28S2QMaU) did R489–R513 (see "Session 17h"); next round R514.**
- **Session 17g (2026-10-18 22:18–22:45 UTC, then a worker stall, then 00:13–~01:05 UTC on 2026-10-19, session_01BjG1fjq9qbS3C8jFjtAuWC) did R468–R488 (see "Session 17g"); next round R489.**
- **Session 17f (2026-10-18 21:12–~22:20 UTC, session_01BmfWF5X6EkDYpX9XpiKuXu) did R446–R467 (see "Session 17f"); next round R468.**
- **Session 17e (2026-10-18 20:20–~21:20 UTC, session_01WXwKgexVpiRXyWsWsazxv3) did R429–R445 (see "Session 17e"); next round R446.**
- **Session 17d (2026-10-18 19:00–~20:15 UTC, session_01Jt3NhTjr57JMGhaYdiZwXk) did R413–R428 (see "Session 17d"); next round R429.**
- **Session 17c (2026-10-18 17:57–~19:30 UTC, session_01QTvrmqfxosdqeWGXKGsbMX) did R398–R412 (see "Session 17c"); next round R413.**
- **Session 17b (2026-10-18 16:40–~17:55 UTC, session_01BfaGLYCvgsBvybduPxRouW) did R379–R397 (see "Session 17b"); next round R398.**
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

## Session 17b (2026-10-18, 16:40–~17:55 UTC, session_01BfaGLYCvgsBvybduPxRouW): moods, SKY HOP, Gauntlet, perf, R379–R397
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
- **R393:** Journal Records uses 🏔️ for Gauntlets. **R394:** Orla names the week's five critters up front. **R395:** TURBO / SKY HOP marquees over the arcade cabinet banks (`buildMarquee()`). **R396:** Seashell night jellyfish (`buildJellies()`, Seashell's open sea only). **R397:** the market stalls and the noodle cart go through `bakeStatic({ root, mats: {}, ...keep })` too (pass anything animated as a property so it's kept); Neon at night ~385 draw calls. Triangle counts in advperf swing 530k–1M between runs because wild critters spawn at random.
- **Final checks (17:55 UTC, production build of R397):** advcup Sprout lands back in Bloom Town with no errors (tapcheck at 17:43 was clean; R393–R397 are world-only and were shot one by one).
- **Next ideas:** a third Neon night thing (a DJ stage?), more Gauntlet flavour (Orla's weekly theme, e.g. all one type), the Alpha shown big in its battle and the hero's hat in fights (battle side, the user's chat); merge static parts of stadium crowds/props too; more room decor (Captain's hut, Lodge); Seashell/Frostpeak night events; re-measure on a phone.

## Session 17c (2026-10-18, 17:57–~19:30 UTC, session_01QTvrmqfxosdqeWGXKGsbMX): night life, rooms, menus, R398–R412
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town.
- **Gotcha (tools):** don't `pkill -f "vite preview"` from a Bash call: the pattern matches the calling shell's own command line and kills it (exit 144). Keep the preview's PID in a file and `kill` that.
- **R398: Gauntlet weekly theme.** `gauntletTheme(wk)` (story.js, exported) picks two types per week (15 pairs); `gauntletFoes` draws the five Aces from those types first (topped up from the rest when the hero is one of them). Orla announces "Blaze & Breeze week!". The battle title stays `Gauntlet n/5` (kept short for the VS card).
- **R399: Neon DJ stage (after dusk).** `buildDance()`: a booth at 15–16,9 (solid; decks with spinning records, speakers, DJ TUMBLE sign, cyan trim; `bakeStatic`), a 4×2 light-up floor at 15–18,10–11 that flashes on the beat, a pink glow. Face the booth → `this.danceT = 3.2`: the hero dances (pose in the hero block), sparkles; the first dance a night tips 1 berry (`save.adv.danced`). **NPCs can have a night spot:** `night: { x, y, dir, wander, lines }` on an NPC is merged in by `buildActors` when `phase !== 'day'` (DJ Tumble stands behind the booth at 16,8).
- **R400: room decor.** New interior tiles: `n` hammock (2 tall), `a` anchor + rope coil, `q` open sea chest, `L` log stack, `M` armchair, `I` skis and poles; cabin `C` is a chart desk / map rack. Captain's Hut and Mountain Lodge layouts use them. New colour keys `canvas, rope, leather, ski0, ski1`. Tile letters still unused anywhere: `d e p w x y z`.
- **R401:** the dance floor is one merged vertex-coloured mesh recoloured only when the beat changes (Neon night ~403 → ~332 draw calls).
- **R402: Frostpeak ice lanterns (after dusk).** `buildIceLanterns()`: six translucent ice blocks with candles and warm floor pools around the frozen pond (3 merged meshes, flicker in update); Skater Ivy skates on the pond at night (night spot 4,8).
- **R403:** the PEAK GAUNTLET signpost (`act: 'gauntsign'`) adds this week's theme.
- **R404: ☰ menu.** A 🎩 Hats button (once you own a hat; `wearHats(w)` exported from story.js). **Fix:** at 740×360 the menu's Save & Quit / New Adventure fell off the bottom; on short landscape (`max-height: 460px` + landscape) the menu is now two columns (hero card left, button grid right). The Golden Laurel line now says "☰ → 🎩 Hats".
- **R405: night fishing.** `FISH.night` = Moonfin, rare Glimmer Ray: after dark 30% of catches in any water but lava are night fish. New Journal section "🌙 After dark"; Fisher Finn hints until you've caught a Moonfin.
- **R406:** Pecan news `adv10` (tools' news lists include it).
- **R407:** while a world dialogue box (`.wd-box`) is up, the A button and the joystick base are hidden (`body:has(.wd-box)`; the box is the tap target). Note `.wd-box` is appended to the screens root, not inside `.world-screen`.
- **R408: Seashell message in a bottle (after dusk).** `buildBottle()`: one bottle on a shore tile picked by the date; face it → a tip note from someone in Clashara + 1 berry, once a night (`save.adv.bottle`). **R409:** Town Map 🍾 on Seashell at night while it waits. **R410:** Journal Records count bottles found / nights danced (`countUp('bottle'|'dance')`). **R411:** night lines for DJ Tumble and Skater Ivy (via the night spot). **R412:** townsfolk within 4 tiles dance along while the hero dances.
- **Balance (production build, 18:20 UTC):** 1-rep robin: Ripples 72%, Kindlekit 69%, Voltferret 61%, most 42–56%, Emberfly 39%, Lilypop/Diggles/Squeakwing 36%. A focused 2-rep run of the three low ones: Squeakwing 44%, Diggles 43%, Lilypop 56%, all inside 40–65%, so no stat change. Ripples/Kindlekit might be worth a 2-rep check next (battle side: tell the user's chat if they stay high).
- **Perf (advperf, high, 915×412):** towns 240–320 draw calls by day, Neon night ~330–350, Frostpeak night ~340; triangles swing with random wild spawns.
- **Final checks (~19:10 UTC, production build of R412):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town with no errors.
- **Next ideas:** more night things for Bloom/Sprout (a stargazing spot?), a Lodge "skate rental" so the hero can skate the pond at night, more bottle notes / a bottle collection page, Ripples/Kindlekit balance re-check (battle side), the Alpha shown big in its battle and the hero's hat in fights (battle side, the user's chat), merge static parts of stadium fronts, re-measure on a phone.

## Session 17d (2026-10-18, 19:00–~20:15 UTC, session_01Jt3NhTjr57JMGhaYdiZwXk): stars, skates, fountain, Today page, perf, R413–R428
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of c674464):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town.
- **New module `src/stars.js`:** `CONSTELLATIONS` (8 critter constellations: stars + lines in 0..1 sky coords), `tonightConst(day, hash)`, `stargaze(root, C, seed, onDone, onCatch)` (the canvas eyepiece view; test hook `el.__stars` with `step(sec)`, `close()`, `shoot` get/set) and `BOTTLE_NOTES` (moved out of world.js, now 12).
- **R413: Sprout Village stargazing (after dusk).** `buildScope()`: Grandpa's brass telescope on a tripod at village 16,14 (solid) with a picnic blanket and a glowing jar; face it → `stargaze()`: tonight's constellation traces itself, first look a night +15% of a level (`save.adv.stars = day`, `countUp('stars')`), seen ones in `save.adv.consts`. Mom has a night spot by the blanket (13,14). Journal Records 🔭 Constellations spotted.
- **R414: Journal 🌌 Night tab** (star log grid + every bottle note read, `save.adv.notes` = note indices). 4 new bottle notes.
- **R415: skates.** Skater Ivy's night spot has `story: 'skates'` (story.js): she gives `save.adv.skates`. With skates, an ice slide (any map) kicks up sparkles and ends in a twirl (`this.twirlT`, no bump); the first twirl of a night +10% of a level (`save.adv.skated`, `countUp('skate')`, toast). The frozen-lake puzzle on the Peak is unchanged (only the look and the end of a slide differ).
- **R416: world perf.** Each building/stadium group goes through `bakeStatic({ root: G, mats: {}, keep: [labDish, beacon, ...pennants, ...medals] })` in `buildBuildings`. Bloom 290–321 → 248 draw calls, Seashell 303 → 248, Frostpeak 281–338 → 234–284; Neon 320–381 (its night crowd: each critter is still 25–45 meshes after baking).
- **R417:** Town Map: Glowcap Woods' label sits above its dot (`ly: -12`; it ran into Glowcap Hollow's); 🔭 on Sprout Village at night until tonight's constellation is spotted (+ 'stars' legend chip).
- **R418: Bloom Town fireworks on Fri–Sun nights** (`buildBloomFw()` / `updateBloomFw(dt)`: rockets launch just north of the hero so the high camera sees them; new `sfx.firework`). **Gotcha:** World already has a `fireworks(b)` METHOD (cup-win volley) and `updateFireworks(dt)`; don't name fields/methods `fireworks`/`updateFireworks` (it silently overrode the method). Emberfly's night lines mention them.
- **R419:** rooms in portrait frame 5.6 tiles across (was 7.5) and pan with the hero.
- **R420:** title screen on short landscape (max-height 380px): smaller logo, slimmer buttons, so the menu no longer covers the critters' faces at 740×360.
- **R421:** portrait critter select: the ‹ › arrows sit beside the critter (top 17%), not over the info card.
- **R422:** portrait: the Critterdex card fades at its bottom edge (it scrolls under the roster); toasts sit below the screen header (`body.portrait .toast { top: 70px }`).
- **R423: Cloudtop wishing fountain** (`buildFountain()`, cloudtop 8,9, solid): tiered sky-blue fountain, falling spray, a shimmering 6-band rainbow; face it → `storyTalk('wish')`: 1 berry, once a day (`save.adv.wish`): 20% +5 berries, 40% +30% of a level, 40% +2 berries. Records ⛲ Wishes made.
- **R424: Journal 📅 Today tab (now the default tab):** every daily (bush, dig spots, Alpha, noodles, TURBO/SKY HOP prizes, wish, weekly Gauntlet) and after-dark thing (stars, bottle, both marshmallow fires, dance, candy floss, skating) with ✅ or where to go; only places you've seen.
- **R425:** Pecan news `adv11` (tools' news lists include it).
- **R426:** routes (maps with wild critters, no buildings, not woods/lava/Peak) get 3 street lamps along the path (`buildLamps`, spacing 11).
- **R427:** Old Snoozlo is awake at night (night spot `act: 'wave'` + lines). **Fix/gotcha:** townsfolk with `act: 'hop'|'cheer'` doze at night (`dozing()`), so a night spot with lines must also set another `act` (Emberfly now waves at night).
- **R428:** telescope: tap a 🌠 shooting star in the eyepiece to catch it (1 berry a night, `save.adv.shoot`); "Caught a shooting star!" flash over the eyepiece.
- **Test gotcha:** particles (fireworks, spray, fireflies) expire during the screenshot tools' real-time wait; set `__game.paused = true` at the end of the stop's JS to capture them. An `ask()` answer in tests: `__game.screens.worldObj.dialog.next()` picks the highlighted option (buttons answer on pointerdown, not click).
- Regression runs (dev server): advgauntlet battle 1 plays from the world and back with no errors.
- **Final checks (~20:12 UTC, production build of 786b72c = R428 + handoff):** advcup Sprout wins 3 matches and lands back in Bloom Town with no errors; tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait). A first 740×360 run flagged the title's Challenges/Critterdex/Camp as covered by the footer chips: the menu's 30px `rise` animation (still at its start in headless) slid it over the footer after R420 tightened the layout; short landscape now uses a 6px `riseShort`. Running three checks at once can time out the page load (412×915 did); run tapcheck alone if so.
- **Next ideas:** a Town Map ⛲ mark or Today count badge on the ☰ button; more constellation variety (a seasonal 9th?); Glowcap/Cinder night events; Route lamps could be wooden lanterns instead of Victorian; Neon crowd draw calls (LOD for far critters); Ripples/Kindlekit balance re-check and the Alpha shown big in its battle (battle side, the user's chat); re-measure on a phone.

## Session 17e (2026-10-18, 20:20–~21:20 UTC, session_01WXwKgexVpiRXyWsWsazxv3): fairy ring, hot spring, Critter Box, Pumpkin Nights, R429–R445
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 4a58ec5):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town.
- **R429: ☰ Today badge.** The Journal's Today rows moved to `screens.todayList()` → `{ rows, after, night }`; `todayBadge()` sets `data-n` on the world ☰ button (open day rows, plus after-dark rows at night; refreshed every 3 s while `mode === 'world'`) and the ☰ menu's 📔 Journal button copies it (`.has-badge`).
- **R430:** routes get wooden post lanterns (post, arm, hanging lantern) instead of Victorian lamps; `this.lampSpots` holds the picked corners.
- **R431: Glowcap fairy ring** (new `src/ring.js`, `fairyRing(root, seed, onDone)`; test hook `el.__ring` with `step(dt)`, `tap(i)`, `tune`, `phase`, `close()`): 6 toadstools + a tall white one at glowcap 8,8 (solid, `buildRing()`); after dark they glow and shed spores; face it → 3 rounds (3/4/5 notes, 4 caps, `sfx.note(i)`); a full song pays 2 berries + 15% of a level once a night (`save.adv.ring`, `countUp('ring')`). By day: "come back after dark". Fen mentions it. **Test gotcha:** step it in small increments (`step(0.05)` × 90) — one big step plays only one note.
- **R432:** short landscape (max-height 420, min-width 600): the Journal widens to 760px and its lists run in two columns.
- **R433/R437: Cinder Town hot spring** (`buildSpring()`, ember 21–22 × 2–3, solid): rock ring, steaming turquoise pool, glows at night; face it → `soak()`: the hero sits in the pool for the talk (`this.soaking`, reset in `load()`), once a day +20% of a level (`save.adv.soak`, `countUp('soak')`).
- **R434:** 9th constellation, The Toadstool; star log counts use `CONSTELLATIONS.length`.
- **R435:** Town Map marks today's open ⛲ wish (Cloudtop), ♨️ soak (Cinder Town) and 🍄 ring song at night (Glowcap, drawn to the right of the dot), with a "✨ daily" legend chip.
- **R436:** Pecan news `adv12` (tools' news lists include it).
- **R438:** Journal Records opens with "🗺️ Clashara explored N%" (average of every bar that has a goal; gold at 100%); "Bottle notes read" has a goal now.
- **R439: Berry Center Critter Box** (the right-hand shelf, `x === W - 2` in a `center` room, drawn as a cabinet with a glowing screen; sign act `pcbox` → story.js → `screens.leadPick(w)`): any team critter can lead the Adventure (`save.adv.hero`); the map reloads with the new lead; if the new lead was the buddy, the old lead becomes the buddy. Nurse Lilypop mentions it once (`flags.boxTip`).
- **R440–R444: Pumpkin Nights** (`pumpkinNights()` in world.js: 15 Oct–2 Nov, or `save.adv.fest` to force it): `buildPumpkins()` puts a carved pumpkin beside up to 5 town doors (never on path tiles; solid); faces glow and flicker after dark; the first one checked each night gives a candy berry (`save.adv.pumpkin`, `countUp('pumpkin')`), the third treat ever gives the **Pumpkin Head** hat (`SHOP_HATS` entry with `season: true`; seasonal hats don't count in the Records hat total); townsfolk without a story sometimes chat about the festival (30%); 🎃 on the title's Adventure button; a Today row and Records row while it's on.
- **R445:** 3 more bottle notes (15).
- **Considered, skipped:** Neon crowd LOD — Neon night is ~330 draw calls (62 of them the shadow pass); the rest is animated critter parts already merged per joint, so an LOD would save little. A 100% hat reward would count towards its own goal.
- Regression (production build of 1e4f4bb (R442)): advwins route1/glowcap/ember — 3 wild fights won, no errors.
- **Final checks (~21:20 UTC, production build of ad1c45c = R445):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town with no errors.
- **Next ideas:** show "Clashara explored %" on the ☰ card; more Pumpkin Nights touches (a spooky Glowwood night, costumes on wild critters, battle side for any fight visuals); portrait rooms still leave big dark bands above/below; a Critter Box tip in the Journal; Ripples/Kindlekit balance and the Alpha shown big in its battle (battle side, the user's chat); re-measure on a phone.

## Session 17f (2026-10-18 21:12–~22:20 UTC, session_01BmfWF5X6EkDYpX9XpiKuXu): explored-% rewards, landmark photos, mornings, world LOD, R446–R467
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 96389b9):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town.
- **Scratch build helper:** `build.sh` in the session scratchpad did: `git worktree add <scratch>/wt HEAD --detach`, symlink node_modules, `vite build --outDir <scratch>/dist`, `vite preview --port 5181`. **Gotcha:** `pkill -f "vite preview"` inside a bash command also kills the calling shell (its own command line contains the text); use `pkill -f "port 518[1]"`.
- **R446/R454: portrait rooms** frame ~6 tiles across (`Math.max(16.5, fit * 0.86)` camera height, pans with the hero). Tighter (R446, 14) hid the arcade's side cabinets on entry; wide rooms can't fit a tall phone without bands, so the area around a room is now a dim shade of its own wall colour (`outer`/`fog` via `shade()` in interiors.js) instead of near-black.
- **R447/R464:** the ☰ card shows a `🗺️ N%` chip (tap → Journal Records) and the title's Adventure button subtitle shows it too. Records bars moved to `screens.records()` → `{ body, pc }`; `recordsPc()` is a safe wrapper.
- **R448/R450/R467: Pumpkin Nights in the wild.** Glowcap Woods after dark: jack-o'-lanterns (the `buildPumpkins()` mesh) on grass beside the path every 6+ tiles (up to 7; checking one works like a town pumpkin); `buildWisps(hx, hy)`: five little ghost wisps (glow sprite + a canvas ghost face) bob over path tiles the hero can reach (BFS on `walkable()`, so never behind the bramble); walking into one catches it (`updateWisps`), all five → +1 berry +10% of a level once a night (`save.adv.wisp = day`, `countUp('wisp')`). Today (after dark) + Records rows. Half the wild critters (`spawnWild`, not Alphas/fixed ids) wear a costume via `hatModel` (witch/wizard, pumpkin, bunny, top hat, party hat).
- **R449: Journal Today tip of the day** (`tipOfDay()`: only tips for things already open; Critter Box, hats, telescope, fountain, night/evening fishing, landmark photos, rematches after the crown, Pumpkin Nights).
- **R451: world perf (LOD).** `new Critter(def, { lod })` now works: `'low'` (14 sphere segments, growth parts 12) for townsfolk and wild critters, `'mid'` (22/18) for the hero and buddy; battles keep the default (36/28). Module `seg` in critters.js and `growthSeg()` in growth.js are set at the start of the constructor and reset at its end. Rendered triangles (shadow pass included) dropped 30–55% on most maps (Bloom 484k → 315k, Neon night 446k → 200k). World update is ~0.05–0.25 ms/frame (advperf).
- **R452:** portrait Camp: toasts sit below the berries / Toss ball buttons.
- **R453: explored milestones** (`screens.exploreCheck()`, run when the ☰ card or Records opens): 25/50/75% → +5/+10/+15 berries, 100% → +25 and `flags.statue`: a glowing golden statue of the current hero on a plinth in Sprout Village (12,10; `buildStatue()`, solid, plaque text on A). `save.adv.expl` = highest milestone paid. Records ends with "Next reward at N%".
- **R455: golden-hour evenings** (`PHASES.evening` is an orange low sun; the sun sits low in the west during evening → long shadows).
- **R456:** the "Alpha prowls the tall grass" toast shows once per play session (`ALPHA_TOLD` set); it repeated after every fight and room exit.
- **R457: landmark photos.** `LANDMARKS` (world.js): Pecan Lab, Sprout Stadium, Seashell Beach, the fairy ring, the hot spring, the Neon arcade, the wishing fountain, the frozen pond (`door:` id or `at:` tile). A 📸 Photo (`snapshot()` → `landmarkSnap()`) within 4 steps logs it (`save.adv.snaps`); all eight → the **Shutterbug Cap** (new `SHOP_HATS` gift hat, kind `cap`) + 15 berries. Records bar (counts towards explored %) and a "Landmarks to snap" line listing seen towns' missing ones.
- **R458:** Pecan news `adv13` (tools' news lists include it).
- **R459–R462: misty mornings** (6–9h on `canRain` maps when it isn't raining; `this.morning`): `PHASES.morning` pale light, `buildMorning()` drifting mist sprites (**gotcha:** `buildMist()`/`this.mist` already exist for the fireflies woods; don't reuse those names), Mom serves berry pancakes once a day (+15% of a level, `save.adv.breakfast`, `countUp('breakfast')`; Today row only while it's morning or once eaten), 🥞 Town Map daily mark on Sprout Village, a busier dawn chorus and a far-off rooster (`sfx.ambient('rooster')`) in Sprout Village.
- **R463:** Neon City by day is a brighter lavender twilight (its base `mood`), so day and neon night read apart.
- **R465: golden-evening fish** `FISH.dusk` (Sunset Snapper, Amber Koi; 30% of evening bites in any water but lava). 16 kinds in the album now.
- **R466:** the breakfast Today row can't leave the ☰ badge stuck after 9.
- Regression (production build of e3f71d0): advwins route1/glowwood/ember: 3 wild fights won, no errors.
- **Final checks (~22:15 UTC, production build of 3571d9d = R467):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town with no errors.
- **Next ideas:** an evening thing to do (a Seashell sunset bench?); more landmarks / a photo album page (thumbnails would need storage care); a Town Map 📸 hint for unsnapped landmarks; the portrait arcade still pans to show its cabinets (could start the camera nearer one side); morning dew sparkles on grass; the Alpha shown big in its battle and Ripples/Kindlekit balance (battle side, the user's chat); re-measure FPS on a phone (LOD should help a lot).

## Session 17g (2026-10-18 22:18 – 2026-10-19 ~01:05 UTC, session_01BjG1fjq9qbS3C8jFjtAuWC): sunset bench, snow fort, garden, geyser, kite, a night-load crash fix, R468–R488
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 31aab12):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town.
- **Worker stall:** the worker stopped from ~22:45 to 00:13 UTC (88 min), so the 48-hour end time moved from 15:44 to **17:12 UTC on 2026-10-20** (top of this file).
- **Scratch build helper** (`<scratchpad>/build.sh`): builds the *working tree* with `vite build --outDir <scratch>/dist` and serves it with `vite preview --port 5181` (no worktree needed; preview doesn't hot-reload). Call the script as its own Bash command: `pkill -f "port 518[1]"` inside a command line that contains that text kills the calling shell. `tools/multi.mjs` honours PORT now.
- **R468/R481: Seashell sunset bench** (`buildSunset()`, driftwood bench at seashell 11,14, solid): in the golden evening (not raining) a big sun sinks into the open sea straight out from it (halo sprite + half disc at z = (H+0.7)·TILE), a glittering path on the water, and a warm additive glow plane that hides the seam where the map's sea meets the open sea. Face it → `sunsetSit()`: the hero sits (`this.sitting`), the camera pans out to sea (`updateCamera`: +5.5 landscape / +2.4 portrait), once a day +1 berry +15% XP (`save.adv.sunset`, `countUp('sunset')`). By day/night: come back in the evening. Today row (evening only, or once watched), Records, 🌅 Town Map daily mark, tip.
- **R468: no trees past watery map edges**: the border loop skips outside cells whose nearest map tile is `~` (palms used to grow out of the open sea south of Seashell).
- **R469:** Town Map names get ` 📸` where a landmark still waits for its photo (+ 'photo spot' key chip).
- **R470:** misty mornings: dew twinkles (`star` particles) on grass/flower tiles around the hero (`updateMorning`).
- **R471:** portrait arcade: `vw` 10 (instead of 5.6) so TURBO and SKY HOP show from the door.
- **R472/R473: snowfall** on `M.snow` maps: light flurries always; a real snowfall when `rainAt(key + 'snow')` (or `save.adv.snow`) → `this.snowing`, 🌨️ on the banner and ☰ card.
- **R474/R486: Snowball Toss** (new `src/snowball.js`, `snowballToss(root, kipPortrait, seed, onDone(score))`; hook `el.__snow` with `step(dt)`, `tap(i)`, `up`, `phase`, `score`, `close()`): Kip's snow fort at frostpeak 10,11 (`buildFort()`, solid). Snowmen pop up behind 6 mounds for 20 s (gold ones +3, Kip −2). 12+ hits → +2 berries +15% XP once a day (`save.adv.snowball`, `countUp('snowball')`); best in `save.adv.snowHi`. Each tap throws a CSS snowball. Today row, Records, ⛄ map mark, tip, Kip's line.
- **R475/R485:** Pecan news `adv14` and `adv15` (tools' news lists include both).
- **R476: Bloom Town garden plot** (`buildGarden()` at bloom 8,13; `gardenTend()`): plant → water once a day (sprout, leaves, bud) → on day 4 it blooms (colour cycles per bloom) → pick: +5 berries, +25% XP, the first bloom gives the new gift hat **Sunbloom Hat** (`SHOP_HATS` id `sunbloom`, new `hatModel` kind `sunflower`). State `save.adv.garden = { stage, last, blooms }`, `countUp('bloom')`. Today row, Records, 🌻 map mark, tip, Bea's line.
- **R477:** on tall portrait phones the Journal list is up to 62vh.
- **R478: Route 1 butterflies** (`buildFlutters()/updateFlutters()`): by day (not rain) five butterflies over reachable grass; walk into them; all five → +1 berry +10% XP once a day (`save.adv.flutter`, `countUp('flutter')`).
- **R479: crash fix.** Opening the Adventure on a fresh World at night in Seashell Town or Frostpeak threw (buildBonfire/buildBottle read `this.doors`/`this.itemSpots` before the map built them). `load()` now resets `doors`, `itemSpots` and `dig` first; the bonfire takes door steps from `M.buildings`. **R480: `tools/advload.mjs`** opens the Adventure fresh on every map and room at 7/12/18/22h and in the rain (160 loads) and reports errors. Run it after adding any world prop.
- **R482:** petting the buddy gives lines about the place, weather and hour.
- **R483:** Glowcap Woods nights all year: outside Pumpkin Nights the five wisps are big golden fireflies (`this.wispKind`). `save.adv.fest = false` now forces the festival off (true forces it on).
- **R484: Cinder Road steam geyser** (`buildGeyser()/updateGeyser()` at cinder 19,5, walkable): rumbles at 5.4 s, blasts at 6.6–7 s of a 7 s cycle; standing on the vent at the blast → `geyserLaunch()` (`this.launchT` spins the hero 4 units up; `busy` while airborne); first ride a day +1 berry (`save.adv.geyser`, `countUp('geyser')`).
- **R487: Gale's kite** (story.js `lostQuest`: once `kite_done`, talking to Gale calls `w.flyKite(who)`): a canvas kite with a bow tail on a string flies beside the hero during the talk (`updateKite`); once a day +15% XP (`save.adv.kite`, `countUp('kite')`).
- Regression: advwins seashell/frostpeak/village/glowcap/neon/cloudtop/ember/glowwood (fresh night loads): no errors.
- **Final checks (~00:55 UTC, production build of the R487 tree):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town with no errors; advload 160 fresh loads, no errors.
- **Next ideas:** the Today list is long now (14 day rows); maybe group it by town or fold done rows; a Town Map 🪁/💨 mark is not needed but a "today" filter on the map could help; Neon City by day is still dusky (R463 made that call); the Alpha shown big in its battle and Ripples/Kindlekit balance (battle side, the user's chat); a sound for the snowball splat; re-measure FPS on a phone; other early builders (`buildScope`, `buildBottle`) still exclude `this.dig`, which is null at that point now (harmless).

## Session 17h (2026-10-19 00:59–~02:30 UTC, session_01CpYgjF7gfPegFE28S2QMaU): ice, rooms, twig race, Fishing Derby, photo album, moonflowers, sweet potatoes, balance, R489–R513
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 0779a50):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town with no errors.
- Scratch helpers (recreate them, they live in the scratchpad): `build.sh` (vite build of the working tree to `<scratch>/dist` + `vite preview --port 5181`; run it as its own Bash command) and `push.sh "<msg>"` (git add src/tools/md, commit with the attribution lines, fetch + merge origin, push with retries).
- **R489:** Journal 📅 Today lists what's still open first; the done rows fold into one `.jr-done` line of ticked icons per section; After dark shows a count. The geyser row's 'where' is now "Cinder Road steam vent".
- **R490/R502:** frozen ice is painted as one sheet over all `i` tiles (and boulders sitting in it) when a map has 6+: deep-blue radial middle, long additive sheen bands, branching cracks, frozen bubbles (Champion's Peak lake, Frostpeak pond). The per-tile glint stripe is gone.
- **R491:** `sfx.snowball(gold)` (throw whoosh + crunchy splat, a sparkle for golden snowmen) in Snowball Toss.
- **R492/R508: landmark photo album.** `landmarkSnap(photo, pad, W, Hh)` keeps a 220×165 JPEG crop of any 📸 Photo taken by a landmark in its own localStorage key `critterclash-album` (`albumGet()` in world.js; NOT in the save, so the backup code doesn't carry it). A retake replaces it ("New album photo"). Journal → Records shows eight polaroids (`.jr-album`/`.al-card`; tap one for a big `.al-view`), old snaps without a photo say "snap it again for the album", unseen towns are 🔒.
- **R493:** rooms (not arcade/lobby/forge/cabin): panelling with seams under a rail and striped wallpaper above on the back wall; the side/front cut walls wear a wooden `cap` tinted to the room (`wall2` is a shade darker too).
- **R494:** Berry Centers (pink/cream) and the Pecan Lab (cool grey) get checked floor tiles with grout and a shine (only when the room uses the default wood palette).
- **R495/R496/R505: Route 2 twig race.** On the bridge (`=`), facing the river: ask Twig race / Fish (if rod) / Never mind → `twigRace()` (pick 🍂 or 🌿) → two twigs drop upstream and drift along the river's middle (`updateTwigs`) to the last river row; the first win of the day pays +1 berry +10% XP (`save.adv.twig`, `countUp('twig')`). Today row, Records, tip, 🪵 Town Map mark, Wren's after-battle line (the old one about the bridge critter went stale).
- **R497: balance.** Full 19-critter robin (1 rep, production build): everyone 42–61% except Pricklepuff 31% (also low in earlier runs). Pricklepuff hp 1090→1130, speed 6.5→6.6, power 1.10→1.13; a 2-rep focused robin then put it at 53%.
- **R498/R503: weekly Fishing Derby.** `derbyOf(gauntletWeek())` (world.js) picks an everyday (non-rare) fish from pond/sea/lava/cold/dusk and a size (its range's middle). Landing it at that size pays +6 berries +25% XP once a week (`save.adv.derbyWk`, `countUp('derby')`); the first win gives the new gift hat **Angler's Bucket** (`angler`, kind `bucket`). Finn tells the week's target; Today row (weekly, not counted for the perfect day), Fish tab banner, 🎯 derby tag in the fish album (named before it's caught), Records.
- **R499:** Pecan news `adv16` (derby, album, twig race); the tools' news lists include it.
- **R500:** lava edges throw a breathing warm additive glow onto the ground in the evening and at night (`buildLavaGlow()`, one merged mesh).
- **R501: perfect day.** `todayBadge()` (every 3 s in the world) pays +5 berries once a day when all ☀️ daily rows (6+, weekly ones aside) are ticked (`save.adv.perfect`, `countUp('perfect')`); Today footer hint, Records.
- **R504/R505: Route 1 moonflowers** (`buildMoonflowers()`): after dark (no rain) three glowing flowers beside the path, seeded by day; face one + A → `moonflowerSniff()` +12% XP once a night (`save.adv.moon`). After dark row, Records, tip.
- **R506:** hat picker / Hat Shop portraits zoom toward the head (`object-view-box`). Note: on short screens the whole modal is scaled 0.7, which is why images measure 42px.
- **R507:** beach sand gets wind ripples and little ribbed seashells painted into the ground texture.
- **R509/R510: Cinder Road sweet potatoes.** After dusk, face any lava tile on Cinder Road + A → `lavaRoast()` +12% XP once a night (`save.adv.roast`, `countUp('roast')`); a basket of sweet potatoes with a stick sits at 12,9 by the lava after dusk (built in `buildLavaGlow`). After dark row, Records, tip.
- **R511:** Town Map: Seashell's daily mark shows 🎣 while the week's derby is open (beside the evening 🌅).
- **R512:** soft snow drifts along the edges of frozen ice on snowy maps.
- **R513:** the derby's Today row reads "Derby: <fish> <cm>+ cm" so it fits two columns.
- Checks after R508 (production build): tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 and lands back in Bloom Town, no errors; advload 160 fresh loads, no errors.
- **Final checks (~02:15 UTC, production build of the R513 tree):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors; advload 160 fresh loads, no errors.
- A second full 1-rep robin after the Pricklepuff buff (R513 build): Voltferret 72%, Woolt 67%, most 39–58%, Pricklepuff 47%, Squeakwing 28%. The first run had Voltferret 47% and Squeakwing 56%, so 1-rep runs still swing ±25%; no change made. Run `robin.mjs 2` (or 3) before touching Voltferret/Squeakwing.
- Regression: advload 160 fresh loads, no errors (after R500).
- **Next ideas:** the Critique backlog's Sky Cup/Camp balloon item is already done (camp.js) and can be struck; Neon City by day is still dusky (R463's call); the Alpha shown big in its battle (battle side, the user's chat); a 2-rep full robin to confirm balance (last full run: 42–61% bar Pricklepuff, now buffed); re-measure FPS on a phone; the album isn't in the save backup (by design; say so if the user asks).

## Session 17i (2026-10-19 02:20–~03:55 UTC, session_01GCkeeKc9vfEuRH9UvU8ayy): Daycare, A-button hints, rainbows, ponds, grass edges, balance, R514–R531
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 4e3c2a8):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- **R514/R523:** tall-grass patches fray at open edges onto lawn (`.`/`f`): short spill blades in `buildGrass` and scalloped `C.tall` tufts painted into the ground texture (a post pass). Neon City (`M.city`) keeps a neat kerb.
- **R515:** Town Map on short landscape phones (`max-height: 420px` and `min-aspect-ratio: 3/2`) is a grid: map left, title/tip/legend/Close in a 210px right column (the growing legend pushed Close off at 740×360). Journal `.jr-list` fades at its foot (mask) so a scrolling list says so.
- **R516/R517/R527/R530: Critter Daycare.** `daycareSpot()` (world.js) adds **Nanny Nell** (woolt, story `daycare`) at 2,3 in every Berry Center, and the cared critter romping at 4,4 (wander 1, hop, a pink ♥ now and then). `daycare(S, w)` (story.js): drop off any team critter but the lead (`S.leadPick(w, 'care')`, a mode of the Critter Box picker) → `save.adv.care = { id, at: steps, lv0 }`; take it back for `careXp(c)` = xpNeeded(lv0) × min(2000, steps since)/1000 (1000 steps = a level, up to two). The lead picker and buddy picker grey it out (`.hero-grid button.off`) and toast if tapped. ☰ card line "🧸 X is at the Daycare · N steps"; Records 🧸 Daycare stays (`cnt.care`); Nurse Lilypop mentions Nell once (`flags.careTip`); Pecan news **adv17** (tools' news lists include it). A toy corner (chest, ball, blocks) at 1,3 (solid) in every Berry Center.
- **R518/R528:** small town ponds (`~` < 40, not beach/snow/lava/cloud/`M.pads`) get lily pads, pink water lilies and cattails on grassy banks; a river with a bridge (Route 2) gets cattails only.
- **R519/R520/R529: A-button hints.** `aHint()` names what A would do (Talk, Poke, Pet, Shake, Dig, Look, Roast, Twigs, Fish, Read, Enter, Swap, Blend, Shop, Rest, Open, Play); `showHint()` every 0.2 s sets `.wd-a[data-hint]` → a pill above the touch A button; keyboard players get a "Space · Talk" prompt in the corner.
- **R521/R522/R525/R526: after the rain.** `this.afterRain` (load): the first hour of a 3-hour block after a rainy one (`rainAt(key, d, hr - 3)`), day only, grassy maps; `save.adv.rainbow` forces it in tests. A screen-space rainbow `.wd-rainbow` (the world camera has no sky; per-orientation sizes, plain alpha), a toast, a buddy line, Records 🌈 Rainbows seen (`cnt.rainbow`, once a day), and sky-blue puddles on the paths. **Bug found and fixed in passing:** rain puddles had been drawn fine; my first edit briefly commented out the fill (never pushed).
- **R522:** two toasts at once stack (`marginTop` by the live toasts' heights) instead of printing over each other. `advtour.mjs`: `MOBILE=1` forces the touch UI in landscape.
- **R524:** townsfolk standing about turn to watch the hero within two tiles (rotation only; `a.dir` is unchanged, so trainers' watch lines and dialogs are unaffected; sleepers, anglers and dozers don't look up).
- **R530/R531: balance.** A 2-rep full robin (72 games each, R513 build): Woolt 61%, Whirlwhisk 60%, most 44–58%, Squeakwing 40%, Diggles 38%, **Rolladillo 33%**. Rolladillo hp 1150→1190, speed 5.4→5.5, power 1.10→1.13 (the stat change rode along in the R530 commit). A focused 2-rep re-run then put Rolladillo at **58%** (42–30); fine for now, re-check in the next full robin.
- Perf note: Cinder Road at noon is the busiest map (362 draw calls); its critters are already merged (`bakeStatic`, R382), ~40 draws each, so more merging gains little.
- advload after R525: 160 fresh loads, no errors.
- **Final checks (~03:50 UTC, production build of the R530 tree):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- **Next ideas:** Diggles (38%) and Squeakwing (40%) if they stay low in the next 2-rep robin; Neon City by day is still dusky (R463's call); the Alpha shown big in its battle (battle side, the user's chat); re-measure FPS on a phone (the rainbow overlay and A hint are cheap, but check); Daycare could show on the Town Map or hatch something (an egg?) if more depth is wanted; the album isn't in the save backup (by design).

## Session 17j (2026-10-19 04:45–~06:20 UTC, session_01DQ35cJzhCn4DLxt8ufnCuy): Daycare eggs, Neon daylight, storms, Critterdex fit, balance, R532–R542
- Started by hand after 17i hit the lineage limit; the local clone was on stale history and was reset to `origin/ccr-4fc93d6e-suxlhd`. A worker restart at ~05:15 UTC killed the dev/preview servers and the robin (restarted; a few minutes, so the end time is unchanged). **Checks at start (production build of f5867e1):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors. advload (R536): 160 fresh loads, no errors.
- **R532/R534/R535/R536: Daycare eggs.** In `daycare()` (story.js), once a day (`A.eggDay`) after ≥400 steps of a stay and with no egg in the bag, Nanny Nell offers an egg → `save.adv.egg = { at: steps, id: caredId }`. `hatchEgg()` (world.js, called from `arrive()` after `pickItem`) toasts "wobbling" at 225 steps and hatches at 250 (not in a lobby or during dialogue): +5 berries, `cnt.egg`, the first hatch gives the **Eggshell Cap** (`eggshell` hat kind, critters.js), and the baby joins `A.nursery` (last 3 kept), shown small (scale 0.55) in every Berry Center at 3,6 / 2,5 / 3,4 with their own lines. `wearEgg()` puts a spotted egg in a sling on the hero's back while carried. ☰ card line "🥚 Your egg hatches in N steps", Journal Today row 🥚 "Collect a Daycare egg" (only while one waits), Records 🐣 Eggs hatched, Pecan news **adv18** (eggs + storms; tools' news lists include it).
- **R533:** Neon City by day uses `dayPalette`/`dayOuter` (worldmaps.js; world.js applies them when `phase === 'day'`): sunlit lilac pavement, so day and the deep neon night read apart. Street lamps are painted per town: white by the sea, navy in snow, cream in the clouds (dark iron elsewhere).
- **R537:** Critterdex on short landscape phones (`max-height: 420px`, landscape): compact card (wins/level/hearts fit at 740×360) with a fade at its foot as a scroll cue for the growth row.
- **R538–R540: thunderstorms.** `stormAt(d, hr)` (world.js, exported): a third of the 3-hour blocks turn showers into storms (`save.adv.storm` forces it in tests). Heavier rain, `lightning()` every 7–17 s (a `.wd-bolt` double flash overlay + `sfx.rumble` 0.4–1.5 s later), ⛈️ banner, ☰ card "⛈️ Storm", photo captions, Records ⛈️ Thunderstorms weathered (`cnt.storm`, once a day), spark critters join water critters in the rain's ambush pool, a buddy line, and Prof. Pecan's forecast names storms.
- **R541/R542: balance.** A 2-rep full robin (R535 build): Voltferret 65%, Kindlekit 61%, Ripples 60%, most 42–57%, Diggles 40%, Squeakwing 39%, Jiggawatt 38%. Diggles hp 1050→1090 / power 1.04→1.07, Jiggawatt hp 1060→1080 / power 1.08→1.10, Squeakwing (R541) hp 1120→1150 / power 1.24→1.26, then (R542, still 35% in a focused run) hp 1180, speed 7.1, power 1.30. Focused 2-rep re-runs: Jiggawatt 50%, Diggles 44%, Squeakwing 47%. Re-check in the next full robin (Voltferret at 65% could take a hair off if it stays high).
- **Final checks (~05:55 UTC, production build of the R540 tree; R541/R542 only change three critters' stats):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- Critiqued and left as is: portrait rooms pan with the hero (R419/R446's call; Nell and the Critter Box show when you walk over); Route 1's square path loop round the rock; the title, Tournament, Quick Battle, Challenges, How to Play and Camp screens at 740×360/412×915 look right (the portrait title just animates in slowly headless).
- **Next ideas:** nursery babies could grow up after a few days and visit the hero's home; lightning could briefly light the 3D scene too; balance (Voltferret 65%, Squeakwing re-check); the Alpha shown big in its battle (battle side, the user's chat); re-measure FPS on a phone (storm rain spawns ~230 drops/s, 150 in plain rain).

## Session 17k (2026-10-19 06:04–~07:05 UTC, session_01T4Ppdv8eks7xiYBZHXjX4g): lightning light, grown-up babies, night music, portrait camera, live clock, play time, night owls, R543–R558
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 4949b38):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- Scratch helpers (recreate them in the scratchpad): `build.sh` (vite build of the working tree to `<scratch>/dist`, then `vite preview --port 5181`) and `push.sh "<msg>"` (git add src/tools/md, commit with the attribution lines, fetch + merge origin, push with retries). For a long robin, copy dist to `distR` and serve it on 5182 so rebuilding 5181 doesn't disturb it. Careful: `pkill -f "port 5182"` kills the Bash call that runs it (its own command line matches).
- **R543/R552:** `lightning()` also lights the 3D world: `updateBolt(dt)` (called in the rain block) adds two quick flashes to `arena.hemi`/`arena.sun` intensity, then restores them; a map load or `hideArena(false)` cuts a flash short cleanly. **Reduce flashing** (`game.reduceFlash`) turns it into one slow faint glow (`.wd-bolt.soft`, 1.5 s).
- **R544/R545: grown-up Daycare babies.** `hatchEgg()` also records `save.adv.hatchDays` (parallel to `nursery`). `growUp()` (run at the start of every `load()`) moves babies ≥3 days old to `save.adv.grown` (last 4) with a toast. `grownSpot()` puts them in the hero's home (`M.indoor === 'home'`) at 7,2 / 2,5 / 5,6 / 8,5 (lv 8, scale 0.85, wander, hop). Talking to one (`n.id` starts with `grown`) gives +2 berries once a day (`save.adv.grownDay`), then fun lines. Journal Today row 🏡 "A present from home", Records 🏡 "Grown up at home"; nursery babies tell how many days until they move in.
- **R546: night music.** `playMusic(name, night)` (audio.js): `nightOf(name)` derives a slow (×0.72 bpm) lullaby from any song: sine/triangle voices, a heartbeat kick, no hats (`song.night`). `load()` asks for it when `outPhase === 'night'`, except victory/neon/boss and the arcade.
- **R547: portrait world camera.** Outdoors in portrait the camera stands further back at a lower pitch (H 28, D 19.5, ~58° lens framing the same ground width) instead of an 80° lens close up, which had blown the treetops under the camera up into flat discs. Fog moves out to 50–92 for it. Rooms in portrait are unchanged.
- **R548/R549:** Glowcap toadstool homes (`indoor === 'toad'`) eat round a big red spotted toadstool table (no wooden table or stools); Neon's Sky Flat (`'flat'`) has a low coffee table and a squashy magenta sofa (two solid tiles left of the table). Every enterable house already has its own room kind, so a 'lounge' variant for plain houses was tried and reverted (it would never show).
- **R550: the world keeps up with the clock.** `skyAt(hr)` makes a signature of time of day, rain/storm, misty morning, rainbow hour and snowfall; `skyCheck(dt)` (every 20 s) fades and rebuilds the map at the hero's tile when it changes, with a toast for evening/night/morning. It never runs during dialogue, menus (`.modal-wrap`), fishing, moves, the bench, the hot spring or the credits, nor when `save.adv.clock` is set (tests).
- **R551/R557:** Pecan news **adv19** (grown babies at home, lullaby tunes after dark, night owls); the tools' news lists include it.
- **R553:** Reduce flashing slows Neon City's dance floor to one change a second.
- **R554/R555: play time.** `save.adv.time` counts seconds the world updates (dt capped at 0.25). The ☰ card shows "⏱️ 3h 05m" after a minute, Records has a "Time adventuring" row, and the ending credits list it under The journey (`advcredits.mjs` seeds `time: 45320`).
- **R556: night owls.** `wildList()` adds Hootsy and Squeakwing (twice each, at the map's first entry's levels) to every wild list after dark; used by `spawnWild` and `ambush`. A toast once a session.
- **R558:** Journal Today on short landscape phones: a long 'where' wraps onto two lines instead of being cut off.
- **Balance:** a focused 2-rep robin (R544 build) of the four last touched: Voltferret 60%, Diggles 57%, Squeakwing 50%, Jiggawatt 43%. All in range; no change.
- **Perf note (advperf, 915×412 high):** most maps 100–290 draw calls; Cinder Road at night is the busiest at 445 (noon 333). Each critter is ~40 meshes even after `bakeStatic`, so the next real gain would need skinned critters (a big refactor); not done.
- advload (R553 build): 160 fresh loads, 0 problems.
- **Final checks (~07:00 UTC, production build of the R558 tree):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- Critiqued and left as is: the ☰ card, Journal tabs and Town Map at 740×360/412×915; rooms at 740×360; the fresh-Adventure opening in portrait; evenings/nights in every town; the location banner is a 2.6 s pill, so a slow headless load can miss it (not a bug).
- **Next ideas:** grown babies could follow the hero for a walk or appear in photos; an evening music variant (only night changes now); a Records row for night owls met; skinned critters if draw calls matter on phones; re-measure FPS on a phone (storm rain spawns ~230 drops/s); a full 2-rep robin (the last full one was R535); the Alpha shown big in its battle (battle side, the user's chat).

## Session 17l (2026-10-19 07:00–~08:25 UTC, session_012Xz8agju9ofeQ4h5JvJknc): walks, evening tunes, Twinkle Week, sleep until night, text speed, R559–R585
- The local clone started on stale history; it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of f122f64):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- **R559:** Records 🦉 "Night owls met" (`cnt.owl`, counted in `startWild` for Hootsy/Squeakwing after dark).
- **R560: evening music.** `playMusic(name, mood)` (audio.js): mood `'evening'` plays `eveOf(name)` (×0.86 bpm, triangle lead, lazy kick/snare, no hats); `true`/`'night'` is the lullaby. `load()` asks for evening when `outPhase === 'evening'`.
- **R561/R562/R576: walks with grown babies.** Talking to a grown-up Daycare baby at home (after its daily present) asks "Take it for a walk?" → `save.adv.walk = { id, i, until: steps + 400 }`; `makeFollower()` prefers the walker over the buddy (base form, lv 8, keeps its home name in pet lines), `grownSpot()` leaves it out of the house. `walkHome()` (every step in `arrive()`) ends it after 400 steps or when the hero comes back home (`W.out` marks that it left); a walk of 100+ steps finds a berry. ☰ card line "🐾 X is out on a walk with you", Records 🐾 "Walks with your little ones" (`cnt.walk`), tip of the day.
- **R563: perf.** The auto-quality watchdog (`main.js trackPerf`) also runs in the Adventure world (frames >0.25 s and fades don't count, so map loads don't trip it); low quality halves the rain drops.
- **R564/R565:** Flo's room (`kidroom`) has a striped play tent in its bare corner (`buildTent`, solid 2,2) that can be looked into (a hidden sign in interiors.js).
- **R566:** portrait menu titles (`.sel-head h1`) sit on a soft dark pill; the stadium jumbotron logo showed right behind "Tournament"/"Challenges".
- **R567/R581:** Pecan news **adv20** (walks, mellow evening tunes, night owls in Records, the bed's sleep-until); the tools' news lists include it.
- **R568/R569: things that read as bones from above.** Seaside street lamps are sea-teal (were white) and Cloudtop's lilac (were cream). Seagulls have swept, tapering ShapeGeometry wings with black tips, a grey back and a tail fan (were straight boxes).
- **R570: balance.** A full 2-rep robin (R558 build): everyone 43–58% except Squeakwing 38%. Squeakwing hp 1180→1210, power 1.30→1.33 → 47% in a focused 2-rep re-run.
- **R571–R574: Twinkle Week (18 Dec–3 Jan; `twinkleWeek()` in world.js, `save.adv.winter` forces it).** `buildXtree()`: a fir with baubles, a star and presents by every Berry Center door (home in Sprout Village); lights twinkle in turns after dark. `xtreeTalk()`: a gift once a day (+2 berries, `cnt.twinkle`), the third gives the seasonal **Twinkle Bobble** hat (`twinkle`, nightcap kind, red). Gentle snowfall over the green towns on festival evenings/nights (`this.twinkleSnow`, 🌨️ banner), Journal Today row, Records row, tip, 🎄 on the title's Adventure button. **New Year's Eve/Day nights:** Bloom's weekend fireworks (`buildBloomFw`) now go off over every town, with a toast.
- **R575: Text speed setting** (Slow/Normal/Fast/Instant; `typeSpeed()` in settings.js) for world dialogue and Prof. Pecan. Settings lays out in two columns on short landscape phones (it scrolled at 740×360).
- **R577:** tip of the day for walks. **R578: dusk critters:** in the golden evening Emberfly joins every wild list twice (`wildList()`), toast once a session.
- **R579/R580:** a dozing hero stays asleep until you move (it woke every 14 s); the walking buddy curls up for a nap too.
- **R581/R582: sleep until.** The hero's bed asks "Sleep until...?" (Just a nap / Evening / Night / Morning). `save.adv.shift = { day, h }` moves the world clock on for the rest of that real date (`worldHour()` in world.js, used by `load()` and `skyCheck()`); `save.adv.clock` (tests) still wins.
- **R583:** the buddy picker says when a grown baby is out on a walk. **R584:** Prof. Pecan greets returning trainers once each Twinkle Week (`news` key `twinkle<year>`, January counts as the previous year). **R585:** low quality builds world trees with icosahedron detail 0 and coarser snow caps (Champion's Peak ~470k → ~280k triangles; the world's auto quality drops to low on slow phones since R563).
- advload (R565 build): 160 fresh loads, 0 problems. advwins route1/glowwood fine. advperf (915×412 high): all maps 101–337 draw calls (Cloudtop noon is now the busiest); Peak/Glowcap Woods ~470k triangles.
- **Final checks (~08:12 UTC, production build of the R582 tree; R583–R585 are a modal line, a title greeting and low-quality tree geometry):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- Critiqued and left as is: all towns/routes at 915×412, 740×360 and 412×915; 12 interiors; the ☰ card with every status line; Town Map; title/cups/challenges/dex/camp/select/team menus.
- **Next ideas:** grown babies in photos; on Twinkle Week evenings rain could fall as snow; medium quality could thin far border trees too; re-check Squeakwing in the next full robin; the Alpha shown big in its battle (battle side, the user's chat); skinned critters if draw calls matter.

## Session 17m (2026-10-19 08:16–~09:45 UTC, session_01V4diccGXVCBukrvNKiZbpZ): trick-or-treat, leaf piles, buddy photos, night hero light, balance, R586–R604
- The local clone started on stale history (Round 5); it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 0988c8a):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- **R586:** on Twinkle Week evenings/nights a shower over the green towns falls as a proper snowfall (`twinkleEve` in `load()`: `this.rain` off, `this.snowing` on), and flakes settle on the ground.
- **R587:** ☰ 📸 Photo: the walking buddy (or a grown baby on a walk) steps up beside the hero for the shot and is named in the caption ("Cindermunch & Squeakwing · …"); a long portrait caption shrinks to fit.
- **R588: perf.** Medium quality builds detail-0 canopies on the 3-tile border skirt, and detail-0 lower canopies (smooth tops) for trees deep in the woods (`deep()` in `buildTrees`): Peak ~473k → ~295k, Route 1 ~331k → ~210k triangles at medium. `tools/advtour.mjs` takes `Q=low|med|high`.
- **R589:** Seashell's evening uses a rosier `BEACH` light (the plain golden hour turned sand and hero one orange). Route 2 is also `arena: 'beach'`, so it gets it too.
- **R590/R601: Pumpkin Nights trick-or-treat.** After dark (outdoors, not dozing, not trainers/story folk: `trickOrTreat(n)`), townsfolk wear a costume hat (`COSTUMES`, shared with the costumed wild critters) and the first six you talk to each night give a candy berry (`save.adv.tot = {day, ids}`, `cnt.tot`): Journal Today row 🧛, Records 🍬, tip. The walking buddy dresses up too (R601). `roleHat()` now returns whether it added a hat.
- **R591/R594:** Pecan news **adv21** (trick-or-treat, buddy photos, autumn leaf piles, Twinkle Week snow); the tools' news lists include it.
- **R592:** after dark a soft moonlit pool of light (`this.heroGlow`, ember-warm on lava maps) follows the hero, and moonlight rims the hero's outline, so you can find yourself at night.
- **R593/R596/R599/R600/R603: autumn leaf piles** (October to 15 November; `save.adv.autumn` forces it): two heaps per green map a day (`buildLeaves()`, a tile clear of the canopies and 3+ from townsfolk; not Seashell, snow, lava, city, cloud or Glowcap maps). Walk through one: leaves fly (`leafJump()`), the pile flattens for 14 s, a crunchy `sfx.leafPile()`, the hero grins; the first of the day (`A.leaves`) may hide a berry; the buddy scatters them too. Autumn leaves also drift down over those maps. Records 🍂.
- **R595:** in the landscape world a toast drops below the map-name banner while it shows (CSS `body:not(.portrait):has(.wd-banner) .toast`); "Emberflies come out".
- **R597: balance.** Full 2-rep robin (R591 build, 72 games each): everyone 39–63% (Whirlwhisk 63, Diggles 57, Ripples/Kindlekit 56, … Squeakwing 50, … Pricklepuff 40, Jiggawatt 39). Whirlwhisk power 1.16→1.14; Jiggawatt hp 1080→1100, power 1.10→1.12; Pricklepuff hp 1130→1150, power 1.13→1.14. Focused 2-rep re-check: Jiggawatt 50%, Pricklepuff 47%, Whirlwhisk 47%.
- **R598:** Twinkle Week townsfolk wear red/green bobble hats. **R602:** the hat picker fits two full rows at 740×360.
- **R604: Halloween night (31 Oct; `halloween()`, `save.adv.halloween` forces it):** after dark soft ghost orbs drift through every outdoor map, a toast once a session, and ten trick-or-treats instead of six (Journal row follows).
- **Final checks (~09:20 UTC, production build of R603):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town; advwins route1/glowwood fine, no errors. (R604 is a festival-only effect, screenshot-checked.)
- advload (R591 build): 160 fresh loads, 0 problems. advperf (915×412 high, R598 build): all maps 102–338 draw calls, unchanged.
- Critiqued and left as is: towns/routes at all three sizes (day, evening, night), 8 rooms in portrait (rooms leave the bottom for the controls on purpose), ☰ card, Journal Today/Records, Town Map, Hat Shop grid, title/cups/camp/dex.
- **Next ideas:** Twinkle Week trick-or-treat equivalent (carol singers?); skinned critters if draw calls matter; the Alpha shown big in its battle (battle side, the user's chat); re-measure FPS on a phone; a full robin again after the next combat change.

## Session 17n (2026-10-19 09:26–~10:00 UTC, worker stall, 14:17–~14:50 UTC, session_01HUFkoLzTnjRxbWJxdvt8CV): first impressions, grown-form scarves, carols, glowing-woods light, R605–R614
- The local clone started on stale history (Round 5); it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of eb73e80):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- **Worker stall ~10:00–14:17 UTC (4 h 17 min): the 48-hour end time moved from 2026-10-20 17:12 to 21:29 UTC.**
- **R605:** a brand-new adventure starts on a dry day: no showers or rainbow puddles until `flags.quest` (Prof. Pecan sends the hero out). Both `load()` and `skyAt()` use the same rule, so the live sky check doesn't loop; `save.adv.rain`/`rainbow` still force it.
- **R606:** the hero picker (`heroPick`) shows each critter's type chip and level; at ≤420 px tall it hides the blurb and shrinks portraits so Back stays on screen with a full team.
- **R607:** grown forms (stage 2) wore the level-up scarf as a thin hoop floating round the tummy. `buildGear` now sizes it to the body's slice at that height and flattens it into a cloth band (stage forms only; base forms unchanged).
- **R608:** Whirlglide's `windring` was 0.6 (inside its body, invisible) → 0.85; Tempestail gets `windring: 1` (it read as a plain grey cat from the front).
- **R609:** `boltmane` (Voltweasel, Stormstoat, Thunderam, Megawatt) flares its outer bolts past the cheeks, so it reads from the front/portraits too.
- **R610/R612: Twinkle Week carols.** After dark in Twinkle Week (`caroler(n)`, same eligibility as trick-or-treat), talking to townsfolk sings a carol together (🎵 bubble, `sfx.jingle(2)`); the first six a night give +1 berry (`save.adv.carol = {day, ids}`, `cnt.carol`). Journal Today row under "After dark", Records 🎵 "Carols sung", tip. Trick-or-treat wins if both festivals are forced on (they never overlap for real; tests use `save.adv.fest=false`).
- **R611:** Glowcap Woods/Glowcap Hollow are dim at any hour, so the hero gets the moonlit rim and pool of light there by day too (was a brown blob). **R614:** the walking buddy gets the moonlit rim whenever the hero glow is on.
- **Final checks (~14:45 UTC, production build of R614):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- **R613:** Pecan news **adv22** (carols, glowing-woods light, tidy scarves); the tools' news lists include it.
- Critiqued and left as is: first-launch Prof. Pecan intro, new-adventure intro dialogue (portrait box is centred; the contact sheet is half-size), towns at 740×360 (touch UI) and 412×915, ☰ card, Journal Today/Fish, Camp, all 19 growth lines (lineup.sh).
- **Next ideas:** Hootsy/Pricklepuff stage-2 scarves still look a little like a float from some angles (consider a knot/bow in front); a carol tune instead of the jingle; skinned critters if draw calls matter; the Alpha shown big in its battle (battle side, the user's chat); a full robin after the next combat change.

## Session 17o (2026-10-19 14:38–~15:50 UTC, session_01A4ZY5wCmnYjfYmT3T4J1by): autumn trees, scarecrows, festive rooms, faces to camera, festival music, R615–R628
- The local clone started on stale history (Round 5); it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of c096394):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors. advtrial/advgauntlet/advcredits fine; advload 160 fresh loads, 0 problems.
- Build helper used this session: a scratch `build.sh` (worktree of HEAD → `vite build` → `vite preview --port 5181`). **Gotcha:** `pkill -f "vite preview"` inside a Bash call whose own command line contains that text kills the calling shell (exit 144); use `pkill -f "[v]ite preview"`.
- **R615:** after dusk the stadium floodlights show a lit lamp panel on top (from the high camera they were dark boxes).
- **R616/R627: grown-form scarves.** A knot and a short hanging end under the chin (`buildGear`, stage forms), and the band is narrowed sideways (x scale `chubby * 0.86`) so its ends tuck into the body: a collar, not a belt. Why it looked like a belt: the head overlaps the body so far down that the "neck" sits at t≈0.3 of the ellipsoid, nearly the widest part. Snoozlo's stage 2 still reads a little wide.
- **R617:** Twinkle Week carols play `sfx.carol(k)` (four original waltz phrases, matching the verse shown) instead of the jingle.
- **R618/R620: festival music.** `playMusic(name, mood, extra)`: `extra` = `'bells'` (Twinkle Week: sleigh-bell shakes on the beat) or `'spooky'` (Pumpkin Nights evenings/nights: a wobbly ghost "ooo" every other bar). The world passes it in `load()`; every other caller passes nothing, so it resets.
- **R619: faces to camera.** In the world, the hero, buddy and townsfolk/wild critters tip their chin up (`P.head -= 0.22 * cos(yaw)`) when facing the high camera, so you see a face rather than the top of a head; dozers/sleepers keep their nod.
- **R621/R626/R628: Pumpkin Nights scarecrow** (`buildScarecrow`, `scareTalk`): hay bales and pumpkins by every Berry Center (home in Sprout Village), by day too; A = it wobbles + a line; a crow on its arm flaps off when the hero is within 2 tiles and returns once they're 6+ away; on Halloween night its face glows. The face is painted on the head's texture (u=0.25 faces +z) and the head tips up, because a face plane sank into the sphere.
- **R622: autumn colours.** `isAutumn()` (October to 15 Nov; `save.adv.autumn` forces it, shared with leaf piles). On green maps (no `M.trees`, snow, lava, Seashell, cloud or fireflies) ~40% of trees, picked by a position hash, get orange/gold/red canopies (moonlit shades at night): 3 extra merged meshes.
- **R623/R624: festive rooms** (`roomFestive`): a jack-o'-lantern pair (Pumpkin Nights) or a little potted twinkling tree (Twinkle Week) in a free back corner of every room except the arcade and lobbies, lit after dark, with a Look line. It keeps clear of the Daycare toy chest (center) and Flo's tent (kidroom).
- **R625:** Pecan news **adv23** (autumn colours, scarecrow, festive rooms, festival music); the tools' news lists include it.
- **Final checks (~15:44 UTC, production build of cb4ad85 = R628):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors. APK runs for R621–R623 succeeded.
- Critiqued and left as is: all towns at 3 sizes (day/evening/night), 8 rooms at 740×360 and 412×915 (portrait rooms pan with the hero on purpose), Journal tabs and ☰ card at both sizes, dialogue box at all sizes, all menus (tapcheck shots), 8 growth lines, advperf (102–336 draw calls, unchanged).
- **Note for the user's chat (battle side):** in autumn the world trees turn orange/gold/red, but the open-field wild-fight backdrop (arena.js open mode) keeps green trees. `isAutumn()` is exported from world.js if you want to match it.
- **Next ideas:** Snoozlo stage-2 collar still a touch wide; a crow "caw" sound; first-frost/late-November look after the autumn window; a Twinkle Week counterpart to the scarecrow (a snowman with a carrot nose by each Berry Center); a full robin after the next combat change.

## Session 17p (2026-10-19 15:53–~17:15 UTC, session_0136aYRsjLRmRKTEKj7yUeBs): autumn drifts, round canopies on phones, frosty mornings, skinned townsfolk, R629–R636
- The local clone started on stale history (Round 5); it was reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 78b21e8):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 matches and lands back in Bloom Town, no errors.
- Build helper: a scratch `build.sh` (worktree of HEAD → `vite build` → `vite preview --port 5181`) and `push.sh` (commit + fetch/merge + push). **Gotcha (again):** `pkill -f`/`pgrep -f` patterns match the calling shell's own command line if the same text appears in it (exit 144, or a wait loop that never ends); wait on a marker file (`touch /tmp/x.done`) instead.
- **R629:** autumn trees turn in drifts: a 3×3-tile grove shares orange, gold or red (8% pick the next hue), and ~14% of trees are only just turning (yellow-green). Was a candy row of alternating colours.
- **R630:** `sfx.caw()` when the scarecrow's crow flaps off; moonlit autumn canopies a touch warmer (the reds read maroon at night).
- **R631:** on medium/low quality (the phone default: touch → 'med') the border/deep tree canopies are detail-0 icosahedrons with flat normals, so they looked like cut gems. `ico()` in `buildTrees` gives them round normals (same triangles).
- **R632:** grown-form scarves are capped at 0.36 half-width (`min(chubby*0.86, 0.36/(w*0.5*snug))`), so Snoozalot (widest body) wears a tucked collar, not a belt.
- **R633: frosty mornings.** `isFrost()` (16 Nov–17 Dec; `save.adv.frost` forces it) on `canRain` maps, 6–10 am, dry and not after rain (`this.frost`, set next to `afterRain` in `load()` so the ground/trees see it): silvery grass palette, tinted tall-grass blades, thin white caps on canopies, 'snow' footsteps on grass, breath puffs from the hero, a one-time ❄️ toast. Reuses `buildMorning`/`updateMorning` (mist only 6–9).
- **R634:** Mom (always the hero's own species, `critter: '$hero'`) wears a flower crown via `roleHat` (`/^Mom$/`), so she isn't the hero's twin in the opening. `tools/advload.mjs` takes `FORCE='{"frost":true}'` (merged into `save.adv` before each load).
- **R635:** Pecan news **adv24** (autumn drifts, frosty mornings, the crow's caw); the tools' news lists include it.
- **R636: skinned townsfolk.** Each baked critter still drew one or two meshes per joint (~30 draws a critter). `skinStatic(cr)` (world.js, after `bakeStatic`) folds every baked part (`userData.baked`) into one `SkinnedMesh` per material with the joints as bones (bone inverse = joint world matrix at bind; `bindMode` attached, so it follows the root). Used for townsfolk (NPC build) and wild critters (`spawnWild`); NOT yet the hero or the buddy. Same-seed A/B: Route 1 231→177 draws, Route 2 248→227, Cinder Road 262→217, Cloudtop 347→314; triangles go up 10–25% because the merged body now casts the whole critter's shadow (castLite used to pick the two biggest parts). Bone textures are freed in `unload()` and `removeNpc()`. A/B close-ups were identical.
- **Final checks (~17:05 UTC, production build of 6990a5b = R636):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 and lands back in Bloom Town; advwins route1/route2/glowwood fine; advload 160 fresh loads, 0 problems (also with `FORCE='{"frost":true}'` on the dev server).
- Critiqued and left as is: all 13 maps at 740×360 (touch) and the main ones at 412×915 day/night, Pumpkin Nights/Halloween nights at 915×412, title/Tournament/Critterdex/Camp/Challenges/Training at 412×915 and 740×360, ☰ card and Town Map at 915×412 and 412×915, the new-adventure opening at 740×360 and 412×915, advperf on medium (≤313 draws, ≤360k triangles).
- **Note for the user's chat (battle side):** a Route 2 wild fight uses the "beach" open-field backdrop (sand dunes and palms); fine if intended (Route 2 runs to Seashell), odd if not. Also still: the open-field backdrop keeps green trees in autumn (`isAutumn()` is exported from world.js).
- **Next ideas:** skin the buddy (follower, `lod: 'mid'`) and the hero too (the buddy didn't spawn in a quick advtour check, so it was left out untested); limit skinned critters' shadow to the body (cast a cheap shadow-only proxy) to win back the extra shadow triangles; a Twinkle Week snowman was considered and dropped (the Twinkle tree already stands by each Berry Center); a full robin after the next combat change.

## Session 17q (2026-10-19 17:10–~18:20 UTC, session_01AXYQttiHJUdTzqAKd8dsAy): skinned hero and buddy, all four seasons, R637–R654
- The local clone started on stale history (Round 5); reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 778318b):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- Scratch helpers as before: `build.sh` (worktree → `vite build` → `vite preview --port 5181`) and `push.sh` (commit + fetch/merge + push). **Gotcha:** an end-of-line `// comment` inserted mid-line swallows the rest of that line (R642 broke `ambience()` until fixed; `node --check src/world.js` catches it in a second, and the dev page just never becomes ready).
- **R637:** the walking buddy is skinned too (`skinStatic` in `makeFollower`; ~30 → 8–11 meshes). `refreshFollower()` frees the old buddy's skeleton/geometry; the Daycare-walk end reuses it (indoors it just drops the reference; the reload's unload frees it). advload with `FORCE='{"buddy":"squeakwing"}'`: 160 loads, 0 problems.
- **R638:** Seashell gulls glide on a shallow V with short flap bursts (a full flap seen from above looked like a pink bone at sunset).
- **R639:** the hero is skinned (`skinStatic(this.hero)` right after `bakeStatic`; ~30 → 9–13 meshes). Hats, egg sling, brolly and the rod are added after and still ride on the joints. advroom (bed), advwins route1/cinder and photo fine.
- **R640:** low quality used detail-0 canopies everywhere (cut-gem trees); it now follows medium's rule (chunky only on the border skirt and deep in the woods).
- **R641: spring blossom** (`isSpring()`: 20 Mar–30 Apr; `save.adv.spring` forces it): about 40% of green-map trees flower in groves (pink / pale pink / white, moonlit at night) via the autumn `tint()` groves, pink petals drift past the hero (`this.blossom`), one-time 🌸 toast.
- **R642: summer** (`isSummer()`: 21 Jun–31 Aug; `save.adv.summer`): `buildSunflowers()` puts up to 6 clumps of 3–4 tall sunflowers on grass tiles next to woods (leaning into the trees, faces up to the sun, merged into 4 meshes), and `sfx.ambient('cicada')` buzzes on summer afternoons.
- **R643/R644:** Pecan news **adv25** (blossom, sunflowers, winter snow); tools' news lists include it. **Winter** (`isWinter()`: 4 Jan–end Feb; `save.adv.winterSnow`): frosty mornings return after Twinkle Week, and a shower over the green maps falls as snow (`this.winterFall` → no rain, `snowing`/`twinkleSnow` on, and `frost` all day so grass and treetops look dusted), with a 🌨️ toast.
- **R645:** the ☰ card names the season/festival (`seasonTag()` in screens.js; kept on one line with `.nw`).
- **R646:** ~30% of the trees on the volcano maps are charred grey (they had turned into another orange "autumn" wood).
- **R647/R648:** a year-long goal: `seasonMark()` (called from `buildMorning`) ticks `save.adv.seasons.{spring,summer,autumn,winter}`; all four give the **Four Seasons Crown** (`kind: 'seasons'`, `season: true` so it isn't in the hat total). Journal Records shows '🗓️ Seasons seen 🌸 · 🍂 ·'.
- **R649:** ☰ 📸 captions add snow and the season/festival emoji. **R650:** in Jan/Feb Pecan's forecast says snow for the green maps.
- advload with `FORCE='{"spring":true,"summer":true,"winterSnow":true}'`: 160 loads, 0 problems.
- **Final checks (~18:15 UTC, production build of abbcb02 = R654):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 and lands back in Bloom Town, no errors. advload with meadow/early/summer forced: 160 loads, 0 problems.
- Earlier checks (production build of 59c1a51 = R650): tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- **R651:** room windows show the weather outside (`this.outWet` / `this.outSnow`, worked out in `load()` from the outer map): rain streaks or snowflakes on the glass.
- **R652:** late spring (`isMeadow()`: May–20 Jun; `save.adv.meadow`): wildflowers dotted through the grass texture on the green maps (own dice); counts as spring for the crown; 🌼 on the ☰ card/photos.
- **R653:** early autumn (`isEarlyAutumn()`: September; `save.adv.early`): ~13% of green-map trees just turning yellow-green, ~4% gold; counts as autumn; 🍃. **Every month now has a look:** Jan–Feb winter, 20 Mar–Apr blossom, May–20 Jun meadow, 21 Jun–Aug summer, Sep early autumn, Oct–15 Nov autumn (+ Pumpkin Nights 15 Oct–2 Nov), 16 Nov–17 Dec frost, 18 Dec–3 Jan Twinkle Week.
- **R654:** `green` in `buildTrees` excludes rooms (the blossom toast could fire indoors).
- **Measured, not done:** skinned critters' shadows cost 47k (Route 1) – 80k (Cloudtop) triangles on medium (17–22%). A cheap shadow proxy can't be hidden from the main pass with layers (three r170's shadow map tests the *main* camera's layers), so it would cost a main-pass draw per critter and blobbier shadows; left as is.
- Critiqued and left as is: world tour at 915×412 (8 towns), portrait 412×915 day/evening/night, low quality at 740×360, rooms at 740×360, menus (title, Tournament, Challenges, Camp, Critterdex, Training) at 740×360, title at 412×915, ☰ card, hat picker, photo, dialogue box. Neon City by day is still lavender-dusky (a style call).
- **Next ideas:** seasonal fish (careful: the fish album counts towards completion); seasonal townsfolk lines (a few NPCs remarking on blossom/sunflowers/snow); the 'cicada' sound is untested on a real phone; a full robin after the next combat change.

## Session 17r (2026-10-19 18:18–~19:45 UTC, worker restart ~19:08–19:31, session_01XNLHQuvCA3bwuJZLRkhYe5): seasonal chat, seasonal fish, seasonal dailies, two deliveries, world-critter LOD, R655–R671
- The local clone started on stale history (Round 5); reset to `origin/ccr-4fc93d6e-suxlhd`. **Checks at start (production build of 7509aaf):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the in-battle pause menu in portrait); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- Scratch helpers as before (`build.sh` worktree → `vite build` → `vite preview --port 5181`; `push.sh` commit + fetch/merge + push). **Gotcha:** writing the helper scripts with a heredoc in the same Bash call that runs them kills the shell (the heredoc text holds the `pkill -f` pattern). Write them first, run them in a separate call.
- **R655:** townsfolk chat about the time of year (`seasonChat(n)` in world.js: blossom, wildflowers, sunflowers/cicadas, early autumn, autumn, frost, Twinkle Week, winter snow), 30% of the time outdoors, outside Pumpkin Nights (which keeps its own chatter).
- **R656–R658, R669–R670: seasonal visitor fish.** `SEASON_FISH` + `seasonKey()` (exported from world.js; `seasonMark()` uses it too): Blossom Koi (spring), Sunburst Perch (summer), Maple Trout (autumn), Snowflake Smelt (winter); any water but lava, about 1 fish in 4 while in season. Stored in `save.adv.fishLog.season`, **kept apart from the fish album** (`sp`, `best`), so album completion never waits on the calendar. +3 berries on each first catch; all four give the **Koi Bucket Hat** (`kind: 'koi'`, `season: true`, not in the hat total). Journal Fish tab has a "Seasonal visitors" section, Today lists "Hook the <fish>" until caught (a 6th row element `'season'` keeps it out of the ☰ badge and the perfect-day bonus), Records shows them (no goal), Fisher Finn tips you off. Pecan news **adv26** (tools' news lists include it).
- **R659/R665/R666/R667: seasonal dailies** (world.js `propSpot()` helper): spring/meadow days a picnic blanket + basket by the Route 1 pond (`buildPicnic`/`picnicSit`, +XP); summer days a watermelon on a striped towel on Seashell beach (`buildMelon`/`melonSplit`: it splits into halves until tomorrow, +2 berries); Jan–Feb a snow critter in Sprout Village (`buildSnowman`/`snowRoll`: three A presses roll base, middle, head; +2 berries). Today rows, Town Map daily marks (🧺 Route 1, 🍉 Seashell), Records counts, A hint 'Look'. Force with `save.adv.spring/summer/winterSnow`.
- **R660:** the red "something new" dot (`.btn.dot::after`) sits inside its button's corner (Camp's dot overlapped How to Play at 740×360).
- **R661:** the petted buddy notices the season (petal sneeze, summer panting, autumn leaves, frosty breath).
- **R662–R664: two new deliveries:** Surfer Pengsicle (Seashell, renamed from 'Pengsicle', `story: 'lost:charm'`) → Old Snoozlo in Bloom Town (asleep by day, so after dark); Elder Oakley (Glowcap, `lost:honey`) → Mom in Sprout Village. Berries + Power Snack each. Mom's after-line never pre-empts her misty-morning pancakes, which come with glowing honey once delivered. Favours total is now 15 (the explored-% may dip a little for finished saves).
- **R668: world-critter LOD.** Capsule limbs, flame lathes and the scarf torus now follow the LOD (`seg`) in critters.js (low 4×10, mid 6×14; battles unchanged). A far critter drops ~18.6k → ~10.7k triangles; advperf (medium, 740×360) triangles down 10–25% on most maps (Glowcap Woods night 481k → 391k), draw calls unchanged (≤244). Same-view A/B shots were identical.
- **R671:** the open sea past Seashell beach has sparse drifting wave marks (`this.seaTex`, starlight glints at night) instead of a flat slab (very visible at 412×915).
- `tools/forms.mjs <out.png> <id,id> [lv,lv]` renders full-body portraits of growth forms on one sheet (stage 2 = Lv 7–13, stage 3 = 14+).
- advload with `FORCE='{"spring":true,"summer":true,"fest":false}'` (production build of 4e23b71): 160 loads, 0 problems.
- **Final checks (~19:40 UTC, production build of 0dd51d0 = R671):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint in portrait); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- Critiqued and left as is: world tours at 915×412, 740×360 (touch, medium) and 412×915, rooms at 412×915, title/Tournament/Camp at 412×915 and 740×360, Journal Today/Fish/Favours/Records, Town Map at both sizes, the hat picker, grown-form scarves (Hootsy/Pricklepuff/Snoozlo stage 2 now read as collars with a knot, so that old note is done).
- **Next ideas:** autumn has leaf piles and Pumpkin Nights but no daily "prop" like the others (maybe apple-bobbing or a harvest basket in Bloom Town); the Hootsy stage-2 (gust) scarf is pale on a lavender body; the sea texture could also go on other water borders; a full robin after the next combat change.

## Session C3 (2026-10-24 05:28 UTC →, session_01Peyg2coA3B6H1NqJSezMPh): C5 UI consistency pass done, R738–R741
- Local clone started on stale history (d18c276); fast-forwarded to origin. Build scripts as in Session C1 (recreated; `build.sh`/`wbuild.sh` take `P=`, `wbuild.sh` builds into `wdist$P`). A `push.sh` helper: commit with a message, fetch + merge, push with retries.
- **Checks at start (0f68b09, production build):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- **R738: `tools/uishots.mjs [WxH] [step,step]`.** An end-game save (every gate flag, 30 levels, 40 hats, all forms seen, all news read), then 30 steps: ☰ menu, each Journal tab (Today/Records also scrolled to the bottom), Town Map (mainland, isles), Buddy, Hats, Hat Shop grid, a long `say`, `ask` with 3 and 4 options, telescope, fairy ring, TURBO and SKY HOP start screens, Settings, Back up, Restore, Match Setup, Challenges, Cups, Critterdex, a toast over the menu. Screenshots `tools/out/ui-<WxH>-<step>.png`; reports MODAL off-screen, SIDE/VERT spills out of the modal (scrolling lists are fine), CUT text (ellipsis and line-clamp are allowed), SMALL buttons under 26 px, TINY text under 10 px. Fixes: **toasts over an open menu drop to the bottom edge** (`.toast.low`; the 25%/75% explore toast hid the ☰ card's title at 740×360) and never catch taps; **'{hero} got…' dialog lines** (`say()` in world.js) drop the speaker tag; **portrait Journal tabs** are a 3×2 grid (13.5 px, 34 px tall; they were 11.5 px pills in one row); the ☰ card's 📋 chip keeps together.
- **R739:** the Journal list has a **fixed height** (the modal used to shrink to the Favours page and grow for Fish, so the tab bar jumped) and, on short landscape screens, hides its 'Journal' title (the tabs say where you are) for 40 px more list; the Records explore toast fires after the Journal is up (so it drops low); **Match Setup** is 640 px wide on short landscape screens so 30 rival buttons fit two rows again (the legends had pushed two onto a third).
- **R740:** Match Setup's sticky footer used a −22 px side margin against the 18 px short-screen padding (4 px sideways scroll); **portrait screen headers** get a dark fade band (the stadium jumbotron's CRITTER CLASH logo read through behind Challenges/Tournament); the ☰ card's play-time chip keeps together.
- **R741:** uishots ignores SVG text in the tiny check; docs.
- Critiqued at 915×412, 740×360 and 412×915: every uishots step, plus tapcheck `SHOTS=1` (title, howto, settings, cups, select, Match/Sparring Setup, team screens, challenges, trials, dex, badges, camp, Pecan, ladder, recruit, trophy, moves, pause, results, hero pick, world, Town Map, Berry Center). Seen and fine: the Hat grid hides its h2 under 420 px on purpose; the arcade/telescope/ring overlays; backup/restore sheets; the ask box's 4-option layout in portrait (3 + 1).
- **Final checks (production build of 058f214, R740; R741 is a tool tweak and docs):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors. uishots clean at all three sizes.
- **For C6 (audio and feel):** `sfx.ui('ok'|'back'|'move')`, `sfx.jingle`, `sfx.note`, `sfx.cheer`, `sfx.voice` in audio.js; `playMusic(tune)` per map (world.js ~line 505 picks `tune`). Grep for `addEventListener('click'` without a nearby `sfx.` to find silent buttons; `navigator.vibrate` and the Vibration setting already exist (settings.js).

## Session C2 (2026-10-24 03:41 UTC →, session_01UGdChPvkPsLSfyUsJVsRPA): C2, C3 and C4 done, R731–R737
- Build scripts as in Session C1 (`build.sh` builds HEAD, `wbuild.sh` the working tree; give each its own `P=` port, and don't rebuild a port a running tool is using: `wbuild.sh` kills that port's server).
- **Checks at start (d18c276, production build):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- **R731 (C2): an orange story ❗.** `storyMark(npc)` in story.js names whoever starts the next main beat (Pecan before the quest, Bouldillo, Dash at the Thunder door, Mama Squeak then Pip then Mama again, the Stone Sage, Dash with the Night Gang, Dash and King Snooze on the peak, Skua, Morra, the Showdown Dash; R734 adds the three legendaries once awake); world.js `questMarks` draws it (kind 'm': an orange disc with '!'; favours keep the yellow one) and `a.markKind` records it; big NPCs (`n.scale`) carry the mark higher. nextGoal: the Trial of Heart (nothing gates it, so the goal line now points at it once the Champion Cup is won), and Pip's rescue step by step. **The landscape outdoor camera stops 4.2 tiles short of the south border** (Neon City's south road was half a screen of border roofs). `tools/goals.mjs` prints the ☰ goal line and every ❗ at 38 story stages (mainland, isles, post-game). `LOSE=1 node tools/advstory.mjs ...` loses the story battle instead and prints where the hero ends up and the spawn: every mainland and island story loss sends you to the spawn with the beat still waiting (no soft-lock).
- **R732 (C3):** WAVE RIDER's Surfer's Visor had the shop Surf Visor's id (`surfvisor` twice in SHOP_HATS): it is `surfervisor` now and save.js `load()` gives it to saves with `surfHi >= 300`. Island trainers hidden by a flag before you beat them (Petrel, Shag after Morra's Amends) no longer count in the island trainers row. The ferry sets `adv.spawn` to the Berry Center where you land (Port Coral / Seashell), so an island loss doesn't wash you up on the mainland. `tools/giftcount.mjs` (24 mainland boxes, as Records says; boxes are placed by a search from the hero, so the tool starts on an open tile).
- **R733 (C3): lava fishing.** world.js skipped casting on `M.lava` maps, so Cinder Carp and Ember Eel (and a Derby week that picked one) could never be caught and the fish row couldn't reach 100%. Now lava pools take a line (fire critters bite instead of water ones, orange splash), and on the Caldera Rim lava beats the isle reef list. `tools/lavafish.mjs [maps]`.
- **R735 (C3):** the telescope picks a constellation you haven't logged (`tonightConst(day, hash, seen)`, the same one all night via `adv.starsC`), and bottles bring a note you haven't read.
- **R736–R737 (C4): the 100% goal.** Records: a 🏝️ Sunscatter Isles total (the `own` rows now feed `iparts`; new row 'Island gift boxes' of 20) and a 🏅 Grand total = (Clashara % + isles %) / 2, returned as `records().ipc/.tpc`; the ☰ card's chip shows the grand total once `isle_arrive`. `exploreCheck` sets `flags.grand` at 100% (toast) → Pecan's orange ❗ → `grandTour()` (closing scene, Explorer's Crown `grandcrown` with `extra: true`, +50 🍓, fireworks over the lab, `grand_done`). nextGoal leads with the grand lines.
- Also ran clean this session: ch2walk, tower, legends, masters, dashshow, amends, glidechain, pearls, grove, wreck, reefdive, gullclub, islefavours, advcup Coral Cup (from the world, lands back in Port Coral), advcredits isles, `tools/photos.mjs` (all 12 landmark spots reachable). Every gift hat in SHOP_HATS has a grant path (static grep).
- Critiqued: Bouldillo's ❗ (sat on his face → higher for scaled NPCs), Neon's south road (fixed by the camera stop), the ☰ card goal line at 740×360 / 412×915 (a world toast can sit over the card's title for 2 s: left for C5), the Records island rows and totals (412×915), lava fishing (915×412, 412×915), Moonwhal and Dash marks on the atoll.
- **Final checks (~05:20 UTC, production build of 455a104):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors. (A combined build-and-check command hung in `build.sh` once; run `build.sh` with `timeout` in its own step, then the tools.)
- **For C5 (UI pass):** the toast-over-modal overlap above; story dialogs that pass a speaker name label every line with it, even "{hero} got..." lines (grandTour, the Shiny Charm).

## Session C1 (2026-10-24 02:08 UTC →, session_01UPhH5bFT8yNjD2V3aAs9yf): completion run begins; C1 close the open threads
- **Build scripts** (put them in the scratchpad; `S` = scratchpad path):
  - `build.sh`: `git worktree add $S/wt HEAD --detach`, symlink `games/critter-clash/node_modules` into it, `npx vite build --outDir $S/dist --emptyOutDir`, `fuser -k $P/tcp`, then `nohup npx vite preview --outDir $S/dist --port $P --strictPort &`. Run `npm install` first in a fresh container.
  - `wbuild.sh`: the same, but builds the working tree (`cd games/critter-clash; npx vite build --outDir $S/wdist`) so uncommitted edits show up.
  - Run tools in parallel only if they use different ports or don't screenshot: advcup timed out on a screenshot while tapcheck ran at the same time.
- **Checks at start (cdb4994, production build):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- **Undocumented session (session_017gxL5n4uxP1o7uzrkiPXgq, R713–R723, reconstructed from git log):** R713 **Verdelk**, the Grove Elk, Clashara's own legend (leaf, 3 forms, shiny), woken by the Heartseed chain (Picker Fern → Prof. Pecan → Elder Oakley → Gardener Rosa → Mama Squeak; the Grove Crown), boss by the Glowcap Woods pond, `tools/grove.mjs`. R714 the **Gull Fishing Club** on Starfall Atoll (catch of the day, 3 🍓, Gull Club Cap after five), `tools/gullclub.mjs`. R715 the world camera eases up near the north edge so Ember Isle's volcano shows. R716/R718 Verdelk balance (hp 1060, speed 6.5, power 0.97). R717 the **Sunken Wreck** dive spot off Port Coral (after Morra's Amends; Diving Helm), `tools/wreck.mjs`. R719 Pecan news adv31. R720 the Heartseed in the world (Glowcap woods dim after the Chapter 2 finale, shine once it's planted; a young glowing tree by the pond). R721 three single-step island favours, `tools/islefavours.mjs`. R722 **REEF DIVE** (Dive Coach Nami in the wreck; Dive Goggles for 250+), `tools/reefdive.mjs`. R723 (part) a night drawing for WAVE RIDER. That session left no HANDOFF notes and no battle-side edits (src diff: arcade, critters, data, growth, screens, story, style, world, worldmaps).
- **R723 (finished):** Surfer Malia offers a moonlight ride when the windows show night (`w.outPhase === 'night'`; the shack is indoors, so `w.phase` is always 'day' there). Night WAVE RIDER: stars, a crescent moon, the Starfall lighthouse on an islet sweeping its beam, a glowing crater, glowing plankton and spray. +5 🍓 for the first moonlight ride (`A.surfNight` count, `A.surfNightHi`), a 🌙 Records row. `tools/surf.mjs [WxH] [secs] [hour]`.
- **R724: Rainbow Reach at night:** the rainbow turns into a pale silver moonbow and 26 soft star sprites drift low over the islet, twinkling (`this.nearStars`, animated in `update`). `tools/reach.mjs <WxH> 22`.
- **R725: battle crash fix** (see "Note for the user's chat"): mirror cyclone supers.
- **R726: `tools/mapwalk.mjs [WxH] [map,map]`**: every map with an end-game save (every hideFlag/showFlag/edge `need`/cup flag set): BFS from the first way in; reports unreachable doors (tile in front), open edges, and edge tiles that land on a blocked tile on the next map. All 25 maps clean (the grotto's north exit is behind the boulder puzzle, listed in `PUZZLE`). Needs `window.__maps` (world.js).
- **R727:** nextGoal's post-game list adds the Deep Grotto chest and the Sunken Wreck before the final line.
- **R728: `tools/mainwalk.mjs [WxH]`**: the Chapter 1 route/gate check (ch2walk's twin): Dash's Route 1 trigger (row 6, story.js, not a blocker), Bouldillo (trial_strength), the brambles (trial_friendship), the Stone Sage (trial_wisdom), every mainland stadium door, Frostpeak → Champion's Peak. All good. Steps take an edge letter as from/to (the first open tile on that edge).
- **R729–R730: balance.** Full `robin.mjs 1` (28 critters, 378 matches, no crash after R725): Woolt 69%, Pengsicle/Whirlwhisk 61%, most 44–59%, Squeakwing 41%, Smokeshell 37%, Blowfin/Pumicub 35%, Skimray 30%. Changes: Woolt power 0.93; Smokeshell hp 1180 power 1.12; Blowfin power 1.27; Pumicub hp 1340; Skimray hp 1080 power 1.06. Focused re-run: Woolt 50%, Smokeshell 44%, Blowfin 44%, Skimray 43%, Pumicub 69% → power 1.25 (R730, **not re-measured: run `PORT=5181 node tools/robin.mjs 1 pumicub` first**).
- Also ran clean this session: advload (245 fresh loads), advtrial, advgauntlet, ch2walk, tower, reach (day/night), surf (day/night), advstory Pecan intro.
- **Final checks (production build of 1896524, R729; R730 is one stat):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- Critiqued: night WAVE RIDER at 915×412 / 740×360 / 412×915 (lighthouse was hidden under the sea → moved onto an islet; flat crater glow → a radial glow), Rainbow Reach night at all three sizes (stars too faint → bigger and brighter), the Tower hall (banners grey before any rank; small but fine).
- **Late in the session (03:15–03:40; a worker restart at ~03:25):** the whole mainland story played through in order with advstory/advcup/advtrial, no errors, ending with `crowned,ending` (the exact commands are in ROADMAP.md C2 status). Dash's Thunder Stadium door ambush fires unless `rival2` is set (by design).
- **Next (C2):** ❗ marks and nextGoal per stage; a mid-beat map-leave soft-lock hunt. Context note: screenshots cost a lot; C1 wrapped at ~210k.

## Session 18d (2026-10-21 23:40–~00:50 UTC, session_01JkygnyfnFio7oFRNAVRJbS): M4 finished, post-game content, R701–R712
- Build/serve as in 18b/18c: the scratchpad `build.sh` (`P=<port>`: git worktree of HEAD → `vite build` → `vite preview` on that port). npm works; run `npm install` first in a fresh container.
- **Checks at start (75a18c4):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors. **Robin** (`robin.mjs 1 moonwhal`): 69% → R701 power 0.91 → 71% → R705 hp 920 / speed 6.0 / power 0.9 → **63%** (in range now).
- **R701 (M4): the Rival Showdown.** After the Sunstone, Dash waits on Starfall Atoll (`dash_b`, `story 'dashshow'` → `dashShow()`): one battle at full strength (his shiny rival critter at hero level +5, diff 0.95, +15 🍓, flag `dash_show`), then **Dash's Headband** on the next talk, then a daily island rematch (hero +4, diff 0.9, +4 🍓, flag `dashisle_<day>`). `tools/dashshow.mjs [wins] [WxH]` (also screenshots the Champ tab).
- **R702 (M4): Journal 🏆 Champ tab** (appears after the Sunstone): Battle Tower streak/best/total and the rank ladder with hats, this week's Sunscatter Masters (4 rows), this week's Peak Gauntlet, the two legendaries (where to find them), the Critterdex and Shiny Charm (R710), the Rival Showdown and today's rematch. Fits 740×360 and 412×915 (six tabs).
- **R703 (M4):** Prof. Pecan's legend lore in Sprout Village (a hint for whichever legend is still out there, a shaky-hands reaction when a legend leads), **Pecan news adv30** (Dash's showdown, Gale's new windsock, the Champ page; shows once the hero has Bronze, the glider or a legend). The tools' news lists include adv30. **M4 marked done in ROADMAP.md.**
- **R704: Rainbow Reach** (`reach`, mainland, `hidden`, `extra: true`): a cloud islet above Cloudtop Gardens; the Kite Glider rides a new updraft at Cloudtop's east edge (21,10) (`U.hint`: what the windsock says before you have the glider). A big rainbow over the sky shrine (`M.rainbowArch` → `buildRainbowArch`), Cloud Hermit Cirrus, Sky Ace Altair (Lv 32), Lv 29–32 fliers, **lucky (3× shinies) while it rains on the mainland** (`rainBelow`), a chest with the **Halo Ring** (new 'halo' hat kind). Its trainer, gift boxes and hat don't count towards Clashara % (`extra`). `tools/reach.mjs [WxH] [hour]`.
- **R706:** the Ember Isle volcano moved in and scaled to 0.72 so its crater shows over the palms (portrait; the landscape camera stops at the map edge, so it still can't show there); the Battle Tower counter is navy and gold.
- **R707: WAVE RIDER** (arcade.js `waveRider`): Surfer Malia in Ember Isle's Surf Shack lends her board. Tap to hop rocks, grab shells (some in the air), don't hop into gulls; it speeds up. A daily prize (100/250/450 → 1/2/3 🍓), the **Surfer's Visor** for 300+, Records (best) and a Today row. `tools/surf.mjs [WxH] [secs]` (an auto-hopper; it survives 45 s, so the thresholds were raised).
- **R708: Morra's Amends**, an island hub chain on Starfall Atoll (LOST `amends1–3`; Morra `morra_b` is the giver): diving goggles → Snorkeller Pia (Port Coral), a carved walking stick → Old Tutu (Ember Isle), a letter → Keeper Lumi: **a shiny Hootsy** (new LOST field `shiny` on a delivery) and the **Night Watch Cap**. **Records fix:** island favours (chains that start on an island map, followed back through `needs`) get their own 🏝️ row, and Clashara's 'Favours done' counts the 16 mainland ones only (it counted all 25, so island chains lowered Clashara %). `tools/amends.mjs`.
- **R709:** Solmoth's wings use a golden moth texture with a sun eye-spot near each tip (`mothTexture`).
- **R710: the Shiny Charm.** Befriend every critter (27) and Prof. Pecan gives the Shiny Charm (`flags.shinycharm`: shiny wild critters twice as often) and the Critterdex Crown (+30 🍓); he counts down the last six.
- **R711:** Moonwhal has pale-gold star freckles on its cheeks and brow (all forms).
- **R712:** the Battle Tower hall: four rank banners on the back wall (coloured once reached) and two flagpoles by Morra's counter flying the hero's best rank.
- nextGoal's post-game list now runs Tower → glider → Moonwhal → Solmoth → Rival Showdown → Morra's Amends → Rainbow Reach → the final line.
- Critiqued: the Champ tab at all three sizes, Rainbow Reach (day/night; fixed the test clock), the Cloudtop windsock, the Ember Isle volcano (landscape and portrait), the Tower hall, WAVE RIDER at 915×412 / 740×360 / 412×915, both legendaries' forms sheets.
- **Final checks (~00:35–01:00 UTC, production build of 83a801a, R711; R712 is a room-decor change, screenshot-checked):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors; dashshow, reach, surf, amends, ch2walk, masters, tower, legends and glidechain all ran with no errors.
- **Next ideas:** a Rainbow Reach night look (stars close enough to touch?); reformed Gloom Gulls fishing on the atoll after Morra's Amends; a third legendary or a mainland one; WAVE RIDER could get a night version; more island single-step favours; the Tower banners are small from the top-down camera (the flagpoles read better); the Ember Isle volcano can't show in landscape (a camera nudge near the north edge would fix it, but that's camera code). Watch Moonwhal (63%) in the next full robin.

## Session 18c (2026-10-21 22:43–~23:55 UTC, session_01W7Pdfri5qPxnMP2dsnCvLL): M3 finished (glider, hidden areas, pearls), M4 started (Battle Tower, legendaries, Masters), R692–R700
- Build/serve as in 18b, but the scratchpad `build.sh` now takes `P=<port>` (dist per port), so a robin can run on 5182 while screenshots use 5181.
- **Checks at start (e688ef9):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint); advcup Sprout wins 3 and lands back in Bloom Town. **Robin:** Blowfin 46% (fine now), Pumicub 25% → buffed in R695 → 42%.
- **R692 (M3): Hana's Kite Glider**, a quest chain across both regions. `Kitemaker Hana` now stands outside at the south cliff of Breezy Bluffs (`hana_b`, `lost:glidesketch`, needs the Gale Cup; the Kite Loft has Apprentice Nalu instead) → glider sketch to **Kite Flyer Gale** (Cloudtop) → `glidesail`: cloud silk to **Tinker Volt** (Neon) → `glidewing`: the wing back to Hana → `flags.glider` (+20 🍓, a Power Snack, Glider Goggles). New LOST fields: `from` (a link given by someone whose own story is something else; `chainFor(npc)` in story.js routes their talk and shows the ❗), `key` (a flag set on delivery), `later: [flag, lines]` (what the giver says once that flag is set). **Updrafts** (`M.updrafts: [{ x, y, to, tx, ty, dir, name, back?, hot? }]`, `buildUpdrafts`, `updraftTalk`, `gliderMesh`): a striped windsock and rising swirls; with the glider the hero lifts off under a red delta wing and the view fades to the target map. **Windcrest Stack** (`stack`, hidden: no Town Map node): seabird nests (`M.nests`), Birdkeeper Ama, Lv 27–30 fliers, and a big nest (`chest.nest`) whose shimmering egg hatches a **shiny Skimray** (unlock + `save.shinies`). `tools/glidechain.mjs` plays the whole chain and both glides.
- **R693 (M3):** a volcano thermal by the Ember Isle path (19,1) lifts the hero to the hidden **Caldera Rim** (`rim`: a lava lake, vents, Volcanologist Ash, Lv 28–31 fire critters, a chest with the **Obsidian Helm**; `chest.hatLine`). Thermals have orange swirls and grey ash puffs.
- **R694 (M3): hidden pearls.** `M.pearl: [x, y]` on all ten island maps (coral, palmpath, bluffs, ashtrail, ember_isle, atoll, grotto, grotto2, stack, rim): invisible until the hero is near (a twinkle within 3 steps, the pink shell at 1), walk over it to pick it up (+2 🍓; flag `pearl_<map>`); all ten → **Pearl Circlet** + 20 🍓. Records row. `tools/pearls.mjs` checks each is reachable from its map's entrance (one first landed on a berry-bush tile).
- **R695 (M4): the Battle Tower.** After the finale the Gloom Gull hideout on Starfall Atoll becomes the Battle Tower (`after: { flag, ...fields }` on a building swaps its look/label once a flag is set; `battleTower()` adds a round stone tower with battlements, banner and flag). Inside: a new `tower` room (counter, long rug, fan tables); interior NPCs can take an 8th `need` flag ('!flag' = until) and a 9th extra-fields object. **Tower Master Morra** (`story 'tower'` → `tower()` in story.js): win streaks against Tower Aces (a shuffled critter order per streak, `towerFoe(run, n, hero)`; Lv = hero + 1 + streak/4; difficulty 0.76 + 0.008 per win), every 7th battle is Morra and her shiny Skimray; the streak waits while you rest and ends on a loss (`save.adv.tower = { streak, best, run, wins, pending }`, the win comes back as `flags.tower_win`). Ranks (`TOWER_RANKS`): Bronze 7 (Tower Cap +10 🍓), Silver 14 (Silver Laurel +15), Gold 21 (Tower Crown, a new 'crown' hat kind, +20), Legend 35 (Morra's Tricorn +30); each sets `flags.tower_<rank>`. Records rows. `tools/tower.mjs [wins]`.
- **R696 (M4): two legendaries** (data.js `legend: true`, `isle: true`): **Solmoth** (fire, Dawn Moth: Emberfly-style wings at `wingMul: 2.1`, a small sun ruff; forms Solarwing, Heliomoth; Sunflare Swoop / Daybreak = `swoop`/`supernova`) rests on the Caldera Rim once the Sunstone Festival is done (`festlamp_done`); **Moonwhal** (water, Moonlight Narwhal: a new forward ivory `narhorn` part, a moon pearl; forms Lunawhal, Tidemoon; Moonlit Glide / Moon Tide = `iceslide`/`whirlpool`) dozes off the Starfall beach once you reach Bronze in the Tower (Morra tells you about the singing), and only battles at night. Boss fights Lv 36, diff 0.92, `recruit: true` (`legend()` in story.js, `LEGENDS`). `tools/legends.mjs`.
- **R697:** Pecan news **adv29** (Tower, glider, legends, pearls; the tools' news lists include it); the post-game goal line walks through the Tower → glider → Moonwhal → Solmoth.
- **R698:** '★ Legendary' tag on the critter info card; Gloom Gulls wear dark bandanas, Morra a tricorn (shiny in the Tower hall), Hana goggles, Ash a helmet, Ama a sun hat; Moonwhal nerf.
- **R699:** Moonwhal stats in line with the other `iceslide`/`whirlpool` critters (hp 1000, speed 6.2, power 0.97, weight 1.05) after robins at 90% and 88%. Robin (1 rep, focused): Solmoth 44%; Moonwhal 90% → 88% → 67% → power 0.97 → 0.94 (**not re-measured: run `PORT=5181 node tools/robin.mjs 1 moonwhal` first next session**).
- Critiqued: Windcrest Stack (day/night, 915×412, 740×360, 412×915), the glide lift-off, the Bluffs updraft, the Caldera Rim (fixed: one tiny grass patch piled every wild critter together, now three patches) and the Ember Isle thermal (moved out from under the palm border), the hidden pearl at 412×915, the Battle Tower outside (portrait shows it best) and inside (fixed: it was a plain house room, now its own hall), the two legendaries' forms sheet (fixed: Solmoth read as a sun-lion with tiny wings; Moonwhal's horn pointed straight up), Quick Battle select and the Critterdex at 740×360.
- **R700 (M4): the weekly Sunscatter Masters** (`marina_c`, Champion Marina outside Coral Stadium once the Sunstone is home; `masters()` in story.js, `MASTERS`): Marina, Zephyra, Magda and Morra in a row with shiny critters at hero level +3…+6 (diff 0.88–0.94), wins saved per week (`mast_<week>_<i>`), 10 🍓 a week, the Champion's Lei on the first clear, Records row, `tools/masters.mjs`. **Harder island rematches:** after the finale, island trainers' daily rematches come at hero level +3 with diff 0.8 and pay 2 🍓 (world.js talk, rematch branch only).
- **Final checks (~23:40 UTC, production build of bda6279):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors; glidechain, pearls, tower, legends, masters and ch2walk all ran clean during the session.
- **Next (M4, then polish):** re-measure Moonwhal; M4 is close to done: consider a harder Dash finale (a post-game Dash rematch on the atoll with a full-strength rival), a Tower Journal page (best streak, ranks, Masters weeks), mainland legend hints (Pecan or the Professor's lab mentioning Solmoth/Moonwhal), and an `advcup`-style check for the Masters. Then mark M4 done and ask nothing: keep adding content (more island side quests, a third hidden area for the glider, e.g. a cloud islet off Cloudtop on the mainland). Polish ideas: Moonwhal could get star freckles; Solmoth's wings use the generic iridescent texture (a sun-eye pattern would read more moth-like); the Ember Isle volcano is still hidden behind palms in landscape; the Tower counter is the Berry Center pink.

## Session 18b (2026-10-21 21:18–~22:45 UTC): M2 finished (Breezy Bluffs to the Chapter 2 finale), M3 started, R681–R690
- **npm works again in this sandbox**, so checks use the normal production build: `build.sh` in the scratchpad does `git worktree add <scratch>/wt HEAD --detach`, symlinks node_modules, `npx vite build --outDir <scratch>/dist`, then `npx vite preview --outDir <scratch>/dist --port 5181`. (Don't put the words "vite preview" in a `pkill -f` inside the same shell command line: it kills the shell itself.)
- **Checks at start (3c65844):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town. **Robin** (`robin.mjs 1 blowfin,pumicub`): Pumicub 44%, Blowfin 38% → Blowfin got a small third buff in R682 (not re-measured).
- **R681: Breezy Bluffs** (`bluffs`): a cliff-top town over the sea (grey rocky rim), Gale Stadium, Berry Center, the Kite Loft (Kitemaker Hana), three white windmills with turning sails (`M.windmills` → `buildWindmills`), kite kids whose kites swoop overhead on a line (`kite: color` on an NPC → `buildKites`), wild Toucharge/Skimray/Whirlwhisk/Squeakwing/Mossloth Lv 21–24, Birdwatcher Lani and Paraglider Koa. Palm Path's rope bridge opens after the Coral Cup (Bridge Crew Bo steps aside). Arrival beat, post-Gale beat (Zephyra).
- **R682: the Ash Trail** (`ashtrail`: steam vents, ash-grey grass; Hiker Kale, Gloom Gull Tern) **and Ember Isle** (`ember_isle`: Caldera Stadium, black sand beach, a smoking volcano behind the town `M.volcano` → `buildBigVolcano`, Surf Shack, Volcano Lab, Old Tutu). Trail Ranger Ono holds the trail until the Gale Cup; then **Gloom Gull Skua** (story fight Lv 23, flag `skua_b`) guards it. Post-Caldera beat (Magda). advload covers the island maps.
- **R683: Starfall Atoll and the finale** (`atoll`): the ferry now sails Port Coral ⇄ Starfall once all three island cups are won (Captain Gill on the atoll pier too). Gloom Gull hideout, Petrel and Shag, Dash (who lost to Morra), **Captain Morra** (shiny Skimray Lv 28, flag `morra`) at the lighthouse door. After the win: the Sunstone goes home (`sunstone`), the striped lighthouse lights up (`M.lighthouse` → `buildLighthouse`: glowing lamp, two sweeping beams after dark), Keeper Lumi and a reformed Morra stay on, Sunstone Circlet hat.
- **R684:** four reef fish (`FISH.isle`: Parrotfin, Coral Puff, Reef Tang, rare Starfall Marlin; the derby stays mainland), four island landmark photos (`isle: true`; all four = +15 🍓; the Shutterbug Cap still needs the eight mainland ones), Town Map ferry line Coral ⇄ Starfall, Pecan news **adv28**.
- **R685: Chapter 2 credits** (`w.credits(done, true)`: a postcard tour Coral → Bluffs → Ember Isle → Starfall, island cast only; the mainland credits now list mainland folk only). Shell Hats stall wears a straw boater sign. `advcredits.mjs 915x412 isles`.
- **R686:** Dash's Ember Isle battle (Lv 25, `dash_isle2`), a 🏝️ Sunscatter Isles section in Journal Records (island cups, trainers, hats, reef fish, landmarks, the Sunstone, ferry rides; it doesn't count towards Clashara's %), island digs (Smokeshell hermit crabs instead of Diggles; Ember Isle digs in its black sand).
- **R687: `tools/ch2walk.mjs`** checks every Chapter 2 route and gate by BFS (bridge shut/open, Ono, Skua, Ash Trail, stadium doors, Morra). **M2 marked done.** advcup passes for all three island cups (`node tools/advcup.mjs 915x412 bluffs 12 6 <flags>`, `... ember_isle 7 6 <flags>`).
- **R688 (M3): the Ember Grotto** (`grotto`, a cave north of the Ash Trail's cave mouth `M.mouth`): `M.cave` maps get tall crag walls, a rock border, glowing crystals and the hero's pool of light. **Puzzles:** `boulders` (push one tile per shove; the hero follows), `pits` (a boulder fills a pit; `pitFlag` remembers), `plates`/`gates` (a boulder on the plate sinks the gate; `gateFlag`). Stuck? Leaving the map resets the boulders. **The Deep Grotto** (`grotto2`, `M.dark`: a warm lantern light) needs the **Sun Lantern** (`lantern`, from Keeper Lumi after the finale; edge `need`/`needSay`). Its treasure chest (`M.chest`) gives 20 🍓 and the Spelunker Cap.
- **R689 (M3): the Sunstone Festival quest chain** (LOST entries with `needs`: Iona's kite frame → Leilani → her volcano silk → Shelly → her kite lantern → Keeper Lumi): Festival Lantern Hat, +25 🍓, a Power Snack, and paper lanterns circling the lighthouse every night. Talking to someone you carry a parcel for now delivers it before their own story starts (quest-chain links are both recipients and givers). `questReady(id)` hides the ❗ until the link before is done.
- **R691:** narrower, softer lighthouse beams.
- **R690 (M3): rare finds:** starry nights on Starfall Atoll triple the shiny chance (toast), island rain brings Blowfin swarms, golden hour on the Bluffs brings gliding Skimrays.
- **Final checks (~22:40 UTC, production build of e0f30ea):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint); advcup Sprout wins 3 and lands back in Bloom Town; ch2walk all good; advload 240 fresh loads, 0 problems.
- Critiqued: Breezy Bluffs (day/evening, all three sizes), windmills and kites, the Ash Trail and its cave mouth, Ember Isle (day/night, portrait volcano), Starfall Atoll (dark and lit, the finale), the isles Town Map at 740×360, Journal fish/records, the Chapter 2 credits, the Ember/Deep Grotto (fixed: night rim light made the crags look like broken glass; now a dim cave mood with matte crags), the festival lanterns.
- **Next (M3, then M4):** a hidden area reached by a new field skill or story item (e.g. a sea cave behind the Port Coral reef reached with a Blowfin "dive", or a ledge on the Bluffs reached by gliding with Skimray), a second quest chain on the mainland or one that crosses both regions (reward: a rare critter or key item), more hidden items. Then M4: the Battle Tower, two legendaries, harder rematches. Polish ideas: the Ember Isle volcano is hidden behind palms in landscape (only portrait shows it well; moving it east of the island did not help with the steep camera, so it needs a smaller cone inside the map or a lower north wall); Gloom Gull NPCs could wear a dark bandana; re-measure Blowfin. (R691 narrowed the lighthouse beams.)

## Session 18a (2026-10-21 16:49–~18:20 UTC): the new 48-hour run begins; M1 new critters, M2 Port Coral, R672–R680
- Set the new run's end time: **2026-10-23 16:49 UTC**.
- **Sandbox note: the npm registry was blocked this session** (403 / DNS fail), so `npm install` and `vite build` could not run. Checks ran against a static snapshot server instead, which has no HMR either, so it is equivalent for the checks: `/home/claude/devserver.mjs` (serves the game, rewrites `three` imports to a sparse clone of three.js r170 from GitHub in `/home/claude/vendor/three`, fonts from a sparse clone of fontsource/font-files, stubs `@capacitor/*`), and `/home/claude/snap.sh` (copies index.html, src and public to `/home/claude/snap` and serves it on port 5181). If npm works next time, use the normal `vite build` + `vite preview` route. The CI APK build is unaffected (it runs npm in GitHub Actions). `tools/eval.mjs` and `tools/evalm.mjs` now honour `PORT`.
- **Checks at start (snapshot of 536e563):** tapcheck 740×360 / 412×915 clean (only the expected rotate hint over the portrait pause menu); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- **R672: six new critters** for the Sunscatter Isles (data.js `isle: true`): Smokeshell (fire, Volcano Hermit Crab: a volcano shell with a lava spiral and glowing crater, feelers, pincers), Blowfin (water, Puffer Fish: head and body spines, pouty lips, fins for arms), Mossloth (leaf, Moss Sloth: sloth face patches, moss cape, hibiscus, long clawed arms), Toucharge (spark, Thunder Toucan: a huge banana beak, owl-style wings), Pumicub (stone, Pumice Bear Cub: dark pores with a few glowing ones, ash puff, snout), Skimray (gust, Breeze Manta: flat head, cephalic fins, wing-fin arms that flap, whip tail). New parts in critters.js (`extra`: hermit, puffer, sloth, toucan, pumice, manta; `tail: 'whip'`). Specials (fighter.js): Lava Burst (three marching ground bursts), Puff Up (spike jab, then a pop shove), Lazy Lariat (a spinning multi-hit drift), Beak Beam (a long straight paralysing bolt), Pumice Pound (a hop that lands with a stony slam), Skim Loop (a wide loop that cuts back through the rival). Growth forms (growth.js, `bodyMul` + existing parts): Smokestack/Calderon, Spinyfin/Bloatide, Fernsloth/Jungloth, Toucannon/Thundercan, Pumiursa/Basaltursa, Galeray/Monsoonray. Shinies, MOVE_DESC, LINES. `tools/forms.mjs` renders them.
- **R673: Chapter 2 scaffolding.** `ISLE_CUPS` (Coral, Gale, Caldera; Lv 20–27 trainers, boss Marina / Zephyra / Magda) + `ALL_CUPS()` + `cupById()` (interiors.js, story.js and world.js look cups up by id now). The **Sunny Gull ferry**: Captain Gill on a new north-south pier in Seashell Town (`M.ferry` → `buildFerry`, a bobbing red-and-white boat); before the ending he says only Champions sail; after it, `story 'ferry'` asks and fades to Port Coral (and back). **Port Coral** (`coral`: pink sand `palette.sand/sand2`, turquoise water, `reef: true` coral clusters in the shallows, Coral Stadium, Berry Center, Shell Hats, cottage, Dockhand Shelly, Snorkeller Pia, Mossloth) and **Palm Path** (`palmpath`: wild Mossloth/Blowfin/Skimray/Pumicub/Lilypop Lv 19–22, Surfer Tiko and Hiker Moana, a lagoon with a bridge; Bridge Crew Bo blocks the east end until Breezy Bluffs exists). Arrival beat (`isle_arrive`, Captain Gill explains the three cups and the Gloom Gulls), Dash's island battle (`dash_isle1`, Lv 22). Vertical piers get planks across and rails down the sides. The THE END card now hints at the ferry. **advcup on the Coral Cup** (`node tools/advcup.mjs 915x412 coral 7 6 crowned,ending,isle_arrive`): wins 4 and lands back in Port Coral, no errors.
- **R674:** the isles Town Map (title "Sunscatter Isles", its own islands, palm/shell/kite/volcano/lighthouse marks, a ferry icon; nodes appear as their maps exist; flying stays inside the isles); mainland-only marks (Gauntlet, bottle, stars) are hidden there. `nextGoal` points Champions to the ferry and then to the next island cup.
- **R675:** Port Coral rooms (interiors.js PEOPLE): the Shell Hats stall (Shellkeeper Sandy, a Toucharge) sells four island hats (`isle: true` in SHOP_HATS: Straw Boater, Hibiscus Crown, Captain's Cap, Surf Visor; Milliner Mo's stock is unchanged), a Berry Center visitor, Grandma Kalani's cottage. First balance pass.
- **R676:** no autumn colours, leaf piles or sunflowers on `isle` maps; Palm Path gets a palm border; night jellies over the reef; Marina's post-Coral-Cup beat (`post_coral`).
- **R677:** Pecan news **adv27** (the six critters; the ferry for Champions; try them in Quick Battle). Tools' news lists include it.
- **R678:** signature intro and victory animations for the six (personality.js INTRO/WIN).
- **R679:** the Match/Sparring Setup rival grid fits 26 critters in two rows at 740×360 (tapcheck had flagged the arena buttons under the footer).
- **R680:** second buff for Blowfin and Pumicub. Robin (1 rep, focused, Lv 10): first pass Toucharge 63%, Smokeshell 56%, Skimray 44%, Mossloth 38%, Pumicub 23%, Blowfin 17%; after R675's buffs Mossloth 52%, Toucharge 52%, Blowfin 27%, Pumicub 27%. **R680's bigger buffs are not measured yet.**
- **Final checks (~18:15 UTC):** tapcheck 740×360 clean (after R679) and 412×915 clean (only the expected rotate hint); advcup Sprout wins 3 and lands back in Bloom Town, no errors.
- Critiqued: the six base critters and their stage 3 forms (front sheet), battles at 915×412, Port Coral (day/night) and Palm Path at 915×412, 740×360 (touch) and 412×915, the Seashell pier and ferry, the ferry ride and Dash's talk, the isles Town Map at 740×360, the Shell Hats stall and cottage, Match Setup.
- **Next (M2):** re-measure Blowfin/Pumicub; build **Breezy Bluffs** (cliff town, windmills, kites; Gale Cup; Toucharge and Skimray in its grass) and open Palm Path's east edge to it (remove Bridge Crew Bo or move him), then the **Ash Trail** and **Ember Isle** (black sand `palette.sand`, steam vents; Caldera Cup; Smokeshell, Pumicub), then **Starfall Atoll** (lighthouse; the Gloom Gulls and Captain Morra finale; the Sunstone), Chapter 2 credits, Journal Records/Today rows, island fish, landmark photos, dig spots, Berry Center visitors, and an `advcup` for the Gale Cup. The Smokeshell shell reads a little dark from the back; Toucharge reads as a penguin from behind (a crest or tail tuft might help).

## Critique backlog (known issues)
- The user hasn't yet confirmed the Round 32 character-pick fix on their phone. If they reply, prioritise whatever they report.
- (Fixed in R132.) A re-measure robin at 04:10 (production build of cccf6e6) died with `page.evaluate: TypeError: Cannot read properties of null (reading 'critter')` somewhere after 141+ matches. Only data.js stats changed since the previous clean full run, so it's a rare existing race. Unconfirmed guess: robin starts the next battle at once while the previous battle's `onEnd` → `screens.results()` timer (900 ms) fires mid-battle. A player can't start a battle that fast. Run robin against the dev server (port 5180) to get an unminified stack trace, and make robin call `__game.endBattle()` and wait 1 s between matches if the guess is right.
- Native photo Save/Share (Round 27) is untested on a real phone.
- Haptics (Round 72) are untested on a real phone.
- Full run at 05:40 (session 11, all 19 critters, 1 rep = 36 games each, no errors): Emberfly 67%, Bubbalotl 64%, Pebblepup and Snoozlo 61%, most 44–58%, Kindlekit 39%, Pengsicle 33%, Jiggawatt 25%, Squeakwing 22%. 1-rep runs swing ±15% (Pengsicle was 56% and Emberfly 41% in the previous run), so only buff critters that are low run after run: Squeakwing (21/44/38/22%) and Jiggawatt (38/25%) got buffs in R145.
- Full run at 04:45 (session 11, 18 critters, 1 rep): Pebblepup/Whirlwhisk/Lilypop/Kindlekit 62%, Voltferret/Diggles 59%, most 38–56%, Bubbalotl 35%, Pricklepuff 24% (both buffed in R137). Run a full `tools/robin.mjs 1` with all 19 next.
- Older: last full balance run (04:04, 18 critters, 1 rep = 34 games each): Voltferret, Pengsicle and Lilypop 68%, Pebblepup and Kindlekit 62%, most others 41–53%, Bubbalotl and Hootsy 35%, Squeakwing 21% (a focused run just before said 44%, so the sample is noisy). Small tweaks followed (top three power -0.02/-0.03, Bubbalotl/Hootsy/Squeakwing buffs) but were not re-measured. Re-run `tools/robin.mjs 2` first.
- (Done in camp.js.) The Sky Cup outro promises a picnic; Camp could have a sky-themed reward (e.g. a balloon prop) for clearing it.
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
   - 48-hour prompt (verbatim; pass it to create_session exactly as below, without the fence; its "currently 17:12" is the user's wording, the real end time is the one at the top of this file). Updated by session 17i: newest sections are Session 17, R532 next, and it handles the lineage depth limit (a hand-started session can chain about 8 deep):
```
Continue building Critter Clash in a 48-hour chained build run. The goal is to keep developing the game until it's complete, at AAA quality.
Start: run date -u. The run's end time is at the top of games/critter-clash/HANDOFF.md ("48-hour run", currently 2026-10-20 17:12 UTC). Never reset it. If that time has already passed, do the Finish steps below. Post a one-line status to me when you start.
Read first: games/critter-clash/CONTINUE.md, then games/critter-clash/HANDOFF.md. Begin with the newest "Session 17" sections (17h, 17i, and any later ones) and their "Next ideas" lists.
Focus: move the game toward a finished product. That means Adventure mode content and polish, finishing loose ends from the backlog and "Next ideas", bug fixes, performance, balance, menus and UI polish. All creatures stay original. Each round: take screenshots at 915x412, 740x360 and 412x915 (tools/advtour.mjs takes many world shots in one page load; MOBILE=1 forces the touch UI in landscape), critique them, then improve. Do round after round.
Git: commit and push each round to branch ccr-4fc93d6e-suxlhd. Before every push, run git fetch origin ccr-4fc93d6e-suxlhd && git merge --no-edit origin/ccr-4fc93d6e-suxlhd. Never rebase or force-push. If the local clone starts on stale history, reset it to origin/ccr-4fc93d6e-suxlhd. Round numbers continue from the highest R-number in git log (R532 next).
Ownership: my own chat also works on this branch and owns the Adventure battles, results and the flow back to the world: screens.js results/worldFight, battle.js, arena.js open mode and hud.js. Keep world work in world.js, worldmaps.js, interiors.js and story.js unless HANDOFF.md says otherwise.
Checks: run tapcheck at 740x360 and 412x915, plus an advcup Sprout run, at the start and near the end of each session. Run them against a production build (HANDOFF.md "48-hour run" explains how), not the dev server.
Chaining: each session builds for about 100 minutes, or less if context nears 300k. Then follow the HANDOFF "Chaining" steps:
Update HANDOFF.md and CONTINUE.md with the rounds done, the next ideas and the 48-hour end time.
Commit and push.
Fetch the APK built from your last commit and send it to me.
Call create_session with source_url https://github.com/zchillsounds-debug/super-chainsaw1, source_revision and outcome_branch ccr-4fc93d6e-suxlhd, and this same prompt word for word. Then tell me in one line that the next session has started.
If create_session refuses because of the session lineage depth limit, don't retry. Note it in HANDOFF.md, push, and tell me in one line to start the next session by hand with this same prompt.
If a worker stalls, push the end time back by the length of the stall.
Finish: at the 48-hour end time, send the final APK, update HANDOFF.md and CONTINUE.md, and stop with a short summary. Don't chain after that.
I approve this plan and continuous building, so don't stop to ask me questions. Make sensible calls and keep going.
```
Continue building Critter Clash in a 48-hour chained build run. The goal is to keep developing the game until it's complete, at AAA quality.
Start: run date -u. If HANDOFF.md doesn't already have a "48-hour run" end time, set one: now + 48 hours. Write it at the top of HANDOFF.md, then commit and push. Later sessions read that end time from HANDOFF.md and don't reset it. Post a one-line status to me when you start.
Read first: games/critter-clash/CONTINUE.md, then games/critter-clash/HANDOFF.md fully. Begin with the newest "Session 16" sections (16i, 16j) and their "Next ideas" lists.
Focus: move the game toward a finished product. That means Adventure mode content and polish, finishing loose ends from the backlog and "Next ideas", bug fixes, performance, balance, menus and UI polish. All creatures stay original. Each round: take screenshots at 915x412, 740x360 and 412x915 (tools/advtour.mjs takes many world shots in one page load), critique them, then improve. Do round after round.
Git: commit and push each round to branch ccr-4fc93d6e-suxlhd. Before every push, run git fetch origin ccr-4fc93d6e-suxlhd && git merge --no-edit origin/ccr-4fc93d6e-suxlhd. Never rebase or force-push. If the local clone starts on stale history, reset it to origin/ccr-4fc93d6e-suxlhd. Round numbers continue from the highest R-number in git log (R368 next).
Ownership: my own chat also works on this branch and owns the Adventure battles, results and the flow back to the world: screens.js results/worldFight, battle.js, arena.js open mode and hud.js. Keep world work in world.js, worldmaps.js, interiors.js and story.js unless HANDOFF.md says otherwise.
Checks: run tapcheck at 740x360 and 412x915, plus an advcup Sprout run, at the start and near the end of each session.
Chaining: each session builds for about 100 minutes, or less if context nears 300k. Then follow the HANDOFF "Chaining" steps:
Update HANDOFF.md and CONTINUE.md with the rounds done, the next ideas and the 48-hour end time.
Commit and push.
Fetch the APK built from your last commit and send it to me.
Call create_session with source_url https://github.com/zchillsounds-debug/super-chainsaw1, source_revision and outcome_branch ccr-4fc93d6e-suxlhd, and this same prompt word for word. Then tell me in one line that the next session has started.
If a worker stalls, push the end time back by the length of the stall.
Finish: at the 48-hour end time, send the final APK, update HANDOFF.md and CONTINUE.md, and stop with a short summary. Don't chain after that.
I approve this plan and continuous building, so don't stop to ask me questions. Make sensible calls and keep going.
```
   - **New run (from session 18a): chain with the user's Chapter 2 prompt word for word** (it begins "Continue building Critter Clash in a new 48-hour chained build run, following games/critter-clash/ROADMAP.md"); the end time is the "New 48-hour run end time" line at the top of this file. **Session 18a could NOT chain: this chat has no create_session tool at all** (not even after a tool search), so the user starts the next session by hand with the same prompt; it continues at R681.
   - Session 17q chained at R655 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17p chained at R637 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17o chained at R629 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17n chained at R615 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17m chained at R605 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17l chained at R586 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17k chained at R559 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17j (started by hand) chained at R543 with the 48-hour prompt word for word (if create_session refused, see the line added below).
   - Session 17i could NOT chain: create_session refused ('lineage depth 8, limit 8'; no setting changes it). The user has to start the next session by hand with the 48-hour prompt above. The next session it starts is a fresh lineage and can chain again.
   - Session 17h chained at R514 with the 48-hour prompt word for word.
   - Session 17g chained at R489 with the 48-hour prompt word for word.
   - Session 17f chained at R468 with the 48-hour prompt word for word.
   - Session 17e chained at R446 with the 48-hour prompt word for word.
   - Session 17d chained at R429 with the 48-hour prompt word for word.
   - Session 16j did not chain: the user's window ended at about 10:45 UTC on 2026-10-18.
   - Session 16i chained to the next session at R359 with the same prompt (end ~10:45 UTC on 2026-10-18).
   - Session 16h chained to the next session at R339 with the same prompt (end ~10:45 UTC on 2026-10-18).
   - Session 16f chain prompt: the user's own prompt (read CONTINUE.md and HANDOFF.md, Session 16–16f; Adventure polish and new content; critique at 915x412, 740x360 and 412x915; commit and push each round to ccr-4fc93d6e-suxlhd, merging origin first; never rebase or force-push; the user's chat owns screens.js results/worldFight, battle.js, arena.js open mode and hud.js; keep world work in world.js, worldmaps.js, interiors.js and story.js), with the next round number, the remaining time and the end time.
   - `prompt` (session 16 chain): "Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it. Start with the "Session 16: ADVENTURE MODE", "Session 16b" and "Session 16c" sections. Focus: Adventure mode polish (see Session 16c → Next ideas, and keep critiquing screenshots). Run the critique loop (screenshot, critique, improve) round after round. Commit and push each round to branch ccr-4fc93d6e-suxlhd: merge origin first, and never force-push. Round numbering continues from R<next>. The user asked for 5 hours in total, until about 04:45 UTC on 2026-10-15. Chain to a fresh session about every 2 hours or near 300k context, following the HANDOFF chaining steps (use this same prompt, updating the round number). Send the user the APK at the end of each session. At 04:45 UTC, send the final APK, update HANDOFF.md, and stop with a short summary. The user approved this plan and continuous building, so don't stop to ask questions. Post a one-line status to the user when you start."
   - older prompt (sessions 14–15): "Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it. Focus: modes & polish. Run the critique loop round after round, and commit and push each round to branch ccr-4fc93d6e-suxlhd (merge origin first, never force-push). The user asked for about 2 hours (until ~22:25 UTC on 2026-10-14) and to chain to a new chat near 300k context. At the end of the time, send the final APK, update HANDOFF.md, and stop with a short summary unless the user asks for more. Post a one-line status to the user when you start."
5. Tell the user in one short message what was done and that the next session has started.
