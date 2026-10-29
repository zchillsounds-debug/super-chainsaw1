// node tools/battleperf.mjs [WxH] [q] : per arena, the battle's update cost (ms/frame over 300 sim frames, mid-fight) and the
// draw calls / triangles of one rendered frame (shadow pass and bloom included), the frame-rate proxy for the phone default.
// SIG=1 measures with the arena's signature live (SIG=whirl: the aqueduct's whirlpool).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '740x360').split('x').map(Number), q = process.argv[3] || 'med';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&mobile&q=' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
import { readFileSync } from 'fs';
// the arena keys, read from arena.js's ARENAS table (two-space keys between 'export const ARENAS' and the class)
const src = readFileSync(new URL('../src/arena.js', import.meta.url), 'utf8'), tbl = src.slice(src.indexOf('export const ARENAS'), src.indexOf('\nexport class'));
const arenas = process.argv[4]?.split(',') || [...tbl.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]);
const rows = await pg.evaluate(([keys, sig]) => {
  const g = __game, R = g.renderer, D = (id) => __grow(__critters.find((x) => x.id === id), 14), out = [];
  for (const a of keys) {
    g.startBattle(D('cindermunch'), D('bubbalotl'), { difficulty: 0.8, playerLevel: 14, cpuLevel: 14, arena: a });
    for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5); __sim(2);
    if (sig) { const H = g.battle.hazards; H.timer = 99; if (sig === 'whirl') H.whirlNext = true; H.S && H.signature(); __sim(1.5); } // SIG=1 (or SIG=whirl): measure with the signature live
    const t0 = performance.now(); __sim(5); const upd = (performance.now() - t0) / 300;
    R.info.autoReset = false; R.info.reset(); g.composer.render(1 / 60); R.info.autoReset = true;
    out.push([a, +upd.toFixed(2), R.info.render.calls, Math.round(R.info.render.triangles / 1000) + 'k']);
  }
  return out;
}, [arenas, process.env.SIG]);
for (const r of rows) console.log(r.join('\t'));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
