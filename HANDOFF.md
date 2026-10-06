# Madinat al-Salam: Handoff (Round 29 shipped; APK signing waits on the user's secrets)

## Paste this into the new chat
> I'm continuing a game project called **Madinat al-Salam**: a Diablo-style 3D ARPG in Three.js, set on the outskirts of Abbasid Baghdad just after the siege of 813 CE. The code is on branch `ccr-59dadb04-xy78e6` of zchillsounds-debug/super-chainsaw1. Round 29 (APK signing fix and save backup, four new troops, five side quest chains, the epilogue) is on branch `claude/new-session-9masup`; check its "Status" list below for what is left.
>
> Please:
> 1. Fetch the branch and read HANDOFF.md fully.
> 2. Run `npm install`. When pushing the session branch, `git push -u origin <session-branch>` (a fresh branch carries the earlier rounds' history). Run tests with `shots/withvite.sh node shots/<test>.mjs ...`: it starts vite, runs the test, then stops vite. Run one `withvite.sh` at a time (a second one can't bind the port and loses its server when the first stops). Never edit `src/` while a test runs from the same folder: vite reloads the page and the test dies ("Execution context was destroyed"). Run tests from a copy (see "Test workflow" under Round 27).
> 3. Finish whatever Round 29's "Status" list says is left, then ask me about Round 30 and confirm the plan with me before building.
>
> The goal is AAA mobile quality, with Diablo IV and Diablo Immortal as the bar. Run the critique loop every round (screenshot, critique, improve). I play on Android. When a round is done:
> - Republish the game as a playable Artifact, updating https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (read it first, then publish with `url`). Touch controls must keep working.
> - Push to the session's assigned branch.
> - Send me the APK that CI builds (see "Getting the APK to the user").

## Round 29: APK updates, new troops, side quests, the epilogue
User decisions: side quests, the post-game epilogue and new enemy types (camp props dropped). The user has not played Round 28 on the phone yet. Phones keep **High** quality by default (the user declined a middle default). Build order: APK fix, foes, side quests, epilogue (the epilogue was to be cut first if context ran short; it was not).

