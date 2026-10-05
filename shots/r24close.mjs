// node shots/r24close.mjs <outdir> [names]: Round 24 close-ups. The falcon perched on Salim and in flight; the
// Byzantine troops one by one (skoutatos, psilos, menavlatos, toxotes, siphon-bearer, kataphraktos) at a 3/4 view.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, onlyS] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const only = onlyS?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?play&q=high&noadapt&cls=rami');
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
const want = (n) => !only || only.includes(n);
const shot = async (name, js, arg) => { if (!want(name)) return; await pg.evaluate(js, arg); await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/${name}.png`, timeout: 180000 }); console.log(name); };
await pg.evaluate(() => { for (const e of __game.enemies) if (e.pos.distanceTo(__game.player.pos) < 40) { e.rig.visible = false; e.dead = true; } });
await shot('falcon-perch', () => { const g = __game; g.player.falcon = { on: true }; __sim(1.5); __close(-50, 1.6, 1.85, 1.55); g.camera.fov = 26; g.camera.updateProjectionMatrix(); __sim(0.2); });
await shot('falcon-fly', () => { const g = __game; g.player.pos.set(40, 0, 20); __sim(4); const f = g.scene.children.find((o) => o.userData?.wings); __close(0, 3, 9.5, 9, () => f.position); g.camera.position.set(f.position.x + 1.6, f.position.y - 0.6, f.position.z + 1.6); g.updateCamera = function () { this.camera.position.set(f.position.x + 1.3, f.position.y - 0.5, f.position.z + 1.3); this.camera.lookAt(f.position); }; g.camera.fov = 40; g.camera.updateProjectionMatrix(); __sim(0.1); });
for (const [k, ang] of [['guard', 35], ['bandit', -35], ['spearman', 30], ['archer', -30], ['naffat', 35], ['rider', 60]]) {
  await shot('foe-' + k, ([k, ang]) => {
    const g = __game; g.player.falcon = { on: false };
    for (const e of g.enemies) if (e.close24) { e.rig.visible = false; e.dead = true; }
    const x = 30, z = 30; g.player.pos.set(x + 12, 0, z + 12);
    const e = g.spawnPack(k, x, z, 1, 5)[0]; e.close24 = true; e.alerted = false; e.facing = 0.4;
    __sim(0.3); e.pos.set(x, e.pos.y, z); e.facing = 0.4;
    const big = k === 'rider';
    __close(ang, big ? 6.5 : 3.6, big ? 2.6 : 1.7, big ? 1.8 : 1.15, () => e.rig.position); g.player.facing = 0.4; g.camera.fov = 30; g.camera.updateProjectionMatrix(); __sim(0.2);
  }, [k, ang]);
}
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
