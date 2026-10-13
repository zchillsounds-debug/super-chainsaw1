// node tools/wide.mjs <query> <out.png> [camX camY camZ lookY] : sim, then render from a fixed camera
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [q, out, x = 0, y = 9, z = 24, ly = 6] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5180/?' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(([x, y, z, ly]) => { __sim(4); const g = __game; g.battle.updateCamera = () => { g.camera.position.set(x, y, z); g.camera.lookAt(0, ly, 0); }; document.getElementById('ui') && (document.getElementById('ui').style.display = 'none'); g.camera.position.set(x, y, z); g.camera.lookAt(0, ly, 0); g.composer.render(); }, [+x, +y, +z, +ly]);
await pg.waitForTimeout(1500); await pg.screenshot({ path: out });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
