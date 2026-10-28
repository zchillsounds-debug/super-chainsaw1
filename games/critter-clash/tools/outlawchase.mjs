// node tools/outlawchase.mjs [WxH] : R832: today's WANTED outlaw bolts a few tiles when the hero comes within 2 tiles, three times,
// then it's out of puff and can be talked to (the fight starts). Shots tools/out/chase-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_canyon', 'dash_canyon', 'cup_sandstorm', 'cup_sprout'];
const shot = async (n) => { await pg.waitForTimeout(500); await pg.screenshot({ path: `tools/out/chase-${n}-${tag}.png`, timeout: 120000 }); };
const close = async () => { for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); };
// the outlaw's map today
const map = await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true; __save.critters.cindermunch.level = 44;
  __save.adv = { hats: [], flags: f, cnt: {}, seen: {}, hero: 'cindermunch', map: 'oasis', x: 5, y: 11, dir: 's', bounty: { day: new Date().toISOString().slice(0, 10), list: [], base: {}, paid: [] } };
}, story);
const maps = ['duneroad', 'redrock', 'flats', 'dunecamp'];
let found = null;
for (const m of maps) {
  await pg.evaluate((m) => { Object.assign(__save.adv, { map: m, x: 5, y: 5, dir: 's', shift: { day: new Date().toISOString().slice(0, 10), h: (11 - new Date().getHours() + 24) % 24 }, sandstorm: false, rain: false }); __game.screens.adventure(); __sim(0.5); }, m);
  await pg.waitForTimeout(800); await close();
  found = await pg.evaluate(() => { const o = __game.screens.worldObj, a = o.npcs.find((q) => q.n.id === 'wanted'); return a ? { map: o.key, x: a.x, y: a.y, name: a.n.name } : null; });
  if (found) break;
}
console.log('outlaw', JSON.stringify(found));
if (!found) { console.log('NO OUTLAW'); await b.close(); process.exit(1); }
for (let r = 1; r <= 4; r++) {
  const before = await pg.evaluate(() => { const o = __game.screens.worldObj, a = o.npcs.find((q) => q.n.id === 'wanted');
    // put the hero 2 tiles off on a walkable tile
    for (const [dx, dy] of [[0, 2], [2, 0], [0, -2], [-2, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const x = a.x + dx, y = a.y + dy; if (o.walkable(x, y) && !o.occupied(x, y, 'hero')) { o.hx = x; o.hy = y; o.placeHero(); break; } }
    return { x: a.x, y: a.y, hx: o.hx, hy: o.hy };
  });
  await pg.evaluate(() => __sim(0.25));
  if (r === 1) await shot('bolt');
  await pg.evaluate(() => __sim(2));
  const after = await pg.evaluate(() => { const a = __game.screens.worldObj.npcs.find((q) => q.n.id === 'wanted'); return { x: a.x, y: a.y, runs: a.runs || 0 }; });
  console.log(`approach ${r}: from (${before.x},${before.y}) hero (${before.hx},${before.hy}) -> (${after.x},${after.y}) runs ${after.runs}`, after.x === before.x && after.y === before.y ? 'STAYED' : 'RAN');
}
await shot('puffed');
// now talk to it: stand next to it and face it
const t = await pg.evaluate(() => { const o = __game.screens.worldObj, a = o.npcs.find((q) => q.n.id === 'wanted');
  for (const [dx, dy, d] of [[0, 1, 'n'], [0, -1, 's'], [1, 0, 'w'], [-1, 0, 'e']]) { const x = a.x + dx, y = a.y + dy; if (o.walkable(x, y) && !o.occupied(x, y, 'hero')) { o.hx = x; o.hy = y; o.dir = d; o.placeHero(); break; } }
  __sim(0.3); o.tapA = true; __sim(0.4); return document.querySelector('.wd-box')?.textContent.slice(0, 160); });
console.log('talk:', t);
for (let k = 0; k < 6 && !(await pg.evaluate(() => !!__game.battle)); k++) await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.8); });
await pg.waitForFunction(() => !!__game.battle, null, { timeout: 30000 }).catch(() => {});
console.log('fight:', await pg.evaluate(() => __game.battle ? __game.battle.fighters[1].def.name : 'no battle'));
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
