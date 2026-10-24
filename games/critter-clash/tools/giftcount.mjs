// node tools/giftcount.mjs : loads every outdoor map and counts its gift-box spots (Records says 24 on the mainland)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const r = await pg.evaluate(() => {
  const out = {}; let main = 0;
  for (const [k, M] of Object.entries(__maps)) {
    if (M.indoor || k.includes(':')) continue;
    __save.adv = { hero: 'cindermunch', map: k, x: M.enter?.x ?? 2, y: M.enter?.y ?? 2, dir: 's', flags: { intro: true, quest: true }, spawn: { map: 'village', x: 4, y: 6 } };
    __game.screens.adventure(); __sim(0.05);
    let wo = __game.screens.worldObj;
    if (!wo.walkable(wo.hx, wo.hy)) { // start on an open tile (items are placed by a search from the hero)
      let best = null; for (let y = 1; y < wo.H - 1; y++) for (let x = 1; x < wo.W - 1; x++) if (wo.walkable(x, y) && (!best || Math.abs(y - wo.H / 2) + Math.abs(x - wo.W / 2) < Math.abs(best[1] - wo.H / 2) + Math.abs(best[0] - wo.W / 2))) best = [x, y];
      __save.adv.x = best[0]; __save.adv.y = best[1]; __game.screens.adventure(); __sim(0.05);
    }
    const n = __game.screens.worldObj.itemSpots.length; out[k] = n + (M.isle ? ' isle' : '') + (M.extra ? ' extra' : '');
    if (!M.isle && !M.extra) main += n;
  }
  return { main, out };
});
console.log('mainland gift boxes:', r.main); console.log(JSON.stringify(r.out));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
