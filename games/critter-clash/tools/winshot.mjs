// node tools/winshot.mjs <WxH> <prefix> [trainer] [extra]: win an Adventure fight and screenshot the results; reports where the buttons sit
// trainer=1 fights Route 1's trainer (a quote bubble); extra=1 also forces a level-up with a gear callout
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size, prefix, trainer = '0', extra = '0'] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:5180/?q=low&mobile&auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(([TR, EX, TU]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: !TU, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3'] });
  __save.adv = { hero: 'cindermunch', map: 'route1', x: 5, y: 10, dir: 's', flags: { intro: true, quest: true }, spawn: { map: 'village', x: 4, y: 6 } };
  if (EX) { __save.critters.cindermunch.level = 9; __save.critters.cindermunch.xp = 9999; }
  __game.screens.adventure(); __sim(0.5);
  const w = __game.screens.worldObj;
  if (TR) { const a = w.npcs.find((a) => a.n.trainer); w.challenge(a); for (let i = 0; i < 30 && w.dialog; i++) w.dialog.next(); }
  else w.startWild('clovebun', 3);
}, [+trainer, +extra, !!process.env.TUT]);
await pg.waitForTimeout(4000);
await pg.evaluate((s) => __sim(s), +(process.env.SIMT || 3));
await pg.screenshot({ path: `tools/out/${prefix}-fight.png` });
await pg.evaluate(() => { const b = __game.battle; for (let i = 0; i < 60 && b.phase !== 'done'; i++) { if (b.phase === 'fight') { b.fighters[1].hp = 1; b.fighters[0].hp = b.fighters[0].maxHp; } __sim(1); } __sim(2); });
await pg.waitForTimeout(5000);
const r = await pg.evaluate(() => [...document.querySelectorAll('.res-btns .btn, .res-btns button')].map((e) => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, Math.min(innerHeight - 1, r.y + r.height / 2)); return { text: e.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, hit: t === e || e.contains(t) ? 'ok' : (t ? t.className : 'none') }; }));
console.log(JSON.stringify(r));
await pg.screenshot({ path: `tools/out/${prefix}-win.png` });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
