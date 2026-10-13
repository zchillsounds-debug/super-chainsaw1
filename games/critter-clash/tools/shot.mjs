// node tools/shot.mjs <w> <h> <query> <out.png> [js-before] [waitMs]
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h, q, out, js = '', wait = '1500'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = q.includes('mobile');
const pg = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text()));
await pg.goto('http://localhost:5180/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
if (js) await pg.evaluate(js);
await pg.waitForTimeout(+wait);
await pg.screenshot({ path: out });
console.log('errors:', errs.slice(0, 8).join(' | ') || 'none');
await b.close();
