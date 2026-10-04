// node shots/r21mount.mjs <region> [outdir]: whistle up the mount, it trots in, Salim rides; screenshots of the whistle and the ride
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'karkh', out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await pg.goto(`http://localhost:5173/?play&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
const log = [];
log.push(await pg.evaluate(() => { const g = __game; for (const e of g.enemies) e.alerted = false; g.mount.toggle(); __sim(0.25); return 'whistling ' + g.player.st.action + ' coming ' + !!g.mount.coming; }));
if (out) { await pg.evaluate(() => { __close(35, 2.6, 1.7, 1.5); __sim(0.05); }); await pg.waitForTimeout(600); await pg.screenshot({ path: out + `/whistle-${region}.png` }); }
log.push(await pg.evaluate(() => { const g = __game; for (let i = 0; i < 16; i++) __sim(0.15); return 'mounted ' + g.mount.on + ' horse ' + !!g.mount.horse; }));
log.push(await pg.evaluate(() => { const g = __game, p = g.player; const z0 = p.pos.z; for (let i = 0; i < 12; i++) { g.joy = { x: 0, y: -1 }; __sim(0.15); } g.joy = null; return 'rode ' + (z0 - p.pos.z).toFixed(1) + ' m in 1.8 s'; }));
if (out) { await pg.evaluate(() => { const g = __game; g.joy = { x: 0, y: -1 }; __sim(0.3); __close(80, 6.5, 2.6, 1.6); __sim(0.05); }); await pg.waitForTimeout(600); await pg.screenshot({ path: out + `/ride-${region}.png` }); }
console.log(log.join('\n'));
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
