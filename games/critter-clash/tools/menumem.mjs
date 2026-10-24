// node tools/menumem.mjs [laps] : the C7 menu leak check. Hops title → cups → select → Critterdex (paging) → challenges →
// camp → title and in and out of the Adventure, lap after lap, and prints the renderer's live geometries/textures, the
// scene's object count, the DOM size and the JS heap per lap. Numbers that climb lap after lap are a leak.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave } from './uisteps.mjs';
const laps = +(process.argv[2] || 6);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const pg = await b.newPage({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(endGameSave);
const stat = () => pg.evaluate(() => { window.gc?.(); const g = __game, m = g.renderer.info.memory; let n = 0; g.scene.traverse(() => n++); return { geo: m.geometries, tex: m.textures, obj: n, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), dom: document.querySelectorAll('*').length }; });
const STEPS = ['title', 'cups', 'select', 'dex', 'challenges', 'camp', 'title', 'adventure', 'title'];
console.log('start', JSON.stringify(await stat()));
for (let lap = 1; lap <= laps; lap++) {
  for (const s of STEPS) {
    await pg.evaluate((s) => {
      const S = __game.screens, r = () => __game.renderer.render(__game.scene, __game.camera);
      if (S.mode === 'world') S.leaveWorld?.();
      S[s](); __sim(0.4); r();
      if (s === 'dex' || s === 'select') for (let i = 0; i < 8; i++) { (s === 'dex' ? S.dexPick : S.pick).call(S, (i * 5) % __critters.length, true); __sim(0.2); r(); }
    }, s).catch((e) => errs.push(s + ': ' + e.message.split('\n')[0]));
  }
  console.log('lap', lap, JSON.stringify(await stat()));
}
console.log(errs.length ? 'errors: ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'errors: none');
await b.close();
