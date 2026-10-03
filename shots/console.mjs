import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage(); const errs = [];
pg.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errs.push(m.text().slice(0, 400)));
await pg.goto('http://localhost:5173/?' + process.argv[2]);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 }); await pg.waitForTimeout(2000);
console.log(errs.filter((e) => !e.includes('CERT')).slice(0, 6).join('\n---\n') || 'none'); await b.close();
