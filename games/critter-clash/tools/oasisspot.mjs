// node tools/oasisspot.mjs [WxH] [x,y] : R882, the oasis platform: where the hero stands off the Sand-Rail vs the parked engine. Shot tools/out/oasisspot-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, [sx, sy] = (process.argv[3] || '12,12').split(',').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
await pg.evaluate(([x, y]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive'.split(',')) f[k] = true;
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map: 'oasis', x, y, dir: 's', flags: f, hats: [], spawn: { map: 'oasis', x: 12, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (11 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(1.5);
}, [sx, sy]);
await pg.waitForTimeout(800); await pg.screenshot({ path: `tools/out/oasisspot-${tag}.png`, timeout: 120000 });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
