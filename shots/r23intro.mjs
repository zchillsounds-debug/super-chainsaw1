// node shots/r23intro.mjs <outdir> [tod]: start a new game and shoot each shot of the prologue (the riders on the dune
// are Tatzates, a skoutatos and a kataphraktos), half a second or so into each shot
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = '.', tod = 'dusk'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?noadapt&tod=${tod}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate(() => document.getElementById('startbtn').click()); await pg.waitForTimeout(2500);
await pg.waitForSelector('.cp-card[data-k="faris"]', { timeout: 60000 });
await pg.evaluate(() => document.querySelector('.cp-card[data-k="faris"]').click()); await pg.waitForTimeout(4000);
for (let n = 0; n < 7; n++) {
  const st = await pg.evaluate(() => { const d = __director; return { on: !!d.def, i: d.i, line: d.shot?.line?.text || d.shot?.caption || d.shot?.card?.en || '' }; });
  if (!st.on) break;
  console.log(n, st.i, st.line);
  await pg.screenshot({ path: `${out}/intro${String(n).padStart(2, '0')}.png`, timeout: 180000 });
  await pg.evaluate(() => { const d = __director, i0 = d.i; d.advance(); if (d.i === i0) d.advance(); for (let k = 0; k < 24 && d.def && d.i === i0; k++) __sim(0.5); if (d.def) __sim(0.8); });
  await pg.waitForTimeout(700);
}
console.log('errors:', errs.filter((e) => !e.includes('CERT')).join('\n') || 'none'); await b.close();
