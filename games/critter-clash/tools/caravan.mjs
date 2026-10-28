// node tools/caravan.mjs [WxH] : R837-R838, CARAVAN RUN. Talks to Caravan Master Hakim in Sunwell Oasis and plays three runs with
// different auto-leaders (idle: never changes lane; dodge: steps out of a lane with trouble ahead; pro: dodges and steers for
// dates, scarabs and water), printing each score; screenshots mid-run (in the sandstorm for pro) and after (tools/out/caravan-*).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,dunecamp_arrive,cup_sandstorm,caravan1_asked,caravan1_done,caravan2_asked,caravan2_done,caravan3_asked,caravan3_done'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.adv = { hero: 'cindermunch', map: 'oasis', x: 3, y: 12, dir: 'w', flags, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } };
for (const bot of ['idle', 'dodge', 'pro']) {
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.story === 'caravanrun')); });
  await pg.waitForTimeout(400);
  if (bot === 'idle') console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 140)));
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
  await pg.waitForTimeout(300);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.caravan'))) { console.log('game did not open'); break; }
  const run = (secs) => pg.evaluate(([secs, bot]) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S, LY = [118, 166, 214]; A.lane(0);
    const ahead = (l, far) => S.things.filter((o) => !o.got && o.x - S.x > -4 && o.x - S.x < far && (o.k === 'twister' ? Math.abs(o.y - LY[l]) < 30 : o.l === l));
    const bad = (l) => ahead(l, 70 + S.v * 0.2).some((o) => o.k === 'cactus' || o.k === 'twister');
    for (let i = 0; i < secs * 60 && !S.over; i++) {
      if (bot !== 'idle' && Math.abs(S.y - LY[S.lane]) < 4) {
        const opts = [S.lane - 1, S.lane, S.lane + 1].filter((l) => l >= 0 && l <= 2);
        const score = (l) => (bad(l) ? -100 : 0) + (bot === 'pro' ? ahead(l, 160).reduce((n, o) => n + ({ date: 5, scarab: 15, skin: S.water < 20 ? 30 : 3 }[o.k] || 0), 0) : 0) + (l === S.lane ? 1 : 0);
        const best = opts.sort((a, b) => score(b) - score(a))[0];
        if (best !== S.lane) A.lane(best - S.lane);
      }
      A.step(1 / 60);
      if (bot === 'pro' && S.stormT > 0 && S.stormT < 4.5 && !window.__stormShot) { window.__stormShot = true; return { storm: true, m: Math.floor(S.x / 10) }; }
    }
    return { m: Math.floor(S.x / 10), dates: S.dates, scarabs: S.scarabs, skins: S.skins, humps: S.humps, water: Math.round(S.water), over: S.over }; }, [secs, bot]);
  const mid = await run(12);
  if (bot === 'pro') { await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.currentTime = 2000; } })); await pg.screenshot({ path: `tools/out/caravan-mid-${tag}.png`, timeout: 120000 }); }
  let end = await run(70);
  if (end.storm) { await pg.screenshot({ path: `tools/out/caravan-storm-${tag}.png`, timeout: 120000 }); end = await run(70); }
  await pg.waitForTimeout(2600); await pg.evaluate(() => __sim(0.5));
  const say = await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 90));
  console.log(bot, JSON.stringify(mid), '→', JSON.stringify(end), '|', say);
  if (bot === 'pro') await pg.screenshot({ path: `tools/out/caravan-after-${tag}.png`, timeout: 120000 });
  await close();
}
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.caravanHi, day: __save.adv.caravanDay, hats: __save.adv.hats, berries: __save.berries, n: __save.adv.cnt?.caravan })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
