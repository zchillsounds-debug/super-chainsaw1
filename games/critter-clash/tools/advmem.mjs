// node tools/advmem.mjs [fights] [every] : the C7 Adventure leak check. With an end-game save, plays wild fights in a row on a
// loop of maps (world → fight → results → back to the world) and prints the renderer's live geometries/textures, the scene's
// object count, the DOM size and the JS heap every few fights. Numbers that climb fight after fight are a leak.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave } from './uisteps.mjs';
const n = +(process.argv[2] || 20), every = +(process.argv[3] || 4);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const pg = await b.newPage({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low&auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.evaluate(endGameSave);
await pg.evaluate(() => { __game.screens.adventure(); __sim(0.5); });
const MAPS = ['route1', 'route2', 'glowwood', 'palmpath', 'bluffs', 'ashtrail', 'ember_isle', 'coral'];
const stat = () => pg.evaluate(() => { window.gc?.(); const g = __game, m = g.renderer.info.memory; let n = 0; g.scene.traverse(() => n++); return { geo: m.geometries, tex: m.textures, obj: n, heap: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), dom: document.querySelectorAll('*').length }; });
console.log('start', JSON.stringify(await stat()));
const modes = [];
for (let i = 0; i < n; i++) {
  const map = MAPS[i % MAPS.length];
  await pg.evaluate((map) => {
    const w = __game.screens.worldObj; if (!__maps[map]) return;
    w.load(map, 5, 5, 's'); __sim(0.3);
    const id = w.M.wild?.list?.[0]?.[0] || 'clovebun'; w.startWild(id, 20);
  }, map).catch((e) => errs.push(map + ': ' + e.message.split('\n')[0]));
  await pg.waitForFunction(() => !!__game.battle, null, { timeout: 30000 }).catch(() => {});
  if (!(await pg.evaluate(() => { for (let k = 0; k < 40 && __game.battle?.phase !== 'fight'; k++) __sim(0.5); return __game.battle?.phase === 'fight'; }))) errs.push(map + ': no fight');
  await pg.evaluate(() => { const b = __game.battle; for (let i = 0; i < 60 && b && b.phase !== 'done'; i++) { if (b.phase === 'fight') { b.fighters[1].hp = 1; b.fighters[0].hp = b.fighters[0].maxHp; } __sim(1); } __sim(2); });
  await pg.waitForTimeout(1200);
  for (let k = 0; k < 12; k++) { await pg.evaluate(() => { document.querySelector('.res-btns .btn')?.click(); __sim(0.5); }); await pg.waitForTimeout(600); if (await pg.evaluate(() => !!__game.screens.worldObj?.group && !__game.battle)) break; }
  modes.push(await pg.evaluate(() => (__game.battle ? 'battle:' + __game.battle.phase + ':' + [...document.querySelectorAll('.btn')].filter((b) => b.offsetParent).map((b) => b.textContent.trim().slice(0, 12)).join('/') : 'world')));
  if ((i + 1) % every === 0) console.log('after', i + 1, JSON.stringify(await stat()), modes.slice(-every).join(','));
}
console.log(errs.length ? 'errors: ' + [...new Set(errs)].slice(0, 5).join(' | ') : 'errors: none');
await b.close();
