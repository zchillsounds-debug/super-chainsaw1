// node tools/advtrial.mjs [WxH]: plays the Trial of Friendship (save Pip, bring Pip home, the brambles open, Dash's 3rd battle)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const shot = (n) => pg.screenshot({ path: `tools/out/trial-${n}.png` });
const flags = Object.fromEntries('intro,quest,rival1,cup_sprout,trial_strength,rival2,cup_thunder,post_sprout,post_thunder,woods'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.unlocked = __save.unlocked.filter((i) => i !== 'squeakwing');
  __save.adv = { hero: 'cindermunch', map: 'glowwood', x: 12, y: 6, dir: 'n', flags, spawn: { map: 'seashell', x: 18, y: 5 } };
  __game.screens.adventure(); __sim(0.3);
}, flags);
const W = (js) => pg.evaluate(`(()=>{const w=__game.screens.worldObj;${js}})()`);
const drain = () => W('for(let i=0;i<30&&w.dialog;i++)w.dialog.next(); return !!w.dialog');
const fight = async () => {
  await pg.waitForFunction(() => __game.battle, null, { timeout: 20000 });
  await pg.evaluate(() => { const bt = __game.battle; const p = bt.fighters[0]; for (let i = 0; i < 90 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') bt.fighters[1].hp = 1; __sim(0.5); } __sim(2); });
  await pg.waitForFunction(() => __game.screens.mode === 'results', null, { timeout: 20000 });
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); });
  await pg.waitForFunction(() => __game.screens.mode === 'world', null, { timeout: 20000 });
  await pg.evaluate(() => __sim(0.3));
};
// 1. Mama asks for help
console.log('mama:', await W('w.interact(); const t=document.querySelector(".wd-box")?.textContent; return t?.slice(0,60)'));
await drain();
console.log('bramble solid:', await W('return !w.walkable(10,4)'));
// 2. find Pip and the bully
await W('w.hx=4; w.hy=17; w.dir="e"; w.placeHero(); w.interact()');
await shot('1-pip'); await drain();
await fight();
console.log('after pip fight:', await W('return {f: !!w.follower, follow: __save.adv.follow, dlg: document.querySelector(".wd-box")?.textContent?.slice(0,50)}'));
await drain();
await W('w.tryMove("n")'); await pg.evaluate(() => __sim(0.4));
await shot('2-follow');
// 3. back to Mama
await W('w.load("glowwood", 12, 6, "n")'); await pg.evaluate(() => __sim(0.4));
await W('w.interact()'); await drain();
await pg.evaluate(() => __sim(0.4)); await shot('3-open');
await fight();
console.log('end:', await W('return {open: w.walkable(10,4) && w.walkable(11,4), dash: __save.adv.flags.dash3, trial: __save.adv.flags.trial_friendship, sq: __save.unlocked.includes("squeakwing"), follow: __save.adv.follow, map: w.key}'));
await W('w.hx=10; w.hy=5; w.placeHero(); w.tryMove("n")'); await pg.evaluate(() => __sim(0.4)); await shot('4-through');
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
