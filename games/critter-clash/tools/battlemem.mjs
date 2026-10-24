// node tools/battlemem.mjs [battles] [every] : the C7 battle leak check. Plays CPU vs CPU battles in a row (a different pair
// each time, cycling through every critter and arena) and prints the renderer's live geometries/textures, the scene's object
// count, the DOM size and the JS heap every few battles. Numbers that climb battle after battle are a leak.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const n = +(process.argv[2] || 30), every = +(process.argv[3] || 5);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const stat = () => pg.evaluate(() => { window.gc?.(); const g = __game, m = g.renderer.info.memory; let n = 0; g.scene.traverse(() => n++); return { geo: m.geometries, tex: m.textures, obj: n, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), dom: document.querySelectorAll('*').length }; });
console.log('start', JSON.stringify(await stat()));
for (let i = 0; i < n; i++) {
  await pg.evaluate((i) => {
    const g = __game, ids = __critters.map((c) => c.id), D = (id) => __grow(__critters.find((x) => x.id === id), 12);
    const a = ids[i % ids.length], c = ids[(i * 7 + 3) % ids.length];
    g.startBattle(D(a), D(c === a ? ids[(i + 1) % ids.length] : c), { difficulty: 0.8, playerLevel: 12, cpuLevel: 12 });
    const bt = g.battle; let t = 0;
    while (bt.phase !== 'done' && t < 300) { __sim(1); t++; }
    g.renderer.render(g.scene, g.camera);
  }, i).catch((e) => errs.push('battle ' + i + ': ' + e.message.split('\n')[0]));
  if ((i + 1) % every === 0) console.log('after', i + 1, JSON.stringify(await stat()));
}
console.log(errs.length ? 'errors: ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'errors: none');
await b.close();
