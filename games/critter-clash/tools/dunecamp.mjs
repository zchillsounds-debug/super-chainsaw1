// node tools/dunecamp.mjs [WxH] : Chapter 3 (D2). After Dash's canyon rematch: Redrock Canyon's east edge (bumps before it),
// the walk into the Dune Camp and its arrival scene, views (the Sandstorm Dome, the tents, Dust Devil HQ), the dome's lobby,
// a tent inside and the Amber Sands Town Map. Env HOUR= sets the clock. Screenshots in tools/out/dc-*.
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
const only = (process.env.ONLY || '').split(',').filter(Boolean), want = (k) => !only.length || only.includes(k);
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/dc-${n}-${tag}.png`, timeout: 120000 }); };
const start = (map, x, y, dir, extra = []) => pg.evaluate(([map, x, y, dir, extra]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'cup_coral', 'cup_gale', 'cup_caldera', 'cup_sprout', 'cup_thunder', 'cup_grove', 'cup_champion', 'cup_midnight', 'cup_sky', 'cup_legend', 'sunstone', 'morra', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', ...extra]) f[k] = true;
  __save.critters.cindermunch.level = 40;
  const now = new Date(), H = +(window.__HOUR ?? 11);
  __save.adv = { hero: 'cindermunch', map, x, y, dir, flags: f, spawn: { map: 'oasis', x: 12, y: 12 }, shift: { day: now.toISOString().slice(0, 10), h: (H - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, extra]);
const W = () => pg.evaluate(() => { const o = __game.screens.worldObj; return o && `${o.key} ${o.hx},${o.hy} dlg=${!!document.querySelector('.wd-box')}`; });
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(150); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(150); await pg.evaluate(() => __sim(1.2)); };
if (want('edge')) {
  // 1) before Dash's rematch the canyon's east edge bumps
  await start('redrock', 28, 6, 'e');
  await walk('ArrowRight', 1.2);
  console.log('no rematch:', await W());
  // 2) after it: walk east into the Dune Camp; the arrival scene plays
  await start('redrock', 28, 6, 'e', ['dash_canyon']);
  await walk('ArrowRight', 2.4);
  await pg.waitForTimeout(2000); await pg.evaluate(() => __sim(2.5));
  console.log('walked east:', await W(), 'arrive flag:', await pg.evaluate(() => !!__save.adv.flags.dunecamp_arrive), 'goal:', await pg.evaluate(() => __game.screens.goalLine(__save.adv.flags)));
  await shot('arrive');
}
if (want('views')) {
  await start('dunecamp', 6, 6, 'e', ['dash_canyon', 'dunecamp_arrive']);
  for (const [n, x, y, d] of [['west', 6, 6, 's'], ['dome', 16, 6, 'n'], ['tents', 25, 6, 'n'], ['hq', 24, 7, 's']]) {
    await pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.load('dunecamp', x, y, d); __sim(1); }, [x, y, d]);
    await shot('view-' + n);
  }
}
if (want('rooms')) {
  await start('dunecamp', 16, 5, 'n', ['dash_canyon', 'dunecamp_arrive']);
  for (const [n, x, y] of [['lobby', 16, 5], ['weaver', 24, 4], ['berry', 4, 11]]) {
    await pg.evaluate(([x, y]) => { const o = __game.screens.worldObj; o.load('dunecamp', x, y, 'n'); __sim(0.8); o.tapA = true; __sim(0.2); }, [x, y]);
    await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(1.5));
    console.log(n + ':', await W());
    await shot('room-' + n);
  }
}
if (want('gate')) {
  // the big dune: bumps until the Baron's map is found, then leads to the Sun Gate (arrival scene)
  await start('dunecamp', 15, 12, 's', ['dash_canyon', 'dunecamp_arrive', 'cup_sandstorm', 'post_sandstorm', 'devils2']);
  await walk('ArrowDown', 1.2);
  console.log('no map:', await W());
  await start('dunecamp', 15, 12, 's', ['dash_canyon', 'dunecamp_arrive', 'cup_sandstorm', 'post_sandstorm', 'devils2', 'citymap']);
  await walk('ArrowDown', 2.4);
  await pg.waitForTimeout(2000); await pg.evaluate(() => __sim(2.5));
  console.log('walked south:', await W(), 'arrive:', await pg.evaluate(() => !!__save.adv.flags.sungate_arrive), 'goal:', await pg.evaluate(() => __game.screens.goalLine(__save.adv.flags)));
  await shot('gate-arrive');
  for (const [n, x, y, d, ex] of [['gate', 13, 10, 'n', []], ['ruins', 8, 13, 'e', []], ['gate-open', 13, 10, 'n', ['baron', 'gate_open']]]) {
    await start('sungate', x, y, d, ['dash_canyon', 'dunecamp_arrive', 'cup_sandstorm', 'post_sandstorm', 'devils2', 'citymap', 'sungate_arrive', ...ex]);
    await pg.evaluate(() => __sim(1)); await shot('view-' + n);
  }
}
if (want('map')) {
  await start('dunecamp', 16, 6, 's', ['dash_canyon', 'dunecamp_arrive']);
  await pg.evaluate(() => __game.screens.worldMap());
  await shot('townmap');
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
