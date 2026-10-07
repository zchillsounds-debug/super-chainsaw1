// node shots/r32face.mjs [out]: close-ups of the Round 32 people (Umayma, Nadr, Qays, Nasim, a deserter) for the critique loop
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = '/tmp/claude-0/r32'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?play&mobile&q=high&noadapt&region=sawad');
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
for (const who of ['Umayma', 'Qays', 'Nasim', 'Doukitzes']) {
  const ok = await pg.evaluate((who) => { const g = __game, n = g.npcs.find((x) => x.name === who); if (!n) return false; n.rig.visible = true; n.st.crouch = 0; const P = n.rig.position, f = n.rig.rotation.y, s = n.rig.userData.parts?.body.scale.x || 1;
    __director.play({ actors: [], shots: [{ dur: 99, cam: { p0: () => P.clone().add({ x: Math.sin(f) * 1.5 * s + Math.cos(f) * 0.4, y: 1.55 * s, z: Math.cos(f) * 1.5 * s - Math.sin(f) * 0.4, isVector3: true }), t0: () => P.clone().add({ x: 0, y: 1.45 * s, z: 0, isVector3: true }), fov: 30 } }] });
    __sim(0.5); return true; }, who);
  if (ok) await pg.screenshot({ path: `${out}/face-${who}.png`, timeout: 180000 });
  // and at a cutscene's wide-shot distance
  if (ok) { await pg.evaluate((who) => { const n = __game.npcs.find((x) => x.name === who), P = n.rig.position, f = n.rig.rotation.y; __director.def.shots[0].cam = { p0: () => P.clone().add({ x: Math.sin(f) * 3.6 + Math.cos(f) * 1.6, y: 2.0, z: Math.cos(f) * 3.6 - Math.sin(f) * 1.6, isVector3: true }), t0: () => P.clone().add({ x: 0, y: 1.2, z: 0, isVector3: true }), fov: 34 }; __sim(0.3); }, who).catch(() => {}); await pg.screenshot({ path: `${out}/wide-${who}.png`, timeout: 180000 }); }
  await pg.evaluate(() => { while (__director.def) __director.skip(); });
}
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
