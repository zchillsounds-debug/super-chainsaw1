// node tools/spore.mjs [WxH] : R854, SPORE DRIFT. Talks to Forager Pim in Glowcap Hollow (glowcaps given) and plays three runs with
// different auto-pilots (idle: never steers; dodge: slides out from under ledges and drips; pro: dodges and steers for motes and glowcaps),
// printing each score; screenshots mid-run and after (tools/out/spore-*).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,spring_arrive,odjournal_done,hollow_arrive,gcap_asked,gcap_done'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.adv = { hero: 'cindermunch', map: 'glowhollow', x: 13, y: 9, dir: 'w', flags, hats: ['glowcaphat'], spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } };
await close();
for (const bot of ['idle', 'dodge', 'pro']) {
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.story === 'glowcaps')); });
  await pg.waitForTimeout(400);
  if (bot === 'idle') console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 160)));
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
  await pg.waitForTimeout(300);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.spore'))) { console.log('game did not open'); break; }
  const run = (secs) => pg.evaluate(([secs, bot]) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S, Y = 170; A.start();
    for (let i = 0; i < secs * 60 && !S.over; i++) {
      if (bot !== 'idle') {
        const near = S.things.filter((o) => !o.gone && o.y < Y + 10 && o.y > Y - 120);
        const blocked = (x) => near.some((o) => (o.k === 'rock' && x > o.x0 - 16 && x < o.x1 + 16) || (o.k === 'drip' && Math.abs(o.x - x) < 22));
        let tgt = S.x;
        if (bot === 'pro') { const good = near.filter((o) => o.k === 'mote' || o.k === 'cap').sort((a, b) => b.y - a.y)[0]; if (good && !blocked(good.x)) tgt = good.x; }
        if (blocked(tgt)) { let best = null; for (let x = 50; x <= 270; x += 10) if (!blocked(x) && (best == null || Math.abs(x - S.x) < Math.abs(best - S.x))) best = x; if (best != null) tgt = best; }
        A.steer(tgt);
      }
      A.step(1 / 60);
    }
    return { m: Math.floor(S.h), score: Math.floor(S.score), light: +S.light.toFixed(2), motes: S.motes, caps: S.caps, over: S.over, won: S.won }; }, [secs, bot]);
  const mid = await run(8);
  if (bot === 'pro') await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.currentTime = 2000; } })), await pg.screenshot({ path: `tools/out/spore-mid-${tag}.png`, timeout: 120000 });
  const end = await run(120);
  if (bot === 'pro') await pg.screenshot({ path: `tools/out/spore-end-${tag}.png`, timeout: 120000 });
  await pg.waitForTimeout(2600); await pg.evaluate(() => __sim(0.5));
  const say = await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 90));
  console.log(bot, JSON.stringify(mid), '→', JSON.stringify(end), '|', say);
  await close();
}
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.sporeHi, day: __save.adv.sporeDay, berries: __save.berries, n: __save.adv.cnt?.spore })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
