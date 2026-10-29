// node tools/chorus.mjs [WxH] : R892, DUNE CHORUS. Talks to Dune Singer Amani on the Singing Dunes (already beaten) and plays runs with
// bots that sing back perfectly until a set length, then miss a note (and one idle run), printing each score and the prize lines;
// screenshots the stones singing, the hero's turn and the end (tools/out/chorus-*). Also checks Battle still reaches her rematch talk.
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
  __save.adv = { hero: 'cindermunch', map: 'singing', x: 5, y: 7, dir: 'w', flags, hats: [], spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } };
await close();
const amani = () => pg.evaluate(() => { const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.id === 'chanter_s')); });
console.log('mark before:', await pg.evaluate(() => (((a) => a?.mark ? a.markKind : null)(__game.screens.worldObj.npcs.find((q) => q.n.id === 'chanter_s')))));
for (const [bot, upto] of [['idle', 0], ['short', 3], ['good', 6], ['great', 10]]) {
  await amani(); await pg.waitForTimeout(300);
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
  await pg.waitForTimeout(300);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.chorus'))) { console.log('game did not open'); break; }
  const shots = bot === 'great';
  // the bot: waits out the stones' song, then taps each note back after 0.35 s; past `upto` notes it taps a wrong stone
  const run = (secs, upto, stopAt) => pg.evaluate(([secs, upto, stopAt]) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S; let t = 0;
    for (let i = 0; i < secs * 60 && !S.over; i++) {
      if (stopAt && S.mode === stopAt[0] && S.seq.length >= stopAt[1] && S.at >= stopAt[2]) return { stop: true, len: S.seq.length, score: S.score };
      if (S.mode === 'you' && upto) { t += 1 / 60; if (t > 0.35) { t = 0; A.tap(S.seq.length > upto ? (S.seq[S.at] + 1) % 4 : S.seq[S.at]); } }
      A.step(1 / 60);
    }
    return { len: S.seq.length, score: S.score, over: S.over }; }, [secs, upto, stopAt]);
  if (shots) { await pg.waitForTimeout(700); await run(60, upto, ['play', 4, 2]); await pg.screenshot({ path: `tools/out/chorus-sing-${tag}.png`, timeout: 120000 }); await run(60, upto, ['you', 5, 3]); await pg.screenshot({ path: `tools/out/chorus-you-${tag}.png`, timeout: 120000 }); }
  const end = await run(400, upto);
  if (shots) { await pg.evaluate(() => document.querySelector('.arcade-wrap').__arcade.step(0.3)); await pg.screenshot({ path: `tools/out/chorus-end-${tag}.png`, timeout: 120000 }); }
  await pg.waitForTimeout(3000); await pg.evaluate(() => __sim(0.5));
  const say = [];
  for (let k = 0; k < 4 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { say.push(await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 90))); await pg.evaluate(() => { __game.screens.worldObj.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); }
  console.log(bot, JSON.stringify(end), '|', say.join(' / '));
  await close();
}
// Battle: her old talk (a rematch offer after the crowning)
await amani(); await pg.waitForTimeout(300);
console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 170)));
await pg.evaluate(() => { document.querySelectorAll('.wd-opts button')[1].dispatchEvent(new PointerEvent('pointerdown')); __sim(0.2); });
await pg.waitForTimeout(300);
console.log('battle →', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 120)));
console.log('mark after:', await pg.evaluate(() => (((a) => a?.mark ? a.markKind : null)(__game.screens.worldObj.npcs.find((q) => q.n.id === 'chanter_s')))));
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.chorusHi, day: __save.adv.chorusDay, berries: __save.berries, n: __save.adv.cnt?.chorus, hat: __save.adv.hats.includes('songcirclet') })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
