// node shots/r22holds.mjs <hold id> [outdir]: an act hold end to end: its door on the map, the close camera, the
// captain halfway, a fire, the lever (portcullis or sunken bridge), a pressure plate, the cracked wall or loose
// stones, the hidden chest, the master (or the act's lieutenant in a story hold), his chest, a fall, the way out
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id = 'kilnpits', out] = process.argv.slice(2);
const REG = { caravan: 'sawad', kilnpits: 'sawad', reedisle: 'marsh', weir: 'marsh', lanes: 'karkh', undercroft: 'karkh', hulk: 'docks', warehouse: 'docks' }[id];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:5173/?play&mobile&q=${out ? 'high' : 'low'}&noadapt&region=${REG}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (name) => { if (!out) return; await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/${id}-${name}.png` }); };
const log = [];
log.push(await pg.evaluate(async (id) => { const g = __game, p = g.player, door = g.holdDoors[id], it = g.interactables.find((x) => x.area === id);
  const L = g.matriarch; const parked = L ? `${L.name} parked ${!!L.parked}` : 'no lieutenant';
  p.level = Math.max(p.level, 6); g.recalcStats(); p.hp = p.stats.maxHp; p.pos.set(door.x, door.y, door.z + 1); __sim(0.2);
  const lbl = it.label; await it.act(); __sim(0.3); const I = g.interior.I;
  return `door ${door.toArray().map((v) => v.toFixed(0)).join(',')} label "${lbl}" ${parked} | entered ${!!g.interior?.hold} cam ${g.camAction} lvl ${g.interior.def.level} foes ${g.interior.enemies.length} bosses ${g.interior.enemies.filter((e) => e.holdBoss || e.storyBoss).map((e) => e.name + ':' + e.maxHp + (e.storyBoss ? '(story)' : '')).join(',')} fires ${I.fires.length} levers ${I.levers.length} doors ${I.doors.length} bridges ${I.bridges.length} plates ${I.plates.length} shallows ${I.shallows.length} secrets ${I.cracks.length} objective "${I.objective()[1]}"`; }, id));
await shot('entrance');
log.push(await pg.evaluate(() => { const g = __game, p = g.player, z0 = p.pos.z; for (let i = 0; i < 8; i++) { g.joy = { x: 0, y: -1 }; __sim(0.15); } g.joy = null; __sim(0.3); return 'walked ' + (z0 - p.pos.z).toFixed(1) + ' m'; }));
// the captain halfway
log.push(await pg.evaluate(async () => { const g = __game, p = g.player; for (const e of g.interior.enemies) if (!e.holdBoss && !e.storyBoss) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
  const M = g.interior.enemies.find((e) => e.holdKey === 'mid'); p.pos.set(M.pos.x, 0, M.pos.z + 9); __sim(0.4); const card = __director.shot?.card?.en; __director.skip(); await new Promise((r) => setTimeout(r, 50));
  const seen = new Set(); for (let i = 0; i < 120; i++) { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; __sim(0.1); if (M.curMove) seen.add(M.curMove); if (i === 50) M.hp = M.maxHp * 0.4; }
  g.lockOn = M; p.target = M; __sim(0.2);
  return `mid ${M.name} card "${card}" p2 ${!!M.p2} moves ${[...seen].join(',')}`; }));
await shot('mid');
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, M = g.interior.enemies.find((e) => e.holdKey === 'mid'); g.damageEnemy(M, M.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.5); __director.skip?.(); await new Promise((r) => setTimeout(r, 50)); return 'mid dead ' + M.dead + ' objective "' + g.interior.I.objective()[1] + '"'; }));
// fire, lever, plate, secret, hidden chest
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I, V = (x, y, z) => new p.pos.constructor(x, y, z), r = [];
  const F = I.fires[I.fires.length - 1]; p.pos.copy(F.pos).add(V(0, 0, 1.6)); __sim(0.2); g.interactables.find((x) => x.pos === F.pos).act(); document.getElementById('shop')?.remove(); r.push('fire ' + F.lit);
  if (I.levers.length) { const L = I.levers[0]; p.pos.copy(L.pos); __sim(0.1); g.interactables.find((x) => x.pos === L.pos).act(); __sim(1.5); const [c0, r0] = I.doors[0] ? [I.doors[0].c, I.doors[0].r] : [I.bridges[0].c, I.bridges[0].r]; r.push(`lever on ${I.leverOn} walk ${I.walkable(c0, r0)} saved ${g.holds.state(I.hold).lever}`); }
  if (I.plates.length) { const P = I.plates[0]; p.pos.copy(P.pos); p.invuln = 0; const hp0 = p.hp; __sim(0.1); const armed = P.fuse >= 0; __sim(0.7); r.push(`plate armed ${armed} hurt ${hp0 > p.hp}`); p.hp = p.stats.maxHp; p.pos.copy(F.pos).add(V(0, 0, 1.6)); __sim(0.1); }
  if (I.shallows.length) { const [x0, z0, x1, z1] = I.shallows[0]; p.pos.set((x0 + x1) / 2, 0, (z0 + z1) / 2); __sim(0.05); r.push('wading slow ' + (g.hazSlowK ?? 1).toFixed(2)); }
  const C = I.cracks[0];
  if (C) { const it = g.interactables.find((x) => x.label === (C.secret ? 'Push the loose stones' : 'Break through the cracked wall'));
    if (C.secret) { p.pos.set(C.x + C.face[0] * 4, 0, C.z + C.face[1] * 4); __sim(0.1); r.push('glint ' + C.glint.visible); }
    p.pos.copy(it.pos); __sim(0.1); it.act(); __sim(0.2); r.push((C.secret ? 'loose stones ' : 'crack ') + C.open); }
  const S = I.chests.find((c) => c.kind === 'S'); p.pos.copy(S.pos).add(V(0, 0, 1.5)); __sim(0.1); g.interactables.find((x) => x.pos === S.pos).act(); __sim(0.4); r.push('hidden chest ' + S.opened);
  for (const G of I.gates) { p.pos.copy(G.far); __sim(0.1); g.interactables.find((x) => x.pos === G.far).act(); __sim(0.1); r.push('gate ' + G.open); }
  return r.join(' | '); }));
await shot('puzzles');
// the master, or the act's lieutenant
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; const B = g.interior.enemies.find((e) => e.holdKey === 'boss'); p.pos.set(B.pos.x, 0, B.pos.z + 8); __sim(0.4); const card = __director.shot?.card?.en || ''; __director.skip?.(); await new Promise((r) => setTimeout(r, 50));
  const seen = new Set(); for (let i = 0; i < 120; i++) { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; p.invuln = 0.2; __sim(0.1); if (B.curMove) seen.add(B.curMove); if (B.hook) seen.add('hook:' + B.hook.phase); if (B.smoke) seen.add('smoke:' + B.smoke.phase); if (B.st.action) seen.add(B.st.action); if (i === 50) B.hp = B.maxHp * 0.45; }
  const r = `master ${B.name}${B.storyBoss ? ' (lieutenant, quest ' + B.quest + ')' : ''} card "${card}" moves ${[...seen].join(',')}`; const act0 = g.act;
  B.ghost = false; g.damageEnemy(B, B.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.4); for (let k = 0; k < 10 && g.cinematic; k++) { __director.skip?.(); await new Promise((r2) => setTimeout(r2, 60)); __sim(0.3); }
  const T = I.chests.find((c) => c.kind === 'T'); p.pos.copy(T.pos).add(new p.pos.constructor(0, 0, 1.5)); __sim(0.1); g.interactables.find((x) => x.pos === T.pos).act();
  return r + ` | dead ${B.dead} done ${g.holds.state(I.hold).done} chest ${T.opened} act ${act0}->${g.act} quests ${g.quests.filter((q) => q.done).map((q) => q.id).join(',')}`; }));
await shot('master');
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; p.hp = 0; g.playerDeath(); await g.respawn(); __sim(0.2); const at = p.pos.clone(); await g.holds.exit(); __sim(0.2); return `woke at fire ${I.fires[g.holds.state(I.hold).lastFire]?.pos.distanceTo(at).toFixed(1)} m | out: interior ${!!g.interior} cam ${g.camAction} label "${g.interactables.find((x) => x.area === I.hold).label}"`; }));
console.log(log.join('\n'));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none'); await b.close();
