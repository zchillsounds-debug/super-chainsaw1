// node tools/hollowfish.mjs [WxH] : R857: Glowcap Hollow's Starspot Eel. Starts in the hollow by the black pool (eels swim in it),
// lands an eel (the reel's first roll forced to 0.5), checks the fish log, then Pim's chat line and Layla's reaction. Shots tools/out/hollowfish-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_sprout', 'rod', 'spring_arrive', 'odjournal_done', 'hollow_arrive', 'gcap_asked', 'gcap_done'];
await pg.evaluate(([flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  __save.adv = { hats: ['glowcaphat', 'palmangler'], flags: f, cnt: {}, seen: { oasis: true, wellspring: true, glowhollow: true }, hero: 'cindermunch', map: 'glowhollow', x: 10, y: 6, dir: 's', spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false };
  __game.screens.adventure(); __sim(0.5);
}, [story]);
const close = async () => { await pg.waitForTimeout(800); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box:not(.wd-ask)')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } await pg.evaluate(() => __sim(1)); };
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/hollowfish-${n}-${tag}.png`, timeout: 120000 }); };
const say = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 240));
await close(); await pg.evaluate(() => __sim(2));
console.log('eels:', await pg.evaluate(() => __game.screens.worldObj.loaches?.length));
await shot('pool');
await pg.evaluate(() => { const o = __game.screens.worldObj, R = Math.random; let i = 0; Math.random = () => (i === 0 && /\.reel /.test(new Error().stack.split('\n')[2] || '') ? (i++, 0.5) : R()); o.fishing = { rod: new o.hero.root.constructor() }; o.hero.root.add(o.fishing.rod); o.reel('catch'); Math.random = R; });
await pg.evaluate(() => __sim(1)); console.log('fish:', await say()); await shot('fish'); await close();
console.log('fishLog.hollow', await pg.evaluate(() => __save.adv.fishLog?.hollow));
// Pim's "Just chat" (the first time after an eel: his eel line)
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 11; o.hy = 9; o.dir = 'e'; o.placeHero(); __sim(0.5); o.tapA = true; __sim(0.5); });
await pg.waitForTimeout(600); await pg.evaluate(() => __sim(1.5));
await pg.evaluate(() => document.querySelectorAll('.wd-ask button')[1]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await pg.waitForTimeout(600); await pg.evaluate(() => __sim(1));
console.log('Pim:', await say(), 'flag', await pg.evaluate(() => !!__save.adv.flags.pim_eel)); await shot('pim'); await close();
// the Journal's fish page
await pg.evaluate(() => { __game.screens.worldJournal('fish'); __sim(0.3); });
await pg.waitForTimeout(500);
await shot('journal'); console.log('journal:', await pg.evaluate(() => [...document.querySelectorAll('.jr-fish')].map((e) => e.textContent).filter((t) => /Eel|Loach|\?\?\?/.test(t)).join(' | ')));
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
