// node tools/lavafish.mjs [map,map] : on each lava map (or the maps given), finds a spot facing a lava pool, checks A says 'Fish', and reels in until a lava fish bites
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
for (const map of (process.argv[2] || 'cinder,ember,rim').split(',')) {
  const r = await pg.evaluate((map) => {
    __save.adv = { hero: 'cindermunch', map, x: 1, y: 1, dir: 's', flags: { intro: true, quest: true, rod: true, crowned: true }, spawn: { map: 'village', x: 4, y: 6 } };
    __game.screens.adventure(); __sim(0.1);
    let wo = __game.screens.worldObj, spot = null;
    const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
    for (let y = 1; y < wo.H - 1 && !spot; y++) for (let x = 1; x < wo.W - 1 && !spot; x++) if (wo.walkable(x, y)) for (const [d, [dx, dy]] of Object.entries(D)) if (wo.tile(x + dx, y + dy) === '~') { spot = [x, y, d]; break; }
    if (!spot) return 'no lava-side spot';
    __save.adv.x = spot[0]; __save.adv.y = spot[1]; __save.adv.dir = spot[2]; __game.screens.adventure(); __sim(0.1); wo = __game.screens.worldObj;
    wo.phase = 'day';
    const hint = wo.aHint();
    const got = [];
    for (let i = 0; i < 300; i++) { wo.cast(); wo.reel('catch'); wo.dialog = null; wo.busy = false; if (__game.screens.mode !== 'world') return 'a critter bit: ' + __game.screens.mode; }
    return { spot, hint, kinds: Object.keys(__save.adv.fishLog?.sp || {}).join() };
  }, map);
  console.log(map, JSON.stringify(r));
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
