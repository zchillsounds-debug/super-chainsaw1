// node tools/photos.mjs : every landmark photo spot can be reached (a walkable tile within 4 steps of it, reached from the map's way in), with an end-game save
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
// R864: the landmark list comes from the game (world.js LANDMARKS, window.__landmarks), so new desert spots are checked too
const LM = await pg.evaluate(() => __landmarks.map((l) => [l.map, l.door || l.at]));
// an end-game save, as in mapwalk: every flag a townsfolk or edge gate mentions, plus the story milestones and the aqueduct's flow
const flags = await pg.evaluate(() => { const F = new Set('intro quest rival1 crowned ending isle_arrive sunstone morra skua_b glider lantern atoll aqueduct_flow'.split(' '));
  for (const M of Object.values(__maps)) { for (const n of M.npcs || []) for (const k of ['hideFlag', 'showFlag']) n[k] && F.add(n[k]); for (const e of Object.values(M.edges || {})) e.need && F.add(e.need); for (const bd of M.buildings || []) bd.stadium && F.add('cup_' + bd.stadium); }
  return [...F]; });
let bad = 0;
for (const [map, at] of LM) {
  const r = await pg.evaluate(([map, at, flags]) => {
    const M = __maps[map], e = Object.keys(M.edges || {})[0] || 's';
    __save.trainer = { name: 'Sam', partner: 'cindermunch' }; __save.tutorialDone = true;
    __save.adv = { hero: 'cindermunch', map, x: 1, y: 1, dir: 's', flags: Object.fromEntries(flags.map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 } };
    __game.screens.adventure(); __sim(0.05);
    const wo = __game.screens.worldObj;
    let start = null; for (let i = 0; i < (e === 'n' || e === 's' ? wo.W : wo.H) && !start; i++) { const x = e === 'e' ? wo.W - 1 : e === 'w' ? 0 : i, y = e === 's' ? wo.H - 1 : e === 'n' ? 0 : i; if (wo.walkable(x, y)) start = [x, y]; }
    if (!M.edges || !start) start = { cloudtop: [13, 12], atoll: [9, 13] }[map] || start; // balloon / ferry landings
    if (!start && M.lifts) start = [M.lifts[0][0], M.lifts[0][1]]; // (Redrock Mesa: the BFS starts at a rope lift's top)
    if (!start) return 'no way in on edge ' + e;
    const d = typeof at === 'string' && wo.doors.find((q) => q.b.id === at), [tx, ty] = d ? [d.x, d.y + 1] : at;
    const seen = new Set([start.join()]), q = [start];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = q[i][0] + dx, ny = q[i][1] + dy; if (!seen.has(nx + ',' + ny) && wo.walkable(nx, ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); } }
    const near = q.filter(([x, y]) => Math.abs(x - tx) + Math.abs(y - ty) <= 4);
    return near.length ? true : `spot ${tx},${ty} unreachable from ${e} edge`;
  }, [map, at, flags]);
  if (r !== true) bad++;
  console.log(r === true ? 'ok  ' : 'FAIL', map, JSON.stringify(at), r === true ? '' : r);
}
console.log(bad ? `${bad} failed` : 'all good', '· errors:', errs.join(' | ') || 'none');
await b.close();
