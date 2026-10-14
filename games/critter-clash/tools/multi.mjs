// node tools/multi.mjs <w> <h> <query> <outprefix> '<json [[js, name], ...]>'
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h, q, out, steps] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = q.includes('mobile');
const pg = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => (m.type() === 'error' || m.text().startsWith('REMOVED')) && errs.push(m.text()));
await pg.goto('http://localhost:5180/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
for (const [js, name, wait = 600] of JSON.parse(steps)) {
  const r = js ? await pg.evaluate(js) : null;
  if (r !== undefined && r !== null) console.log(name, '=>', typeof r === 'string' ? r : JSON.stringify(r));
  await pg.waitForTimeout(wait);
  if (name && !name.startsWith('_')) await pg.screenshot({ path: `${out}-${name}.png` });
}
console.log('errors:', errs.slice(0, 8).join(' | ') || 'none');
await b.close();
