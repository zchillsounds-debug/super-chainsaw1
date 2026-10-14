// node tools/flow.mjs <w> <h> : fresh save, real taps through welcome -> title -> quick battle -> select
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w = 915, h = 412] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:5180/');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const shot = (n) => pg.screenshot({ path: `tools/out/flow-${n}.png` });
const tapText = async (re, t = 20000) => { const l = pg.locator('button', { hasText: re }).first(); await l.waitFor({ timeout: t }); await l.tap(); await pg.waitForTimeout(400); };
try {
  await pg.locator('body').tap({ position: { x: 5, y: 5 } }).catch(() => {});
  await tapText(/Next/); await shot('1');
  await pg.locator('.name-in').waitFor({ timeout: 20000 }); await pg.fill('.name-in', 'Zee'); await tapText(/OK/);
  await pg.locator('.pcard').first().waitFor({ timeout: 20000 }); await shot('2');
  await pg.locator('.pcard').nth(1).tap(); await pg.waitForTimeout(300);
  await tapText(/Yes/); await tapText(/Let's go/); await pg.waitForTimeout(1500); await shot('3');
  await tapText(/Quick Battle/); await pg.waitForTimeout(1500); await shot('4');
  const cards = pg.locator('.rcard'); console.log('cards', await cards.count());
  await cards.nth(7).tap(); await pg.waitForTimeout(800); await shot('5');
  console.log('sel', await pg.evaluate(() => __game.screens.sel));
  await tapText(/FIGHT/); await shot('5b');
  await pg.locator('.train-pick .tp-foe').nth(3).tap(); await pg.locator('.train-pick .tp-ar').nth(2).tap(); await shot('5c');
  await pg.locator('.train-pick button', { hasText: /FIGHT/ }).tap(); await pg.waitForTimeout(3000); await shot('6');
  console.log('mode', await pg.evaluate(() => __game.screens.mode + ' battle=' + !!__game.battle + ' p=' + __game.battle?.fighters[0].def.id));
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await shot('fail'); }
console.log('errors:', errs.slice(0, 8).join(' | ') || 'none');
await b.close();
