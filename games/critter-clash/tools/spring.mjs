// node tools/spring.mjs [WxH] : R829: the Sunwell Spring under Sunwell Oasis's well. Climbs down the well rope (after the Mirage Cup),
// shoots the arrival and the cave, rolls the boulder onto the rune plate (the alcove gate opens), opens the chest (Dewdrop Circlet),
// lands a Lantern Loach (forced roll), then climbs the rope back up. Shots tools/out/spring-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_sprout', 'rod'];
await pg.evaluate(([flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { hats: [], flags: f, cnt: {}, seen: { route1: true, oasis: true }, hero: 'cindermunch', map: 'oasis', x: 15, y: 4, dir: 'n', wellDay: now.toISOString().slice(0, 10), spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false, shift: { day: now.toISOString().slice(0, 10), h: (11 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [story]);
const close = async () => { await pg.waitForTimeout(800); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box:not(.wd-ask)')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } await pg.evaluate(() => __sim(1)); };
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/spring-${n}-${tag}.png`, timeout: 120000 }); };
const W = () => pg.evaluate(() => { const o = __game.screens.worldObj; return o && `${o.key} ${o.hx},${o.hy}`; });
const say = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 220));
const answer = async (i) => { await pg.waitForTimeout(600); await pg.evaluate(() => __sim(1.5)); const q = await say(); await pg.evaluate((i) => document.querySelectorAll('.wd-ask button')[i]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), i); return q; };
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(120); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(120); await pg.evaluate(() => __sim(0.8)); };
await close();
await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.4); });
console.log('well:', await answer(0));
await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(2)); await pg.waitForTimeout(500);
console.log('now:', await W(), 'arrive:', await pg.evaluate(() => !!__save.adv.flags.spring_arrive), '|', await say());
await shot('arrive'); await close();
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 11; o.hy = 6; o.dir = 's'; o.placeHero(); __sim(1.5); }); await shot('cave');
// the boulder: (15,8) west to the plate at (12,8)
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 16; o.hy = 8; o.dir = 'w'; o.placeHero(); __sim(0.5); });
for (let k = 0; k < 6 && !(await pg.evaluate(() => !!__save.adv.flags.spring_gate)); k++) await walk('ArrowLeft', 0.2);
console.log('boulder:', await pg.evaluate(() => JSON.stringify(__game.screens.worldObj.puz.boulders.map((q) => [q.x, q.y]))), 'gate flag:', await pg.evaluate(() => !!__save.adv.flags.spring_gate), await W());
await pg.evaluate(() => __sim(2)); await shot('gate');
await close();
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 7; o.hy = 11; o.dir = 's'; o.placeHero(); __sim(0.5); o.tapA = true; __sim(0.6); });
console.log('chest:', await say()); await shot('chest'); await close();
console.log('hat:', await pg.evaluate(() => __save.adv.hats.join(',')));
// a Lantern Loach (the reel's first roll forced to 0.6)
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 6; o.hy = 6; o.dir = 'n'; o.placeHero(); __sim(0.5); });
await pg.evaluate(() => { const o = __game.screens.worldObj, R = Math.random; let i = 0; Math.random = () => (i === 0 && /\.reel /.test(new Error().stack.split('\n')[2] || '') ? (i++, 0.6) : R()); o.fishing = { rod: new o.hero.root.constructor() }; o.hero.root.add(o.fishing.rod); o.reel('catch'); Math.random = R; });
await pg.evaluate(() => __sim(1)); console.log('fish:', await say()); await shot('fish'); await close();
console.log('fishLog.spring', await pg.evaluate(() => __save.adv.fishLog?.spring));
// back up the rope
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 10; o.hy = 2; o.dir = 'n'; o.placeHero(); __sim(0.5); o.tapA = true; __sim(0.4); });
console.log('rope:', await answer(0));
await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(2));
console.log('back:', await W());
await shot('back');
// R831: Pool Angler Layla hears about the Lantern Loach (once she's given her hat): +3 berries, once
await pg.evaluate(() => { __save.adv.hats.push('palmangler'); const o = __game.screens.worldObj; o.hx = 16; o.hy = 9; o.dir = 'e'; o.placeHero(); __sim(0.5); o.tapA = true; __sim(0.5); });
const ll = []; for (let k = 0; k < 4; k++) { await pg.waitForTimeout(500); await pg.evaluate(() => __sim(3)); const t = await say(); if (!t) break; ll.push(t.slice(0, 90)); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.3); }); }
console.log('Layla:', ll.join(' / '), 'flag', await pg.evaluate(() => !!__save.adv.flags.layla_loach));
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
