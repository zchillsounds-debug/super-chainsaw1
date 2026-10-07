// node shots/multi.mjs <w> <h> <query> <outdir> <steps.json>   steps: [[name, js, waitMs], ...]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h, q, out, stepsFile] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: q.includes('mobile'), isMobile: q.includes('mobile') });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => (m.type() === 'error' || m.text().startsWith('[t]')) && errs.push(m.text()));
await pg.goto('http://localhost:5173/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
for (const [name, js, wait = 600] of steps) {
  if (js) await pg.evaluate(js);
  await pg.waitForTimeout(wait);
  await pg.screenshot({ path: `${out}/${name}.png`, timeout: 90000 });
}
console.log('log:', await pg.evaluate(() => window.__log || ''));
console.log('errors:', errs.filter((e) => !e.includes('CERT')).slice(0, 8).join(' | ') || 'none');
await b.close();