**APK installs over the old one (the user's report: every new APK had to be uninstalled first, losing progress):**
- Cause: CI signed each build with a fresh throwaway debug key, and `versionCode` was always 1.
- `apk.yml` now decodes the repo secrets `ANDROID_KEYSTORE_B64` and `ANDROID_KEYSTORE_PASSWORD` into a keystore (`ANDROID_KEYSTORE_FILE`); `android/app/build.gradle` signs the debug build with it (alias `madinat`) when present, and `versionCode` is the CI run number. Without the secrets it falls back to the throwaway key, and the `apk-builds` commit message says "(throwaway key)".
- The key was generated in the session and sent to the user (keystore-base64.txt, password.txt, madinat-release.jks) with steps to add the two secrets. **It is not in the repo.** If the user loses it, a new key means one more uninstall.
- The first install of a fixed-key APK still needs one uninstall (the phone's app has a throwaway key). From then on, updates keep the saves.
- **Settings → Saved game: Back up save / Restore save** (`settings.js` `exportSave`/`importSave`): every `sob.*` localStorage key as one text code (`MAS1:` + base64 JSON). Backup saves first (only while playing, never from the title). Restore sets `window.__noSave` (`saveGame` returns early) and reloads. Test: `shots/r29save.mjs`.

**New troops (`foes29.js`, `TYPES29` merged in `entities.js`, `setupFoes29` in `main.js`; new anim clips `javelin`, `brace`, `tend` in `anim.js`):**
- **Akontistes** (javelin): keeps 7–11 m, throws a javelin with a 0.35 s lead on an arc (a projectile with `jav`, nose-first, stops in the ground), then backs off.
- **Kontaratos** (braced spear; the existing `spearman` is already called Menavlatos, so the user-picked "menavlatos" became this): braces for 1.4 s with a red wedge (4.8 m, ±0.62 rad). Walking in: ×1.4 damage; an evade or dash in: ×2.4 and the evade's invulnerability is cancelled. After the brace he recovers 1.1 s and takes ×1.35 damage.
- **Caltrop Thrower** (`tribolos`): keeps behind his men, throws a marked patch (pooled, 4) that lasts 9 s: slow 0.5 and cuts every 0.5 s (not while evading). `g.caltropsClear29()` on hold reset, exit and dungeon exit.
- **Deputatos** (field surgeon): finds the worst-hurt man under 50% within 16 m, drags him 1.2 s away from Salim, binds him 2.2 s (heal 45%, once per man, `patched`). Any blow on the surgeon breaks it off ("Interrupted").
- Stale wedges and rings are swept each frame (`g.marks29`).
- Placed in every region's `spawnX` (game.js, "Round 29" lines), in the ambush and champion rosters (`encounters25.js`), and below ground: from level 5 one middle room adds a surgeon, caltrop man or kontaratos, and qanats and contracts from level 4 add a javelin man (`zones.js`).
- Test: `shots/r29foes.mjs [region] [out] [spot]`.

**Side quests (`sidequests.js`):** one chain per region, each with a "meet" step (a new step kind: a person out on the land, a conversation scene, optional guard band) and a turn in the story:
- Sawad `seed` (Rifa'a, miller; the thief Sa'd is a burned-out farmer; they end up sowing together).
- Marsh `mashuf` (Khalaf, boat-builder; the boy Dahir took it under threat; Khalaf takes him on).
- Karkh `copper` (Hammad, bath-keeper; the coppersmith Ghalib bought it honestly; drive off his extortioners). **It first landed in the world-events table by mistake; fixed in `f9d3ad5`, needs `r29quests karkh` and `r16test karkh` re-run.**
- Docks `pilot` (Bakr, river pilot; escort the hiding lamplighter Mundhir home through an ambush).
- Hamrin `flock` (Ghaylan, shepherd; the old deserter Niketas kept the sheep alive; escort him to the east road while his company hunts him). Hamrin's first side quest.
- Engine: `meet` steps (`npc()` placed with `freeSpot`, removed with its collider on clear; shows the rig before its scene, since `animateHub` hides people more than 60 m from Salim), escort `who: 'man'` with a `look`, new looks `oldman` and `miller`. `freeSpot` refuses Hamrin rock faces (`hamrinOpen > 0.6`). Mundhir was moved twice to open ground (`[-52, -40]`).
- Tests: `shots/r29quests.mjs <region> [out]` (plays the region's new chain, prints where people and bands land); `r16test` now handles `meet` steps.

**The epilogue (`epilogue29.js`, scene `quaysAtDusk` in `scenes.js`):**
- Once Tatzates has fallen (`p.rival.final`), "Ride home to Baghdad" by the Hamrin camp's south gate, or "Walk the quays at dusk" by Ishaq on the quays, sets `sob.endgame = 'epilogue'` and travels (card "Baghdad, at Dusk").
- `IS_EPILOGUE` (region.js; `?epilogue` forces it): the docks map at dusk, every foe removed each frame, world events off, the tracker leads to Yusuf, Bishr and 'Amr in turn, then Ishaq.
- Farewells follow the camp stories (`s25.camp[k] >= 3`) and the choices (photeinos, marsh, tatzates). Ishaq's scene: the House of Wisdom across the river, the Pages copied seven times, lines for `arsaber: promise` and `ishaq: heard`, "Go home first, and take Jabir's spear", Salim's lamp, the card "The City of Peace", then the victory screen (New Game+).
- State: `s25.said.ep29_<who>` and `ep29_done` (New Game+ clears `said`, so it plays again). `sob.endgame` is cleared after.
- Test: `shots/r29epilogue.mjs [out] [lang]` (`FAST=1` skips the farewells). All lines play, then victory, `done: true`.

**Also:** damage numbers hidden in cutscenes (`body.incine #dmg`). Arabic for all of it in `story29_ar.js` (`AR29`).

**Test notes:** lanes as in Round 28 (`/home/user/wt28` port 5173 and `/home/user/wt28b` port 5174, `lane.sh`, `sweep28.sh`, `sync29.sh`). Syncing a lane while a test runs in it reloads the page and kills the test, even for a change in `shots/` only. A background command is killed after 2 hours; long tests in SwiftShader (the quest and epilogue tests take 10–30 min) should run one per command. Cutscene lines wait for a tap (or 20 s): tests must call `__director.advance()`.

**Status:**
- Built, committed and pushed. Regression sweep clean (34 of 34, rc 0, "errors: none"): r16test ×4 (every old and new quest completes), r29quests ×5, r29foes ×4, r29epilogue, r29save, finaletest sawad and docks, r21holds quarry and rivalhold, r22holds dam and shipyard, r25boss marsh and karkh, r26boss sawad and docks, r26hold quarry and rivalhold, r27hold stockade and hulks boss, r27dungeon marsh, trialtest, r21rift, crafttest, ngtest, traveltest, benchtest. (The shipyard run once hit a page-load timeout with two browsers going, passed on re-run.)
- Artifact version 27 published (1.83 MB; `smoke26.mjs` now waits for `domcontentloaded`, since the font request can hold up `load`).
- APK: CI builds every push. **If the `apk-builds` commit message says "(throwaway key)", the user has not added the secrets yet**: remind them (steps: repo Settings → Secrets and variables → Actions → `ANDROID_KEYSTORE_B64` = keystore-base64.txt, `ANDROID_KEYSTORE_PASSWORD` = password.txt), then re-run `apk.yml` by hand and send that APK. Tell them it needs one last uninstall.

**Round 30 ideas (not approved):** camp props (the sculpted forge, cooking gear, tents, water jars: carried over twice), a device check of Rounds 26–29 on the user's phone, quest markers on the map for meet steps, Arabic voice for the epilogue card.


## Round 28: phone pass and boss moves (shipped)
User decisions: all four areas were chosen (boss moves, camp props, phone fixes, story or content), as a full round. Approved build order: (1) phone pass, (2) boss moves, (3) camp props, (4) side quests, post-game epilogue and new enemy types if context allowed. Items 1 and 2 are done. Items 3 and 4 move to Round 29. The user hadn't played on the phone but ticked frame drops, readability and controls, so the phone pass was done from probes and phone-sized shots.

**Commits:** `82f4ad8` (phone pass), `26c77c4` (boss moves), both on `ccr-59dadb04-xy78e6`.

**Phone pass: frame cost**
- **Shadow proxy (`human.js` `installShadowProxy`, `SHADOW_PROXY`):** the shadow pass draws every crowd rig's far sculpt (about a fifth of the triangles), even when the near one is shown. The renderer's `shadowMap.render` is wrapped to swap the sculpts only for that pass. It is turned off for the load-time warm-up frame (`main.js`), so both sculpts compile their depth programs at load.
- **Outline hull (`outline.js` `LITE`):** on touch devices or Low, the hull under a near crowd sculpt uses the far geometry, pushed out 1.2 cm (`LITE_MATS`, uniform `uOB`, same program). Outline triangles went from 1.67M to 0.36M in the pack probe.
- **Play LOD for hero-class rigs (`human.js` `PLAY_LOD`, `updatePlayLOD`, `build(tier)`):** on a phone, rigs with `detail: 'hi'` (Salim was 199k triangles; also companions, bosses and story people) also get the crowd-tier sculpt and show it in play. They switch back to full detail in cutscenes and the close camera (`main.js`, next to `showOutlines`). Their cloth is not throttled.
- **Cloth (`cloth.js`, `anim.js`):** phones simulate cloth within 12 m (24 m elsewhere) with 2 relax passes (3 elsewhere). `performance.now()` is read once per step (it was called twice per particle, 7% of the update). Far-LOD rigs move their cloth every third step. The High update went from 14.6 to 8.5 ms per step in the pack probe.
- **World UI (`ui.js` `setS`):** health bars, loot labels and damage numbers write a style only when it changes. `project()` reuses one result object. Loot more than 60 m away isn't projected.
- **Shaders compiled mid-fight:** blood and scorch decals disposed their material on fade; once the last one went, the program was freed and the next first blood recompiled it. Keeper meshes at y -500 now hold the programs (`game.js` `decalMat`). The slash-trail material is made at load (`ensureSlashMat`). `shots/r28progs.mjs` shows 0 new programs in fights, except one pre-existing depth program for Krateros' arm gear in al-Karkh (it was there before Round 28).

**Phone pass: controls (`mobile.js`, `game.js` `pickTarget`)**
- Floating stick: past the rim the base follows the thumb. The 7 px dead zone is remapped so speed starts from zero, and full speed is reached at 80% of the radius.
- Buttons take pointer capture: a thumb that slides off the attack button while holding no longer drops the hold.
- Aim assist: with the stick pushed, a foe the stick points at counts as up to 40% nearer.
- Tested by `shots/r28touch.mjs` (synthetic pointer events, all ok).

**Phone pass: readability and framing**
- Boss phase and duel lines (`scenes.js` `faceCam`, `faceAim`): the camera picks a side with a clear line to the boss and frames his face in the upper third. Before, Bardanes and Arsaber were shot from the waist with the face behind the subtitle bar, and the arch pier filled half the frame.
- A bark sits under a tutorial card when both show (`story25.js`). The tracker objective keeps to two lines on phones (`style.css` Round 28 block).
- Checked and fine in `r28hud` shots: inventory, disciplines, journal, map, settings. No touch target under 44 px.

**Boss moves (`bosses28.js`; Arabic in `story28_ar.js` as `AR28`)**
- Field captains, one per affix (in a custom `T.ai` wrapper; a stagger breaks a move off): Swift `dashcuts`, Ironclad `slam`, Volley `rain`, Firebrand `firering`, Rallying `warcry` (once, two men), Snaring `netline` (pins with `p.netT`), Reed-born `reedstrike`.
- Dungeon bosses (`zones.js` marks `dboss`; the move comes from `g.interior.def.style`): cistern `sluice`, kiln2 `vents`, grainvault `stacks`, warren `hutfire`, salt `saltburst`, palace `tiles`, older grounds `slam`. Contracts and trials use their ground.
- Act bosses, under 30% life (`combat25.js` now exposes `g.SIGS25`, `g.KITS25`, `g.startCombo25`; selector `g.pickSig28`): Bardanes `javelins` (thrown with a lead), Kallinikos `siphon` (a fan of fire lanes), Krateros `smokerush` (he vanishes and strikes from behind; the boss is made visible again if a scene or the duel interrupts), Arsaber `flurry` (5 thrusts, only the last parryable).
- Hamrin masters (`holds.js` MOVES via `makeMoves28`, added to `p2.add`): Krambonites `propfall`, Charsianites `wallvolley`, Pankalos `gorgerush`, Tatzates `threeshafts`.
- All timing runs on the game clock (no `setTimeout`). A one-time hint shows for captains and one for dungeon bosses.
- Tests: `shots/r28moves.mjs` (all 13 captain and ground moves, 4 act bosses, a real marsh dungeon) is all ok. `shots/r28hold.mjs quarry|fort|gorge|rivalhold` ran the new move in all four, errors: none.

**New scripts:** r28perf (draws, triangles, particle coverage; `DETAIL=1` for a per-pass breakdown), r28prof (CPU profile of the update; `Q=high`), r28progs (shaders compiled mid-fight), r28look, r28hud (`<out> [region] [lang]`), r28phase, r28touch, r28moves, r28hold. All take `PORT`.

**Test workflow:** `/home/user/wt28` (lane a, port 5173) and `/home/user/wt28b` (lane b, port 5174) are tar copies of the checkout. `/home/user/sync28.sh` refreshes both (never while a test runs). `/home/user/lane.sh <a|b> <cmd>` runs one test with its own vite. `/home/user/sweep28.sh <a|b> <list> <logdir>` writes a SUMMARY. These live outside the repo: recreate them in a new container. Older tests hardcode 5173: run them in lane a only.

**Shipped (session branch `claude/new-session-9masup`):**
- Regression sweep, all clean (43 of 43, rc 0, "errors: none"): finaletest ×4, r15test sawad, r16test marsh, r17test karkh, r18test faris, r21holds ×4, r22holds ×8, r25boss ×4, r26boss ×4, r26hold ×4, r27hold dam/stockade/quarter/hulks boss, r27dungeon marsh, trialtest, r21rift, crafttest, ngtest, traveltest, benchtest.
- The Round 28 scripts (r28perf, r28prof, r28progs, r28look, r28hud, r28phase, r28touch, r28moves, r28hold) were never committed (`shots/` is gitignored; use `git add -f`) and are lost. Rewrite them if needed.
- Artifact version 26 published (1.79 MB inlined; `shots/smoke26.mjs` from `file://` with phone emulation: touch UI on, troops present, no page errors).
- APK: CI's build of `f9a924b` (same code as this note), sent to the user.

**Round 29 (approved last round, carried over):** camp props (a sculpted forge with hearth, bellows and chimney hood in place of Bishr's plain stump, plus cooking gear, tents and water jars), new side quests (one 2–3 step chain per region), a post-game epilogue (Salim back in Baghdad, Ishaq at the House of Wisdom, the camp men's endings), and 2–3 new enemy types. Confirm with the user before building.

**Ideas (not approved):** the default quality is High on phones too, and AO plus reflections roughly double the character draws there; adaptive quality drops AO only after two slow 3 s windows. Consider a phone default of a middle setting. The JS update is still about 6–8 ms per step in a 12-foe fight on the desktop CPU.

## Round 27: masters, troops below ground, camp props, phone readability
User decisions: all four areas (the story-hold masters' new moves, the new troops in more places, sculpted camp props, phone feel); a full round until about 300k context. The user gave no device notes, so the phone pass was done from phone-sized shots.

**Masters (`masters27.js`, merged into `holds.js` MOVES by `makeMoves27({ lineTele, inLine })`; each master's `p2.add` in `storyholds.js` lists his move):**
- Sawad: Lalakon `sluice` (a 5 m water lane across Salim's ground: a throw, then slowing water for 5 s), Photeinos `bandon` (once: a standard-bearer and two bandits; the Round 26 rally), Bryennios `bellows` (a cone of sparks, then a ring of vent fire from 3.2 to 5.6 m), Olbianos `chainsweep` (the band from 3 to 7.5 m is struck: step in close or stay out).
- Marsh: Kourkouas `causeway` (three marked patches become mud: slow 0.4 for 5.5 s), Katakylas `reedfire` (three rings of fire closing in, 8.5, 6 and 3.6 m, all with the same gap), Tzantzes `hooks` (a lane; caught, Salim is dragged to him), Petronas `polesweep` (a 4.2 m sweep, then a 12 m jab).
- Karkh: Mousele `roofs` (three collapses walking toward Salim), Narses `testudo` (the Round 26 shield wall), Gongylios `crossfire` (three 24 m lanes, 0.6 s apart), Kalokyros `embertrail` (fire lands where Salim stood 0.6 s before, for about 3 s).
- Docks: Aetios `slipway` (a lane, then a rolling banded log), Rhentakios `cargonet` (a marked net drop that pins: `p.netT`), Monomachos `chainpull` (an arc in front: caught, pulled in), Skleros `feintstrike` (a glint with no blow, then the real one).
- Plan changes: Olbianos already had a hook-and-pull and Kalokyros already struck from the smoke, so they got the chain sweep and the fire trail instead.
- Shared parts in `setupMasters27(g)`: `g.m27band(c, inner, outer, delay, onDone, gapAt, gap)` (a ring band telegraph, in `g.hazards` as kind `m27band`; the game's `updateHazards` advances its clock), `g.m27zone('lane'|'mud', at, o)` (pooled slowing ground through `g.hazSlowK`), the pooled log, `g.m27clear()` (called on hold reset, death and exit). Waves are driven by the move's own clock, not `setTimeout` (timers ran on while paused).

**New troops below ground (`zones.js` enter):** dungeons of level 8 and up, every contract and every Siege Trial get a standard-bearer with the pack in one room (40% of the way) and a shield wall in another (75%), with two fewer men beside it. No horse archers indoors: rooms are 12 m cells, too tight for his circle (he stays on the open maps).

**Camp props (`props27.js`):** `wasitGoods()` (slatted crates with rope lashings, a lumpy date sack with spilled dates, an indigo cloth bolt with its loose end), `anvil()` (an extruded and bevelled body with horn, face, heel and feet, a bright face, a hammer, tongs and a quench bucket on a banded stump), `drillGround()` (a straw-bound post with a straw texture pinched at three rope bands, cut marks, arms, and an A-frame rack of blunted spears and wooden swords). Each is merged per material (6 to 8 meshes, 1.3k to 2.5k triangles). `g.campProp26(k)` places one (for tests).

**Phone readability:** callouts ("Fire the reeds!", "Cart!", "Again!", "Feint!") floated over the boss and landed on his name in the boss bar. They now show as a line under the bar (`ui.bossCall(text)`, `#bossbar .bcall`), translated. The band markers are brighter (they were faint on the orange kiln floor). Callouts drawn by `damageNumber` had never been translated (Round 26's "Cart!" Arabic never showed); master and act-boss announcements now go through `t()`.

**Fixes found on the way:** local `let t` counters in `combat25.js` renamed `tt` (they would have shadowed the new `t()` import and crashed `firewave` and `beams`).

**Arabic:** `story27_ar.js` (`AR27`, merged last).

**New scripts:** `r27hold.mjs <hold> <mid|boss> [out]` (a master's new move; prints slowing ground, bands, the log, the net, men called up), `r27dungeon.mjs [region] [out]` (a dungeon, a contract and a trial: counts, rally, the wall waking), `r27props.mjs [region] [out]` (close shots of the three props and one at play distance).

**Test workflow:** `/home/user/wt26` (5173, `/home/user/sweep.sh <list> <logdir>`) and `/home/user/wt27` (5174, `/home/user/vite2.sh`, `/home/user/sweep2.sh <list> <logdir>`, synced by `/home/user/sync27.sh`) are copies of the checkout, so code can be edited while tests run. These live outside the repo and have to be recreated in a new container (copy with tar; `wt27` symlinks `node_modules`). Run at most two lanes: the container has 4 cores, and a third browser makes page loads time out (a 180 s `__ready` wait failed this way).

**Shipped:**
- Final sweep, all clean (35 tests, rc 0, "errors: none"): r22holds ×8, r21holds ×4, r26hold ×4, r26camp marsh and docks, r25boss sawad and docks, r26boss ×4, trialtest, r21rift, crafttest, ngtest, r26foes sawad, r27dungeon sawad and docks, r27hold stockade/kilns/hulks/dam boss. All 16 `r27hold` runs and `r27dungeon marsh` passed during the round.
- Note: `r25boss`, `trialtest`, `r21rift`, `crafttest`, `ngtest` (and other older scripts) hardcode port 5173, so run them only on the 5173 lane.
- Artifact version 25 published. The APK is CI's build of the commit that carries this note.

**Next round: ideas (not approved):**
- Device check on Android: the masters' new moves at real frame rate (the reed fire rings, the chain sweep band, the rolling log), the callout line under the boss bar, the troops in tight dungeon rooms (the shield wall's turn in a 12 m room).
- The Round 26 device items are still unchecked on a real phone (the rally ring, the horse archer's circle, Kallinikos' fire rings, the 8 px poise bar).
- Act bosses and Hamrin masters could get one more move each; field captains and dungeon bosses still fight with the base kit.
- More sculpted props in the camps (the old forge stump beside Bishr's new anvil is a plain cylinder).

## Round 26: troops, bosses, Hamrin, the camp
User decisions: all four areas: Hamrin endgame content, fixes for the phone (the user hadn't played Round 25 yet, so Claude ran the device checklist from phone-sized shots), a polish and bug sweep, and new content (all four offered: Hamrin story arc, boss depth, hub NPC arcs, enemy variety). Tatzates' ending: chains for Baghdad or let him go (approved as recommended).

**New troops (`foes26.js`, types merged into `TYPES` in `entities.js`, placed in every region's `spawnX` in `game.js`):**
- **Bandophoros** (`standard`): a skoutatos carrying a plain bandon (`o.standard` in `human.js`: a pole in the left hand, plain cloth, a light band and two tails, no device). While alerted, his men within 9 m get `rallyT`: ×1.25 speed and ×1.25 damage. A faint gold ring shows the reach. He keeps 5–8 m behind his men while any are near him. When he falls, his men within 12 m reel for 1.3 s ("The standard falls: his men waver").
- **Skoutatos of the Wall** (`wall`, made by `spawnWall(g, x, z, level, opts)`, also `g.spawnWall26`): three men abreast with big oval shields (1.3×). The line turns slowly toward Salim and advances. Front blows are blocked 95% of the time (`blockK`), and blocked hits drain poise ×2.6 (`blockPoiseK`). When poise empties: "Guard broken!" and a 1.8 s stagger (new lines in `game.js` damageEnemy's block branch). Shield bash (`shove`) shoves Salim back. With one man left he fights as a normal skoutatos.
- **Hippotoxotes** (`hippo`): a horse archer (`horseRider` with the toxotes look). He circles Salim at 5.7–7.1 m (wider circles left the phone view), shoots when `lineClear` (the nav grid is padded around props, so `navClear` failed at the hub), and reverses when a wall eats his step. He is thrown at half health and fights on as an archer. `T.shootH` sets the arrow height (`shootArrow`).
- Each type shows a one-time toast the first time it is met. Bardanes' second half spawns a standard and two men (`g.onBossPhase26`).

**Boss second halves:**
- **Act bosses (`combat25.js`):** `KITS[type].sig2` alternates with the first signature once `b.phase >= 2`, opening with the new move. The wrapper now hands control to the base AI for the phase change (before, a boss busy with his own moves never reached it).
  - Bardanes `doubleCharge`: charges down the lane, then charges back (`charge(b, 'back')`); only the second miss winds him.
  - Kallinikos `firewave`: two rings of liquid fire (4.2 m, then 7.6 m) roll out, each with a gap about two flames wide; the fire burns for 6 s.
  - Krateros `beams`: three lanes at Salim, 0.7 s apart, burning for 6.5 s.
  - Arsaber `feint`: `KITS.ghanimFeint`, a first glint with no blow behind it (shape `'feint'`, not parryable), then the real arc swing on the second glint. A toast teaches it once. Beyond 5.5 m he takes his guard instead.
- **Hamrin masters (`holds.js` MOVES, added to their `p2.add`):**
  - Krambonites `cartroll`: a 22 m lane across Salim's ground, with damage and a throw.
  - Charsianites `testudo`: once per fight, a shield wall of three in front of him.
  - Pankalos `leap`: a marked landing and a 2.2 m arc (`e.liftY`, applied after `e.pos.y = 0`, reset when staggered), then a slam.
  - Tatzates `snipe`: a 30 m marked line, then a heavy shaft (×2.2).

**Hamrin content:**
- Ambushes and the champion **Varazes**: `encounters25.js` ROSTER `hamrin`, with a standard-bearer in the retinue and horse archers in the second wave.
- Three letters (`story25.js` LEAVES `hamrin`, new kind `tally`, "Tatzates' quiver lid"), placed with `freeSpot` so they land on the gorge floors. `LEAVES_TOTAL` is now **15** ("All fifteen found").
- Salim's arrival line and the campfire memory already existed (Round 25).

**Hamrin story (`story26.js`, `scenes.js` `hamrinScout` / `hamrinArrow`, `lieutenantFalls`, `holds.js` rivalLast):**
1. **Scout:** the first time Salim is within 12 m of Ishaq in the camp, a bound scout (made for the scene, removed after) names the frontier road. Ishaq: "it will not give Jabir back"; Salim: "I am going so that it ends."
2. **Arrow:** after two of the quarry, fort and gorge holds fall, back in the camp: an arrow lands beside Salim with Tatzates' message; Salim: "He wants me angry"; Ishaq (off screen): "Then go to him calm. Anger misses."
3. **Face-off:** two more lines in the ravine ("The boy on the dune. I remember the wind that day. Not his face." / "I remember it for both of us.").
4. **The fall:** Tatzates is now spared like Photeinos (he kneels). Choice `p.s25.ch.tatzates`: `chains` (+30 Renown) or `free` (cut bowstring, +15). Two lines each, the card, then over black: the bowman's road, and "That night Salim set a lamp on the Diyala for Jabir, and let the current take it." `p.rival.final` is set to the choice. Back in the camp, Ishaq says a line for each choice. Beats seen: `s25.said.h26scout`, `h26arrow`, `h26ishaq`.

**The camp's own stories (`camp26.js`):**
- Yusuf (his partner Sulayk, found alive in Wasit), Bishr (the Abna' soldier who owed half a sword's price comes back wounded and pays) and 'Amr (he fought for al-Amin; he takes on a boy, Nasim).
- Three beats each, one per region visit from the marshes on. A beat is told in the dialog box when Salim stands calm within 3.6 m of the man.
- The third beat gives a named legendary (Sulayk's Scale-Weight ring, The Other Half amulet, The Drill-Master's Sash belt) and +20 Renown, and adds a prop by the man in every camp from then on (Wasit crates, a new anvil, a practice post and spear rack).
- State: `p.s25.camp` (saved with `s25`).

**Fixes:**
- Blade trails and slashes are cleared while the director runs (`combatFx.clear()`).
- On phones, a bark moves under the tracker while a context prompt shows (they overlapped: `#bark25.top`).
- The poise bar is 8 px on touch (it was 5 px).
- **The pink squares at dusk (Round 24) were side-quest giver markers** (blue diamonds, tinted by the dusk grade) left visible in cutscenes. They are now hidden in `cineTick` (`g.sideMarks`); a pixel scan of the epilogue shots finds none.

**Arabic:** `story26_ar.js` (`AR26`, merged last).

**New scripts** (all take `PORT`; `/home/user/vite2.sh` runs vite from the main checkout on 5174, so a second test can run beside a `withvite.sh` sweep):
- `r26foes.mjs [region] [out] [spot]`: the rally, the wall, the horse archer. Use the spot `x=-44&z=22` for open sand.
- `r26boss.mjs <region> [out]`: the second-half moves by their callouts.
- `r26hold.mjs <quarry|fort|gorge|rivalhold> [out]`: the masters' new moves.
- `r26hamrin.mjs [out] [0|1]`: the whole Hamrin story with either choice.
- `r26camp.mjs [region] [out] [beat]`: the camp beats.

**Workflow:** edits in the main checkout; tests run from the copy at `/home/user/wt26` (`/home/user/sync26.sh`); `/home/user/sweep26.sh <list>` runs a list of tests one after another and writes `/home/user/logs26/SUMMARY`.

**Shipped:** see "Round 26 · Shipped" below.

## Round 26 · Shipped
The full sweep was clean (44 of 44, run by the Round 26 chat). Artifact version 24 was published from this chat, and the APK from `ad30f04` (same code) was sent to the user.

## Round 25: gameplay and story
User decisions: all four gameplay areas (combat feel and bosses, encounter pacing, the first hour, phone readability) and all four story areas (character arcs, companion and NPC voices, environmental storytelling, choices with consequences); rework of weak existing lines allowed; critique loops until the context limit, then ship. The three choices were approved as proposed.

**Readability (`outline.js`, new):** a thin inverted-hull outline on Salim (dark brown), foes (dark red), elites and bosses (bright red), and the hired guard (dark teal). One shader program (`customProgramCacheKey 'outline25'`), compiled at load. The outline width is constant on screen. The outlines are on camera layer 3 (`showOutlines(camera, on)` every frame in `main.js`: in play only, hidden in cutscenes) and are kept off the reflection layer. The default zoom is 1.1 (was 1.25; new key `sob.zoom3`). The touch target bar moved below the tracker pill (it overlapped). The marsh is warmer and clearer (`mist` preset) with a pale causeway (it read as a dark smear).

**Combat (`combat25.js`, new, set up last in `main.js`; it wraps `bossAI`, `damageEnemy`, `damagePlayer` and `killEnemy`):**
- **Boss poise:** every act boss has a poise bar (`.bpoise` under the boss bar), sized at 2.2% of max HP. Emptying it **breaks** him for 3.2 s: he reels and takes ×1.5 damage (the old `staggerT` bonus). Each break raises the next threshold by 20%. A toast on the first break: "He reels: strike now!"
- **Combos (`KITS`):** up close, a boss strings 2–3 swings (clip, duration, hit point, reach, damage). The finisher glints and marks its ground, and it can be **parried** (an evade inside 0.22 s), which removes half his poise.
- **Signature moves:**
  - Bardanes: `charge`, a marked lane. If he misses he is winded for 1.6 s.
  - Kallinikos: `fireline`, 3–5 lanes of liquid fire spreading outward.
  - Krateros: `collapse`, a ring of burning stalls with one gap, then the middle falls in.
  - Arsaber: `guard`, blade raised. A hit into it triggers a parryable riposte; if the guard runs out, he lunges in a combo.
- **Last foe:** when the last of a 3+ foe fight falls, a short slow-motion beat.

**Pacing (`encounters25.js`, new):** per story region, two **ambushes** on the main path (hub → first site and second site → last fight, found with `findPath`):
- Wave 1 is 4–5 foes rising around Salim. When it is down to one, wave 2 comes from a flank with archers. Clearing it pays gold, an item and 2 Renown.
- They only spring after 6 s of quiet.

Also one **champion** per region (Rhaptes, Kontos, Mylonas, Karykes), an elite with his retinue camped 7 m off the path between the first two sites. He calls out on aggro and drops a rare (30% legendary). Champions are spawned at load. `g.enc25` holds the state (per session, not saved).

**First hour:**
- `tutorial.js` hints wait for their moment: attack when a foe is near, skills when 3+ are near. On touch, the button they name pulses (`.tut-pulse`).
- Evade and parry are taught at the first 3 glints within 6 m, with a short slow-down and the evade button pulsing. The lesson finishes on a parry.
- No hint cards during boss fights.
- The fifth skill slot and the first alternate skill open at **level 5** (`SLOT5_LEVEL`, was 15), the second at **12** (was 20), with a banner naming the new skill.
- The guide trail also hides in boss fights and whenever a foe is alerted close by.

**Story (`story25.js` + `scenes.js`, Arabic in `story25_ar.js` as `AR25`, merged last; see `STORY.md` "Round 25"):**
- **Director (`cinema.js`):**
  - A shot can carry `choice: { prompt, options: [{ label, fx }] }`. It shows buttons (keys 1/2 work), never auto-advances, and can't be skipped while showing. Skipping a scene before its choice takes option 0.
  - `when: () => bool` skips a shot unless it holds.
  - Choices are saved in `p.s25.ch` (`save.js` EXTRA `s25`; NG+ clears `ch` and `said`, while found letters stay).
- **The three choices:**
  - Photeinos is now **spared** (kneels like Arsaber, `e.spared`): qadi or free.
  - After Kallinikos: chase the bundle, or stay for the burning reed village (fire shown in the distance).
  - The parley: refuse Arsaber, or promise a copy.
  - Consequences: Renown (`onChoice25`), the marsh gift in al-Karkh, Photeinos's purse on the quays, the Karkh pyre caption, Arsaber's lines and caption at the end, and consequence captions in `docksFinale`.
- **Ishaq's confession:** the first talk outside the Sawad, then a `converse` reply. It closes at the lamps ("I chose his road…").
- **Barks (`g.bark(who, text)`, `#bark25`):**
  - Salim's Jabir line as each region opens (never mid-fight).
  - Hired-guard lines (`GUARD[kind][ctx]`: fight, ambush, champion, hurt, boss).
  - Yusuf, Bishr and 'Amr once per act.
- **Campfire memories:** the first rest at a hold fire in each region shows a memory of Jabir at the top of the rest panel (`g.memory25`, hook in `holds.js` rest).
- **Leaves and Letters:** 12 papers (3 per story region, `LEAVES`) near the sites. They glint, are picked up by walking over them (never mid-fight), and are read in the dialog box. All 12 earn the Teacher's Inkwell (a legendary amulet).
- **Rewrites:** in al-Karkh, Salim's "Who holds them now?" became "Jabir wanted to see Baghdad. Not like this."

**New scripts:**
- `shots/r25boss.mjs <region> [out]`: combo, parry, break, signature and riposte.
- `shots/r25story.mjs <region> [out] [option]`: the choice scene, the ambush in two waves, the champion, a letter, barks.
- `shots/r25end.mjs <region> <photeinos> <marsh> <arsaber> [out]`: plays the ending with those choices and lists every line and caption.
- `finaletest` now clicks a choice when one shows.

**Workflow:** edits in the main checkout; tests run from a copy at `/home/user/wt25` (`/home/user/sync25.sh`, a tar copy; there is no rsync). **Never sync while a test runs**: Vite reloads and the test dies with "Execution context was destroyed".

**Shipped:** sweep clean (exit 0, "errors: none"): r22holds dam, finaletest marsh/docks/sawad, r18test faris, r15test sawad, r16test marsh, r17test karkh, r21holds quarry, traveltest, ngtest, r21rival docks; plus r25boss ×4 regions, r25story ×3 (both options), r25end docks. Artifact **version 23** at https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (1.71 MB inlined; smoke-tested from `file://` with mobile emulation: ready, touch UI, outlines and encounters present, no page errors). APK built by CI from the final push. Not re-run this round: r15/r16/r17 for the other regions, r18 for the other classes, r21/r22 for the other holds, trialtest, crafttest, benchtest, r21comp, r21mount, r21rift, r21hub. Run them first next round.

**Next round: ideas (not approved):**
- Device check on Android: the outline width and colours, the choice buttons, the bark position over the orbs, boss poise readability, the tutorial pulses.
- Hamrin has no ambushes, champions or letters yet.
- The headless shots can't judge the burning reed village in the marsh choice or the liquid-fire lanes at real frame rate; check them on a device.
- A blade-trail ribbon was caught around Salim in one ending shot right after a kill (the trails may need hiding when a scene starts).
- Still open from Round 24: the small pink squares at dusk.

## Round 24: transitions, story, graphics
User decisions: a visual and graphics pass plus "stories and transitions for a smooth gameplay feel"; all four kinds of transition (region travel, cutscene in/out, hold and dungeon doors, combat to calm and boss entries); polish the story and add new beats; graphics targets: the Hamrin overworld, Byzantine close-ups, lighting and FX, and whatever the critique finds; ship the usual way at the end. Arsaber is spared, not killed.

**Transitions**
- **Cutscenes (`cinema.js`):** the first shot blends out of the play camera over 0.85 s (position, rotation, fov). If the first shot is more than 28 m away it dips through black instead, and shots that open on black (`fadeIn`) skip the blend. When a scene ends, `director.blendOut()` (called every frame from `main.js`) eases the play camera out of the last framing over 0.9 s and lets the film grade (`uCine`) fall away. A scene that ended on black fades back up with `ui.fade` unless travel holds it black (`ui.holdBlack`, `director.endedBlack`). The HUD and touch controls fade back in after a short delay (`style.css`). `def.noBlend` turns blending off.
- **Region travel (`main.js` `game.travel`, `index.html`):** the act card now shows once. The act-ending scenes (`epilogue`, `rawhFalls`, `finale`) no longer end on a card: they fade to black, and the loader shows a **travel card** (`TRAVEL_CARD`: Arabic name, act title, the reason to go) stored in `sessionStorage['sob.travelcard']` and drawn by an inline script in `index.html`. After the reload the game resumes straight out of the loader once the map is ready (`resumeTravel`, `start(saved, true)`), with no second fade to black and no arrival scene half-played under the loader. The mix fades out before the reload (`audio.fadeOutAll`) and back in after it (`fadeInAll`).
- **Audio after a reload (`audio2.js`):** an AudioContext made without a tap starts suspended, so a one-time pointer or key listener now resumes it. The music runs through a duck gain: `ui.onFade` dips it while the screen is black.
- **Doors:** `ui.fade(v, sec)` fades out in 0.5 s, so the 0.6 s swap behind it is always covered (it used to show at 0.8 s). The fire-to-fire travel in holds now waits 560 ms.
- **Music (`audio.js`, `game.js`):** the score changes between explore and combat only on a bar line. A daff fill leads into the fight, and a qanun cadence down to the tonic closes it. The fight music holds 3 s after the last foe falls. A boss's death plays a `settle` stinger and the camera eases in (`settleZoom`) for 1.9 s before the ending scene.

**Story (`scenes.js`, Arabic in `story24_ar.js` as `AR24`, merged last)**
- **Act III epilogue:** after the lamps, Arsaber (on horseback, `horseRider` with the officer look) watches from the opposite bank of the canal, then turns for Baghdad. This is his first appearance.
- **Act VI arrival (docks):** a parley at the khan under a truce. Arsaber offers to take Ishaq and the Pages to Constantinople ("a library, not a prison"); Ishaq: "He had a prison here. He still chose to teach here." Arsaber leaves; Salim: "Let him try." Ishaq then names Rhentakios.
- **Docks finale:** Arsaber is beaten, not killed (`b.spared`; `game.js` skips the sink-and-remove for spared foes). He kneels: "You burn your own city, and call me the thief." Salim: "We copy. That is the difference." A caption: he went home that winter in an exchange of prisoners on the Lamis.
- **Framing:** the arrival scenes' over-the-shoulder shots are wider (the turban and mail filled half the frame).

**Graphics**
- **Hamrin:** warmer ground with broad red-earth and scree patches (`terrain.js` RG 4); the `highland` preset has a lower sun, a warmer and lighter haze (fog 0.003) and grade 3; boulders are weathered grey-brown, not cream.
- **Readability:** in play the character rim light is 1.6× (scenes keep the softer one); the vignette is 0.55 (was 0.75).
- **Black banner:** the Abbasid banner at the caravanserai was `#151515` with roughness 1 and read as a hole from above; now `#2e2a26` with a woven sheen.
- **Marsh causeway:** trodden brown silt with darker wet patches and few pebbles (it read as a grey sheet).
- **Falcon (`hublife.js` `falconRig`):** a new sculpt: lathe body with a streaked pale breast, long pointed wings (pale underside, dark tips), a barred fan tail, hooked beak, moustache stripe, yellow legs. The hinge interface is unchanged.
- **Touch notices:** at the top left under the minimap, at most four at once (they stacked over the fight).

**New scripts:** `shots/r24scene.mjs <out> <region> <scene> [tod]` (play one story scene and shoot each shot; for `epilogue`, `rawhFalls`, `finale` and `docksFinale` it spawns and fells the boss first), `shots/r24close.mjs <out> [names]` (falcon perched and flying, Byzantine troops close up).

**Shipped:** full sweep clean (exit 0, "errors: none"): traveltest, finaletest ×4 (marsh re-run after the test fix: `reloaded true`), r15test ×4, ngtest, r16test ×4, r17test ×4, r18test ×4 classes, r21rival ×4, r21holds ×4, r22holds ×8, r21hub marsh and docks, r21comp, r21mount, r21rift, trialtest, crafttest, benchtest, plus r24scene (docks arrival, sawad epilogue, docks finale) and r24close. Artifact **version 22** at https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (1.65 MB inlined; smoke-tested from `file://` with mobile emulation: ready, touch UI on, new game into the prologue, no page errors). APK built by CI from the final push.

**Test fix:** `finaletest` reported `reloaded false` for the travelling endings: the travel reload kills the loop's last evaluate before Playwright's `framenavigated` lands. It now waits 4 s before reporting.

**Next round: ideas (not approved):**
- Device check on Android: the travel card while loading, audio after a region change (it resumes on the first tap), the blend in and out of cutscenes, the new music changes.
- Small pink squares appeared near the horizon in two dusk shots of the Sawad epilogue (not identified; check whether they show on a device).
- Characters are small at the default overhead zoom; the brighter rim light helps, but a subtle outline or a slightly closer default may read better on a phone.
- The marsh hub still reads muted under its morning mist.

**Workflow note:** this round edited in the main checkout and tested from a git worktree (`/home/user/wt24`, synced by a small copy script), so tests and edits never collided. `pgrep -f <pattern>` inside a waiting loop matches the loop's own command line; wait on a task's output file instead.

## Round 23 · Shipped
Details of the work are in "Round 23 (done): the Byzantine mission" below.

**Critique, final session** (all fixed and re-shot):
- **Felt caps:** the rolled brim sat at brow height and crossed the eyes like a blindfold. Now it rests on the forehead above the brows, with a thinner roll (geometry cache `r23.3`).
- **No cross shapes:** the shipyard's timber posts had a level cross-tree near the top and read as crosses. Now each has one jib leaning up and out to a side, with a rope and a bale hanging from it (`holds.js`, `p` glyph, timber theme). The barges' furled yard was level across the mast; now it is a lateen yard slanting fore and aft (`docksprops.js`). Wells (two posts and a windlass) were checked and are fine.
- **Cutscenes:** the hero's gold play ring showed under him in cutscenes. It is now hidden whenever the director runs (`game.heroRing`, toggled in `cineTick` and `update`).
- **Looked at and fine:** crit.mjs (every scene); r22crit for the stockade, burned quarter and shipyard; the prologue riders at dusk (two Byzantine riders with shields and spears on the dune against a purple sky); a kataphraktos charging past with his lance in play; Tatzates mounted with his riders. A white glow on one foe's head in a stockade shot was a crit hit flash caught in the frame.

**New scripts:** `shots/r23intro.mjs <out> [tod]` (one shot per prologue shot; card and caption shots move on with time, so it steps the sim until the index changes). `shots/r23charge.mjs <out> [region] [spot]` (a kataphraktos and Tatzates spawned on screen on open ground; the overhead camera only sees about 7 m around the hero, and the Sawad hub and Hamrin camp don't suit it).

**Test fixes:**
- `withvite.sh` now runs `node_modules/.bin/vite` directly. With `npx`, the kill reached npx and left vite running.
- `r21hub docks` failed about half the time. The falcon step teleports the hero to the farthest archer, which was sometimes within 24 m of Arsaber's ground. That spawned the boss, and his intro then played over the fishing (the fish never bit, and the strike scared it off). The step now picks an archer more than 45 m from `SITES.arch`, and the fishing step says why if a cast ends early. It passed 5 of 5 after the fix.

**Test sweep, all clean (exit 0, "errors: none"):** r15test ×4, r16test ×4, r17test ×4, r18test ×4 classes, finaletest ×4, r21rival ×4, r22holds ×8 (previous session); r21holds ×4, ngtest, traveltest, trialtest, crafttest, benchtest, r21comp, r21mount, r21rift, r21hub marsh and docks, plus r22holds shipyard, finaletest sawad and r21rival sawad again after the fixes (this session). The logs print the new names and lines: Brachamios and Tatzates ("All this way, for one arrow?"); Aetios and Rhentakios ("Arsaber pays us to hold the river…"); Tatzates escaping ("The envoy's silver does not cover this").

**Shipped:** Artifact **version 21** at https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (1.65 MB inlined; smoke-tested from `file://` with mobile emulation: ready, touch UI on, new game into the prologue, no page errors). The APK was built by CI from the final push and sent to the user.

**Next round:** not planned yet. Ask the user.

## Restore the code
```
unzip madinat-round19-handoff.zip -d madinat && cd madinat
git clone repo.bundle game && cd game        # Round 20 is on branch ccr-c97baf64-6kbn83 (Round 19: ccr-56d2fa55-vx1w3y)
npm install && npx vite --port 5173          # http://localhost:5173
```
If the session's repo is empty, run `git fetch <path>/repo.bundle 'refs/heads/*:refs/remotes/bundle/*'` and then `git checkout -B <session-branch> bundle/ccr-c97baf64-6kbn83`. If the repo has the branch, just `git fetch origin claude/new-session-fobl3t && git checkout -B <session-branch> FETCH_HEAD` (Round 24 shipped; Round 23 alone is `claude/new-session-e8f6al`; Round 23 before its final session is `claude/new-session-eqeuig`; Round 22 alone is `claude/new-session-2oveca`; Round 21 alone is `claude/new-session-w9ig9m`; Round 21 before its final session is `ccr-a81550d1-0nkldn`, Round 20 alone is `ccr-c97baf64-6kbn83`).

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

## Round 23 (done): the Byzantine mission
Every adversary is now one of the envoy **Arsaber**'s company (al-Rum), and the story is rewritten around his covert mission to carry the Teacher's Pages to Constantinople. User decisions this round: Claude picks the remaining names and lists them here; old saves map old names to new.

- **Look (`byz.js`, new):** `LOOK` presets per troop type and `byzify(o)`, which every foe build passes through last (TYPES, foes20, hold captains, Tatzates, the prologue riders): no turbans, caps or veils; felt caps become the **pilos**; any helmet becomes the **ribbed Byzantine helmet** (`helm: 'byz'`: six dark-iron ribs so nothing reads as a cross from above, brow band, mail aventail to the shoulders, open face; officers get a horsehair tuft with `crest: 'plume'`); shields become **oval skoutaria** (helmeted men) or **small round shields**, painted in four unit colours with plain rings only (`byzShield` in `characters.js`); hair is cropped (`keepHair` keeps a look's own, used for Tatzates' long hair); beards are dark; the qaba is the padded kavadion. New gear in `characters.js`: `pike` (menavlion, `o.pike`), `siphon` (bronze hand siphon with a flame, `o.siphon` on the torch weapon), `solenarion` (arrow-guide, `o.solen` on the crossbow weapon). Geometry cache `VERSION` is `r23.0`.
- **Troops (type keys unchanged, the AI keys off them):** bandit = Psilos, guard = Skoutatos, spearman = Menavlatos, archer = Toxotes, deserter and reedman = Trapezites, naffat = Siphon-bearer, slinger = Slinger, netter = Marine, crossbow = Solenarion Archer, engineer = Mechanikos, rider = **Kataphraktos on a horse** (`horseRider` in `foes20.js`, the horse sculpt; thrown at half health as "Unhorsed Kataphraktos"). Bosses: commander = Bardanes, rawh = Kallinikos, utba = Krateros, ghanim = Arsaber, zubayr = Tatzates.
- **Story text:** `story15.js`, `scenes.js`, `rivals.js`, `region.js`, `storyholds.js`, `holds.js`, `content.js`, `dungeons.js`, `sidequests.js`, `progression.js`, `narrative.js`, `game.js`, `travel.js` (the Hamrin hub is now "The Hill Camp"), `STORY.md`. The journal and tracker title is "The Teacher's Pages". Ishaq has a new topic, "Why would Constantinople want the Pages?".
- **New codex entries (`narrative.js`):** The Army of the Romans (`byzarmy`, after 75 s anywhere), The Frontier (`thughur`, Hamrin), Liquid Fire (`liquidfire`, marsh), Embassies (`embassy`, Ishaq's new topic), The Exchange on the Lamis (`lamis`, docks), Leo the Mathematician (`leo`, Ishaq's topic).
- **Arabic:** `story23_ar.js` (`AR23`, merged last in `story_ar.js`). The Byzantines are الروم. The bounty "Hunt …" pattern in `i18n.js` follows the new wording.
- **Saves:** `OLD_NAMES` and `renameSlain` in `byz.js`; `save.js` renames `p.slain` keys on load. `p.named` (ids), `p.rival` (regions) and `p.holds` (hold ids) were already keyed by id. The BOSS and hold keys in `storyholds.js` and `holds.js` keep the old names (`farud`, `hisham`, …) so saved progress still loads.

### Name mapping (old → new)
| Role | Mapping |
|---|---|
| Envoy, commanders, rival | Ghanim → **Arsaber** · Ghassan → **Bardanes** · Rawh → **Kallinikos** · 'Utba → **Krateros** · Zubayr → **Tatzates** |
| Lieutenants | Farud → Photeinos · Hisham → Olbianos · Marwan → Katakylas · Sahl → Petronas · 'Asim → Narses · Layth → Kalokyros · Bilal → Rhentakios · Mus'ab → Skleros |
| Story-hold mids | Durayd → Lalakon · Mazin → Bryennios · Farqad → Kourkouas · Shibl → **Tzantzes** (the plan's Genesios is also a saint's name) · Hajib → Mousele · Ghiyath → Gongylios · Hawtha → Aetios · Murra → Monomachos |
| Field captains | 'Uqba → Kalamanos · Nasr → Doukas · Bakr → Chalkoutzes · Hamdan → Pegonites · Rabi'a → Kamoulianos · Jarir → Bourtzes · Zuhayr → Kontoleon · Muhriz → Rhangabes · Hammad → Kontomytes · Shabib → Triphyllios · Kulayb → Tzourakes · Dhuhl → Melissenos · Asbagh → Karteroukas · Kahmas → Baanes |
| Area captains | Qays → Kamateros · Thabit → Argyros · Mundhir → Tornikios · Ghalib → Kourtikios · Qutayba → Sarantapechos · Sawwar → Dalassenos |
| R17 dungeon captains | Wahb → Taronites · Bujayr → Artabasdos · Hurayth → Krenites · Sinan → Rhadenos · Unays → Bringas · Habib → Xylinites · Hubaysh → Boilas · Mudrik → Gabalas |
| Gauntlet | Malik → Kekaumenos · Sa'd → Kaballarios · 'Ubayd → Maniakes · Hani → Alyates · Mukhariq → Exazenos (also a qanat captain; the qanat set is Exazenos, Argyros, Pegonites, Doukas) |
| Hamrin holds | Sakhr → Phobenos · Ghaylan → Krambonites · Shaddad → Tarchaneiotes · Jabala → Charsianites · Dhuayb → Apokaukos · Hanzala → Pankalos · Nahshal → Brachamios |
| Side-quest elites | Bujayr → Lekapenos · Kharija → Spondyles · Murra → Kanabos · Shamir → Apsimar · Tarafa → Garidas · Zafir → Mavrianos · Hawshab → Chalkeus · Qurra → Barys |
| Elites (random) | Bryas, Kamytzes, Melias, Tzirithon, Sarantenos, Hexamilites, Choumnos, Mouzalon |
| Bounty targets | Sphenos, Pastilas, Tzoulas, Kolybas, Gouber, Rodophyles, Maleses, Petzeas, Chasanes, Zoupas |

## Round 23: the approved plan (kept for reference)
The user asked for **every adversary to become Byzantine** (looks, names, everything), with the **main story rewritten** around it. Decisions (all answered by the user):
- **Frame:** a covert mission. Under cover of the brothers' civil war, a Byzantine envoy, **Arsaber**, slips into Iraq with a picked company and hired turncoats, ordered to carry Baghdad's best learning to Constantinople. **The Teacher's Pages** are the prize. (Historically no Byzantine army reached Baghdad in 813, which is why it is a mission, not an invasion.)
- **Names:** period Greek names, **no saints' or biblical names** (no Michael, John/Ioannes, George, Peter, Stephen, Nikephoros, Theodore, Manuel, Theophilos, Andronikos, Thomas, Basil, Constantine, Kosmas, Leontios...). Single names, no epithets (family names used as single names are fine: Skleros, Kourkouas...).
- **Scope: everything.** All regions, the Hamrin endgame, side quests, bounties, world events, dungeons, the Gauntlet, contracts, qanat captains and all story-hold captains, plus a full story and codex rewrite with Arabic. Shipped once at the end (Artifact, push, APK).
- **Rival:** Zubayr becomes **Tatzates**, an Armenian bowman in Byzantine pay, with the same arc (three ambushes, escapes, last stand in his Hamrin hold). His line about the Hamrin hills stays.
- **Hanzala** (Round 22: "keep") is renamed too, because the new rule is that every adversary is Byzantine.

**Stays Abbasid:** Salim, Ishaq, Hakam, the hub NPCs (Yusuf, Bishr, 'Amr, Kathir, side-quest givers), the hired guards (Ma'n, Dirar, Tamim, Talha), the four classes, the music, the maps, the holds' layouts. The civil war stays as the backdrop, not the enemy.

### Story beats
| Act | Beat |
|---|---|
| Prologue | Riders in Byzantine mail on the dunes; the attack at dusk stays off screen; Jabir dies from an arrow loosed by Arsaber's bowman (Tatzates). |
| Briefing | Ishaq: "A Byzantine envoy came under the war's smoke. His soldiers took the Pages. Bardanes leads them in the Sawad. Start with Photeinos at the caravanserai." |
| I–III Sawad | **Photeinos** (Broken Dam, was Farud) → **Olbianos** (Kiln Galleries, was Hisham; keeps the hooked chain) → **Bardanes**, the company's commander, at the ruined arch (was Ghassan). |
| IV Marshes | The Pages go by boat. **Katakylas** (Reed Stockade, was Marwan) → **Petronas** (Sunken Village, was Sahl) → **Kallinikos**, master of the liquid-fire siphons, at the weir (was Rawh). |
| V Al-Karkh | **Narses** (Burned Quarter, was 'Asim) → **Kalokyros** (Vaults, was Layth; keeps the smoke fight) → **Krateros** in the square, ready to burn the Pages rather than lose them (was 'Utba). |
| VI River quays | **Rhentakios** (Shipyard, was Bilal) → **Skleros** (Hulks, was Mus'ab) → **Arsaber** himself at the ship meant to carry the Pages north (was Ghanim; the "unnamed buyer" is now Arsaber). Then the lamps on the canal: "We keep the account." |
| Hamrin | The company's last fortified road toward the frontier; Tatzates' hold. |

Story-hold mid captains (suggested): Durayd → Lalakon, Mazin → Bryennios, Farqad → Kourkouas, Shibl → Genesios, Hajib → Mousele, Ghiyath → Gongylios, Hawtha → Aetios, Murra → Monomachos. Other candidates checked against the rule: Arsaber, Bardanes, Tatzates, Artabasdos, Photeinos, Olbianos, Katakylas, Krateros, Kalokyros, Kallinikos, Narses, Petronas, Rhentakios, Skleros, Lalakon, Bryennios, Kourkouas, Genesios, Mousele, Gongylios, Aetios, Monomachos, Belisarios (very famous; avoid for a minor captain). Pick the rest (field captains Qays, Thabit, Mundhir, Zuhayr, Muhriz, Hammad, Shabib, Kulayb, Dhuhl, Asbagh, Kahmas; R17 captains Wahb, Bujayr, Hurayth, Sinan, Unays, Habib; area captains Ghalib, Qutayba, Hubaysh, Mudrik, Sawwar; Gauntlet Malik, Sa'd, 'Ubayd, Hani, Mukhariq; Hamrin hold captains Sakhr, Ghaylan, Shaddad, Jabala, Dhuayb, Hanzala, Nahshal; qanat and contract captains; rivals/mid lines) the same way and list the full mapping here when done. `grep -n "bossName\|name: '" src/*.js` finds most of them; `captainLook`'s `NAMED` table in `entities.js` keys crests by name and must follow the renames.

### Enemy types (keep the AI, change look and name)
| Type key (keep) | New name | Kit |
|---|---|---|
| bandit | Psilos (light infantry) | spear, small round shield, felt cap |
| guard | Skoutatos (shield infantry) | spathion, large oval shield, helmet with aventail, lamellar |
| spearman | Menavlatos (pikeman) | heavy menavlion pike |
| archer | Toxotes | Byzantine bow |
| deserter (hidden) | Trapezites (raider) | knives, springs from cover |
| naffat | Siphon-bearer | hand siphon of liquid fire (same fire mechanics; rename "naft" text to liquid fire where it is the enemy's) |
| slinger | Slinger (sphendonistes) | sling |
| netter | Marine (river-fleet sailor) | weighted net |
| reedman | Trapezites in the reeds | as above, marsh dress |
| crossbow | Solenarion archer | the arrow-guide (solenarion) shooting short darts far; crossbows are later. Keep the kneeling aim and red line. |
| engineer | Mechanikos | raises a mangonel |
| rider (camel) | Kataphraktos | armoured horseman on a **horse** (the horse sculpt exists in `creatures.js`) |

**Look:** lamellar klibanion over padded kavadion coats, crested helmets with mail aventails (felt caps for light troops), officers' cloaks, oval and round shields in unit colours with plain bands or animal devices, beards and short hair (no turbans, no qalansuwa). **No crosses, icons, chi-rho, saints, church buildings or religious emblems anywhere** (the design rule still holds). Bosses keep their kits (`story15.js` BOSS) but get Byzantine looks and lines.

### Text to rewrite
`scenes.js` (prologue, briefing, lieutenant falls, boss intros, finales), `story15.js` (LIEUT, BOSS intros and phase lines, ISHAQ_TALK), `rivals.js` (RIVAL lines), `region.js` (quest texts, banners), `storyholds.js` and `holds.js` (captains, subs, phase lines), `content.js`, `dungeons.js`, `sidequests.js` (bounty and event text that names foes), `progression.js` (Gauntlet), `STORY.md`, codex entries that call the foes brigands or deserters, the tutorial if it does. New codex entries: the Byzantine army (themata and tagmata), the frontier (al-thughur), liquid fire, embassies between Baghdad and Constantinople, prisoner exchanges on the Lamis river, Leo the Mathematician. **Arabic for all of it** (new `story23_ar.js`, merged in `story_ar.js`; the Arabic for the Byzantines is الروم).

### Check before shipping
- No religious symbol slipped into a shield, banner or helmet (critique shots of every foe type close up: `shots/faces.mjs`, `shots/crit.mjs`, `shots/r22crit.mjs`).
- Geometry cache: bump `VERSION` in `geocache.js` if sculpts change.
- Saves: renamed captains in `p.slain`, `p.named`, `p.rival` must still load. Map the old names or reset those keys.
- Full test sweep (see Round 22 "Shipped"). Tests that match old names (`r21rival`, `r22holds` last words, `finaletest`) need their expectations updated.

## Round 22 (done): story holds in every region
User decisions: hand-built holds like the Hamrin four, but through the whole story; new layouts themed per region; two per region (8); **required story steps**, with each region's two lieutenants fought inside as the holds' masters (the act bosses stay in the open); everything inside **matches the hero's level**; Hanzala keeps his name. Playtest list: none sent this round (the user said "holds for now").

- **`storyholds.js`** (new): the 8 maps (`MAPS`), 16 captains (`BOSS`: a new captain halfway plus the lieutenant), the 8 holds (`HOLDS`), the doors at the old sites, codex entries. Registered into `holds.js` with `registerHolds(maps, bosses, holds)`.

  | Region | Hold 1 (chief) | Hold 2 (second, barred until hold 1) |
  |---|---|---|
  | Sawad | The Broken Dam: Durayd, then Farud (golden) | The Kiln Galleries: Mazin, then Hisham with his hooked chain (vents) |
  | Marsh | The Reed Stockade: Farqad, then Marwan (reed, open water) | The Sunken Village: Shibl, then Sahl (drowned mud houses, shallows) |
  | Karkh | The Burned Quarter: Hajib, then 'Asim (charred, vents, falling beams) | The Warehouse Vaults: Ghiyath, then Layth in his smoke |
  | Docks | The Shipyard: Hawtha, then Bilal (timber, hoists) | The Hulks: Murra, then Mus'ab (barges in mid-river, low bulwarks) |

- **`holds.js` generalised:** `HOLDS[id].theme` = `rock` (Hamrin) | `masonry` | `reed` | `timber`, each with its own walls, chasm faces, piers, low walls, stacks and door. Per-hold keys: `light` (preset), `wall`/`rock`/`floor` (`'deck'` = planks with seams)/`wet`/`water`, `waterY` and `chasm` (`river` | `deep`), `sea` (open water to the horizon), `low` (hull bulwarks), `wallH`, `char` (soot), `braziers`. New tiles: `%` shallow water (wade, 0.72 speed, water footsteps), `v` fire vent (5.5 s cycle: glow, ring telegraph, burst), `k` hoist or charred beam (drops a load at Salim's feet every 5–7.5 s within 7 m), `h` a stack in the way. Story keys: `region`, `site` (`serai`/`kiln`), `lieut` (`chief`/`second`), `quest`, `needs` + `lockMsg`.
- **Lieutenants:** the master of a story hold gets `e.quest` and becomes `g.chief`/`g.matriarch`, so `game.killEnemy` completes the quest and plays `SCENES.lieutenantFalls` exactly as before. `BOSS[k].own` = `'hookAI'` | `'smokeAI'` runs his own fight from `rivals.js` between hold moves. The open-world lieutenant spawns are gone (`spawnEnemies` sets `chief`/`matriarch` to null); their packs stay at the sites.
- **Story text:** quest lines in `region.js` and three lieutenant lines/cards in `story15.js` now point to the holds. The guide trail leads to the door (`g.storyDoor`). Level inside = `p.level` (mids +1, masters +2). An old save whose lieutenant already fell counts that hold as broken. New Game+ clears the story holds and every region's saved quests (`savedQuests`).
- **Camera:** inside a hold the close camera only pulls in for tall tiles (`g.holdCamClear`: `#` unless `low`, closed `x`/`g`), not campfires, chests, stacks or rope rails. First hold entry shows a hint about the close camera and lock-on (`p.tutHold`).
- **Fixes:** holds no longer unlock the "Baked Brick" codex entry (the interior catch-all in `narrative.js`). Footsteps in holds follow the theme.
- **Arabic:** `story22_ar.js` (`AR22`) for every new string.
- **Tests:** `shots/r22holds.mjs <id> [out]` (door, trail, lock, hazards, both captains, fire, crack, gate, chests, the lieutenant's own fight and last words, quest, act, way out): all 8 clean. `shots/r22crit.mjs <id> <out>` (critique shots: door, way in, walk, mid ground, past the fire). The full sweep is clean (see "Shipped" below). `r21rival` now notes the lieutenants live in holds; `r15test` prints `holdDoors`.
- **Pitfall:** never edit `src/` while a `withvite.sh` test runs: Vite reloads the page and the test dies with "Execution context was destroyed". And `pkill -f vite` kills your own shell when the command line contains "vite"; kill by PID.

- **Shipped:** full sweep clean: r15test ×4, r16test ×4, r17test ×4, finaletest ×4, r21rival ×4, r18test ×4 classes, ngtest, traveltest, r22holds ×8, r21holds ×4 (rivalhold's last blow now un-vanishes Zubayr first, as r22holds does for Layth), trialtest, crafttest, benchtest, r21comp, r21mount, r21rift, r21hub marsh and docks. No page errors. Artifact **version 20** at https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (1.65 MB inlined; smoke-tested from `file://` with mobile emulation: ready, touch HUD, both hold doors). APK built by CI from the final push.
- **Next round: ideas (not approved):**
  - Device check of the close camera on Android: lock-on button reach, camera speed when steering with the joystick in tight corridors.
  - The falcon is still small and blobby on the shoulder (a proper sculpt).
  - Holds are about 30 tiles from door to master; longer second holds per region, or a third optional hold, if the user wants more.
  - Rising water in the Sunken Village (the R17 cistern mechanic) and fire spreading in the Burned Quarter would make the hazards more than set dressing.
  - Gate shortcuts in the story holds save only a few tiles (the validator in the Round 22 scratch notes flags them as "weak"); route the late areas further from the start so the shortcut matters.
  - One headless High-quality capture came out black once (Vaults, not reproducible). Watch for it.

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

### Shipped (final session)
- **Test sweep, all clean:** r15test ×4, r16test ×4, r17test ×4, r18test ×4 classes, ngtest, traveltest (now Sawad → marsh → Karkh → docks → Hamrin → docks, through the real "Ride north" / "Ride back" interactables), finaletest ×4, trialtest, crafttest, benchtest, r21comp, r21rival ×4, r21mount, r21holds ×4, r21rift, r21hub marsh and docks. No page errors anywhere.
- **Draws:** the hub-life props (kennel, ledger, the camp's needs before and after) were loose boxes, about 3 draws each over the main, shadow and AO passes. They now go through `mergeStatic` like every placed prop. Sawad hub High 677 → **596**, Low 373 → **333**, docks hub 612 → **568**, Hamrin camp 457 (High).
  - **Pitfall:** `perf.mjs` and `draws.mjs` add the `?` themselves. Pass `play&noadapt&q=high`, not `?play…`, or `play` is not read and you measure the title screen (about 2,600 draws). `shots/drawprobe.mjs <query>` splits draws by render target, before and after the cull.
- **Polish:** the forge stands at Bishr's side (`besideSmith()`, perpendicular to the camp centre → Bishr line in every camp), so it no longer hides behind him. The Craft tab has a switch at the top, "Rare to order" | "Set pieces · n/20", and learning a recipe opens Set pieces. Arabic added for the five sets and their 20 pieces, the materials (Iron Scrap, Silk Thread, Gem Shard), Bishr's Gems tab, the salvage toast, and the map walk "Walking: …".
- **Artifact:** version 19 at https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (1.57 MB inlined). Smoke-tested from `file://` with mobile emulation: title, Start, class pick, play, touch HUD, and joystick movement (raw touch events drive the joystick; Salim walked 13.7 m on the dev build). A cold start with no geometry cache takes about 4–5 minutes in headless SwiftShader. Use a 500 s ready timeout and 180 s screenshot timeouts.
- **APK:** built by CI from the final push (see "Getting the APK to the user").

### Next round: ideas (not approved)
- The falcon is small and blobby on the shoulder (a proper sculpt, like the saluki).
- `r21rival marsh` logs no Zubayr moves. That is a test artefact: the test puts Salim in deep water (depth 1.16), `navClear` fails, and Zubayr waits at 12 m. In play, deep water is walled off. Fix the test by choosing a dry spot.
- r16test docks prints "event undefined": the docks world-event label in the test log (cosmetic).
- Hold captain names to recheck against the naming rule: Hanzala and Jabala are ordinary Arab names, but Hanzala is also borne by a well-known Companion. Ask the user whether to swap it.

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
- **Round 26:** foes26.js, story26.js, camp26.js, story26_ar.js (also combat25.js, holds.js, scenes.js, story25.js, encounters25.js, human.js, game.js)
- **Round 25:** outline.js, combat25.js, encounters25.js, story25.js, story25_ar.js (also cinema.js choices, scenes.js, tutorial.js, holds.js rest, build.js, classes.js)
- **Round 24:** story24_ar.js (most changes are in cinema.js, main.js, audio.js, audio2.js, scenes.js, terrain.js, lighting.js, hublife.js, index.html)
- **Round 22:** storyholds.js, story22_ar.js (holds.js gained themes and the registry)
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
