// node tools/advload.mjs [WxH] : opens the Adventure fresh (a new World, as after an app restart) on every map and room,
// at morning, noon, evening and night (and once in the rain), and reports any errors. Catches props that read state built later.
// FORCE='{"frost":true,"winter":true}' merges into save.adv first (festivals, frost, autumn...)
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '740x360').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const keys = await pg.evaluate(() => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true });
  __save.adv = { hero: 'cindermunch', map: 'village', x: 9, y: 9, dir: 's', flags: { intro: true, quest: true }, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.3);
  const w = __game.screens.worldObj, out = Object.keys(__game.screens.worldObj.constructor.MAPS || {});
  return out.length ? out : null;
});
const maps = keys || ['village', 'route1', 'bloom', 'route2', 'seashell', 'glowwood', 'glowcap', 'cinder', 'ember', 'neon', 'cloudtop', 'frostpeak', 'peak', 'coral', 'palmpath', 'bluffs', 'ashtrail', 'ember_isle'];
for (const m of readFileSync(new URL('../src/interiors.js', import.meta.url), 'utf8').matchAll(/^  '([a-z0-9_]+:[a-z0-9_]+)': \{/gm)) maps.push('in:' + m[1]); // and every room
let n = 0, bad = 0; const force = JSON.parse(process.env.FORCE || '{}');
for (const map of maps) for (const [clock, rain] of [[7, false], [12, false], [18, false], [22, false], [12, true]]) {
  const r = await pg.evaluate(([map, clock, rain, force]) => {
    try {
      __game.screens.leaveWorld();
      const A = __save.adv; Object.assign(A, force, { map, clock, rain, x: 1, y: 1 });
      // stand on the first walkable tile, as a save would
      __game.screens.adventure(); const w = __game.screens.worldObj;
      for (let y = 1; y < w.H - 1; y++) for (let x = 1; x < w.W - 1; x++) if (w.walkable(x, y)) { A.x = x; A.y = y; y = 1e9; break; }
      __game.screens.leaveWorld(); __game.screens.adventure(); __sim(0.4);
      return __game.screens.worldObj.key === map ? null : 'landed on ' + __game.screens.worldObj.key;
    } catch (e) { return String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
  }, [map, clock, rain, force]);
  n++;
  if (r) { bad++; console.log(map, clock, rain ? 'rain' : '', '→', r); }
}
console.log(`${n} fresh loads, ${bad} problems; page errors: ${errs.slice(0, 6).join(' | ') || 'none'}`);
await b.close();
