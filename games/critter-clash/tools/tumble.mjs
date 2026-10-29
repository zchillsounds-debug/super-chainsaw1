// node tools/tumble.mjs [WxH] [tag] : R891, the Redrock Mesa arena's tumbleweed after it lands (open field, CPU vs CPU): one dropped
// on the far fighter, then frames as it lands, bounces on and breaks up (tools/out/tumble-<tag>-<n>.png).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = process.argv[3] || 'now';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=high');
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
await pg.evaluate(() => {
  const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 30);
  g.startBattle(D('scarabold'), D('sizzlard'), { difficulty: 0.8, playerLevel: 30, cpuLevel: 30, arena: 'mesa' });
  g.arena.setOpen(true);
  for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
  g.paused = true;
});
const step = (s) => pg.evaluate((s) => { __game.paused = false; __sim(s); __game.paused = true; }, s);
await pg.evaluate(() => { Math.random = ((s) => () => (s = (s * 16807) % 2147483647) / 2147483647)(7); const H = __game.battle.hazards, f = __game.battle.fighters[1]; H.spawnAt(f.x * 0.5, f.z * 0.5); }); // (seeded, so before and after match)
await step(1.3); await pg.screenshot({ path: `tools/out/tumble-${tag}-a.png`, timeout: 120000 });
await step(0.35); await pg.screenshot({ path: `tools/out/tumble-${tag}-b.png`, timeout: 120000 });
await step(0.45); await pg.screenshot({ path: `tools/out/tumble-${tag}-c.png`, timeout: 120000 });
console.log('left:', await pg.evaluate(() => __game.battle.hazards.list.map((q) => q.roll ? `rolling d=${q.roll.d.toFixed(1)}` : 'ring').join(',') || 'none'));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
