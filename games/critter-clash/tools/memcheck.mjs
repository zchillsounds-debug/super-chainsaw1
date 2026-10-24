// node tools/memcheck.mjs [laps] : the C7 leak check. With an end-game save, walks a loop of maps and rooms (rendering a frame
// at each) for several laps and prints the renderer's live geometries/textures, the scene's object count and the JS heap after
// each lap. Numbers that keep climbing lap after lap are a leak; a first-lap rise is caches warming up.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave } from './uisteps.mjs';
const laps = +(process.argv[2] || 5);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(endGameSave);
await pg.evaluate(() => { __game.screens.adventure(); __sim(0.5); });
const LOOP = ['bloom', 'in:bloom:berry', 'route2', 'seashell', 'glowwood', 'cinder', 'neon', 'in:neon:arcade', 'cloudtop', 'frostpeak', 'coral', 'palmpath', 'bluffs', 'ember_isle', 'atoll', 'in:atoll:hideout_a', 'grotto', 'wreck', 'village'];
const stat = () => pg.evaluate(() => { window.gc?.(); const g = __game, m = g.renderer.info.memory; let n = 0; g.scene.traverse(() => n++); return { geo: m.geometries, tex: m.textures, obj: n, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), dom: document.querySelectorAll('*').length }; });
console.log('start', JSON.stringify(await stat()));
for (let lap = 1; lap <= laps; lap++) {
  for (const k of LOOP) {
    await pg.evaluate((k) => { const w = __game.screens.worldObj, M = __maps[k]; w.load(k, k.startsWith('in:') ? 4 : 5, k.startsWith('in:') ? 5 : 5, 's'); __sim(0.3); __game.renderer.render(__game.scene, __game.camera); }, k).catch((e) => errs.push(k + ': ' + e.message.split('\n')[0]));
  }
  console.log('lap', lap, JSON.stringify(await stat()));
}
console.log(errs.length ? 'errors: ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'errors: none');
await b.close();
