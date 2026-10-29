// node tools/aqfish.mjs [WxH] : R878: the Coinscale Carp in the Old Aqueduct's outlet pool (after the Sun Sluice): a forced catch
// (roll 0.6) by the spout, then the Journal's fish tab. Before the flow the same roll is an ordinary catch. Shots tools/out/aqfish-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const base = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'rod', 'spring_arrive', 'hollow_arrive', 'gcap_done', 'aq_arrive', 'aq_asked', 'tess_a', 'baz_a', 'aq_green'];
const load = (flags, x, y, d) => pg.evaluate(([flags, x, y, d]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  __save.adv = { hats: [], flags: f, cnt: {}, seen: { oasis: true, wellspring: true, glowhollow: true, aqueduct: true }, hero: 'cindermunch', map: 'aqueduct', x, y, dir: d, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false };
  if (__game.screens.worldObj) __game.screens.worldObj.load('aqueduct', x, y, d); else __game.screens.adventure(); __sim(0.8);
}, [flags, x, y, d]);
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/aqfish-${n}-${tag}.png`, timeout: 120000 }); };
const say = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 200));
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(120); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(120); await pg.evaluate(() => __sim(0.8)); };
const at = (x, y, d) => pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = d; o.placeHero(); __sim(0.4); }, [x, y, d]);
const A = async () => { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.5); }); await pg.waitForTimeout(400); await pg.evaluate(() => __sim(1.5)); };
const lines = async () => { const ll = []; for (let k = 0; k < 14; k++) { await pg.waitForTimeout(400); await pg.evaluate(() => __sim(3)); const t = await say(); if (!t) break; ll.push(t.slice(0, 90)); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.3); }); } return ll.join(' / '); };
const pos = () => pg.evaluate(() => { const o = __game.screens.worldObj; return `${o.key} ${o.hx},${o.hy} walk(17,2)=${o.walkable(17, 2)} walk(17,1)=${o.walkable(17, 1)}`; });
const reel = () => pg.evaluate(() => { const o = __game.screens.worldObj, R = Math.random; let i = 0; Math.random = () => (i === 0 && /\.reel /.test(new Error().stack.split('\n')[2] || '') ? (i++, 0.6) : R()); o.fishing = { rod: new o.hero.root.constructor() }; o.hero.root.add(o.fishing.rod); o.reel('catch'); Math.random = R; __sim(1); });
await load([...base, 'rod'], 22, 5, 'e'); await reel(); console.log('before flow:', await lines());
await load([...base, 'rod', 'aqueduct_flow', 'aq_done', 'aq_nookhint'], 22, 5, 'e'); await reel(); await shot('catch'); console.log('after flow:', await lines());
await reel(); console.log('again:', await lines());
console.log('fishLog.aq', await pg.evaluate(() => __save.adv.fishLog?.aq));
await pg.evaluate(() => { __game.screens.worldJournal('fish'); }); await pg.waitForTimeout(800);
console.log('journal row:', await pg.evaluate(() => [...document.querySelectorAll('.jr-fish')].map((e) => e.textContent).filter((t) => /aqueduct/.test(t)).join(' | ')));
await shot('journal');
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
await b.close();
