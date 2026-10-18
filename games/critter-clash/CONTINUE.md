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

## Latest (2026-10-18): the 48-hour run
- **The user started a 48-hour chained build run; it ends at 2026-10-20 15:44 UTC** (top of HANDOFF.md; never reset it). Each session builds ~100 min or until ~300k context, then chains with the same prompt.
- Session 17b (R379–R392) added: Glowcap/Neon nights that follow the clock, a second arcade game (SKY HOP), the weekly post-game **Peak Gauntlet** (Keeper Orla, Golden Laurel hat), a world perf pass merging critter parts (town draw calls down 12–20%), a Hat Shop mirror, toadstool stools and a Sky Flat telescope, glowing toadstool houses, a Neon night market, Cloudtop sky lanterns, and Town Map icon chips. Next round is R393.
- Session 17a (R368–R378) added: Ace Trainers and Lv 18–21 wild critters in snow grass at the foot of Champion's Peak, sharper route trainers, Victorian street lamps (Sprout Village too), Neon City's noodle cart (daily XP bowl + Neon Boppers hat), a playable arcade game (CRITTER CLASH TURBO, pays berries), Adventure ending credits with a postcard tour of every town, ⛏️/💥 Town Map marks, a daily Alpha wild critter, a Journal Records tab, and a world perf pass (up to ~45% fewer draw calls). Next round was R379.
- Session 16j (R359–R367, the last of the user's window) added: Neon City's first delivery (Tinker Volt's pocket fan for the melting Pengsicle; Frosty Visor hat), a rocking chair that rocks, Cinder Town ember-gem digs, a Seashell beach bonfire and a Frostpeak campfire after dusk (toast a marshmallow once a day), and volcano towns that follow the clock (ember evenings, dark ash nights). Next round is R368. Final checks passed (tapcheck clean, the advcup Sprout run lands back in the world).
- Session 16i (R339–R358) added: Grandpa's cottage and Flo's room, a home trophy shelf, a lab growth chamber, themed Berry Centers, Frostpeak ice-gem digs, 4 deliveries between towns (new hats Seedling Sprout, Cocoa Bobble, Sleepy Nightcap), Flo's lost firefly, snowy/cloud evenings and nights with an aurora and shooting stars, street lamps, stadium floodlights, moonlit night grass/trees/water and owl hoots.
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
