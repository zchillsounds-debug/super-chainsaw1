// node shots/r21comp.mjs [outdir]: Round 21 hired guards: each of the four fights, foes turn on him, he goes down,
// Salim helps him up, and he rides a camel beside a mounted Salim
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await pg.goto('http://localhost:5173/?play&q=low&noadapt');
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const r = await pg.evaluate(() => {
  const g = __game, p = g.player, C = g.__companion, log = [];
  p.gold = 99999; p.level = 8; g.recalcStats();
  const SPOT = { spear: [38, 14], bow: [22, 36], naft: [0, 6], knives: [-36, -16] };
  for (const kind of ['spear', 'bow', 'naft', 'knives']) {
    p.dead = false; p.st.dead = false; p.hp = p.stats.maxHp;
    p.companion = { kind, order: 'follow' }; C.spawn(kind);
    p.pos.set(SPOT[kind][0] + 6, 0, SPOT[kind][1] + 6); __sim(0.3);
    const k0 = g.kills || 0;
    for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(p.pos) < 26) e.alerted = true;
    p.invuln = 99; // keep Salim standing while we watch the guard
    const h0 = g.companion.hp; let minHp = h0, onGuard = 0;
    for (let i = 0; i < 40; i++) { p.hp = p.stats.maxHp; __sim(0.25); minHp = Math.min(minHp, g.companion.hp); onGuard += g.enemies.filter((e) => e.onGuard).length; }
    log.push(`${kind}: guard hp ${h0}->${Math.round(minHp)} onGuard-frames ${onGuard} kills ${(g.kills || 0) - k0}`);
  }
  // knocked down, then helped up
  p.dead = false; p.st.dead = false; p.hp = p.stats.maxHp; p.rig.children[0].rotation.x = 0;
  C.knockDown(); const G = g.companion; log.push('down ' + G.down);
  for (const e of g.enemies) { e.alerted = false; if (e.pos.distanceTo(p.pos) < 30) { e.hp = 0; e.dead = true; } }
  p.pos.copy(G.pos).add(new p.pos.constructor(1, 0, 0)); __sim(3.2); log.push('helped up ' + !G.down + ' hp ' + Math.round(G.hp) + '/' + G.maxHp);
  // riding
  p.pos.set(1, 0, 70); G.pos.set(2, 0, 72); __sim(0.5); g.mount.mount(); for (let i = 0; i < 10; i++) { g.joy = { x: 0, y: -1 }; __sim(0.2); } g.joy = null;
  log.push('mounted ' + g.mount.on + ' guard rides ' + !!G.st.mounted + ' gap ' + G.pos.distanceTo(p.pos).toFixed(1));
  window.__close?.(70, 7, 3, 1.4);
  return log.join('\n');
});
console.log(r);
if (out) { await pg.addScriptTag({ path: new URL('./close.js', import.meta.url).pathname }); await pg.evaluate(() => { __close(80, 8, 3.2, 1.4); __sim(0.1); }); await pg.waitForTimeout(800); await pg.screenshot({ path: out + '/ride.png' }); }
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none'); await b.close();
