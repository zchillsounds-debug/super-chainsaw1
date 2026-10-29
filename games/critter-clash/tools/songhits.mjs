// node tools/songhits.mjs [n] : R898, how the Stone Song lands in CPU-vs-CPU fights on the Singing Dunes: n signatures (default 24), counting
// each fighter the ring reached as hit (the hurt went in), blocked (guarded) or missed (dodging / invulnerable / down).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const n = +(process.argv[2] || 24);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const r = await pg.evaluate((n) => {
  const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 30), out = { hit: 0, block: 0, miss: 0 };
  const pairs = [['scarabold', 'sizzlard'], ['fennzap', 'humpdrop'], ['siroccat', 'cactortle']];
  for (let i = 0; i < n; i++) {
    const [a, c] = pairs[i % 3];
    g.startBattle(D(a), D(c), { difficulty: 0.8, playerLevel: 30, cpuLevel: 30, arena: 'singing' }); g.arena.setOpen(true);
    for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
    __sim(3); const H = g.battle.hazards, hurt = H.hurt.bind(H);
    H.hurt = (f, ...rest) => { const v = hurt(f, ...rest); out[v === true ? 'hit' : v === 'block' ? 'block' : 'miss']++; return v; };
    H.timer = 99; H.clearSig?.(); H.signature();
    for (let k = 0; k < 40 && H.sig; k++) __sim(0.1);
  }
  return out;
}, n);
console.log(JSON.stringify(r), 'errors:', errs.join(' | ') || 'none');
await b.close();
