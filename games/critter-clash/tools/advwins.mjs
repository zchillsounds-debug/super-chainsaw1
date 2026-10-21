// RAIN=1 node tools/advwins.mjs <WxH> <prefix> <map,map,...> (RAIN=1: a rainy midday): a wild fight on each Adventure map; shots mid-fight and on the results
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [size, prefix, maps] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low&mobile&auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
for (const map of maps.split(',')) {
  const info = await pg.evaluate(([map, rain]) => {
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3', 'adv4', 'adv5', 'adv6', 'adv7', 'adv8', 'adv9', 'adv10', 'adv11', 'adv12', 'adv13', 'adv14', 'adv15', 'adv16', 'adv17', 'adv18', 'adv19', 'adv20', 'adv21', 'adv22', 'adv23', 'adv24', 'adv25', 'adv26', 'adv27'] });
    const M = __game.screens.constructor.getMap?.(map);
    __save.adv = { hero: 'cindermunch', map, x: 5, y: 5, dir: 's', flags: { intro: true, quest: true }, spawn: { map: 'village', x: 4, y: 6 }, ...(rain ? { rain: true, clock: 12 } : {}) };
    __game.screens.adventure(); __sim(0.5);
    const w = __game.screens.worldObj, W = w.M.wild;
    const id = W?.list?.[0]?.[0] || 'clovebun';
    w.startWild(id, 10);
    return [w.M.name, w.M.arena, id];
  }, [map, !!process.env.RAIN]);
  await pg.waitForTimeout(4500);
  await pg.evaluate(() => __sim(7));
  await pg.screenshot({ path: `tools/out/${prefix}-${map}-fight.png` });
  await pg.evaluate(() => { const b = __game.battle; for (let i = 0; i < 60 && b.phase !== 'done'; i++) { if (b.phase === 'fight') { b.fighters[1].hp = 1; b.fighters[0].hp = b.fighters[0].maxHp; } __sim(1); } __sim(2); });
  await pg.waitForTimeout(3000);
  await pg.screenshot({ path: `tools/out/${prefix}-${map}-win.png` });
  console.log(map, JSON.stringify(info));
  await pg.evaluate(() => { document.querySelector('.res-btns .btn')?.click(); });
  await pg.waitForTimeout(1500);
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
