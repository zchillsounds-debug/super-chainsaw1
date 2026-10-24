// node tools/photos.mjs : every landmark photo spot can be reached (a walkable tile within 4 steps of it, reached from the map's way in), with an end-game save
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const LM = [['village', 'lab'], ['bloom', 'stadium'], ['seashell', [13, 15]], ['glowcap', [8, 8]], ['ember', [21, 3]], ['neon', 'arcade'], ['cloudtop', [8, 9]], ['frostpeak', [4, 8]], ['coral', [12, 14]], ['bluffs', [24, 11]], ['ember_isle', [17, 2]], ['atoll', [12, 3]]];
const flags = 'intro,quest,rival1,trial_strength,rival2,trial_friendship,pip_found,pip_saved,dash3,trial_wisdom,trial_heart,crowned,ending,isle_arrive,skua_b,morra,sunstone,atoll,cup_sprout,cup_thunder,cup_grove,cup_champion,cup_midnight,cup_sky,cup_legend,cup_coral,cup_gale,cup_caldera'.split(',');
let bad = 0;
for (const [map, at] of LM) {
  const r = await pg.evaluate(([map, at, flags]) => {
    const M = __maps[map], e = Object.keys(M.edges || {})[0] || 's';
    __save.adv = { hero: 'cindermunch', map, x: 1, y: 1, dir: 's', flags: Object.fromEntries(flags.map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 } };
    __game.screens.adventure(); __sim(0.05);
    const wo = __game.screens.worldObj;
    let start = null; for (let i = 0; i < (e === 'n' || e === 's' ? wo.W : wo.H) && !start; i++) { const x = e === 'e' ? wo.W - 1 : e === 'w' ? 0 : i, y = e === 's' ? wo.H - 1 : e === 'n' ? 0 : i; if (wo.walkable(x, y)) start = [x, y]; }
    if (!M.edges || !start) start = { cloudtop: [13, 12], atoll: [9, 13] }[map] || start; // balloon / ferry landings
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
