# Sands of Baghdad: Handoff (after Round 1)

## Paste this into the new chat
> I'm continuing a game project called **Sands of Baghdad**: a Diablo-style 3D ARPG in Three.js set on the outskirts of Abbasid Baghdad just after the siege of 813 CE. I've attached `sands-of-baghdad-handoff.zip` (full source, git history as `repo.bundle`, the screenshot script, and this HANDOFF.md). Please unzip it, read HANDOFF.md fully, run `npm install && npx vite`, and start **Round 2** exactly as specified in the "Round 2 spec" section. Run the critique loop (screenshot → critique → improve) every round, aiming for AAA graphics like Diablo IV. Ask me clarifying questions and confirm with me before building. I play on Android, so republish the game as a playable Artifact after each round (touch controls must keep working). Update the existing link https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c rather than making a new one. Push to branch `claude/game-design-feedback-u77pmt` on zchillsounds-debug/super-chainsaw1.

## Restore the code
```
unzip sands-of-baghdad-handoff.zip -d sands && cd sands
git clone repo.bundle game && cd game        # branch claude/game-design-feedback-u77pmt
cp ../shot.mjs shots/ 2>/dev/null || (mkdir -p shots && cp ../shot.mjs shots/)
npm install && npx vite --port 5173          # http://localhost:5173
```
URL flags: `?play` skips the title, `?mobile` forces the touch UI, `?q=low|high` sets quality, `?noadapt` turns off auto quality, `?x=..&z=..` sets the spawn point.
GitHub push from the last session failed with a 403. If it fails again, reconnect GitHub at https://claude.ai/connect-github and install the Claude GitHub App on the repo.

## Non-negotiable design rules (from the user)
- **No religious buildings or symbols at all.** That means no mosques, minarets, mausoleums, graves, crescents, crosses, the ۞ mark, Seal of Sulayman/star sigils, Quranic text or religious greetings ("Peace be upon you", etc.). Kufic-style lettering is fine **only** with non-religious text (act titles, place names).
- **No supernatural enemies.** No djinn, ifrit, ghuls or imps. All foes are human: brigands, deserters, mercenaries.
- **Authentic to 813 CE, not Western tropes.** Straight swords (sayf, not scimitar/shamshir/kilij), qalansuwa/bayda headgear, qaba coats, black Abbasid dress, short single period names (Salim, Ishaq, Ziyad, Hisham, Ghassan). No "the Cutthroat"-style epithets.
- Audio should move away from the generic "Hijaz" cliché toward Abbasid court style: Rast/Bayati modes, oud + qanun plucks, daff frame-drum rhythms.
- The user prefers to be asked clarifying questions and to confirm before building.

## Story bible (decided)
- **Hero:** Salim, a caravan guard. Abbasid black qaba over mail, felt qalansuwa wound with a dark turban, a red wool mantle on his **back**, coat tails and a straight sayf.
- **Setting:** the Sawad (farmland) outside Baghdad, just after the 811–813 civil war between al-Amin and al-Ma'mun. Deserters and raiders exploit the chaos.
- **Act 1:** Salim's caravan is ambushed. Ishaq (astronomer of the Bayt al-Hikma, whose instruments were in the caravan) gives the mission. Ziyad holds the old caravanserai.
- **Act 2:** Hisham's knife-men hide in the brick-kiln yard beside a ruined Sasanian palace vault. Add a new zone/town hub with a merchant.
- **Act 3:** Ghassan, the renegade commander, at the ruined Persian arch (Taq Kasra style), trying to choke the grain road.
- Target length is 3 acts and about 30–45 minutes, with 6–8 cutscenes. The game auto-saves per act/checkpoint (localStorage) and the title screen gets a Continue button.
- **Classes still to come (Round 3):** Faris (heavy melee, which is the current hero kit), Rami (archer), Naffat (naft fire-thrower), 'Ayyar (rogue with daggers and stealth).

