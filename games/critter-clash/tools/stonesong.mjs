// node tools/stonesong.mjs [WxH] [tag] : R895, the Singing Dunes arena's Stone Song (open field, CPU vs CPU): the signature started, then frames as
// its ring of sound crosses the field (tools/out/song-<tag>-<n>.png).
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
  g.startBattle(D('scarabold'), D('sizzlard'), { difficulty: 0.8, playerLevel: 30, cpuLevel: 30, arena: 'singing' });
  g.arena.setOpen(true);
  for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
  g.paused = true;
});
const step = (s) => pg.evaluate((s) => { __game.paused = false; __sim(s); __game.paused = true; }, s);
await pg.evaluate(() => { const H = __game.battle.hazards; H.timer = 99; H.signature(); });
for (const [n, t] of [['a', 1.0], ['b', 1.2], ['c', 0.5]]) { await step(t); await pg.screenshot({ path: `tools/out/song-${tag}-${n}.png`, timeout: 120000 }); }
console.log('hits:', await pg.evaluate(() => __game.battle.hazards.sig ? __game.battle.hazards.sig.hit.size : 'over'));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
