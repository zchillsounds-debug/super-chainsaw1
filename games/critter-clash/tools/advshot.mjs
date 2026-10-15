// node tools/advshot.mjs <WxH> <prefix> <map> <x> <y> [flags,comma] [extra js]: drops the hero into the Adventure world and screenshots
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size, prefix, map, x, y, fl = '', extra = ''] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:5180/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries(['intro', 'quest', ...fl.split(',').filter(Boolean)].map((k) => [k, true]));
await pg.evaluate(([map, x, y, flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  for (const id of ['cindermunch', 'squeakwing', 'rolladillo']) if (!__save.unlocked.includes(id)) __save.unlocked.push(id);
  __save.adv = { hero: 'cindermunch', map, x: +x, y: +y, dir: 's', flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, flags]);
if (extra) console.log('extra:', JSON.stringify(await pg.evaluate(extra)));
await pg.evaluate(() => __sim(0.4));
await pg.waitForTimeout(1500);
await pg.screenshot({ path: `tools/out/${prefix}.png` });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
