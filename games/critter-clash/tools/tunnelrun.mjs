// node tools/tunnelrun.mjs [WxH] : R875: TUNNEL RUN in the drained Old Aqueduct. Talks to Tunnel Runner Tess, picks Race!, runs the course
// with Shift held (west post, spout post, back), prints the clock and her verdict; then a slow walk (no Shift) that loses. Shots tools/out/trun-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'rod', 'spring_arrive', 'hollow_arrive', 'gcap_done', 'aq_arrive', 'aq_asked', 'tess_a', 'baz_a', 'aq_green', 'aqueduct_flow', 'aq_done', 'aq_nookhint'];
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  __save.adv = { hats: [], flags: f, cnt: {}, seen: { oasis: true, wellspring: true, glowhollow: true, aqueduct: true }, hero: 'cindermunch', map: 'aqueduct', x: 13, y: 6, dir: 'e', spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false };
  __game.screens.adventure(); __sim(0.8);
}, flags);
const shot = async (n) => { await pg.waitForTimeout(500); await pg.screenshot({ path: `tools/out/trun-${n}-${tag}.png`, timeout: 120000 }); };
const say = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 220));
const at = (x, y, d) => pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = d; o.placeHero(); __sim(0.4); }, [x, y, d]);
const A = async () => { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.5); }); await pg.waitForTimeout(300); await pg.evaluate(() => __sim(1.5)); };
const lines = async () => { const ll = []; for (let k = 0; k < 14; k++) { await pg.waitForTimeout(300); await pg.evaluate(() => __sim(3)); const t = await say(); if (!t) break; ll.push(t.slice(0, 110)); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.3); }); } return ll.join(' / '); };
const pick = async (i) => { await pg.click(`.wd-opts button[data-i="${i}"]`); await pg.evaluate(() => __sim(0.1)); };
// hold keys for a number of game seconds, in small slices so each arrive() sees the keys
const hold = async (keys, sec) => { for (const k of keys) await pg.keyboard.down(k); await pg.waitForTimeout(80); for (let t = 0; t < sec; t += 0.25) await pg.evaluate(() => __sim(0.25)); for (const k of keys) await pg.keyboard.up(k); await pg.waitForTimeout(60); };
const st = () => pg.evaluate(() => { const o = __game.screens.worldObj; return `${o.hx},${o.hy} run=${o.run ? o.run.t.toFixed(2) + ' cp ' + o.run.cp : 'none'}`; });
// step the course tile by tile at run pace (0.143 s a tile) or walk pace (0.23), letting arrive() see each tile
const path = []; for (let x = 12; x >= 4; x--) path.push([x, 6]); path.push([4, 5]); for (let x = 5; x <= 21; x++) path.push([x, 5]); for (let x = 20; x >= 13; x--) path.push([x, 5]);
const race = async (k, name) => {
  await at(13, 6, 'e'); await A(); console.log('ask:', (await say())?.slice(0, 140)); await shot(name + '-ask'); await pick(0);
  await pg.evaluate(() => __sim(1.3)); await shot(name + '-go');
  const half = Math.floor(path.length / 2);
  console.log(' sim/real:', await pg.evaluate(([P, k]) => { const o = __game.screens.worldObj, t0 = o.t, r0 = o.run.t; for (const [x, y] of P) { o.hx = x; o.hy = y; o.placeHero(); __sim(k); o.arrive(); } return [(o.t - t0).toFixed(2), (o.run.t - r0).toFixed(2), P.length * k]; }, [path.slice(0, half), k]));
  console.log(' mid:', await st()); await shot(name + '-mid');
  await pg.evaluate(([P, k]) => { const o = __game.screens.worldObj; for (const [x, y] of P) { if (!o.run) break; o.hx = x; o.hy = y; o.placeHero(); __sim(k); o.arrive(); } }, [path.slice(half), k]);
  console.log(' end:', await lines()); await shot(name + '-end');
};
console.log('tiles:', path.length);
await race(0.15, 'fast');
console.log('best:', await pg.evaluate(() => __save.adv.runBest), 'hats:', await pg.evaluate(() => __save.adv.hats.join(',')), 'berries day:', await pg.evaluate(() => __save.adv.runDay));
await race(0.23, 'slow');
await at(13, 6, 'e'); await A(); await pick(1); console.log('battle option:', (await say())?.slice(0, 100)); await shot('battle');
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
await b.close();
