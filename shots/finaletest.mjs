// node shots/finaletest.mjs <region> [outdir]: kill the region's boss, tap through the ending scene, report how it ends
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region, out] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
let reloaded = false; pg.on('framenavigated', () => { reloaded = true; });
await pg.evaluate(() => { const g = __game, A = __game.constructor && null; const s = Object.values(g.zones ? {} : {}); g.player.invuln = 1e9; });
await pg.evaluate(() => { const g = __game; const { x, z } = g.__sites || {}; });
await pg.evaluate(() => { const g = __game; g.player.pos.set(g.bossPos?.x ?? 0, 0, 0); });
const r0 = await pg.evaluate(() => { const g = __game; g.spawnBoss(); const b = g.boss || g.enemies.find((e) => e.boss); __director.skip?.(); __sim(0.5); b.rise = 1; b.hp = 1; g.damageEnemy(b, 1e9, false, b.pos); return b.name; });
let shots = 0, log = [];
for (let i = 0; i < 70 && !reloaded; i++) {
  const st = await pg.evaluate(() => { __sim(0.5); const d = __director; if (d.def) { d.advance(); __sim(0.05); d.advance(); } const v = document.querySelector('#victory, .victory'); return { cine: !!d.def, shot: d.i, line: d.shot?.line?.text || d.shot?.caption || d.shot?.card?.en || '', victory: !!(v && getComputedStyle(v).display !== 'none' && v.offsetParent) }; }).catch(() => ({ gone: true }));
  if (st.gone) break;
  if (st.line && log[log.length - 1] !== st.line) { log.push(st.line); if (out && shots < 12) await pg.screenshot({ path: `${out}/${region}-${String(shots++).padStart(2, '0')}.png` }); }
  if (st.victory) { log.push('VICTORY'); break; }
}
await pg.waitForTimeout(4000); // Round 24: a travel reload starts as the loop's last evaluate dies; give the navigation event time to land
console.log(region, 'boss', r0, '\n ' + log.join('\n '), '\nreloaded', reloaded);
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none'); await b.close();
