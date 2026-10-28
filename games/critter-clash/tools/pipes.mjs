// node tools/pipes.mjs [WxH] : R865, WATERWORKS. Talks to Waterwright Osei in the Old Aqueduct (Sun Sluice open, cap given) and plays
// three runs with different bots (idle: never taps; slow: 4 s + 1 s a needed turn per board; human: 3 s + 0.6 s a turn; pro: 1.5 s + 0.35 s a turn), printing each score and the
// prize lines; screenshots the board fresh, mid-run and at the end (tools/out/pipes-*).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,spring_arrive,odjournal_done,hollow_arrive,gcap_asked,gcap_done,aq_arrive,aq_asked,aqueduct_flow,aq_done'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.adv = { hero: 'cindermunch', map: 'aqueduct', x: 4, y: 4, dir: 'n', flags, hats: ['wheelcap'], spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, sluice: 0 };
  __game.screens.adventure(); __sim(0.5);
}, flags);
const close = async () => { for (let k = 0; k < 10 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } };
await close();
console.log('mark before:', await pg.evaluate(() => { const wo = __game.screens.worldObj, a = wo.npcs.find((q) => q.n.story === 'aqueduct'); return a?.mark ? __game.screens.worldObj.npcs.find((q) => q.n.story === 'aqueduct').markKind : null; }));
for (const bot of ['idle', 'slow', 'human', 'pro']) {
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.story === 'aqueduct')); });
  await pg.waitForTimeout(400);
  if (bot === 'idle') console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 160)));
  await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
  await pg.waitForTimeout(300);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.pipes'))) { console.log('game did not open'); break; }
  if (bot === 'pro') { await pg.evaluate(() => document.querySelector('.arcade-wrap').__arcade.step(1.3)); await pg.waitForTimeout(100); await pg.screenshot({ path: `tools/out/pipes-fresh-${tag}.png`, timeout: 120000 }); }
  const [base, per] = { idle: [1e9, 0], slow: [4, 1], human: [3, 0.6], pro: [1.5, 0.35] }[bot];
  const run = (secs) => pg.evaluate(([secs, base, per]) => { const A = document.querySelector('.arcade-wrap').__arcade, S = A.S; A.start(); let t = 0;
    for (let i = 0; i < secs * 60 && !S.over; i++) { if (S.flood <= 0) t += 1 / 60; if (S.flood <= 0 && t >= base + per * S.need) { t = 0; A.solve(); } A.step(1 / 60); }
    return { boards: S.boards, score: S.score, time: Math.ceil(S.time), over: S.over }; }, [secs, base, per]);
  const mid = await run(bot === 'pro' ? 5.2 : 20);
  if (bot === 'pro') { await pg.evaluate(() => { const A = document.querySelector('.arcade-wrap').__arcade; const S = A.S; for (let k = 0; k < 2; k++) { const [x, y] = S.path[k]; if (S.grid[y][x] !== S.sol[y][x]) A.turn(x, y); } A.step(0.1); }); await pg.screenshot({ path: `tools/out/pipes-mid-${tag}.png`, timeout: 120000 }); }
  const end = await run(400);
  if (bot === 'pro') await pg.screenshot({ path: `tools/out/pipes-end-${tag}.png`, timeout: 120000 });
  await pg.waitForTimeout(2800); await pg.evaluate(() => __sim(0.5));
  const say = [];
  for (let k = 0; k < 4 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { say.push(await pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.slice(0, 80))); await pg.evaluate(() => { __game.screens.worldObj.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); }
  console.log(bot, JSON.stringify(mid), '→', JSON.stringify(end), '|', say.join(' / '));
  await close();
}
console.log('mark after:', await pg.evaluate(() => __game.screens.worldObj.npcs.find((q) => q.n.story === 'aqueduct')?.mark ? __game.screens.worldObj.npcs.find((q) => q.n.story === 'aqueduct').markKind : null));
console.log('save:', await pg.evaluate(() => JSON.stringify({ hi: __save.adv.pipeHi, day: __save.adv.pipeDay, berries: __save.berries, n: __save.adv.cnt?.pipes, hat: __save.adv.hats.includes('pipegoggles') })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
