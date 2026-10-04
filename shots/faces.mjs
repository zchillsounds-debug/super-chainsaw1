// node shots/faces.mjs <outdir>: close-ups of Salim's face in each expression, plus a crowd of foes (hair styles)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const only = process.argv[3]?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 480 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:5173/?play&q=high&noadapt&cls=rami');
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
for (const ex of only || ['neutral', 'grief', 'anger', 'surprise', 'warm', 'pain']) {
  await pg.evaluate((ex) => { const g = __game; g.player.rig.userData.expr = ex; __close(0, 1.25, 1.68, 1.64); g.camera.fov = 16; g.camera.updateProjectionMatrix(); __sim(0.6); }, ex);
  await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/face-${ex}.png` });
}
if (!only) {
  await pg.evaluate(() => { const g = __game, e = __nearest(); __look(e, 30, 5.5, 2.2, 1.3); __sim(0.4); });
  await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/crowd.png` });
}
console.log('errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
