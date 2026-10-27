// node tools/redrock.mjs [WxH] : Chapter 3 (D2). With the Mirage Cup won: the oasis's post-cup scene, Sand Crew Kip stepping aside
// on Dune Road, a walk through Dune Road's east edge into Redrock Canyon, views of the canyon (cliff houses, rope lifts, stadium),
// the Canyon Stadium lobby and the Amber Sands Town Map. Without the cup, the edge must bump. Screenshots in tools/out/rr-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
await pg.evaluate((h) => { window.__HOUR = h; }, process.env.HOUR || 11);
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/rr-${n}-${tag}.png`, timeout: 120000 }); };
const start = (map, x, y, dir, extra = []) => pg.evaluate(([map, x, y, dir, extra]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'cup_coral', 'cup_gale', 'cup_caldera', 'cup_sprout', 'cup_thunder', 'cup_grove', 'cup_champion', 'cup_midnight', 'cup_sky', 'cup_legend', 'sunstone', 'morra', 'rail_open', 'sands_arrive', ...extra]) f[k] = true;
  __save.critters.cindermunch.level = 38;
  const now = new Date(), H = +(window.__HOUR ?? 11); // the clock: midday unless HOUR= is given
  __save.adv = { hero: 'cindermunch', map, x, y, dir, flags: f, spawn: { map: 'oasis', x: 12, y: 12 }, shift: { day: now.toISOString().slice(0, 10), h: (H - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, extra]);
const W = () => pg.evaluate(() => { const o = __game.screens.worldObj; return o && `${o.key} ${o.hx},${o.hy} dlg=${!!document.querySelector('.wd-box')}`; });
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(150); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(150); await pg.evaluate(() => __sim(1.2)); }; // (a short real wait so the key event lands before the sim steps)
// 1) no cup yet: Dune Road's east edge bumps (Kip)
await start('duneroad', 31, 5, 'e');
await walk('ArrowRight', 1.2);
console.log('no cup:', await W());
await shot('kip-block');
// 2) the oasis after the Mirage Cup: Amaya's scene
await start('oasis', 7, 7, 's', ['cup_mirage']);
await pg.evaluate(() => __sim(1)); await shot('post-mirage');
console.log('post_mirage:', await pg.evaluate(() => !!__save.adv.flags.post_mirage));
// 3) Dune Road with the cup: Kip stands aside, the edge leads on to Redrock Canyon
await start('duneroad', 30, 5, 'e', ['cup_mirage', 'post_mirage']);
await shot('kip-aside');
await walk('ArrowRight', 3.2);
await pg.waitForTimeout(2000); await pg.evaluate(() => __sim(2.5));
console.log('walked east:', await W());
await shot('canyon-in');
// 4) views
for (const [n, x, y, d] of [['houses', 6, 6, 's'], ['stadium', 22, 7, 'n'], ['pool', 12, 11, 'e']]) {
  await pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.load('redrock', x, y, d); __sim(1); }, [x, y, d]);
  await shot('view-' + n);
}
// 5) the stadium lobby (walk in through the door)
await pg.evaluate(() => { const o = __game.screens.worldObj; o.load('redrock', 22, 5, 'n'); __sim(0.8); o.tapA = true; __sim(0.2); });
await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(1.5)); // the door fade runs on real time
console.log('lobby:', await W());
await shot('lobby');
// 6) the Town Map
await pg.evaluate(() => { const o = __game.screens.worldObj; o.load('redrock', 14, 6, 's'); __sim(0.6); __game.screens.worldMap(); });
await shot('townmap');
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
