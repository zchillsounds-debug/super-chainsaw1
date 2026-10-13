// after a quick battle, go back and try picking critters in quick battle and tournament
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:5180/');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const shot = (n) => pg.screenshot({ path: `tools/out/flow2-${n}.png` });
const tapText = async (re, t = 20000) => { const l = pg.locator('button:visible', { hasText: re }).first(); await l.waitFor({ timeout: t }); await l.tap(); await pg.waitForTimeout(500); };
const state = () => pg.evaluate(() => `mode=${__game.screens.mode} sel=${__game.screens.sel} battle=${!!__game.battle} body=${document.body.className}`);
try {
  await pg.evaluate(() => { __save.trainer = { name: 'Zee', partner: 'bubbalotl' }; __save.tutorialDone = true; __game.screens.title(); });
  await pg.waitForTimeout(800);
  await tapText(/Quick Battle/); await pg.locator('.rcard').nth(0).tap(); await tapText(/FIGHT/);
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const b = __game.battle; for (let i = 0; i < 60 && b.phase !== 'done'; i++) { if (b.phase === 'fight') b.fighters[1].hp = 1; __sim(1); } __sim(2); });
  await pg.waitForTimeout(2500); await shot('res'); console.log('after battle', await state());
  const btns = await pg.locator('button:visible').allTextContents(); console.log('buttons', btns.join(' | '));
  await tapText(/Again|Rematch|Change|Critter|Menu|Title|Continue/); await pg.waitForTimeout(1200); console.log('then', await state()); await shot('a');
  if (await pg.locator('.rcard').count()) { await pg.locator('.rcard').nth(2).tap(); await pg.waitForTimeout(500); console.log('picked', await state()); }
  await pg.evaluate(() => __game.screens.title()); await pg.waitForTimeout(800);
  await tapText(/Tournament/); await pg.waitForTimeout(800); await pg.locator('.cup').first().tap(); await pg.waitForTimeout(1200);
  console.log('cup select', await state(), await pg.locator('.rcard').count()); await shot('cup');
  await pg.locator('.rcard').nth(1).tap(); await pg.waitForTimeout(500); console.log('cup picked', await state()); await shot('cup2');
  await tapText(/GO/); await pg.waitForTimeout(1500); console.log('ladder', await state()); await shot('ladder');
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await shot('fail'); console.log(await state()); }
console.log('errors:', errs.slice(0, 8).join(' | ') || 'none');
await b.close();
