// node tools/nuri2.mjs [WxH] : R899, Stargazer Nuri back on the Singing Dunes after the legend (by day, with 0 and then all 4 desert
// constellations logged). Prints her lines; shot tools/out/nuri2-<WxH>.png.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
for (const dc of [[], ['sunbird', 'caravan', 'scarab', 'lantern']]) {
  await pg.evaluate((dc) => {
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
    const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,cup_sandstorm,sunbird1,legend_aurelark'.split(',')) f[k] = true;
    const now = new Date();
    __save.adv = { hero: 'cindermunch', map: 'singing', x: 12, y: 6, dir: 'n', flags: f, hats: [], dconsts: dc, seen: { singing: 1 }, spawn: { map: 'oasis', x: 14, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (12 - now.getHours() + 24) % 24 } };
    if (__game.screens.worldObj) __game.screens.worldObj.load('singing', 12, 6, 'n'); else __game.screens.adventure(); __sim(1);
  }, dc);
  for (let k = 0; k < 6 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.5); });
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.talk(o.npcs.find((q) => q.n.id === 'nuri_s2')); });
  const out = [];
  for (let k = 0; k < 4 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.waitForTimeout(500); await pg.evaluate(() => __sim(3)); out.push(await pg.evaluate(() => document.querySelector('.wd-box').textContent.replace('▼', '').slice(0, 170))); if (!k && !dc.length) await pg.screenshot({ path: `tools/out/nuri2-${w}x${h}.png` }); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.4); }); }
  console.log(dc.length, '→', out.join(' / '));
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
