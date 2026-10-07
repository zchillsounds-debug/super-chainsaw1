// node shots/r27props.mjs [region] [out]: the Round 27 sculpted camp props: place all three (Yusuf's goods, Bishr's anvil,
// 'Amr's practice post and rack) and shoot each close, then one at play distance from the phone camera; prints draw calls
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'docks', out = '/tmp/r27props'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&q=high&tod=golden&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.addScriptTag({ path: new URL('./close.js', import.meta.url).pathname });
const r = await pg.evaluate(() => { const g = __game; for (const k of ['yusuf', 'bishr', 'amr']) g.campProp26(k); __sim(0.3);
  const o = {}; for (const k in g.campProps27) { const P = g.campProps27[k]; let n = 0, tri = 0; P.traverse((m) => { if (m.isMesh) { n++; tri += m.geometry.attributes.position.count / 3; } }); o[k] = { meshes: n, tris: Math.round(tri), at: P.position.toArray().map((v) => +v.toFixed(1)) }; } return o; });
console.log(JSON.stringify(r));
for (const k of ['yusuf', 'bishr', 'amr']) {
  for (const [ang, dist, h, ly, tag] of [[25, 2.6, 1.3, 0.5, 'close'], [-40, 3.4, 1.9, 0.6, 'side']]) {
    await pg.evaluate(([k, ang, dist, h, ly]) => { const g = __game, P = g.campProps27[k]; g.player.pos.set(P.position.x + 14, P.position.y, P.position.z + 14); g.player.facing = P.rotation.y; g.player.rig.visible = false; __close(ang, dist, h, ly, () => P.position); __sim(0.2); }, [k, ang, dist, h, ly]);
    await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}/prop-${k}-${tag}.png`, timeout: 180000 });
  }
}
// at play distance: the player beside Bishr's anvil, the normal camera and HUD
await pg.reload(); await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate(() => { const g = __game; for (const k of ['yusuf', 'bishr', 'amr']) g.campProp26(k); const P = g.campProps27.bishr; g.player.pos.set(P.position.x + 2, P.position.y, P.position.z + 2.5); __sim(0.6); });
await pg.waitForTimeout(600); await pg.screenshot({ path: `${out}/prop-play.png`, timeout: 180000 });
console.log('errors:', errs.join('\n') || 'none'); await b.close();
