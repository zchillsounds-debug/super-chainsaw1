// node shots/errs.mjs <query>: load the page for 60 s and print page errors and console errors (no wait for ready)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage(); const errs = [];
pg.on('pageerror', (e) => errs.push('PAGE: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
pg.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE: ' + m.text().slice(0, 600)));
await pg.goto('http://localhost:5173/?' + process.argv[2]);
await pg.waitForTimeout(+(process.argv[3] || 60000));
console.log(errs.slice(0, 8).join('\n') || 'none'); await b.close();