## Round 1 (done, published as Version 3 of the artifact)
- The mosque became a covered market (`suq()`) with a watchtower and well. The mausoleum became `palaceVault()` (a ruined Sasanian brick vault). The graveyard became a kiln yard (`kiln()`, `brickStack()`); `SITES.graveyard` was renamed `SITES.kiln`. Minarets were removed from the distant city, along with the star sigil, map icons, the ۞ banner mark and the Seal of Sulayman.
- **Enemies** (`entities.js`): bandit = Brigand; spearman = Deserter Lancer; archer = Brigand Archer; deserter = Knife-man (ambushes from a crouch); naffat = Torch-bearer; commander = **Ghassan** boss (humanoid scale 1.55). The boss AI (`game.js bossAI`) has an overhead `slam`, a `command` gesture that triggers a fan of thrown naft pots, a catapult barrage of telegraphed circles, and a call for his guard.
- **Hero:** `humanoid()` options `qaba`, `cap`, `capBand`, `cloak` (now a pivoted mantle on the back), `tails`, `helm`, `scabbard`, plus weapons `sword|dagger|torch|spear|bow`.
- **Movement momentum:** `p.vel` gets acceleration and a slide on stop. `st.lean` and `st.fwdLean` drive hip and spine lean, and the mantle and tails trail with walk, lean and flutter.
- **Mobile:** smaller translucent thumb cluster, `--tscale`/`--topa` CSS vars with a ⚙ settings panel (localStorage), a one-line quest pill (tap to open), the map behind a "Map" button, a compact bottom dialog, and skills hidden during dialog.

## Round 2 spec (do this next)
### A. Cinematic system + story (original Round 2)
1. A `cinema.js` director: timeline of shots (camera position/target curves, durations, easing), letterbox bars, input lock, subtitle bar with speaker portrait and short non-verbal vocal cue sounds, and **tap-and-hold to skip** (a ring fills on hold).
2. Effects: film grain plus a warm grade during cinematics, slow-motion hits (time scale), depth of field for the speaker (bokeh pass; off on `q=low`), and calligraphic **act title cards** in Kufic-style lettering with non-religious text only.
3. Scenes: the prologue (caravan on the road at dusk, ambush, Salim survives); the Ishaq briefing; Ziyad's defeat; Hisham's defeat; Ghassan's intro and phase changes; and the epilogue.
4. Music: rewrite `audio.js`. Replace Hijaz with Rast/Bayati modes, an oud voice, a qanun-like pluck layer and daff rhythms, with combat intensity layers and cinematic stingers.

### B. Mobile interface (new user feedback)
- The **minimap must go to the top-left**, far from the ability buttons (bottom-right). Make it a small round map (about 84px) top-left that opens to a larger map on tap.
- Declutter. Move the HP/MP orbs so they don't collide with the map. One option is two slim arc bars hugging the thumb cluster, or small orbs bottom-left above the joystick zone. Merge Bag and ⚙ into one menu button. Keep the top centre for the quest pill only.
- Test at 390×844 portrait and 844×390 landscape. Nothing should overlap, and the playfield centre should stay clear.

### C. Character graphics to AAA/Diablo level (new user feedback; highest priority)
Characters are currently capsule/lathe primitives with blank faces. The goal is realistic body, face and structure, with fluid movement that has weight and dimension.
- **Body:** replace per-bone primitives with a single **skinned mesh** (THREE.SkinnedMesh with a proper skeleton: pelvis, spine ×3, neck, head, clavicles, upper/lower arms, hands, thighs, shins, feet). Build the mesh procedurally (sculpted with SDF or marching cubes, or lofted cross-sections) so the shoulders, chest, waist and limbs blend smoothly with real anatomy and proportions (about 7.5 heads tall, broader shoulders for warriors). Note: no external assets are used today. If you consider adding glTF models (for example CC0 Quaternius/Kenney characters with Mixamo-style rigs) embedded as base64, ask the user first, and keep everything inside the single-file artifact under the 16MB limit.
- **Face:** modelled brow ridge, nose, cheekbones, jaw, lips, ears, eyes with whites/iris and eyelids, eyebrows and a beard/moustache with strands or alpha cards. Skin needs subsurface-like wrap lighting and a normal map with pores. Add a few blend shapes or bones for blinking and expressions during cutscenes.
- **Clothing:** the qaba, mantle and coat tails should be cloth-simulated, at least verlet chains on the hem and mantle vertices with body-capsule collision, so they flow and swing with momentum. Add fabric normal and roughness detail, gold tiraz bands, layered mail with a proper normal map, and leather straps.
- **Animation:** a procedural animation layer on the skeleton, covering:
  - a **locomotion blend tree** (idle → walk → run, speed-matched stride, no foot sliding) with **two-bone IK foot placement** on terrain and pelvis bob/sway
  - upper-body counter-rotation and arm swing
  - **3-hit combo** attacks with anticipation, follow-through and recovery
  - hit reactions with additive flinch
  - deaths with ragdoll-like settling
  - turn-in-place
  - secondary motion with spring bones for the beard, tails, scabbard and sash

  Keep the existing momentum and lean values (`st.lean`, `st.fwdLean`) and feed them in.
