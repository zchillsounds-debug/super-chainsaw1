// node tools/balance.mjs <critter> [opponents...] : CPU vs CPU at difficulty 0.8, 2 matches per pairing
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [me, ...opp] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
pg.on('pageerror', (e) => console.log('PAGEERR', e.message));
await pg.goto('http://localhost:5180/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
for (const o of opp) for (let k = 0; k < 2; k++) {
  const r = await pg.evaluate(([me, o, k]) => {
    const { CRITTERS } = window.__data || {};
    const g = __game, D = (id) => __critters.find((c) => c.id === id);
    g.startBattle(D(k ? o : me), D(k ? me : o), { difficulty: 0.8, playerLevel: 10, cpuLevel: 10 });
    const bt = g.battle; let t = 0;
    while (bt.phase !== 'done' && t < 400) { __sim(1); t++; }
    const w = bt.wins, mineSide = k ? 1 : 0;
    return { t, won: w[mineSide] > w[1 - mineSide], hp: bt.fighters.map((f) => Math.round(f.hp)) };
  }, [me, o, k]);
  console.log(me, 'vs', o, k ? '(cpu side)' : '', JSON.stringify(r));
}
await b.close();
