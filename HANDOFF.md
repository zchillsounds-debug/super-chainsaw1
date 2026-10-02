# Sands of Baghdad: Handoff (after Round 2)

## Paste this into the new chat
> I'm continuing a game project called **Sands of Baghdad**: a Diablo-style 3D ARPG in Three.js set on the outskirts of Abbasid Baghdad just after the siege of 813 CE. I've attached `sands-round2-handoff.zip` (full source, git history as `repo.bundle`, and this HANDOFF.md). Please unzip it, read HANDOFF.md fully, run `npm install && npx vite`, and start **Round 3** exactly as specified in the "Roadmap" section. The goal is AAA studio quality (Diablo IV as the bar). Run the critique loop (screenshot → critique → improve) every round. Ask me clarifying questions and confirm with me before building. I play on Android, so republish the game as a playable Artifact after each round (touch controls must keep working). Update the existing link https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c rather than making a new one. Push to the session's assigned branch on zchillsounds-debug/super-chainsaw1.

## Restore the code
```
unzip sands-round2-handoff.zip -d sands && cd sands
git clone repo.bundle game && cd game        # branch claude/continue-build-vnpiq9
npm install && npx vite --port 5173          # http://localhost:5173
```
If the repo in the new session is empty, run `git fetch <path>/repo.bundle 'refs/heads/*:refs/remotes/bundle/*'` and then `git checkout -B <session-branch> bundle/claude/continue-build-vnpiq9` (only when the working tree is empty).
URL flags: `?play` skips the title, `?mobile` forces the touch UI, `?q=low|high` sets quality, `?noadapt` turns off auto quality, `?x=..&z=..` sets the spawn point.
**GitHub push has failed with a 403 in two sessions.** Before starting, reconnect GitHub at https://claude.ai/connect-github and install the Claude GitHub App on the repo. Until that works, keep a git bundle as the backup.

## Non-negotiable design rules (from the user)
- **No religious buildings or symbols at all.** That means no mosques, minarets, mausoleums, graves, crescents, crosses, star sigils (8-point stars included), Quranic text or religious greetings. Kufic-style lettering is fine **only** with non-religious text (act titles, place names).
- **No supernatural enemies.** All foes are human: brigands, deserters, mercenaries.
- **Authentic to 813 CE, not Western tropes.** Straight sayf swords, qalansuwa/bayda headgear, qaba coats, black Abbasid dress, short single period names, no epithets.
- Music in the Abbasid court style: Rast/Bayati modes, oud, qanun and daff. No Hijaz cliché.
- Ask clarifying questions and confirm before building.

## Story bible (decided)
Hero Salim (caravan guard). Ishaq (astronomer, House of Wisdom). Act 1: Ziyad at the caravanserai. Act 2: Hisham at the kiln yard. Act 3: Ghassan at the ruined Persian arch. The target length is 3 acts and 30–45 min.
Planned classes: Faris (heavy melee, the current kit), Rami (archer), Naffat (naft fire-thrower), 'Ayyar (rogue: daggers and stealth).

## What exists now (Rounds 1–2)
- **Mobile HUD:** a round minimap top-left that opens a large map on tap; small HP and MP orbs bottom-left; one ☰ menu (Inventory, Map, Controls); a quest pill top-centre.
- **Characters** (`sculpt.js`, `human.js`, `charmats.js`, `cloth.js`, `anim.js`): SDF-sculpted skinned meshes built with narrow-band surface nets.
  - Skeleton: 24 bones, A-pose bind, with weights taken from which shape owns each vertex.
  - Face: eyes with lids, a jaw bone, brows and a beard.
  - Clothing and materials: one region-based shader handling weave, mail, leather, pores and skin wrap lighting, with rim light.
  - Cloth: verlet skirt and mantle that collide with leg and torso capsules. Simulation runs only near the player on q≠low; otherwise the cloth is kinematic.
  - Spring bones on the beard, scabbard and sash.
  - Animator: planted feet with two-bone leg IK, a 3-hit combo, keyframed clips, flinch, ragdoll-style death, turn-in-place, blinking, `st.lookAt`/`st.talk`/`st.expr`.
  - Detail tiers: `detail:'hi'` for the hero, Ishaq and Ghassan; light for crowds. Geometry is cached per piece.
- **Cinematics** (`cinema.js`, `scenes.js`):
  - Director features: eased camera curves, letterbox, typed subtitles with rendered portraits and vocal cues, tap to advance, hold to skip, slow motion, BokehPass depth of field and a cine/dusk grade.
  - 7 scenes: prologue, briefing, Ziyad, Hisham, Ghassan intro, phase 2, epilogue.
  - Act cards use Reem Kufi.
- **Audio** (`audio.js`): Karplus-Strong oud and qanun improvising in Rast/Bayati, with daff wahda/maqsum rhythms, a combat drone layer, stingers and formant vocal cues.
- **Saving** (`save.js`): auto-saves per act to localStorage; the title screen has Continue / New Chronicle.
- **Test tools:**
  - `shots/shot.mjs`: a single screenshot.
  - `shots/multi.mjs <w> <h> <query> <outdir> <steps.json>`: one page load with many shots.
  - `shots/close.js`: helpers `__close(angle,dist,h,lookY,who)`, `__nearest()`, `__look(e)`.
  - Debug hooks: `__director`, `__SCENES`, `__sim(sec)`.
  - Headless SwiftShader is slow. **Don't run two captures in parallel**, and remember that CSS transitions crawl in headless.

