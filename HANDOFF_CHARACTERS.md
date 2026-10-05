# Sands of Baghdad: Handoff for the Characters round (audit step first)

## Paste this into the new chat
> I'm continuing **Sands of Baghdad**, a Diablo-style 3D ARPG in Three.js (Vite + Capacitor Android) set in Abbasid Baghdad, 813 CE. The repo is `zchillsounds-debug/super-chainsaw1`. Read `HANDOFF.md`, `STORY.md` and this file fully, then run `npm install && npx vite`.
>
> **Task: the Characters round, starting with the audit only.** Do not change any code until I confirm.
> 1. Capture close-up screenshots with the tools in `shots/` of Salim, each of the four classes (Faris, Rami, Naffat, 'Ayyar), a few enemy types and captains, and the NPCs (Ishaq, Yusuf, Bishr, 'Amr, Rafi').
> 2. Write a concrete problem list per character covering four issues I reported: **blocky or smooth bodies, bad faces and heads, flat clothing, stiff animation**.
> 3. Show me the screenshots and the list, propose the fixes in order, and wait for my go-ahead.
>
> Ask me clarifying questions and confirm before building anything. Develop on the session's assigned branch. Do not open a PR unless I ask.

## Decisions already made with the user
- **Approach:** improve the current procedural SDF characters. Do not replace them with imported models.
- **Scope:** all four issues (blocky/smooth bodies, bad faces/heads, flat clothing, stiff animation) and all character groups (Salim, four classes, enemies, NPCs).
- **Order:** characters first. **Icons and menus come after** (Gemini icons plus the Round 12 mobile UI overhaul in `HANDOFF.md`).
- **Engine:** staying on Three.js and the web pipeline (Option A). The later graphics upgrade is WebGPU, better post-processing and image-based lighting.
- **Assets:** this cloud session can't reach Poly Haven, ambientCG, Kenney, Quaternius, Sketchfab or Mixamo; only GitHub works. The user supplies downloaded or Gemini-generated files by uploading them to the repo (suggested folder `assets/raw/`), with a `CREDITS.md` for sources and licenses.
- **Gemini:** it can supply seamless textures, a sky panorama, icons and concept art. It cannot supply rigged 3D models. Textures must be flat-lit with no baked shadows or highlights, so day/night lighting still works.

## Proposed plan (confirm each stage with the user)
1. **Audit:** screenshots plus a problem list per character (do this first).
2. **Faces and heads:** rework head sculpt in `sculpt.js` and `human.js`: proportions, brow, nose, eyes, ears, period beards and headgear.
3. **Bodies:** refine SDF shapes: smoother transitions, hands, shoulders, clothing volume.
4. **Clothing:** weave and normal detail, trim, wear and dirt. Cloth or leather textures from Gemini can feed `charmats.js`.
5. **Animation:** fix strafing glide, add weight shifts and better attack, hit and death animations (including Jabir's prologue fall, see Known gaps in `HANDOFF.md`).
6. **Critique loop each step:** screenshot, compare, iterate, and check draw calls with `shots/perf.mjs` so mobile performance doesn't regress.
7. **Publish:** push to the branch, republish the artifact (update the existing link in `HANDOFF.md`), and let CI build the APK.

## Design rules (non-negotiable)
- No religious buildings or symbols: no mosques, minarets, crescents, crosses or stars, and no religious text or greetings.
- No supernatural enemies. All foes are human.
- Authentic to 813 CE: straight sayf swords, qalansuwa or bayda headgear, qaba coats, black Abbasid dress.
- Check any generated image or texture for forbidden shapes before using it.

## Where to look in the code
- `sculpt.js`: SDF sculpting. `human.js`: human rigs and heads. `charmats.js`: character materials. `cloth.js`: cloth sim. `anim.js`: animation. `characters.js`: character definitions. `creatures.js`: camels. `geocache.js`: IndexedDB cache of sculpted geometry (clear it when the sculpt changes).
- `classes.js`: the four classes and their looks. `cinema.js` and `scenes.js`: cutscenes.
- Test tools in `shots/`: `shot.mjs`, `multi.mjs`, `close.js` (close-up camera helpers), `perf.mjs`, `draws.mjs`, `eval.mjs`. `shots/` is gitignored, so use `git add -f` for new scripts. Headless SwiftShader runs at about 1 fps, so don't run two captures at once. Debug hooks: `__game`, `__sim(sec)`, `__director`, `__SCENES`.
- URL flags: `?play`, `?cls=faris|rami|naffat|ayyar`, `?tod=golden|dusk|night|dawn`, `?q=low|high`, `?mobile`, `?perf`, `?x=..&z=..`.

## Known gaps relevant here (from `HANDOFF.md`)
- Jabir slumps rather than lying fully down in the prologue, because the death fall doesn't finish in cutscenes.
- Farud's and Hisham's death shots and the boss intro still use old camera work.
- Walking sideways while keeping aim can look like gliding.
- Combat feel hasn't been verified on a device.

## Later (not this round)
- Gemini icons for items and skills, plus the Round 12 mobile UI overhaul.
- Gemini textures and sky panorama, PBR and HDRI lighting, WebGPU and post-processing.

## User preferences
- Ask clarifying questions and confirm before building anything.
- When context reaches about 300k, wrap up and write a handoff file for a new chat.
- Android is the user's playtest device. Touch controls must keep working.
