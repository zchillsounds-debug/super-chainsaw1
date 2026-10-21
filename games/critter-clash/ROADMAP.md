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
- M1: not started
- M2: not started
- M3: not started
- M4: not started