- **Rendering:** contact shadows/AO under feet, a stronger rim light, the character lighting rig in cutscenes (key, fill and rim), and per-character LOD for mobile (low poly count and no cloth sim on `q=low`).
- Apply this to the hero first, then Ishaq, then the enemies and Ghassan.
- **Validate with close-up screenshots** from several angles plus walking, running and attacking frames. Critique each loop against Diablo IV character shots.

### Known critique backlog (from Round 1)
- Brass and steel helmets bloom too hot (lower metalness or raise roughness, or clamp bloom).
- Kilns read as flat domes. They need darker fired-brick tint, soot, smoke from the chimney and a visible stoke-hole glow.
- The robe skirt reads as a stiff cone. Cloth sim will fix this.
- The boss intro is just a banner. Make it a proper cinematic in Round 2.
- `shots/run_auto.mjs` (the full autoplay test) wasn't in the bundle. `shot.mjs` covers screenshots and the inline JS hooks.

## Stack
Vite 5 + three@0.170. Everything is procedural (no external assets). The build is a single-file HTML artifact.

## File map (src/)
- main.js: renderer, lights, sky, main loop, adaptive quality, debug hooks `window.__sim(sec)`, `__game`, `__mk`, `__ready`
- graphics.js: post-processing (GTAO, bloom, grade/vignette/grain, SMAA), QUALITY
- terrain.js: heightfield, canal, roads, SITES (village, serai, kiln, arch), `heightAt`
- world.js: places everything, colliders, occluders, fires
- buildings.js: `suq`, `caravanserai`, `greatArch`, `palaceVault`, `kiln`, `roundCity`, `house`
- props.js: stalls, carts, tents, `brickStack`, bridge, waterwheel, lanterns
- characters.js: `humanoid()` rig + `animateHumanoid()`, `sword()`, camel. **This is the file to replace with the skinned character system.**
- entities.js: enemy types. items.js: loot (sayf bases, uniques)
- game.js: player, momentum, combat, skills, AI, boss, loot, NPC dialog, camera, see-through occlusion (skips MeshBasicMaterial)
- ui.js, style.css: HUD (the mobile overrides are at the end of style.css). mobile.js: joystick, thumb skills, settings panel
- audio.js: procedural SFX and music (to be rewritten)

## Testing
`node shots/shot.mjs <w> <h> "<query>" out.png "<js to run after load>" <waitMs>` uses headless Chromium with SwiftShader (slow, so use `__sim(sec)` to advance time). It prints page errors and `window.__log`.
- Hero close-up: override `__game.updateCamera` to orbit the player (see the example in the Round 1 transcript: camera 4.2m away at 2.3m height, looking at hip height).
- Phone: `node shots/shot.mjs 390 844 "play&mobile&q=low" out.png "__sim(0.5)" 3000`
- Boss: `?x=10&z=-72` then `__sim(4)`.

## Publishing
`npx vite build`. Then inline `dist/assets/*.js` (as `<script type="module">`, escaping `</script`) and `*.css` into `dist/index.html`, keeping `<title>Sands of Baghdad</title>` and the Google Fonts link. Publish with the Artifact tool to the existing URL https://claude.ai/artifact/KMb1Ng8m9siBf7AHpNJD7c (read it first in a new chat, then publish with `url`).
