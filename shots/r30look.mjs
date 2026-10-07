// node shots/r30look.mjs <out> [region] [lang]: phone-sized (915x412) shots for the Round 30 phone pass:
// the HUD at rest, a fight with the Round 29 troops (wedge, caltrops, javelins), the big map, the bag.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, region = 'sawad', lang = 'en'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
if (lang === 'ar') await pg.addInitScript(() => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch { /* */ } });
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const shot = async (n) => { await pg.screenshot({ path: `${out}/${region}-${lang}-${n}.png`, timeout: 180000 }); console.log('shot', n); };
await pg.evaluate(() => { const g = __game; g.briefed = true; g.tutorialOn = false; g.player.invuln = 1e9; __sim(1); });
await shot('hud');
await pg.evaluate(() => {
  const g = __game, p = g.player, c = g.camera.position, dx = p.pos.x - c.x, dz = p.pos.z - c.z, L = Math.hypot(dx, dz) || 1, ax = dx / L, az = dz / L;
  const at = (d, s) => [p.pos.x + ax * d - az * s, p.pos.z + az * d + ax * s];
  for (const e of g.enemies) if (!e.dead) { e.dead = true; e.removed = true; e.rig.visible = false; }
  g.enemies = g.enemies.filter((e) => !e.removed);
  const all = [];
  let [x, z] = at(5, 0); all.push(...g.spawnPack('kontaratos', x, z, 1, p.level, { spread: 0 }));
  [x, z] = at(9, -3); all.push(...g.spawnPack('tribolos', x, z, 1, p.level, { spread: 0 }));
  [x, z] = at(10, 3); all.push(...g.spawnPack('akontistes', x, z, 1, p.level, { spread: 0 }));
  [x, z] = at(7, 2); all.push(...g.spawnPack(['bandit', 'deputatos'], x, z, 2, p.level, { spread: 2 }));
  for (const e of all) { e.hidden = false; e.riseT = 1; e.alerted = true; e.rig.visible = true; }
  for (let i = 0; i < 40; i++) { __sim(0.1); }
});
await shot('fight');
await pg.evaluate(() => { __game.openMap(); }); await pg.waitForTimeout(5000); console.log("map open:", await pg.evaluate(() => !!document.querySelector("#shop.bigmap")));
await shot('map');
await pg.evaluate(() => { __game.sheets?.closeAll(); __game.ui.toggleInventory(true); __game.refreshInv(); }); await pg.waitForTimeout(800);
await shot('bag');
await pg.evaluate(() => { __game.sheets?.closeAll(); document.getElementById('quest')?.classList.add('open'); }); await pg.waitForTimeout(500);
await shot('tracker');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