## Known issues (fix first in Round 3)
1. Cloth was retuned (thinner leg capsules, damping 0.94, hoop constraints) and not re-verified at full run. Check that the skirt doesn't flare into a "tutu" and the mantle doesn't fly out like a flag.
2. Sculpt load time is about 1.5 s at low quality on desktop, likely 3–4 s on a phone. Cache the sculpted geometry in IndexedDB (key = piece key + version) and time-slice generation behind the loader.
3. Ziyad's and Hisham's fall shots frame the body from too high, and loot beams intrude. Use a lower orbit and hide the beams during scenes.
4. The prologue's guard-arrow shot needs a framing check. Camels are low-poly primitives next to the new humans, so sculpt camels with the same system.
5. The score has never been listened to. Do a balance pass: levels, how dense the melody is, and the drone volume.
6. The kiln backlog is still open: darker fired brick, soot, chimney smoke and stoke-hole glow.
7. Foot planting was only verified on stills. Record a short frame sequence to check for sliding.

## Roadmap to AAA (one round each; confirm scope with the user first)
**Round 3: Classes and combat feel**
- 4 classes with distinct kits and silhouettes (Faris, Rami, Naffat, 'Ayyar), and a class pick in the prologue.
- Hit feel: hit-stop per weapon weight, camera impulse, blood and spark decals, directional knockback, stagger meter, dodge-roll with i-frames, parry window.
- Enemy AI: flanking, archers keeping range, shield-bearers blocking, grouping tokens so only 2–3 foes attack at once.
- Fix the known issues above.

**Round 4: World and Act II hub**
- A merchant town hub (suq) with a vendor, blacksmith (upgrade and salvage) and stash.
- Add the night/dusk lighting the prologue implies: time-of-day presets per act.
- Zone streaming or chunked terrain. Interiors: caravanserai courtyard and kiln tunnels.
- Environment art pass: trim sheets, decals, vertex-painted wear, scattered clutter, better palms and water.

**Round 5: Rendering to Diablo IV level**
- Clustered or forward+ lights so many torches can cast light.
- Cascaded shadows with contact shadows, SSR on water, volumetric god rays and dust, a colour LUT per act, TAA instead of SMAA on high.
- Character LOD chain with impostors far away; GPU skinning budget checks on mid-range Android (target 30 fps, 60 fps on high).
- Hair cards and better beard shading. A cloth wrinkle normal map driven by stretch.

**Round 6: Loot, progression, endgame**
- Skill trees per class, legendary aspects, item sets, a crafting/enchanting loop.
- Dungeons ("ruined qanats") with modifiers, difficulty tiers, and a boss rush.

**Round 7: Audio and narrative polish**
- More scored cues per act. Positional SFX with an occlusion filter. Footstep surfaces (sand, brick, water). A crowd ambience bed in the suq.
- More cutscenes for side quests. A full dialogue system with choices, a journal and a codex of real Abbasid history.

**Round 8: Production quality**
- Settings menu (graphics, audio, controls, accessibility: subtitles size, colour-blind modes, hold vs toggle).
- Controller support. Localisation (Arabic UI with right-to-left layout).
- Automated regression screenshots and a performance HUD.
- Tutorial/onboarding. Telemetry-free playtest checklist.
- Ship as a PWA (offline, installable on Android).

**If the user approves external assets**
CC0 rigged characters or animations (Quaternius, Kenney, Mixamo-style) or photogrammetry would be the biggest jump toward AAA. Ask first. Everything must stay inside the single-file artifact (16 MB cap).

## File map (src/)
- main.js: renderer, loop, director hookup, Continue/start flow
- graphics.js: post-processing (GTAO, Bokeh, bloom, grade with uCine/uDusk, SMAA)
- terrain.js, world.js, buildings.js, props.js, vegetation.js, water.js: the world
- sculpt.js: SDF and surface nets. human.js: humanoid assembly. charmats.js: character shader. cloth.js: cloth and Jiggle. anim.js: animator and CharLOD
- characters.js: weapons and camel; re-exports humanoid
- entities.js: enemy types. game.js: gameplay, AI, boss, quests, cineTick, checkpoints
- cinema.js: Director. scenes.js: the 7 scenes. save.js: saving
- audio.js: SFX, score, stingers, vocals
- ui.js, mobile.js, style.css: HUD and touch controls (round 2 mobile overrides are at the end of style.css)

## Publishing
`npx vite build`. Then inline `dist/assets/*.js` (as `<script type="module">`, escaping `</script`) and `*.css` into `dist/index.html`, keeping the Google Fonts link (includes Reem Kufi). Publish with the Artifact tool to https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (read it first in a new chat, then publish with `url`). Currently Version 4.
