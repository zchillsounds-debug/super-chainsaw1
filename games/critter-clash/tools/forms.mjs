// node tools/forms.mjs <out.png> <id,id,...> [lv,lv,...] : full-body portraits of critters at the given levels (default 1,16,32: each growth form) on one sheet
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, ids, lvs = '1,16,32'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const L = lvs.split(',').map(Number), I = ids.split(',');
const pg = await b.newPage({ viewport: { width: 200 * L.length, height: 200 * I.length } });
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(([I, L]) => {
  const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#cfe6f5;display:grid;grid-template-columns:repeat(' + L.length + ',200px)';
  for (const id of I) for (const lv of L) { const g = __game.portrait(__grow(__critters.find((c) => c.id === id), lv), 256, true); const im = new Image(); im.src = g; im.style.width = '200px'; d.appendChild(im); }
  document.body.appendChild(d);
}, [I, L]);
await pg.waitForTimeout(500);
await pg.screenshot({ path: out });
await b.close();
