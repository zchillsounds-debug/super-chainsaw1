# Critter Clash: Completion roadmap (C1–C8)

> **Note from session C1 (2026-10-24):** the prompt for this run says the C1–C8 plan was agreed with the user, but no copy of it had been pushed to any branch, and HANDOFF.md had no "Completion run" line. So C1 drafted the plan below from the open threads in HANDOFF.md and the game's state. **If the user's agreed plan differs, theirs wins: replace this section with it** and keep the status lines.

Goal: take Critter Clash from "keeps growing" to **finished**. That means every thread closed, every mode and screen consistent at phone sizes, no dead ends, a clear 100% goal, and a release-ready final APK. Each session does the first milestone that isn't done, keeps about 80% of its time on that milestone and 20% on the bugs it finds, and runs the usual checks.

### C1. Close the open threads
- Finish R723: Surfer Malia offers WAVE RIDER at night (night flag, a night best/prize, a Records/Today note).
- Night looks for the post-game spots that lack one (Rainbow Reach).
- Write up R713–R723 in HANDOFF.md (an earlier session didn't hand off).
- A full balance robin with all critters, plus fixes for anyone outside 40–65%.

### C2. Mainland story audit
- Play a fresh save from the intro to the ending with the tools (advstory / advcup / advtrial per beat). Fix any soft-lock, missing ❗, or wrong nextGoal line.
- Check that every map loads (advload) and every door/edge leads somewhere sensible.

### C3. Chapter 2 and post-game audit
- The same for the ferry → Chapter 2 finale → Tower / legends / Masters / quests.
- Check that every Records row can reach 100%, and that every hat, pearl, photo and fish can be got.

### C4. 100% completion goal
- A clear completion target (Clashara % plus the isles), with a reward and a short closing scene for 100%, shown in the Journal.

### C5. UI consistency pass
- Every menu, modal and Journal tab at 915×412, 740×360 and 412×915: spacing, font sizes, button sizes, scroll, back buttons. Fix overlap and clipping.

### C6. Audio and game feel
- Sound coverage: every button, mini-game, quest step and reward has a sound. Music per region and time of day. Haptics/vibration where it helps.

### C7. Stability
- Save robustness (old saves migrate, a broken save recovers), long-session memory and leaks (map changes, battles in a row), errors in the console, and the frame rate on the phone-default quality.

### C8. Release polish
- Title screen, credits, app icon and version, a final How to Play, and the final full check pass (tapcheck, advcup, advstory, all the feature tools). Then the final APK.

### Completion status
- **C1: done (session C1, R723–R730).** Night WAVE RIDER (R723), Rainbow Reach at night (R724), R713–R723 written up in HANDOFF.md, a full 28-critter robin (which also found and fixed a mirror-cyclone battle crash, R725) and two balance passes (R729–R730: Woolt 50%, Smokeshell 44%, Blowfin 44%, Skimray 43%; Pumicub swung 35% → 69% and was trimmed to power 1.25, not re-measured). Left over: the Tower hall banners are small from the top-down camera (minor).
- **C2: done (sessions C1–C2, R726–R731).** `tools/mapwalk.mjs` (every map's doors, edges and landings), `tools/mainwalk.mjs` (Chapter 1 gates), the whole mainland story played in order with advstory/advcup/advtrial (Pecan intro → King Snooze, `crowned` and `ending` set), post-game next-goal lines (R727). Session C2 (R731): **an orange story ❗** (`storyMark` in story.js) over whoever starts the next main beat (yellow ❗ stays for favours); nextGoal now points at the optional-looking Trial of Heart and follows Pip's rescue step by step; `tools/goals.mjs` prints the ☰ goal line and every ❗ at 25 story stages (all correct); **losing** each story battle (`LOSE=1 node tools/advstory.mjs ...`: Bouldillo, the Night Gang, Dash on the peak, King Snooze) sends the hero to the spawn with the beat still waiting (no soft-lock); every balloon has a way back. Also: the landscape camera stops short of a map's south border (Neon City's south road was half a screen of roofs).
- **C3: started (session C2).**
- C4–C8: not started.

# Critter Clash roadmap: Adventure Chapter 2 (agreed with the user on 2026-10-21)

## What the user decided
- **Goal:** keep growing the game (no fixed end point, no store work yet).
- **Phone:** recent builds run well on the user's phone, so no performance push is needed.
- **Focus:** Adventure content. That covers a new region and story, new critters, deeper side content and post-game challenges, in that spirit.
- **Mix:** about 80% new content and 20% bug fixes and polish.
- **Designs:** just build them. Make sensible, **original** designs (no Pokémon IP) and keep going.
- **Run:** another 48-hour chained run. The first session of the run sets the end time (start + 48 h) at the top of HANDOFF.md.

## Milestones (in order; each session picks up the first one that isn't done)

### M1. New critters (about 2–3 sessions)
- Add **6 original critters** that the new region needs: one per type (fire, water, leaf, spark, stone, gust). Give each one stats, moves, a special, 3 growth forms (growth.js), a portrait and a Critterdex entry.
- Build them from the existing part system in critters.js and add any signature parts they need. Each one should read clearly at world scale and in battle.
- Run a balance robin (`tools/robin.mjs`) after adding them. Keep everyone at roughly 40–65% wins.
- Done when the new critters show up in Quick Battle and the Critterdex, the balance is within range, and tapcheck is clean.

### M2. Chapter 2 region and story (about 5–7 sessions)
- **After the ending**, a ferry from Seashell Town opens a new region (an island chain, with its own name and its own look). It has about 4 towns plus routes, and each area gets a strong visual identity of its own.
- The new critters live in its tall grass. New trainers and townsfolk.
- **3 new stadium cups** and a new rival/antagonist story arc with a finale. Build it from the existing systems: worldmaps.js maps, interiors, story.js beats, CUPS in data.js, the Town Map, the Journal and the credits.
- Give the region its own Berry Centers, a Hat Shop stock, fish, a dig spot or two, and photo landmarks, so the existing systems carry over.
- Done when you can play a fresh post-game save from the ferry to the Chapter 2 finale and back. Add an `advcup`-style check for one new cup.

### M3. Deeper side content (about 3–4 sessions)
- At least one **cave/dungeon** with simple puzzles: push boulders, a dark section lit by a lantern, switches.
- **Hidden areas** reached by new field skills, or by items earned in the story.
- Longer **quest chains** (3–5 steps across towns) with real rewards, such as a rare critter, a hat or a key item.
- Rare finds: hidden items, rare wild spawns tied to weather or time of day.

### M4. Post-game challenges (about 3–4 sessions)
- A **Battle Tower** with win streaks, ranks and rewards.
- **Legendary critters:** 2 original ones, each with its own story and a boss-style encounter.
- Harder trainer rematches and boss battles. Champion-level teams in the new region.

### Always (about 20%)
- Fix any bug you find on the way. Run the checks at the start and end of each session: tapcheck at 740×360 and 412×915, plus the advcup Sprout run, against a production build.
- Keep screenshots and critiques going at 915×412, 740×360 and 412×915.
- Keep HANDOFF.md, CONTINUE.md and this file's milestone status up to date.

## Ownership (unchanged unless the user says otherwise)
- The user's own chat owns Adventure battles, results and the flow back to the world: screens.js results/worldFight, battle.js, arena.js open mode and hud.js.
- New cups, new critters and new arenas may need small battle-side hooks. Keep them minimal, and list them in HANDOFF.md under "Note for the user's chat" so they can be reviewed.

## Status
- **M1: done (session 18a, R672, R675, R678, R680).** Smokeshell (fire, volcano hermit crab), Blowfin (water, puffer fish), Mossloth (leaf, moss sloth), Toucharge (spark, thunder toucan), Pumicub (stone, pumice bear cub), Skimray (gust, breeze manta): new parts, six new specials, 3 growth forms each, shinies, lines, intro/win animations, Critterdex and Quick Battle (as trials until befriended in the isles). Balance: Toucharge, Smokeshell, Mossloth and Skimray landed in 44–63%; Blowfin and Pumicub were still ~27% after a first buff and got a second, bigger buff in R680 (**not re-measured yet: run `PORT=5181 node tools/robin.mjs 1 blowfin,pumicub` first next session**).
- **M2: done (session 18a: R673, R674, R676, R677; session 18b: R681–R687).** The Sunny Gull ferry (Seashell ⇄ Port Coral ⇄ Starfall Atoll), Port Coral (Coral Cup), Palm Path (rope bridge opens after the Coral Cup), Breezy Bluffs (Gale Cup, windmills, kite kids, Kite Loft), the Ash Trail (steam vents; Gloom Gull Skua guards it after the Gale Cup), Ember Isle (Caldera Cup, black sand, smoking volcano, Surf Shack, Volcano Lab), Starfall Atoll (Gloom Gull hideout, Captain Morra finale, the Sunstone, the striped lighthouse that lights up), Dash in Port Coral / Ember Isle / the atoll, Chapter 2 credits, island Journal Records, reef fish, island landmark photos, island digs, Pecan news adv27–28. Checks: `advcup` on all three island cups, `tools/ch2walk.mjs` (every Chapter 2 route and gate), `advstory` through the finale.
- **M3: done (session 18b: R688–R690; session 18c: R692–R694).** The Ember Grotto (boulders, a pit, a pressure plate and gate) and the dark Deep Grotto (Keeper Lumi's Sun Lantern, a treasure chest); the Sunstone Festival chain (4 townsfolk, 4 islands); **Hana's Kite Glider** chain across both regions (Bluffs → Cloudtop → Neon City → Bluffs), whose glider rides updrafts to two hidden areas (**Windcrest Stack**, with a rare egg that hatches a shiny Skimray, and the **Caldera Rim** over the volcano, with the Obsidian Helm); rare finds (starry-night shinies, Blowfin swarms in rain, golden-hour Skimrays) and **ten hidden pearls** (one per island map, the Pearl Circlet for all ten).
- **M4: done (session 18c: R695–R700; session 18d: R701–R703).** The **Battle Tower** on Starfall Atoll (win streaks, every 7th battle vs Tower Master Morra, Bronze/Silver/Gold/Legend ranks with hats), **two legendaries** with their own stories and boss battles (Solmoth, the Dawn Moth, on the Caldera Rim after the festival; Moonwhal, the Moon Narwhal, off Starfall at night after Bronze rank), the weekly **Sunscatter Masters** (four island champions in a row at champion level, the Champion's Lei), **harder island rematches** after the finale, the **Rival Showdown** (Dash at full strength on Starfall Atoll, Dash's Headband, then a daily island rematch), a Journal **🏆 Champ** page (Tower ladder, this week's Masters and Gauntlet, legends, Dash) and Prof. Pecan's legend lore on the mainland. Checks: `tools/tower.mjs`, `legends.mjs`, `masters.mjs`, `dashshow.mjs`.
- **After M4 (session 18d on):** the roadmap's milestones are all done, so later sessions keep adding content in the same spirit (about 80% content, 20% polish). Done so far: Rainbow Reach (a third glider hidden area, above Cloudtop), WAVE RIDER (a surfing mini-game at Ember Isle's Surf Shack), Morra's Amends (an island quest chain with a shiny Hootsy reward), the Shiny Charm for a complete Critterdex, Moonwhal balance (63%), looks for both legendaries and the Tower hall (R704–R712). Next: see HANDOFF.md "Session 18d → Next ideas".
