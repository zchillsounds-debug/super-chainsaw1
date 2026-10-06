// node shots/r27dungeon.mjs [region] [out]: the Round 27 troops below ground: a dungeon of the region, a contract and a
// Siege Trial each get a standard-bearer and a shield wall; Salim walks into each room and the rally and the wall wake
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'marsh', out] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&q=${out ? 'high' : 'low'}&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
await pg.evaluate(() => { const p = __game.player; p.level = 14; __game.recalcStats(); p.hp = p.stats.maxHp; p.invuln = 1e9; __game.briefed = true; });
// what the run holds, then Salim goes to the standard's room and the wall's room in turn
const probe = (tag, shoot) => pg.evaluate(async ([tag, shoot]) => {
  const g = __game, p = g.player; if (!g.interior) return { tag, err: 'not inside' }; const E = g.interior.enemies, live = E.filter((e) => !e.dead);
  const cnt = {}; for (const e of live) cnt[e.type] = (cnt[e.type] || 0) + 1;
  const std = live.find((e) => e.type === 'standard'), wall = live.filter((e) => e.type === 'wall');
  const r = { tag, kind: g.interior.def.kind || 'dungeon', level: g.interior.def.level, rooms: g.interior.I.rooms.length, std: cnt.standard || 0, wall: wall.length, hippo: cnt.hippo || 0, foes: live.length };
  if (std) { p.pos.set(std.pos.x + 4, 0, std.pos.z + 4); for (let i = 0; i < 25; i++) __sim(0.1); r.stdAlert = std.alerted; r.rallied = E.filter((e) => !e.dead && e.rallyT > 0).length; }
  if (wall.length) { const w = wall[1] || wall[0]; p.pos.set(w.pos.x + 6, 0, w.pos.z + 1); const f0 = wall.map((m) => m.facing); for (let i = 0; i < 30; i++) __sim(0.1); r.wallAlert = wall.every((m) => m.alerted); r.wallTurn = +Math.max(...wall.map((m, i) => Math.abs(m.facing - f0[i]))).toFixed(2); r.wallSpread = +Math.max(...wall.map((m) => m.pos.distanceTo(w.pos))).toFixed(2); }
  return r;
}, [tag, shoot]);
const res = [];
// a dungeon of the region
await pg.evaluate(async () => { const g = __game, { DUNGEONS } = await import('/src/dungeons.js'), d = g.interactables.find((x) => x.area === DUNGEONS[0].id); g.player.pos.copy(d.pos); await d.act(); __sim(0.3); });
res.push(await probe('dungeon')); if (out) await pg.screenshot({ path: `${out}/dungeon-${region}.png`, timeout: 180000 });
await pg.evaluate(async () => { await __game.zones.exit(); __sim(0.3); });
// a contract
await pg.evaluate(async () => { const g = __game, { startContract } = await import('/src/dungeons.js'); g.player.slain = { Testes: { type: 'guard' } }; startContract(g, 'Testes', 'grainvault', [], { lvl: 14, renown: 10, gold: 100 }); await new Promise((r) => setTimeout(r, 1500)); __sim(0.3); });
res.push(await probe('contract')); if (out) await pg.screenshot({ path: `${out}/contract-${region}.png`, timeout: 180000 });
await pg.evaluate(async () => { await __game.zones.exit(); __sim(0.3); });
// a Siege Trial
await pg.evaluate(() => { const p = __game.player; p.rift = { tier: 2, best: {}, runs: [] }; __game.__trials.panel(2); });
await pg.waitForTimeout(500); await pg.evaluate(() => document.querySelector('#shop .go').click()); await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(0.5));
res.push(await probe('trial'));
for (const r of res) console.log(JSON.stringify(r));
console.log('errors:', errs.join('\n') || 'none'); await b.close();
