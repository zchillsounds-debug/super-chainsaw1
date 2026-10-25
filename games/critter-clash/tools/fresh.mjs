// node tools/fresh.mjs [WxH] : a brand-new player with real taps: welcome -> name -> partner -> title -> Adventure, screenshots each step (tools/out/fresh-<WxH>-<n>.png)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
let n = 0;
const shot = async (tag) => { await pg.evaluate(() => window.__sim?.(0.3)); await pg.screenshot({ path: `tools/out/fresh-${w}x${h}-${n++}.png` }); console.log(n - 1, tag); };
const tapText = async (re, t = 20000) => { const l = pg.locator('button', { hasText: re }).first(); await l.waitFor({ timeout: t }); await l.tap(); await pg.waitForTimeout(500); };
try {
  await pg.locator('body').tap({ position: { x: 5, y: 5 } }).catch(() => {});
  await shot('welcome');
  await tapText(/Next/); await shot('name');
  await pg.locator('.name-in').waitFor({ timeout: 20000 }); await pg.fill('.name-in', 'Zee'); await tapText(/OK/);
  await pg.locator('.pcard').first().waitFor({ timeout: 20000 }); await shot('partner');
  await pg.locator('.pcard').nth(1).tap(); await pg.waitForTimeout(300); await shot('partner picked');
  await tapText(/Yes/); await shot('after yes');
  await tapText(/Let's go/); await pg.waitForTimeout(1500); await shot('title');
  await tapText(/Adventure/); await pg.waitForTimeout(2500); await shot('adventure');
  await pg.locator('.hero-pick .hero-grid button').first().tap(); await pg.waitForTimeout(3000); await shot('world');
  for (let i = 0; i < 24; i++) { // tap through the opening dialogue, a shot every few lines
    const say = await pg.evaluate(() => document.querySelector('.wd-box')?.innerText?.replace(/\s+/g, ' ').slice(0, 90) || '');
    if (i % 4 === 0) await shot('say: ' + say);
    await pg.mouse.click(w / 2, h * 0.85); await pg.waitForTimeout(600); await pg.evaluate(() => window.__sim?.(0.6));
  }
  await shot('after intro');
  console.log('mode', await pg.evaluate(() => __game.screens.mode + ' ' + JSON.stringify({ map: __save.adv?.map, x: __save.adv?.x, y: __save.adv?.y })));
} catch (e) { console.log('FAIL', e.message.split('\n')[0]); await shot('fail'); }
console.log('errors:', errs.slice(0, 8).join(' | ') || 'none');
await b.close();
