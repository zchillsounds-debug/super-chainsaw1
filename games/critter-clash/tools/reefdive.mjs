// node tools/reefdive.mjs [WxH]: Dive Coach Nami's REEF DIVE in the Sunken Wreck: start, kick a few times, screenshot mid-dive, run out of air, check the prize
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '915x412').split('x').map(Number), tag = process.argv[2] || '915x412';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(() => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map: 'wreck', x: 4, y: 12, dir: 'w', flags: { intro: true, quest: true, sunstone: true, dived: true }, clock: 12, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
  const wo = __game.screens.worldObj; wo.talk(wo.npcs.find((q) => q.n.id === 'nami_w'));
});
await pg.waitForTimeout(300);
console.log('ask:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 160)));
await pg.evaluate(() => { const wo = __game.screens.worldObj; wo.dialog.next(); __sim(0.05); wo.dialog?.next?.(); });
await pg.waitForTimeout(300);
await pg.evaluate(() => { const A = document.querySelector('.arcade-wrap').__arcade; A.flap(); for (let k = 0; k < 40; k++) { if (k % 3 === 0) A.flap(); A.step(0.25); } });
await pg.screenshot({ path: `tools/out/reefdive-${tag}.png` });
console.log('mid:', await pg.evaluate(() => { const S = document.querySelector('.arcade-wrap').__arcade.S; return `air ${S.air.toFixed(1)} coins ${S.coins} dist ${Math.floor(S.dist)}`; }));
await pg.evaluate(() => { const A = document.querySelector('.arcade-wrap').__arcade; A.S.score += 300; for (let k = 0; k < 120 && !A.S.over; k++) { if (k % 3 === 0) A.flap(); A.step(0.25); } A.close(); });
await pg.waitForTimeout(300);
const said = []; for (let i = 0; i < 6; i++) { said.push(await pg.evaluate(() => { const wo = __game.screens.worldObj; const t = document.querySelector('.wd-box')?.textContent?.slice(0, 110); wo.dialog?.next(); return t; })); }
console.log(said.filter(Boolean).join('\n'));
console.log('saved:', await pg.evaluate(() => `hi ${__save.adv.diveHi} day ${__save.adv.diveDay} goggles ${__save.adv.hats?.includes('snorkelmask')}`));
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
