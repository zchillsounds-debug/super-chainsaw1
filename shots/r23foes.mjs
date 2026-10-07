// node shots/r23foes.mjs <outdir> [region]: Round 23 critique of the Byzantine company. Every troop type and boss
// stands in a line in the hub; shots of the line, close-ups of heads and shields, and an overhead game view.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const region = process.argv[3] || 'sawad', spot = process.argv[4] || 'x=40&z=-30';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&q=high&noadapt&cls=faris&region=${region}&tod=golden&${spot}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
const KEYS = ['bandit', 'guard', 'spearman', 'archer', 'deserter', 'naffat', 'slinger', 'netter', 'reedman', 'crossbow', 'engineer', 'rider', 'zubayr', 'commander', 'rawh', 'utba', 'ghanim'];
await pg.evaluate(async (KEYS) => {
  const { TYPES } = await import('/src/entities.js');
  await import('/src/rivals.js');
  const g = __game, P = g.player.pos; const { heightAt } = await import('/src/terrain.js'); g.heightAt = heightAt; g.player.rig.visible = false;
  for (const e of g.enemies) { e.rig.visible = false; e.dead = true; }
  window.__row = [];
  KEYS.forEach((k, i) => {
    const rig = TYPES[k].build({}), x = P.x - 8 + (i % 9) * 2.0, z = P.z - 6 - Math.floor(i / 9) * 5;
    rig.position.set(x, g.heightAt ? g.heightAt(x, z) : P.y, z); rig.rotation.y = 0; g.scene.add(rig);
    const st = { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 };
    __row.push({ k, rig, st, x, z });
  });
  window.__pose = () => { for (const r of __row) for (let i = 0; i < 4; i++) (r.rig.userData.anim ? r.rig.userData.anim.update(r.st, g.t, 0.016) : g.anim(r.rig, r.st, 0.016)); };
  __pose();
}, KEYS);
const shot = async (name, fn) => { await pg.evaluate(fn); await pg.evaluate(() => { __pose(); __sim(0.2); __pose(); }); await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}/${name}.png`, timeout: 240000 }); };
// the whole line, from the front, in three parts
for (const [part, i0, i1] of [[0, 0, 4], [1, 4, 8], [2, 9, 13], [3, 13, 16]]) {
  await shot(`line${part}`, `(() => { const g = __game, r = __row, a = r[${i0}], c = r[${i1}]; const mx = (a.x + c.x) / 2, z = a.z; g.updateCamera = function () { this.camera.position.set(mx, a.rig.position.y + 1.6, z + 7.5); this.camera.lookAt(mx, a.rig.position.y + 1.05, z); }; document.getElementById('ui').style.display = 'none'; })()`);
}
// heads and shields, close
for (const k of ['bandit', 'guard', 'spearman', 'crossbow', 'naffat', 'zubayr', 'commander', 'ghanim']) {
  await shot(`head-${k}`, `(() => { const g = __game, r = __row.find((q) => q.k === '${k}'); const s = r.rig.children[0].scale.x; g.updateCamera = function () { this.camera.position.set(r.x + 0.5 * s, r.rig.position.y + 1.72 * s, r.z + 1.5 * s); this.camera.lookAt(r.x, r.rig.position.y + 1.55 * s, r.z); }; })()`);
}
for (const k of ['guard', 'bandit']) {
  await shot(`shield-${k}`, `(() => { const g = __game, r = __row.find((q) => q.k === '${k}'); g.updateCamera = function () { this.camera.position.set(r.x - 1.6, r.rig.position.y + 1.3, r.z + 1.2); this.camera.lookAt(r.x - 0.2, r.rig.position.y + 1.0, r.z); }; })()`);
}
// overhead, as in play
await shot('overhead', `(() => { const g = __game, r = __row[8]; g.updateCamera = function () { this.camera.position.set(r.x, r.rig.position.y + 13, r.z + 9); this.camera.lookAt(r.x, r.rig.position.y, r.z); }; })()`);
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
