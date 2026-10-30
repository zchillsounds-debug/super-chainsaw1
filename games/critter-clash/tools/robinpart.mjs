// node tools/robinpart.mjs <k/n> [id,id] : one shard (every n-th pair, from k) of robin.mjs's round robin, so n shards can run
// side by side on n cores; LV as in robin.mjs (default 10). Writes tools/out/robin-<k>.json; `node tools/robinmerge.mjs` adds them up.
import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [k, n] = (process.argv[2] || '0/1').split('/').map(Number), focus = process.argv[3]?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 480, height: 270 } });
pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const ids = await pg.evaluate(() => __critters.map((c) => c.id));
const pairs = [];
for (const a of ids) for (const c of ids) if (a !== c && (!focus || focus.includes(a) || focus.includes(c))) pairs.push([a, c]);
const mine = pairs.filter((_, i) => i % n === k), W = {}, M = {}, out = new URL('./out/robin-' + k + '.json', import.meta.url);
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
let done = 0;
for (const [a, c] of mine) {
  const won = await pg.evaluate(([a, c, lv]) => {
    const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), lv);
    g.startBattle(D(a), D(c), { difficulty: 0.8, playerLevel: lv, cpuLevel: lv });
    const bt = g.battle; let t = 0;
    while (bt.phase !== 'done' && t < 400) { __sim(1); t++; }
    return bt.wins[0] > bt.wins[1];
  }, [a, c, +(process.env.LV || 10)]);
  for (const [id, w] of [[a, won], [c, !won]]) { W[id] = W[id] || [0, 0]; W[id][w ? 0 : 1]++; }
  const key = [a, c].sort().join('|'); M[key] = M[key] || {}; M[key][won ? a : c] = (M[key][won ? a : c] || 0) + 1;
  if (++done % 25 === 0 || done === mine.length) { writeFileSync(out, JSON.stringify({ done, of: mine.length, W, M })); console.log(`shard ${k}: ${done}/${mine.length}`); }
}
await b.close();
