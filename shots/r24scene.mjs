// node shots/r24scene.mjs <outdir> <region> <scene> [tod]: play one story scene (arrival | prologue | briefing ...) on a
// region and shoot every shot of it, a little way into each. Round 24: the docks arrival has the parley with Arsaber.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out = '.', region = 'docks', scene = 'arrival', tod] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?play&mobile&noadapt&q=high&region=${region}${tod ? '&tod=' + tod : ''}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
// the act-ending scenes need the act's boss: spawn him, skip his intro, and put him down
const BOSSED = ['epilogue', 'rawhFalls', 'finale', 'docksFinale'];
if (BOSSED.includes(scene)) await pg.evaluate(() => { const g = __game; g.player.invuln = 1e9; g.spawnBoss(); __director.skip?.(); __sim(0.5); const b = g.boss; b.rise = 1; b.hp = 0; b.dead = true; b.st.dead = true; b.st.deadT = 3; g.bossActive = false; g.ui.bossBar?.(null); __sim(0.3); });
await pg.evaluate((sc) => { window.__done = false; __director.play(__SCENES[sc](__game, __game.boss)).then(() => { window.__done = true; }); __sim(0.6); }, scene);
for (let n = 0; n < 30; n++) {
  const st = await pg.evaluate(() => { const d = __director; return { on: !!d.def, i: d.i, line: d.shot?.line?.text || d.shot?.caption || d.shot?.card?.en || '' }; });
  if (!st.on) break;
  console.log(n, st.i, st.line);
  await pg.screenshot({ path: `${out}/${scene}${String(n).padStart(2, '0')}.png`, timeout: 180000 });
  await pg.evaluate(() => { const d = __director, i0 = d.i; d.advance(); if (d.i === i0) d.advance(); for (let k = 0; k < 30 && d.def && d.i === i0; k++) { __sim(0.5); if (d.i === i0) d.advance(); } if (d.def) __sim(1.8); });
  await pg.waitForTimeout(600);
}
console.log('done', await pg.evaluate(() => window.__done));
console.log('errors:', errs.filter((e) => !e.includes('CERT')).join('\n') || 'none'); await b.close();
