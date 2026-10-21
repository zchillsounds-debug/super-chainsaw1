// node tools/pearls.mjs: every hidden pearl (M.pearl) is reachable from its map's entrance, twinkles near the hero, and picking all of them gives the Pearl Circlet
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const ENTRY = { coral: [12, 14], palmpath: [1, 5], bluffs: [0, 9], ashtrail: [1, 4], ember_isle: [17, 1], atoll: [9, 13], grotto: [10, 14], grotto2: [9, 10], stack: [8, 9], rim: [8, 11] };
const out = await pg.evaluate(async (ENTRY) => {
  const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,cup_caldera,skua_b,morra,sunstone,lantern,glider,grotto_pit,grotto_gate'.split(',').map((k) => [k, true]));
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true });
  __save.adv = { hero: 'cindermunch', map: 'coral', x: 12, y: 14, dir: 'n', flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
  const wo = __game.screens.worldObj, res = [];
  for (const [k, [ex, ey]] of Object.entries(ENTRY)) {
    wo.load(k, ex, ey, 'n'); __sim(0.2);
    const P = wo.pearl; if (!P) { res.push(k + ': NO PEARL'); continue; }
    const seen = new Set([ex + ',' + ey]), q = [[ex, ey]];
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = q[i][0] + dx, ny = q[i][1] + dy, kk = nx + ',' + ny; if (!seen.has(kk) && wo.walkable(nx, ny)) { seen.add(kk); q.push([nx, ny]); } }
    const reach = seen.has(P.x + ',' + P.y);
    wo.hx = P.x + 1; wo.hy = P.y; __sim(0.1); const vis1 = P.g.visible;
    wo.hx = P.x + 4; wo.hy = P.y; __sim(0.1); const vis4 = P.g.visible;
    wo.hx = P.x; wo.hy = P.y; const got = wo.pickPearl(); for (let i = 0; i < 6 && wo.dialog; i++) wo.dialog.next();
    res.push(`${k}: (${P.x},${P.y}) reachable ${reach} · seen at 1 step ${vis1}, hidden at 4 ${!vis4} · picked ${got}`);
  }
  res.push('hat: ' + (__save.adv.hats || []).includes('pearl') + ' · berries ' + __save.berries);
  return res;
}, ENTRY);
console.log(out.join('\n'));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
