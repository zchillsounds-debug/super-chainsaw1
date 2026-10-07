// node shots/r33face.mjs [out] [who,...]: head close-ups (front, three-quarter, side) of named people, for the face critique
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = '/tmp/claude-0/r33', list = 'Umayma'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 900, height: 420 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?play&mobile&q=high&noadapt&region=sawad');
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.addStyleTag({ content: '#ui, #hud, .orb, #touch, #minimap { display: none !important; }' });
for (const who of list.split(',')) {
  for (const [tag, ang, dist] of [['front', 0, 0.75], ['tq', 0.7, 0.75], ['side', 1.45, 0.75], ['body', 0.3, 2.6]]) {
    const ok = await pg.evaluate(([who, ang, dist]) => { const g = __game, n = g.npcs.find((x) => x.name === who) || g.npcs.find((x) => x.rig?.userData?.parts?.o?.[who]); if (!n) return false; n.rig.visible = true; const P = n.rig.position, f = n.rig.rotation.y + ang, s = n.rig.userData.parts?.body.scale.x || 1, hy = dist > 1 ? 1.1 : 1.62;
      __director.play({ actors: [], shots: [{ dur: 99, cam: { p0: () => P.clone().add({ x: Math.sin(f) * dist * s, y: hy * s, z: Math.cos(f) * dist * s, isVector3: true }), t0: () => P.clone().add({ x: 0, y: hy * s, z: 0, isVector3: true }), fov: 30 } }] });
      __sim(0.4); return true; }, [who, ang, dist]);
    if (ok) await pg.screenshot({ path: `${out}/${who}-${tag}.png`, timeout: 180000 });
    await pg.evaluate(() => { while (__director.def) __director.skip(); });
  }
}
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
