// node tools/hazshot.mjs <arena> [WxH] [stadium 1|0]: a CPU-vs-CPU fight in that arena; screenshots a falling hazard and then the
// arena's signature move mid-warning and live (tools/out/hz-<arena>-*.png). Stadium 0 = the Adventure's open field.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const arena = process.argv[2] || 'canyon', [w, h] = (process.argv[3] || '915x412').split('x').map(Number), open = process.argv[4] === '0';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=high');
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.screenshot({ path: `tools/out/hz-${arena}${open ? '-open' : ''}-${n}.png`, timeout: 120000 }); };
await pg.evaluate(([a, open]) => {
  const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 30);
  g.startBattle(D('scarabold'), D('sizzlard'), { difficulty: 0.8, playerLevel: 30, cpuLevel: 30, arena: a });
  if (open) g.arena.setOpen(true);
  for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
  g.paused = true;
}, [arena, open]);
const step = (s) => pg.evaluate((s) => { __game.paused = false; __sim(s); __game.paused = true; }, s);
await pg.evaluate(() => { const H = __game.battle.hazards; H.spawnAt(__game.battle.fighters[1].x, __game.battle.fighters[1].z); });
await step(0.7); await shot('a-falling');
await step(0.7); await shot('b-landed');
await pg.evaluate(() => { const H = __game.battle.hazards; for (const q of H.list) q.t = 99; H.update(0.016); H.signature(); });
await step(0.45); await shot('c-sig');
await step(0.9); await shot('d-sig');
await pg.evaluate(() => { __game.paused = false; });
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
