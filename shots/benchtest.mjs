// node shots/benchtest.mjs [shotdir]: run the in-game benchmark (with a faster clock in headless) and print the result line
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2]; if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?play&mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate(() => { __game.settings.open(); document.querySelector('#settings .benchbtn').click(); });
// headless renders ~1 fps: feed the bench clock directly so the three phases run, rendering a frame now and then
for (let i = 0; i < 31; i++) { await pg.evaluate(() => { __game.benchTick(1.0); __sim(0.2); }); if (out && (i === 3 || i === 14 || i === 25)) await pg.screenshot({ path: `${out}/bench${i}.png` }); }
await pg.waitForTimeout(800); if (out) await pg.screenshot({ path: `${out}/result.png` });
console.log(await pg.evaluate(() => __game.lastBench?.line || 'no result'));
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
