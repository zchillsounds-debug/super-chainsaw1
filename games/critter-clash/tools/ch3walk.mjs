// node tools/ch3walk.mjs [WxH] : Chapter 3 (the Amber Sands) route check, like ch2walk. Loads each desert map with the flags a player
// would have at that point, walks (BFS over solid tiles and visible townsfolk) from where the hero comes in, and checks the next goal
// (a stadium door, a story NPC, the next map's edge) can be reached; gated edges must hold until their flag is set.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const base = 'intro quest crowned ending isle_arrive cup_coral cup_gale cup_caldera skua_b morra sunstone rail_open sands_arrive'.split(' ');
const F = (s) => s.split(' ').filter(Boolean);
// [map, from, extra flags, target, expect, what]; a target is 'door:<building>', 'npc:<id>' or 'edge:<n|s|e|w>' (the edge's open
// tiles; with expect false the edge must be gated by a flag that isn't set)
const steps = [
  ['oasis', [12, 12], '', 'door:stadium_m', true, 'Sunwell Oasis: station to the Mirage Stadium door'],
  ['oasis', [12, 12], '', 'edge:e', true, 'Sunwell Oasis: out east to Dune Road'],
  ['duneroad', [0, 5], '', 'edge:e', false, 'Dune Road: Kip holds the road before the Mirage Cup'],
  ['duneroad', [0, 5], 'cup_mirage', 'edge:e', true, 'Dune Road: open to Redrock Canyon after the Mirage Cup'],
  ['redrock', [0, 6], 'cup_mirage', 'door:stadium_r', true, 'Redrock Canyon: to the Canyon Stadium door'],
  ['redrock', [0, 6], 'cup_mirage cup_canyon', 'npc:devil_r', true, 'Redrock Canyon: Dust Devil Sable under the lift'],
  ['redrock', [0, 6], 'cup_mirage cup_canyon devils1', 'npc:dash_r', true, 'Redrock Canyon: Dash'],
  ['redrock', [0, 6], 'cup_mirage cup_canyon devils1', 'edge:e', false, 'Redrock Canyon: the east road holds before Dash'],
  ['redrock', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon', 'edge:e', true, 'Redrock Canyon: east to the Dune Camp'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon', 'door:stadium_s', true, 'Dune Camp: to the Sandstorm Dome door'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon', 'door:berry_c', true, 'Dune Camp: to the Berry Center tent'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon', 'door:hq_c', false, 'Dune Camp: guards on the HQ door'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm', 'npc:guard_c2', true, 'Dune Camp: Dust Devil Flint after the cup'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2', 'door:hq_c', true, 'Dune Camp: HQ open once the guards run'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2', 'edge:s', false, 'Dune Camp: the big dune holds before the map'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap', 'edge:s', true, 'Dune Camp: over the big dune to the Sun Gate'],
  ['sungate', [3, 0], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap', 'npc:baron_g', true, 'Sun Gate: Baron Sirocco at the gate'],
  ['sungate', [3, 0], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap baron gate_open', 'edge:n', true, 'Sun Gate: back over the dune after the finale'],
  // D4: the Sun-Bird
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap baron gate_open buried_vault', 'npc:star_c', true, 'Dune Camp: Stargazer Nuri (the vault mural)'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap baron gate_open buried_vault', 'edge:e', false, 'Dune Camp: the Singing Dunes hold before Nuri'],
  ['dunecamp', [0, 6], 'cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap baron gate_open buried_vault sunbird1', 'edge:e', true, 'Dune Camp: east to the Singing Dunes'],
  ['singing', [0, 5], 'sunbird1 sunbird_wake', 'npc:aurelark_s', true, 'Singing Dunes: the Sun-Bird at its nest'],
  ['singing', [0, 5], 'sunbird1', 'npc:nuri_s', true, 'Singing Dunes: Stargazer Nuri'],
  ['singing', [0, 5], 'sunbird1', 'edge:w', true, 'Singing Dunes: back west to the camp'],
  ['mesa', [5, 9], '', 'npc:zuri_m', true, 'Redrock Mesa: Climber Zuri from the west lift'],
  ['mesa', [5, 9], '', 'npc:watch_m', true, 'Redrock Mesa: Lookout Omar'],
  ['mesa', [18, 9], '', 'npc:lina_m', true, 'Redrock Mesa: Gardener Lina from the east lift'],
];
let bad = 0;
for (const [map, [fx, fy], fl, target, want, what] of steps) {
  const got = await pg.evaluate(([map, fx, fy, fl, target]) => {
    const flags = Object.fromEntries(fl.map((k) => [k, true]));
    __save.adv = { hero: 'cindermunch', map, x: fx, y: fy, dir: 's', flags, spawn: { map: 'oasis', x: 12, y: 12 }, sandstorm: false };
    __game.screens.adventure(); __sim(0.2);
    document.querySelector('.wd-box')?.remove();
    const W = __game.screens.worldObj, M = W.M;
    const vis = (M.npcs || []).filter((n) => !(n.hideFlag && flags[n.hideFlag]) && !(n.showFlag && !flags[n.showFlag]));
    const npc = new Set(vis.map((n) => n.x + ',' + n.y));
    const ok = (x, y) => x >= 0 && y >= 0 && x < W.W && y < W.H && !W.solid.has(x + ',' + y) && !npc.has(x + ',' + y);
    const seen = new Set([fx + ',' + fy]), q = [[fx, fy]];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } }
    const [kind, id] = target.split(':');
    if (kind === 'door') { const bd = M.buildings.find((q) => q.id === id); return seen.has((bd.x + bd.door) + ',' + (bd.y + bd.h)); }
    if (kind === 'npc') { const n = vis.find((q) => q.id === id); return !!n && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((n.x + dx) + ',' + (n.y + dy))); }
    const e = M.edges?.[id]; if (!e) return 'no edge';
    const tiles = [...seen].map((k) => k.split(',').map(Number)).filter(([x, y]) => id === 'e' ? x === W.W - 1 : id === 'w' ? x === 0 : id === 'n' ? y === 0 : y === W.H - 1);
    return tiles.length > 0 && !(e.need && !flags[e.need]);
  }, [map, fx, fy, [...base, ...F(fl)], target]);
  const pass = got === want; if (!pass) bad++;
  console.log(pass ? 'ok  ' : 'FAIL', what, pass ? '' : `(got ${got})`);
}
console.log(bad ? `${bad} failed` : 'all good', '· errors:', errs.join(' | ') || 'none');
await b.close();
