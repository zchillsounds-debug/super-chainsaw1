// node shots/r23charge.mjs <outdir> [region]: a kataphraktos spawned ahead of the hero on open ground, shot as his AI
// runs (the approach, the charge, the pass), plus Tatzates in play beside him
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = '.', region = 'sawad', spot = 'x=40&z=-30'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?play&mobile&noadapt&region=${region}&${spot}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const info = await pg.evaluate(() => {
  const g = __game, p = g.player; g.briefed = true; p.invuln = 1e9;
  for (const e of g.enemies) { e.dead = true; e.rig.visible = false; }
  // screen-up on the ground: from the camera toward the hero
  const c = g.camera.position, dx = p.pos.x - c.x, dz = p.pos.z - c.z, L = Math.hypot(dx, dz) || 1, ax = dx / L, az = dz / L;
  g.spawnPack('rider', p.pos.x + ax * 6.5 - az * 4, p.pos.z + az * 6.5 + ax * 4, 1, p.level, { spread: 0 });
  g.spawnPack('zubayr', p.pos.x + ax * 2 + az * 4, p.pos.z + az * 2 - ax * 4, 1, p.level, { hidden: false, spread: 0 });
  const live = g.enemies.filter((e) => !e.dead); for (const e of live) { e.rise = 1; e.hidden = false; e.riseT = 1; if (e.rig) e.rig.visible = true; }
  __sim(0.2); document.querySelectorAll('.hint, #hint, .tip').forEach((h) => h.remove());
  return live.map((e) => e.name + ' ' + e.type + ' d=' + e.pos.distanceTo(p.pos).toFixed(1));
});
console.log('spawned:', info.join(', '));
for (let n = 0; n < 6; n++) {
  await pg.evaluate(() => __sim(0.35)); await pg.waitForTimeout(400);
  await pg.screenshot({ path: `${out}/charge${n}.png`, timeout: 180000 });
}
console.log('errors:', errs.filter((e) => !e.includes('CERT')).join('\n') || 'none'); await b.close();
