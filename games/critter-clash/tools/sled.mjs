// node tools/sled.mjs [WxH] : R810, DUNE SLED. Talks to Dune Surfer Kai at the Dune Camp and plays three full runs with different
// auto-riders (idle: never presses; dig: holds on every downslope; pro: digs, lets go at crests, holds in the air to land on a
// downslope), printing each score; screenshots mid-run and after (tools/out/sled-*).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,dunecamp_arrive,cup_sandstorm'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.adv = { hero: 'cindermunch', map: 'dunecamp', x: 18, y: 10, dir: 'e', flags, spawn: { map: 'dunecamp', x: 5, y: 11 }, sandstorm: false };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } };
for (const bot of ['idle', 'dig', 'pro']) {
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.story === 'sled')); });
  await pg.waitForTimeout(400);
  if (bot === 'idle') console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 140)));
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
  await pg.waitForTimeout(300);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.sled'))) { console.log('game did not open'); break; }
  const run = (secs) => pg.evaluate(([secs, bot]) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S; A.press(true); A.press(false);
    for (let i = 0; i < secs * 60 && !S.over; i++) {
      const s = A.slope(S.x), ahead = A.slope(S.x + S.v * 0.25);
      if (bot === 'dig') A.press(!S.air && s > 0.05);
      if (bot === 'pro') A.press(S.air ? S.vy > -20 && ahead > 0.1 : s > 0.05 && ahead > -0.05);
      A.step(1 / 60);
    }
    return { m: Math.floor(S.x / 10), dates: S.dates, gems: S.gems, swoosh: S.swoosh, over: S.over, high: Math.round(S.best) }; }, [secs, bot]);
  const mid = await run(12);
  if (bot === 'pro') { await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.currentTime = 2000; } })); await pg.screenshot({ path: `tools/out/sled-mid-${tag}.png`, timeout: 120000 }); }
  const end = await run(45);
  await pg.waitForTimeout(2600); await pg.evaluate(() => __sim(0.5));
  const say = await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 90));
  console.log(bot, JSON.stringify(mid), '→', JSON.stringify(end), '|', say);
  if (bot === 'pro') await pg.screenshot({ path: `tools/out/sled-after-${tag}.png`, timeout: 120000 });
  await close();
}
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.sledHi, day: __save.adv.sledDay, hats: __save.adv.hats, berries: __save.berries, n: __save.adv.cnt?.sled })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
