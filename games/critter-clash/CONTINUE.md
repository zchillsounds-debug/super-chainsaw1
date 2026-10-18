# Continue Critter Clash in a new Claude chat

The full, detailed handoff lives in the repo at `games/critter-clash/HANDOFF.md`, and a copy ships with this package (`HANDOFF.md`). This page is the short version: what's here and how to pick it up.

## What's in this package
| File | What it is |
|---|---|
| `critter-clash-source-226035e.zip` | Full game source at commit `226035e`: `games/critter-clash/` (src, tools, public, signing key, package files, HANDOFF.md) plus `.github/workflows/critter-apk.yml` (the APK build). No `node_modules`; run `npm install`. |
| `HANDOFF.md` | The complete handoff: architecture, test tools, every round done (R1–R279), the backlog, gotchas and chaining steps. |
| `critter-clash-1.0.306.apk` | The latest Android build (version 1.0.306, built from b10018b, which has the same game code as 226035e). It installs over earlier builds and keeps the save, because every build is signed with the committed debug key. |

## Where the live code is
- Repo: `zchillsounds-debug/super-chainsaw1`, branch **`ccr-4fc93d6e-suxlhd`**, folder `games/critter-clash/`.
- Latest commit: `226035e` (after Round 279).
- Each push that touches `games/critter-clash/**` builds an APK on the orphan branch `apk-critter-clash`.

## State of the game (2026-10-15, 04:15 UTC)
- A real-time 3D arena brawler with 19 original critters, each with 3 growth forms. It has Tournament cups, Quick Battle, Challenges, Survival, Daily, Team Battle, Camp and a Critterdex.
- **Adventure mode** (the current focus) is a Pokémon Red/Blue style world with a story. It has 8 towns and routes, 7 stadium cups, 5 trials, Champion's Peak and the ending, plus interiors, a Town Map with flying, a clock of day, rain weather, gift boxes, shinies, a walking buddy and trainer rematches.
- Session 16e (R255–R279) added: grass sway, new palms, chimney smoke, rain (world and fights), room furniture, the Berry Center smoothie blender, smooth water corners, trainer role hats, a natural meadow for wild fights, footprints, a night Town Map, doorway light, beach decor, falling leaves and petals, toadstool spores, and Pecan weather news.
- Final checks for the session passed: tapcheck was clean at 740×360 and 412×915, the Sprout Cup played from the world and landed back there, and the wild-fight wins ran without errors.

## Latest (2026-10-18)
- Sessions 16f–16h (R280–R338) added: Hat Shop, Trader Tock, fishing + fish album, stadium lobbies (and a champion lobby after a win), berry bushes, beach digs, 8 townsfolk favours with a 📔 Journal and Town Map marks, a picture hat picker, new rooms (forge, lodge, ship cabin, toadstool houses), weather/night polish. See HANDOFF.md → Session 16f/16g/16h.

## Two Claude chats share this branch
- The user's own chat (session `01UPXMwf8USorUzs3NksZdTA`, rounds numbered "R245b+") owns the Adventure battles: the open-field scene, results and the flow back to the world (screens.js results/worldFight, battle.js, arena.js open mode, hud.js).
- World-side work belongs in world.js, worldmaps.js, interiors.js and story.js. HANDOFF.md → "Session 16e → Ownership note" lists the small battle-side edits that session 16e made, which still need review.
- Always `git fetch origin ccr-4fc93d6e-suxlhd && git merge --no-edit origin/ccr-4fc93d6e-suxlhd` before pushing. Never rebase or force-push.

## Prompt to paste into a new Claude Code session
Set the session's repo to `zchillsounds-debug/super-chainsaw1` on branch `ccr-4fc93d6e-suxlhd`, then paste:

> Continue building Critter Clash. Read games/critter-clash/HANDOFF.md fully and follow it, starting with the "Session 16", "16b", "16c", "16d" and "16e" sections. Focus: Adventure mode polish (see "Session 16e → Next ideas"). Keep critiquing screenshots of the world, rooms, menus and open-field fights at 915x412, 740x360 and 412x915. Run the critique loop (screenshot, critique, improve) round after round. Commit and push each round to branch ccr-4fc93d6e-suxlhd: merge origin first, and never force-push. Round numbering continues from R280. Ask me clarifying questions and confirm before building. Chain to a fresh session near 300k context, following the HANDOFF chaining steps. Send me the APK at the end.

If you're not using the cloud repo (a local copy from the zip, for example):
```
unzip critter-clash-source-226035e.zip && cd games/critter-clash
npm install
npx vite --port 5180        # http://localhost:5180
```
URL flags (`?play`, `?auto`, `?mobile`, `?q=low|med|high`), the test tools (`tools/advshot.mjs`, `advfight.mjs`, `advwins.mjs`, `advcup.mjs`, `tapcheck.mjs`, …) and the APK steps are all in HANDOFF.md.

## Open questions for the user
- How do rain, the clock of day, grass sway and the smoothie blender feel on your phone? Is the frame rate OK?
- Do the win screen and the battle look (the R244b/R277 fixes) look right now?
- Do you want more hours of Adventure polish, or a new direction?
