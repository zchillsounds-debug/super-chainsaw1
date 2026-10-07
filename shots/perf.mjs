// node shots/perf.mjs <query>  -> prints the perf overlay text after settling
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const q = process.argv[2] || 'play&q=low&perf';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.waitForTimeout(6000);
console.log(await pg.evaluate(() => new Promise((res) => { const a = []; const step = () => { const i = window.__renderer.info.render; a.push(i.calls); if (a.length < 12) requestAnimationFrame(step); else res('draws/frame avg ' + (a.slice(2).reduce((x, y) => x + y, 0) / 10).toFixed(0) + ' [' + a.slice(2).join(',') + ']'); }; requestAnimationFrame(step); })));
console.log('errors:', errs.join(' | ') || 'none'); await b.close();
