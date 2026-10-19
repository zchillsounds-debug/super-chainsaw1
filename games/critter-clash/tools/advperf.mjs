// node tools/advperf.mjs [WxH] [q] : per map, World.update cost (ms/frame, 300 sim frames) and draw calls / triangles of one rendered frame (shadow pass included)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), q = process.argv[3] || 'high';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + q);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const maps = (process.argv[4] || 'village,route1,bloom,route2,seashell,glowwood,glowcap,cinder,ember,neon,cloudtop,frostpeak,peak').split(',');
const clocks = [12, 22];
const rows = await pg.evaluate(([maps, clocks]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate', 'adventure', 'adv2', 'adv3', 'adv4', 'adv5', 'adv6', 'adv7', 'adv8', 'adv9', 'adv10', 'adv11', 'adv12', 'adv13', 'adv14', 'adv15', 'adv16', 'adv17'] });
  const flags = {}; for (const k of 'intro quest rival1 trial_strength cup_sprout cup_thunder woods'.split(' ')) flags[k] = true;
  __save.adv = { hero: 'cindermunch', map: 'village', x: 9, y: 9, dir: 's', flags, spawn: { map: 'village', x: 4, y: 6 } };
  __game.screens.adventure(); __sim(0.5);
  const W = __game.screens.worldObj, R = __game.renderer, out = [];
  R.info.autoReset = false;
  for (const m of maps) for (const c of clocks) {
    __save.adv.clock = c; __save.adv.rain = false;
    const M = W.M; W.load(m, 0, 0, 's');
    // stand on the middle-most walkable tile
    let best = null, bd = 1e9; for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) if (W.walkable?.(x, y)) { const d = (x - W.W / 2) ** 2 + (y - W.H / 2) ** 2; if (d < bd) { bd = d; best = [x, y]; } }
    if (best) W.load(m, best[0], best[1], 's');
    __sim(0.5);
    const t0 = performance.now(); for (let k = 0; k < 300; k++) W.update(1 / 60); const upd = (performance.now() - t0) / 300;
    R.info.reset(); __game.composer.render(1 / 60);
    out.push([m, c, +upd.toFixed(2), R.info.render.calls, Math.round(R.info.render.triangles / 1000) + 'k']);
  }
  R.info.autoReset = true;
  return out;
}, [maps, clocks]);
for (const r of rows) console.log(r.join('\t'));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
