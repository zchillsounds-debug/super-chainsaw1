// node tools/arenawide.mjs <arena> [WxH] [stadium 1|0]: the arena from high above the camera's gap (the whole bowl, the scenery
// and anything over the stands), then the usual fight view at the start of round one. tools/out/aw-<arena>-*.png
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const arena = process.argv[2] || 'dunes', [w, h] = (process.argv[3] || '915x412').split('x').map(Number), open = process.argv[4] === '0';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=high');
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const tag = `${arena}${open ? '-open' : ''}-${w}x${h}`;
await pg.evaluate(([a, open]) => {
  const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 30);
  g.startBattle(D('siroccat'), D('fennzap'), { difficulty: 0.8, playerLevel: 30, cpuLevel: 30, arena: a });
  if (open) g.arena.setOpen(true);
  for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
}, [arena, open]);
await pg.screenshot({ path: `tools/out/aw-${tag}-fight.png`, timeout: 120000 });
await pg.evaluate(() => { const g = __game; g.paused = true; const c = g.battle.camera || g.camera; c.position.set(0, 30, 42); c.lookAt(0, 4, -4); c.updateProjectionMatrix(); g.renderer.render(g.scene, c); });
await pg.screenshot({ path: `tools/out/aw-${tag}-wide.png`, timeout: 120000 });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
