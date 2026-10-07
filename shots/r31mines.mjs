// node shots/r31mines.mjs [region] [out]: Round 31's siege mines: the dungeon's rooms and props, a cracked prop struck
// (the roof comes down on the foes in its band), a sapper digging toward Salim and coming up, the boss's cave-in move
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'karkh', out] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&q=${out ? 'high' : 'low'}&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
await pg.addScriptTag({ path: new URL('./close.js', import.meta.url).pathname });
await pg.evaluate(() => { const p = __game.player; p.level = 16; __game.recalcStats(); p.hp = p.stats.maxHp; __game.briefed = true; });
const shot = async (name) => { if (out) await pg.screenshot({ path: `${out}/${name}.png`, timeout: 180000 }); };
const res = [];
// in through the mine head
res.push(await pg.evaluate(async () => {
  const g = __game, { DUNGEONS } = await import('/src/dungeons.js'), D = DUNGEONS.find((d) => d.style === 'mines');
  if (!D) return { err: 'no mines in this region' };
  const d = g.interactables.find((x) => x.area === D.id); const at = { x: +d.pos.x.toFixed(1), z: +d.pos.z.toFixed(1) };
  g.player.pos.copy(d.pos); await d.act(); __sim(0.3);
  const I = g.interior.I, cnt = {}; for (const e of g.interior.enemies) cnt[e.type] = (cnt[e.type] || 0) + 1;
  return { tag: 'enter', entrance: at, title: g.interior.def.title, style: I.style, rooms: I.rooms.length, props: I.hazards.filter((h) => h.kind === 'prop').length, foes: cnt };
}));
await shot('mines-entry');
// a room with a cracked prop, seen from the usual camera and close
await pg.evaluate(() => { const g = __game, h = g.interior.I.hazards.find((q) => q.kind === 'prop'); g.player.pos.set(h.cx, 0, h.z + 1.5); g.player.invuln = 1e9; __sim(0.4); });
await shot('mines-room');
if (out) { await pg.evaluate(() => { const g = __game, h = g.interior.I.hazards.find((q) => q.kind === 'prop'); g.player.facing = h.sx > 0 ? Math.PI / 2 : -Math.PI / 2; __close(150, 4.2, 2.2, 1.2); __sim(0.1); }); await shot('mines-prop-close');
  await pg.evaluate(() => { const g = __game; g.updateCamera = Object.getPrototypeOf(g).updateCamera; document.getElementById('ui').style.display = ''; __sim(0.1); }); }
// strike the prop: two foes stood in its band take the roof
res.push(await pg.evaluate(() => {
  const g = __game, p = g.player, h = g.interior.I.hazards.find((q) => q.kind === 'prop' && !q.done), E = g.interior.enemies.filter((e) => !e.dead && !e.elite).slice(0, 2);
  E.forEach((e, i) => { e.pos.set(h.cx + (i ? -2 : 2), 0, h.z); e.alerted = true; e.hp = e.maxHp = 500; });
  p.pos.set(h.x - h.sx * 1.4, 0, h.z + 0.6); p.st.action = 'attack'; p.st.actionT = 0; __sim(0.1); p.st.action = null;
  const hp0 = E.map((e) => e.hp); for (let i = 0; i < 12; i++) __sim(0.1);
  return { tag: 'prop', done: h.done, fallen: +h.mesh.rotation.z.toFixed(2), foeDamage: E.map((e, i) => Math.round(hp0[i] - e.hp)), staggered: E.map((e) => e.staggerT > 0), playerHp: Math.round(p.hp) };
}));
await shot('mines-after-prop');
// a sapper digs toward Salim and comes up under him
res.push(await pg.evaluate(() => {
  const g = __game, p = g.player, s = g.interior.enemies.find((e) => !e.dead && e.type === 'sapper' && !e.elite);
  if (!s) return { tag: 'sapper', err: 'no sapper' };
  for (const e of g.interior.enemies) if (e !== s && !e.dead && !e.dboss) { e.dead = true; e.rig.visible = false; }
  p.invuln = 0; p.hp = p.stats.maxHp; s.alerted = true; s.s31 = { s: 'fight', cd: 0, t: 0 };
  const R = g.interior.I.rooms.map((r) => g.interior.I.center(r)).find((c) => Math.abs(c.x - s.pos.x) < 6 && Math.abs(c.z - s.pos.z) < 6) || s.pos; s.pos.set(R.x + 4.5, 0, R.z); p.pos.set(R.x - 3, 0, R.z); __sim(0.05);
  const seen = new Set(), hp0 = p.hp; let ghost = false;
  for (let i = 0; i < 60; i++) { __sim(0.1); seen.add(s.s31.s); if (s.ghost) ghost = true; }
  return { tag: 'sapper', states: [...seen], wentUnder: ghost, cameUp: !s.ghost && s.rig.visible, playerHit: Math.round(hp0 - p.hp), dist: +s.pos.distanceTo(p.pos).toFixed(1) };
}));
// the boss: the cave-in lane and the heaps it leaves
res.push(await pg.evaluate(() => {
  const g = __game, p = g.player, B = g.interior.enemies.find((e) => e.dboss && !e.dead);
  if (!B) return { tag: 'boss', err: 'no boss' };
  for (const e of g.interior.enemies) if (e !== B && !e.dead) { e.dead = true; e.rig.visible = false; }
  p.invuln = 1e9; p.pos.set(B.pos.x + 7, 0, B.pos.z); B.alerted = true; __sim(0.1);
  const key = B.m28key; B.m28cd = 0; B.s31 = { s: 'fight', cd: 99, t: 0 };
  const I = g.interior.I, n0 = I.group.children.length; let started = false, heaps = 0;
  for (let i = 0; i < 25; i++) { __sim(0.1); if (B.m28) started = true; heaps = Math.max(heaps, I.group.children.length - n0); }
  const mid = I.group.children.length - n0;
  for (let i = 0; i < 70; i++) __sim(0.1);
  return { tag: 'boss', name: B.name, type: B.type, move: key, started, heaps, heapsAfter6s: I.group.children.length - n0 - 0, mid };
}));
await shot('mines-boss');
for (const r of res) console.log(JSON.stringify(r));
console.log('errors:', errs.join('\n') || 'none'); await b.close();
