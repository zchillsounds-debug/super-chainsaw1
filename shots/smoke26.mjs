// node shots/smoke26.mjs <file.html> [shot.png]: the inlined Artifact build from file:// with phone emulation: ready, touch UI,
// the Round 26 troops on the map, no page errors
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [file, png] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`file://${file}?play&mobile&noadapt`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const r = await pg.evaluate(() => { const g = __game; __sim(0.5); const c = {}; for (const e of g.enemies) if (['standard', 'wall', 'hippo'].includes(e.type)) c[e.type] = (c[e.type] || 0) + 1; return { touch: document.body.classList.contains('touch'), joyOrButtons: !!document.querySelector('#tskills .t-attack'), troops: c, outlines: !!g.player.rig, enc: (g.enc25 || []).length }; });
console.log('smoke', JSON.stringify(r));
if (png) await pg.screenshot({ path: png, timeout: 180000 });
console.log('errors:', errs.join('\n') || 'none'); await b.close();
