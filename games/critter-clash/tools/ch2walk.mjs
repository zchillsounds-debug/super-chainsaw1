// node tools/ch2walk.mjs [WxH] : Chapter 2 route check. Loads each Sunscatter Isles map with the flags a player would have at that point,
// walks (BFS over solid tiles and visible townsfolk) from where the hero comes in, and checks the next goal can (or, while gated, can't) be reached
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const base = 'intro quest crowned ending isle_arrive'.split(' ');
// [map, from, flags, target, expect reachable, what]
const steps = [
  ['coral', [12, 15], [], [7, 6], true, 'Port Coral: pier to the Coral Stadium door'],
  ['coral', [12, 15], [], [25, 6], true, 'Port Coral: pier to Palm Path (east edge)'],
  ['palmpath', [0, 4], [], [33, 5], false, 'Palm Path: rope bridge shut before the Coral Cup'],
  ['palmpath', [0, 4], ['cup_coral'], [33, 5], true, 'Palm Path: rope bridge open after the Coral Cup'],
  ['bluffs', [0, 9], ['cup_coral'], [12, 6], true, 'Breezy Bluffs: bridge to the Gale Stadium door'],
  ['bluffs', [0, 9], ['cup_coral'], [27, 9], false, 'Breezy Bluffs: Ranger Ono holds the Ash Trail before the Gale Cup'],
  ['bluffs', [0, 9], ['cup_coral', 'cup_gale'], [27, 9], false, 'Breezy Bluffs: Gloom Gull Skua blocks the Ash Trail'],
  ['bluffs', [0, 9], ['cup_coral', 'cup_gale', 'skua_b'], [27, 9], true, 'Breezy Bluffs: Ash Trail open once Skua is beaten'],
  ['ashtrail', [0, 4], ['cup_coral', 'cup_gale', 'skua_b'], [24, 12], true, 'Ash Trail: west edge to Ember Isle (south edge)'],
  ['ember_isle', [17, 0], ['cup_coral', 'cup_gale', 'skua_b'], [7, 6], true, 'Ember Isle: trail to the Caldera Stadium door'],
  ['atoll', [9, 13], ['cup_coral', 'cup_gale', 'cup_caldera', 'skua_b'], [11, 4], true, 'Starfall Atoll: pier to Captain Morra'],
];
let bad = 0;
for (const [map, [fx, fy], fl, [tx, ty], want, what] of steps) {
  const got = await pg.evaluate(([map, fx, fy, fl, tx, ty]) => {
    const flags = Object.fromEntries(fl.map((k) => [k, true]));
    __save.adv = { hero: 'cindermunch', map, x: fx, y: fy, dir: 's', flags, spawn: { map: 'village', x: 4, y: 6 } };
    __game.screens.adventure(); __sim(0.2);
    const W = __game.screens.worldObj, M = W.M;
    const npc = new Set((M.npcs || []).filter((n) => !(n.hideFlag && flags[n.hideFlag]) && !(n.showFlag && !flags[n.showFlag])).map((n) => n.x + ',' + n.y));
    const ok = (x, y) => x >= 0 && y >= 0 && x < W.W && y < W.H && !W.solid.has(x + ',' + y) && !npc.has(x + ',' + y);
    const seen = new Set([fx + ',' + fy]), q = [[fx, fy]];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } }
    return seen.has(tx + ',' + ty) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((tx + dx) + ',' + (ty + dy)) && npc.has(tx + ',' + ty)); // standing next to a townsfolk target counts
  }, [map, fx, fy, [...base, ...fl], tx, ty]);
  const pass = got === want; if (!pass) bad++;
  console.log(pass ? 'ok  ' : 'FAIL', what);
}
console.log(bad ? `${bad} failed` : 'all good', '· errors:', errs.join(' | ') || 'none');
await b.close();
