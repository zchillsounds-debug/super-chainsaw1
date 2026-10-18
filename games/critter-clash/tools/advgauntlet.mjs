// node tools/advgauntlet.mjs [WxH] : the post-game Peak Gauntlet: talk to Keeper Orla, win battle 1, land back on the Peak, check progress
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low&mobile&auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
console.log('talk:', await pg.evaluate(() => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3', 'adv4', 'adv5', 'adv6', 'adv7', 'adv8', 'adv9', 'adv10', 'adv11', 'adv12', 'adv13', 'adv14'] });
  const flags = {}; for (const k of 'intro quest rival1 trial_strength cup_sprout woods ending crowned'.split(' ')) flags[k] = true;
  __save.adv = { hero: 'cindermunch', map: 'peak', x: 5, y: 5, dir: 'w', flags, spawn: { map: 'village', x: 4, y: 6 } };
  __save.critters.cindermunch.level = 22;
  __game.screens.adventure(); __sim(0.5);
  const w = __game.screens.worldObj; w.dir = 'w'; w.S.worldStory('gauntlet', w, null);
  const out = []; for (let i = 0; i < 6 && w.dialog; i++) { __sim(1.5); out.push(document.querySelector('.wd-box p')?.textContent); w.dialog.next(); __sim(0.3); }
  return out.join(' | ');
}));
await pg.waitForTimeout(4500);
await pg.evaluate(() => __sim(6));
await pg.screenshot({ path: 'tools/out/gaunt-fight.png' });
await pg.evaluate(() => { const b = __game.battle; for (let i = 0; i < 60 && b.phase !== 'done'; i++) { if (b.phase === 'fight') { b.fighters[1].hp = 1; b.fighters[0].hp = b.fighters[0].maxHp; } __sim(1); } __sim(2); });
await pg.waitForTimeout(3000);
await pg.screenshot({ path: 'tools/out/gaunt-win.png' });
await pg.evaluate(() => { document.querySelector('.res-btns .btn')?.click(); });
await pg.waitForTimeout(2500);
console.log('after:', await pg.evaluate(() => { const w = __game.screens.worldObj; const F = __save.adv.flags; return JSON.stringify({ map: w?.key, gaunt: Object.keys(F).filter((k) => k.startsWith('gaunt')), berries: __save.berries }); }));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
