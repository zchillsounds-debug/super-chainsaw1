// node tools/robin.mjs [reps] : CPU vs CPU round robin at difficulty 0.8, prints win rate per critter
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const reps = +(process.argv[2] || 1);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 480, height: 270 } });
pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const ids = await pg.evaluate(() => __critters.map((c) => c.id));
const W = Object.fromEntries(ids.map((i) => [i, [0, 0]])), M = {};
for (let r = 0; r < reps; r++) for (const a of ids) for (const c of ids) {
  if (a === c) continue;
  const won = await pg.evaluate(([a, c]) => {
    const g = __game, D = (id) => __critters.find((x) => x.id === id);
    g.startBattle(D(a), D(c), { difficulty: 0.8, playerLevel: 10, cpuLevel: 10 });
    const bt = g.battle; let t = 0;
    while (bt.phase !== 'done' && t < 400) { __sim(1); t++; }
    return bt.wins[0] > bt.wins[1];
  }, [a, c]);
  W[a][won ? 0 : 1]++; W[c][won ? 1 : 0]++;
  const k = [a, c].sort().join('|'); M[k] = M[k] || {}; M[k][won ? a : c] = (M[k][won ? a : c] || 0) + 1;
}
for (const [i, [w, l]] of Object.entries(W).sort((x, y) => y[1][0] / (y[1][0] + y[1][1]) - x[1][0] / (x[1][0] + x[1][1]))) console.log(i.padEnd(12), w, l, (100 * w / (w + l)).toFixed(0) + '%');
console.log(JSON.stringify(M));
await b.close();
