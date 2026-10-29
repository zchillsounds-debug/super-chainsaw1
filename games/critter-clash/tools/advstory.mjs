// node tools/advstory.mjs <map> <x> <y> <dir> <flags,comma> [WxH]: stand there, press A, and play out whatever happens
// (dialogue is tapped through, questions get the first answer, battles are forced wins; LOSE=1 forces losses) until the world is calm again
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [map, x, y, dir, fl = '', size = '915x412'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries(['intro', 'quest', ...fl.split(',').filter(Boolean)].map((k) => [k, true]));
await pg.evaluate(([map, x, y, dir, flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map, x: +x, y: +y, dir, flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
  const wo = __game.screens.worldObj; for (let i = 0; i < 20 && wo.dialog; i++) wo.dialog.next();
  wo.interact();
}, [map, x, y, dir, flags]);
const log = [];
for (let step = 0; step < 40; step++) {
  await pg.waitForTimeout(600);
  const st = await pg.evaluate((LOSE) => {
    const S = __game.screens, wo = S.worldObj;
    if (S.mode === 'world' && wo) {
      const t = document.querySelector('.wd-box')?.textContent?.slice(0, 70);
      if (wo.dialog) { wo.dialog.next(); wo.dialog?.next(); return 'say: ' + t; }
      return wo.busy ? 'busy' : 'calm';
    }
    if (S.mode === 'results') { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results'; }
    const bt = __game.battle;
    if (bt) { const lose = LOSE; const p = bt.fighters[lose ? 1 : 0], q = bt.fighters[lose ? 0 : 1]; for (let i = 0; i < 450 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') q.hp = 1; __sim(0.1); } __sim(2); return (lose ? 'lost to ' : 'battle vs ') + bt.fighters[1].def.name; }
    return S.mode;
  }, !!process.env.LOSE);
  if (log[log.length - 1] !== st) log.push(st);
  if (st === 'calm' && step > 2) break;
}
console.log(log.join('\n'));
await pg.screenshot({ path: 'tools/out/story-end.png' });
console.log('at:', await pg.evaluate(() => [__save.adv.map, __save.adv.x, __save.adv.y].join() + ' · spawn ' + JSON.stringify(__save.adv.spawn)));
console.log('flags:', await pg.evaluate(() => Object.keys(__save.adv.flags).join()));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
