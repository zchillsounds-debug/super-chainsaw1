// node tools/sandrail.mjs [WxH] [flags]: Chapter 3. A post-Sunstone save in Cinder Town talks to Conductor Tamsin, rides the Sand-Rail
// to Sunwell Oasis (arrival scene), screenshots the station, the oasis and the Town Map, buys nothing, and rides back. flags default: sunstone
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), fl = (process.argv[3] || 'sunstone').split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const tag = `${w}x${h}`;
await pg.evaluate((fl) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'cup_coral', 'cup_gale', 'cup_caldera', 'cup_sprout', 'cup_thunder', 'cup_grove', 'cup_champion', 'cup_midnight', 'cup_sky', 'cup_legend', ...fl]) f[k] = true;
  __save.adv = { hero: 'cindermunch', map: 'ember', x: 14, y: 12, dir: 's', flags: f, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
}, fl);
await pg.waitForTimeout(800);
await pg.screenshot({ path: `tools/out/rail-ember-${tag}.png` });
// talk, read every line, pick the first answer, until the map changes
const talk = async (to) => pg.evaluate(async (to) => {
  const W = () => __game.screens.worldObj, out = [];
  W().interact();
  for (let k = 0; k < 40 && W().key !== to; k++) {
    const el = document.querySelector('.wd-box p'); if (el) out.push(el.textContent.slice(0, 90));
    if (W().dialog) W().dialog.next(); // (an ask picks its first answer)
    __sim(0.4); await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}, to);
console.log('ember:', (await talk('oasis')).join(' / '));
await pg.evaluate(async () => { for (let k = 0; k < 20; k++) { __sim(0.3); await new Promise((r) => setTimeout(r, 100)); } });
await pg.waitForTimeout(800);
await pg.screenshot({ path: `tools/out/rail-arrive-${tag}.png` });
const lines = await pg.evaluate(async () => { const W = __game.screens.worldObj, out = []; for (let k = 0; k < 12 && W.dialog; k++) { const el = document.querySelector('.wd-box p'); if (el) out.push(el.textContent.slice(0, 70)); W.dialog.next(); __sim(0.3); await new Promise((r) => setTimeout(r, 100)); } return out; });
console.log('arrive:', lines.join(' / '));
console.log('state:', await pg.evaluate(() => JSON.stringify({ map: __save.adv.map, x: __save.adv.x, y: __save.adv.y, arrive: !!__save.adv.flags.sands_arrive, open: !!__save.adv.flags.rail_open, spawn: __save.adv.spawn, rides: __save.adv.cnt?.rail })));
await pg.evaluate(() => { const W = __game.screens.worldObj; W.load('oasis', 12, 5, 's'); __sim(0.5); });
await pg.waitForTimeout(1200);
await pg.screenshot({ path: `tools/out/rail-oasis-${tag}.png` });
await pg.evaluate(() => { const W = __game.screens.worldObj; W.load('oasis', 12, 12, 'n'); __sim(0.5); });
await pg.waitForTimeout(1200);
await pg.screenshot({ path: `tools/out/rail-market-${tag}.png` });
await pg.evaluate(() => { document.querySelectorAll('.modal-wrap').forEach((m) => m.remove()); __game.screens.worldMap(); return !!document.querySelector('.wd-map'); }).then((r) => console.log('map open:', r));
await pg.waitForTimeout(600);
await pg.screenshot({ path: `tools/out/rail-map-${tag}.png` });
await pg.evaluate(() => document.querySelector('.wd-map')?.closest('.modal-wrap')?.remove());
// ride home
await pg.evaluate(() => { const W = __game.screens.worldObj; W.load('oasis', 12, 12, 'e'); __sim(0.4); });
console.log('oasis:', (await talk('ember')).join(' / '));
console.log('back:', await pg.evaluate(() => __save.adv.map + ' ' + __save.adv.x + ',' + __save.adv.y));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
