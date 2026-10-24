// node tools/surf.mjs [WxH] [secs] [hour]: talks to Surfer Malia in Ember Isle's Surf Shack, plays WAVE RIDER with a simple auto-hopper, shots mid-ride and after
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size = '915x412', secs = '40', hour = ''] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,cup_coral,cup_gale,ember_isle'.split(',').map((k) => [k, true]));
await pg.evaluate(([flags, hour]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map: 'ember_isle', x: 5, y: 11, dir: 'n', flags, spawn: { map: 'village', x: 4, y: 6 }, ...(hour ? { clock: +hour } : {}) };
  __game.screens.adventure(); __sim(0.3);
  const wo = __game.screens.worldObj; wo.load('in:ember_isle:shack_e', 4, 3, 'w'); __sim(0.3);
  wo.talk(wo.npcs.find((q) => q.n.story === 'surf'));
}, [flags, hour]);
await pg.waitForTimeout(400);
console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 160)));
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
await pg.waitForTimeout(300);
const ok = await pg.evaluate(() => !!document.querySelector('.arcade.surf'));
console.log('game open:', ok);
// auto-hopper: hop when a rock is close ahead, or a high shell, and no gull would be hit
const ride = (secs) => pg.evaluate((secs) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S; A.flap();
  for (let i = 0; i < secs * 60 && !S.over; i++) { const rock = S.things.find((o) => o.k === 'rock' && o.x > 84 && o.x - 84 < 52), gull = S.things.find((o) => o.k === 'gull' && o.x > 70 && o.x - 84 < 110); if (rock && !gull && !S.air) A.flap(); A.step(1 / 60); }
  return { dist: Math.floor(S.dist), shells: S.shells, over: S.over }; }, secs);
console.log('ride 1:', JSON.stringify(await ride(6)));
await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.currentTime = 2000; } }));
await pg.screenshot({ path: `tools/out/surf${hour ? '-h' + hour : ''}-${size}.png` });
console.log('ride 2:', JSON.stringify(await ride(+secs)));
await pg.evaluate(() => document.querySelector('.arcade-wrap')?.__arcade.close());
await pg.waitForTimeout(400);
const out = []; for (let i = 0; i < 6; i++) out.push(await pg.evaluate(() => { const wo = __game.screens.worldObj, t = document.querySelector('.wd-box')?.textContent?.slice(0, 110); wo.dialog?.next(); return t; }));
console.log('after:', out.filter(Boolean).join(' / '));
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.surfHi, night: __save.adv.surfNight, nightHi: __save.adv.surfNightHi, day: __save.adv.surfDay, hats: __save.adv.hats, berries: __save.berries })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
