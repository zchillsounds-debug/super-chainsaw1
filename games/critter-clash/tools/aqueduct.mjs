// node tools/aqueduct.mjs [WxH] : R858-R860: the Old Aqueduct. From Glowcap Hollow (Pim's glowcaps done) walks south through the grate,
// shoots the arrival, talks to Waterwright Osei, checks the channels block (a runs, b dry), turns the west wheel (a dry, b runs), crosses,
// turns the middle wheel, crosses, opens the chest (Sun-Spout Circlet), turns the Sun Sluice (both dry, the spout pours), back to Osei for
// the Waterwright's Cap, then the oasis well's two berries. Shots tools/out/aqueduct-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_sprout', 'rod', 'spring_arrive', 'odjournal_done', 'hollow_arrive', 'gcap_asked', 'tess_a', 'baz_a', ...(process.env.LOCKED ? [] : ['gcap_done'])];
await pg.evaluate(([flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  __save.adv = { hats: ['glowcaphat'], flags: f, cnt: {}, seen: { oasis: true, wellspring: true, glowhollow: true }, hero: 'cindermunch', map: 'glowhollow', x: 8, y: 11, dir: 's', spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false };
  __game.screens.adventure(); __sim(0.5);
}, [story]);
const close = async () => { await pg.waitForTimeout(800); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box:not(.wd-ask)')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } await pg.evaluate(() => __sim(1)); };
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/aqueduct-${n}-${tag}.png`, timeout: 120000 }); };
const W = () => pg.evaluate(() => { const o = __game.screens.worldObj; return o && `${o.key} ${o.hx},${o.hy}`; });
const say = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 200));
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(120); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(120); await pg.evaluate(() => __sim(0.8)); };
const at = (x, y, d) => pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = d; o.placeHero(); __sim(0.4); }, [x, y, d]);
const A = async () => { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.5); }); await pg.waitForTimeout(400); await pg.evaluate(() => __sim(1.5)); };
const lines = async () => { const ll = []; for (let k = 0; k < 14; k++) { await pg.waitForTimeout(400); await pg.evaluate(() => __sim(3)); const t = await say(); if (!t) break; ll.push(t.slice(0, 80)); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.3); }); } return ll.join(' / '); };
const can = () => pg.evaluate(() => { const o = __game.screens.worldObj; return `a(9,5) ${o.walkable(9, 5) ? 'dry' : 'RUNS'} · b(17,5) ${o.walkable(17, 5) ? 'dry' : 'RUNS'}`; });
await close();
await walk('ArrowDown', 1.2); await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(2));
console.log('now:', await W(), '|', await say());
if (process.env.LOCKED) { await shot('locked'); await b.close(); process.exit(0); }
await shot('arrive'); await close();
await at(4, 4, 'n'); await A(); console.log('Osei:', await lines());
await pg.evaluate(() => __sim(2)); await at(7, 5, 'e'); await pg.evaluate(() => __sim(1)); await shot('west');
console.log('start:', await can());
await at(8, 4, 'e'); await walk('ArrowRight', 0.4); console.log('try cross a:', await W());
await at(6, 3, 'n'); await A(); await pg.evaluate(() => __sim(2)); console.log('wheel 1:', await can()); await at(7, 5, 'e'); await pg.evaluate(() => __sim(1)); await shot('wheel1');
await at(8, 4, 'e'); await walk('ArrowRight', 0.6); console.log('cross a:', await W());
await at(12, 3, 'n'); await A(); await pg.evaluate(() => __sim(2)); console.log('wheel 2:', await can());
await at(14, 3, 'n'); await A(); console.log('chest:', await say()); await shot('chest'); await close();
await at(16, 4, 'e'); await walk('ArrowRight', 0.6); console.log('cross b:', await W());
await at(21, 3, 'n'); await pg.evaluate(() => __sim(0.5)); await shot('sluice');
await A(); await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1)); console.log('Sun Sluice:', await lines(), '|', await can(), 'flag', await pg.evaluate(() => !!__save.adv.flags.aqueduct_flow));
await at(21, 6, 'e'); await pg.evaluate(() => __sim(2)); await shot('spout');
await at(4, 4, 'n'); await A(); console.log('Osei after:', await lines(), '| hats', await pg.evaluate(() => __save.adv.hats.join(',')));
await at(4, 1, 'n'); await walk('ArrowUp', 1.2); await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1)); console.log('back:', await W());
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
