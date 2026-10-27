// node tools/fossils.mjs [WxH] : Chapter 3 (D3), fossil digs and the Sunwell Museum. Digs the day's heap on each desert map
// (Math.random pinned so no Scarabold pops out), checks the Sun-Bird Feather only comes from the Sun Gate, then the museum:
// empty, part-filled, full, and Curator Petra's thank-yous at 4, 8 and 12. Env ONLY=dig,museum. Screenshots in tools/out/fo-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const only = (process.env.ONLY || '').split(',').filter(Boolean), want = (k) => !only.length || only.includes(k);
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/fo-${n}-${tag}.png`, timeout: 120000 }); };
const all = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', 'dash_canyon', 'dunecamp_arrive', 'cup_sandstorm', 'devils2', 'citymap', 'sungate_arrive', 'baron', 'gate_open'];
const start = (map, x, y, dir, fossils = []) => pg.evaluate(([map, x, y, dir, flags, fossils]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 40;
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map, x, y, dir, flags: f, hats: [], fossils, spawn: { map: 'oasis', x: 12, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (11 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, all, fossils]);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } };
const text = async () => { await pg.waitForTimeout(1800); return pg.evaluate(() => { __sim(1); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 110); }); };
if (want('dig')) {
  await start('oasis', 12, 12, 'n');
  await pg.evaluate(() => { Math.random = () => 0.5; });
  for (const map of ['oasis', 'duneroad', 'redrock', 'dunecamp', 'sungate', 'sungate']) {
    const d = await pg.evaluate((map) => { const o = __game.screens.worldObj; o.load(map, 12, 7, 's'); __sim(0.6); const D = o.dig; if (!D) return null; o.hx = D.x; o.hy = D.y; o.dir = 's'; o.placeHero(); __sim(0.3); return [D.x, D.y, o.aHint()]; }, map);
    console.log(map, 'dig', JSON.stringify(d));
    if (!d) continue;
    if (map === 'oasis') await shot('heap');
    await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.4); });
    console.log('  ', await text());
    await close();
    await pg.evaluate((map) => { delete __save.adv.dig[map]; }, map); // (the Sun Gate twice: the second dig is the feather, once the other heap's gone)
  }
  console.log('fossils:', await pg.evaluate(() => __save.adv.fossils.join(',')));
}
if (want('outside')) {
  await start('oasis', 21, 12, 'n');
  await shot('outside');
}
if (want('museum')) {
  const ids = ['sandshell', 'sunbeetle', 'rayfin', 'mesatooth', 'tailspine', 'sandclaw', 'thunderegg', 'hornskull', 'fanfin', 'stonecoil', 'trilobug', 'sunfeather'];
  for (const [n, list] of [['empty', []], ['five', ids.slice(0, 5)], ['full', ids]]) {
    await start('oasis', 21, 11, 'n', list);
    await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); });
    await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1.5));
    await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 6; o.hy = 4; o.dir = 'n'; o.placeHero(); __sim(0.5); });
    console.log(n, await pg.evaluate(() => __game.screens.worldObj.key));
    await shot('museum-' + n);
    for (let k = 0; k < (n === 'empty' ? 1 : 2); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 6; o.hy = 3; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.3); }); console.log('  Petra:', await text()); if (n === 'full' && !k) await shot('museum-petra'); await close(); }
    if (n === 'full') { await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 11; o.hy = 2; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.3); }); console.log('  plinth:', await text()); await close(); }
    if (n === 'five') { await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 11; o.hy = 2; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.3); }); console.log('  empty plinth:', await text()); await close(); }
  }
  console.log('flags:', await pg.evaluate(() => ['fossil4', 'fossil8', 'fossil12'].map((k) => k + '=' + !!__save.adv.flags[k]).join(' ')), 'hat:', await pg.evaluate(() => __save.adv.hats.includes('fossilhat')));
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
