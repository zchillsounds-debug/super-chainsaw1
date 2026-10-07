// node shots/dung.mjs <outdir> <region> <ids,...>: enter each dungeon and capture a room
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, region, ids] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const id of ids.split(',')) {
  const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${region}`);
  await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
  await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
  await pg.evaluate((id) => { const g = __game; g.briefed = true; (id === 'qanat' ? g.interactables.find((i) => /kiln tunnels/i.test(i.label)) : g.interactables.find((i) => i.area === id)).act(); }, id);
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { const g = __game, I = g.interior.I, c = I.center(I.rooms[2] || I.rooms[1]); g.player.pos.set(c.x, 0, c.z + 2); g.camInit = false; for (const e of g.interior.enemies) e.alerted = true; __sim(1.2); });
  await pg.waitForTimeout(2000);
  await pg.screenshot({ path: `${out}/${id}.png` });
  console.log(id, errs.slice(0, 3).join(' | ') || 'ok'); await pg.close();
}
await b.close();
