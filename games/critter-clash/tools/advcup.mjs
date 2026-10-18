// node tools/advcup.mjs [WxH] [map x y flags]: enter a stadium (default: Bloom Town's Sprout Stadium) from the Adventure world, win the cup, and check you land back in the world
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const [map = 'bloom', sx = 8, sy = 7, fl = ''] = process.argv.slice(3);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5180/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(([map, sx, sy, fl]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map, x: +sx, y: +sy, dir: 'n', flags: Object.fromEntries(['intro', 'quest', 'rival1', ...fl.split(',').filter(Boolean)].map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
  const wo = __game.screens.worldObj; for (let i = 0; i < 12 && wo.dialog; i++) wo.dialog.next(); wo.interact(); for (let i = 0; i < 6 && wo.dialog; i++) wo.dialog.next();
}, [map, sx, sy, fl]);
// stadiums open into a lobby (R288): sign up at the front desk
await pg.waitForFunction(() => __game.screens.worldObj?.M?.indoor === 'lobby', null, { timeout: 20000 }).catch(() => {});
console.log('lobby:', await pg.evaluate(() => {
  const wo = __game.screens.worldObj; if (!wo || wo.M.indoor !== 'lobby') return wo?.key;
  wo.load(wo.key, 7, 3, 'n'); wo.dir = 'n'; wo.interact();
  for (let i = 0; i < 12 && wo.dialog; i++) wo.dialog.next();
  return wo.key;
}));
const path = [];
const click = (re) => pg.evaluate((src) => { const r = new RegExp(src); const el = [...document.querySelectorAll('button')].find((x) => r.test(x.textContent) && x.offsetParent); if (el) { el.click(); return true; } return false; }, re.source);
for (let step = 0; step < 60; step++) {
  await pg.waitForTimeout(700);
  const mode = await pg.evaluate(() => __game.screens.mode + (document.querySelector('.prof-wrap') ? '+prof' : ''));
  path.push(mode);
  if (mode.includes('+prof')) { await pg.evaluate(() => { for (let i = 0; i < 12; i++) document.querySelector('.prof-wrap')?.click(); }); continue; }
  if (mode === 'world') break;
  if (mode === 'ladder') { await click(/Battle!/); continue; }
  if (mode === 'vs' || mode === 'null') {
    await pg.evaluate(() => { const bt = __game.battle; if (!bt) return; const p = bt.fighters[0]; for (let i = 0; i < 80 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') bt.fighters[1].hp = 1; __sim(0.5); } __sim(2); });
    continue;
  }
  if (mode === 'results') { await pg.evaluate(() => document.querySelector('.recruit .btn, .modal-wrap .btn')?.click()); if (!(await click(/Next Battle|Collect Trophy/))) await click(/Continue/); continue; }
  if (mode === 'trophy') { await click(/Continue/); continue; }
}
const end = await pg.evaluate(() => ({ mode: __game.screens.mode, map: __game.screens.worldObj?.key, x: __game.screens.worldObj?.hx, y: __game.screens.worldObj?.hy, cups: Object.keys(__save.adv.flags).filter((k) => k.startsWith('cup_')).join(), dlg: document.querySelector('.wd-box')?.textContent?.slice(0, 60) }));
await pg.screenshot({ path: 'tools/out/advcup-end.png' });
console.log('path:', path.filter((m, i) => m !== path[i - 1]).join(' > '));
console.log('end:', JSON.stringify(end));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
