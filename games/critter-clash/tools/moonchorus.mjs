// node tools/moonchorus.mjs [WxH] : R902, the Moonlight chorus (Dune Singer Amani, after the Songstone Circlet, after dark): picks
// 🌙 Moonlight and plays two bot runs (good: 6 notes, great: 9), printing scores, prize lines and the save; shot tools/out/moonchorus-<WxH>.png
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,cup_sandstorm,chanter_s'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map: 'singing', x: 5, y: 7, dir: 'w', flags, hats: ['songcirclet'], chorusHi: 9, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (22 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } };
await close();
for (const [bot, upto] of [['good', 6], ['great', 9]]) {
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.id === 'chanter_s')); });
  await pg.waitForTimeout(300);
  console.log('opts:', await pg.evaluate(() => [...document.querySelectorAll('.wd-opts button')].map((b) => b.textContent).join(' | ')));
  await pg.evaluate(() => { document.querySelectorAll('.wd-opts button')[1].dispatchEvent(new PointerEvent('pointerdown')); });
  await pg.waitForTimeout(800);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.chorus'))) { console.log('game did not open'); break; }
  const end = await pg.evaluate((upto) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S; let t = 0, gaps = [];
    for (let i = 0; i < 400 * 60 && !S.over; i++) { if (S.mode === 'you') { t += 1 / 60; if (t > 0.3) { t = 0; A.tap(S.seq.length > upto ? (S.seq[S.at] + 1) % 4 : S.seq[S.at]); } } A.step(1 / 60); }
    return { score: S.score, title: document.querySelector('.arcade.chorus b').textContent }; }, upto);
  if (bot === 'great') await pg.screenshot({ path: `tools/out/moonchorus-${tag}.png`, timeout: 120000 });
  await pg.waitForTimeout(3000); await pg.evaluate(() => __sim(0.5));
  const say = [];
  for (let k = 0; k < 4 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.waitForTimeout(400); await pg.evaluate(() => __sim(3)); say.push(await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 110))); await pg.evaluate(() => { __game.screens.worldObj.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); }
  console.log(bot, JSON.stringify(end), '|', say.join(' / '));
  await close();
}
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.chorusHi, moon: __save.adv.moonChorusHi, day: __save.adv.chorusDay, berries: __save.berries })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
