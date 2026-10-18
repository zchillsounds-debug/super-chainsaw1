// node tools/advfight.mjs <WxH> <prefix> <map> <wildId> [lv] [js run first, e.g. weather/clock]: starts a wild fight on that map and screenshots intro and mid-fight
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size, prefix, map, id, lv = '8', pre = ''] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high&auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(([map]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3', 'adv4', 'adv5', 'adv6', 'adv7', 'adv8', 'adv9'] });
  const f = {}; for (const k of 'intro quest cup_sprout cup_thunder cup_grove cup_champion cup_midnight cup_sky woods cinder neon cloudtop frostpeak'.split(' ')) f[k] = true;
  __save.adv = { hero: 'cindermunch', map, x: 18, y: 6, dir: 's', flags: f, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
}, [map]);
if (pre) await pg.evaluate(pre);
await pg.evaluate(([id, lv]) => __game.screens.worldObj.startWild(id, +lv), [id, lv]);
await pg.waitForFunction(() => __game.battle, null, { timeout: 30000 });
await pg.evaluate(() => __sim(1.2)); await pg.waitForTimeout(800);
await pg.screenshot({ path: `tools/out/${prefix}-a.png` });
await pg.evaluate(() => __sim(6)); await pg.waitForTimeout(800);
await pg.screenshot({ path: `tools/out/${prefix}-b.png` });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
