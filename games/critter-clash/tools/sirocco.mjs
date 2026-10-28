// node tools/bounty.mjs [WxH] : R828: the Caravan Guild's bounty board in Sunwell Oasis. Reads the board (two desert jobs + a WANTED
// outlaw), checks the outlaw stands on its map, beats it (forced win), finishes the jobs by counter, collects pay and a Guild Seal;
// with five seals the Caravan Guild Fez. Shots tools/out/sirocco-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_canyon', 'dash_canyon', 'cup_sandstorm', 'cup_sprout', 'spring_arrive', 'cup_mirage', 'devils1', 'devils2', 'citymap', 'sungate_arrive', 'baron', 'gate_open', 'dunecamp_arrive'];
const start = (map, x, y, dir, hour = 11) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  const keep = __save.adv?.cnt ? __save.adv : null;
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { ...(keep || { hats: [], flags: f, cnt: {}, seen: { route1: true, oasis: true, duneroad: true, redrock: true, flats: true, dunecamp: true } }), hero: 'cindermunch', map, x, y, dir, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, story, hour]).then(close);
const close = async () => { await pg.waitForTimeout(1000); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } await pg.evaluate(() => __sim(1.5)); };
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/sirocco-${n}-${tag}.png`, timeout: 120000 }); };
const talk = async (x, y, dir, snap) => { await pg.evaluate(([x, y, dir]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = dir; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); }, [x, y, dir]); const t = []; await pg.waitForTimeout(500); for (let k = 0; k < 10; k++) { const l = await pg.evaluate(() => { __sim(1.5); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 400); }); if (!l) { await pg.waitForTimeout(400); if (!(await pg.evaluate(() => !!document.querySelector('.wd-box')))) break; continue; } t.push(l); if (snap && /GUILD|done/.test(l)) { await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.2); }); await pg.evaluate(() => __sim(4)); await shot(snap); snap = null; } await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.4); }); } await close(); return t.join(' / '); };
const F = () => pg.evaluate(() => Object.keys(__save.adv.flags).filter((k) => k.startsWith('sirocco')).sort().join(','));
const steps = [['sungate', 17, 8, 'e', 'Sirocco asks'], ['oasis', 15, 3, 'e', 'Bram gets the bucket'], ['oasis', 15, 3, 'e', 'Bram asks'], ['oasis', 21, 12, 'e', 'Grit gets the note'], ['oasis', 21, 12, 'e', 'Grit asks'],
  ['redrock', 13, 5, 'n', 'Bo gets the cog'], ['redrock', 13, 5, 'n', 'Bo asks'], ['sungate', 17, 8, 'e', 'Sirocco gets the knot'], ['sungate', 17, 8, 'e', 'Sirocco after']];
let n = 0;
for (const [m, x, y, d, what] of steps) {
  await start(m, x, y, d);
  if (n === 0) await shot('ask');
  const t = await talk(x, y, d);
  console.log(`${what}: ${t.slice(0, 150)}`);
  console.log('   flags', await F());
  n++;
}
console.log('hat', await pg.evaluate(() => __save.adv.hats.includes('siroccohat')));
await pg.evaluate(() => { __save.adv.hat = 'siroccohat'; }); await start('sungate', 16, 9, 's'); await pg.evaluate(() => __sim(1)); await shot('hat');
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
