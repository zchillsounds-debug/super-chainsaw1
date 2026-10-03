// node shots/skills.mjs <outdir> <cls>: fire each skill slot into a pack of foes and capture the effect mid-flight
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, cls] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&cls=${cls}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
await pg.evaluate(() => { const g = __game; g.player.pos.set(30, 0, 70); __sim(0.2); let k = 0; for (const e of g.enemies) { if (e.dead || e.boss || k > 4) continue; e.pos.set(30 + (k % 3 - 1) * 1.6, 0, 66 - Math.floor(k / 3) * 1.4); e.alerted = true; k++; } g.player.facing = Math.PI; g.player.mp = 999; g.setZoom(0.8); g.camInit = false; __sim(0.3); });
for (const slot of ['rmb', '1', '2', '3']) {
  await pg.evaluate((s) => { const g = __game; g.player.mp = 999; g.player.cds = {}; g.aimAuto?.(); g.useSkill(s); __sim(0.25); }, slot);
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `${out}/${cls}-${slot}.png` });
}
console.log(cls, errs.slice(0, 3).join(' | ') || 'ok'); await b.close();
