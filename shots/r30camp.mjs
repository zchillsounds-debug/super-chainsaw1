// node shots/r30camp.mjs [region] [out]: the Round 30 camp props. An overhead shot of the camp, then each new prop close
// (cooking fire, both tents, the water stand, Bishr's field forge and old anvil, the rebuilt forge), one shot at play
// distance; prints triangles and draw calls per prop and checks the camp men can still be reached from the spawn.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out = '/tmp/r30camp'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&q=high&tod=golden&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.addScriptTag({ path: new URL('./close.js', import.meta.url).pathname });
const info = await pg.evaluate(async () => {
  const g = __game, P = g.campProps30 || {}, o = {};
  for (const k in P) { let n = 0, tri = 0; P[k].traverse((m) => { if (m.isMesh) { n++; tri += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; } }); o[k] = { meshes: n, tris: Math.round(tri), at: [+P[k].position.x.toFixed(1), +P[k].position.z.toFixed(1)] }; }
  // every camp man reachable on foot from the spawn
  const { findPath } = await import('/src/nav.js'), { HUB } = await import('/src/region.js');
  const s = { x: HUB.spawn[0], z: HUB.spawn[1] }, reach = {};
  for (const k of ['merchant', 'smith', 'stash', 'trainer', 'ishaq']) { const p = findPath(s, { x: HUB[k][0] + 1.5, z: HUB[k][1] + 1.5 }, 60000); reach[k] = !!p; }
  return { props: o, reach };
});
console.log(JSON.stringify(info));
const shot = (n) => pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 });
// overhead
await pg.evaluate(async () => { const g = __game, { HUB } = await import('/src/region.js'); const c = { x: (HUB.merchant[0] + HUB.trainer[0]) / 2, z: (HUB.smith[1] + HUB.trainer[1]) / 2 }; g.player.rig.visible = true;
  g.updateCamera = function () { this.camera.position.set(c.x + 2, 34, c.z + 20); this.camera.lookAt(c.x, 0, c.z); }; document.getElementById('ui').style.display = 'none'; __sim(0.3); });
await pg.waitForTimeout(500); await shot('overhead');
const close = async (name, getter, ang, dist, h, ly) => {
  await pg.evaluate(([getter, ang, dist, h, ly]) => { const g = __game, P = eval(getter); g.player.pos.set(P.position.x + 14, P.position.y, P.position.z + 14); g.player.facing = P.rotation.y; g.player.rig.visible = false; __close(ang, dist, h, ly, () => P.position); __sim(0.2); }, [getter, ang, dist, h, ly]);
  await pg.waitForTimeout(400); await shot(name);
};
await close('cook', '__game.campProps30.cook', 30, 4.2, 2.2, 0.6);
await close('tentA', '__game.campProps30.tentA', 20, 6.0, 2.6, 0.9);
await close('tentB', '__game.campProps30.tentB', -30, 6.0, 2.6, 0.9);
await close('water', '__game.campProps30.water', 25, 3.2, 1.6, 0.7);
await close('fieldforge', '__game.onAnvil', 140, 4.6, 2.2, 0.5);
// the rebuilt forge: show the upgrade
const hasHearth = await pg.evaluate(() => { const S = __game.hubLife?.spots?.forge; if (!S) return false; S.a.visible = false; S.b.visible = true; window.__hearth = S.b; return true; });
console.log('hearth:', hasHearth);
if (hasHearth) await close('hearth', '__hearth', 30, 4.4, 2.3, 1.0);
// play distance by the cooking fire
await pg.reload(); await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate(() => { const g = __game, P = g.campProps30.cook; g.player.pos.set(P.position.x + 2.5, P.position.y, P.position.z + 2.5); __sim(0.6); });
await pg.waitForTimeout(600); await shot('play');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
