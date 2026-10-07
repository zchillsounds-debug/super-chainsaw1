// node shots/r21holds.mjs <quarry|fort|gorge|rivalhold> [outdir]: enter a hold, the close camera, its captains'
// moves, the fire, the cracked wall, the gate, the chests, the way out
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id = 'quarry', out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:5173/?play&mobile&q=${out ? 'high' : 'low'}&noadapt&region=hamrin`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (name) => { if (!out) return; await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/${id}-${name}.png` }); };
const log = [];
log.push(await pg.evaluate(async (id) => { const g = __game, p = g.player; p.level = 26; g.recalcStats(); p.hp = p.stats.maxHp; await g.holds.enter(id); __sim(0.3); const I = g.interior.I;
  return `entered ${!!g.interior?.hold} camAction ${g.camAction} tiles ${I.W}x${I.H} foes ${g.interior.enemies.length} bosses ${g.interior.enemies.filter((e) => e.holdBoss).map((e) => e.name + ':' + e.maxHp).join(',')} fires ${I.fires.length} gates ${I.gates.length} cracks ${I.cracks.length} chests ${I.chests.length} objective "${I.objective()[1]}"`; }, id));
await shot('entrance');
// walk a little forward with the joystick: the camera follows
log.push(await pg.evaluate(() => { const g = __game, p = g.player, z0 = p.pos.z; for (let i = 0; i < 8; i++) { g.joy = { x: 0, y: -1 }; __sim(0.15); } g.joy = null; __sim(0.3); return 'walked ' + (z0 - p.pos.z).toFixed(1) + ' m forward, camYaw ' + g.camYaw.toFixed(2) + ' cam ' + g.camera.position.toArray().map((v) => v.toFixed(1)).join(','); }));
await shot('walk');
// the mid-boss: go to him, his card, his moves
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; for (const e of g.interior.enemies) if (!e.holdBoss) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
  const M = g.interior.enemies.find((e) => e.holdKey === 'mid'); p.pos.set(M.pos.x, 0, M.pos.z + 9); __sim(0.4); const card = __director.shot?.card?.en; __director.skip(); await new Promise((r) => setTimeout(r, 50));
  const seen = new Set(); for (let i = 0; i < 160; i++) { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; __sim(0.1); if (M.curMove) seen.add(M.curMove); if (i === 60) M.hp = M.maxHp * 0.4; }
  return `mid ${M.name} card "${card}" engaged ${M.engaged} p2 ${!!M.p2} moves ${[...seen].join(',')}`; }));
await pg.evaluate(() => { const g = __game, M = g.interior.enemies.find((e) => e.holdKey === 'mid'); if (M.mv && M.curMove !== 'charge') { /* mid-move is fine */ } g.lockOn = M; g.player.target = M; __sim(0.4); });
await shot('midfight');
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, M = g.interior.enemies.find((e) => e.holdKey === 'mid'); g.damageEnemy(M, M.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.5); __director.skip?.(); await new Promise((r) => setTimeout(r, 50)); return 'mid dead ' + M.dead + ' state ' + JSON.stringify(g.holds.state(g.interior.I.hold)) + ' objective "' + g.interior.I.objective()[1] + '"'; }));
// a fire, the cracked wall, the gate from its far side
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I, F = I.fires[I.fires.length - 1];
  p.pos.copy(F.pos).add(new p.pos.constructor(0, 0, 1.6)); __sim(0.2); const it = g.interactables.find((x) => x.pos === F.pos); it.act(); document.getElementById('shop')?.remove();
  const C = I.cracks[0]; p.pos.set(C.x, 0, C.z + 3); __sim(0.1); g.interactables.find((x) => x.label === 'Break through the cracked wall').act(); __sim(0.2);
  const G = I.gates[0]; p.pos.copy(G.far); __sim(0.1); g.interactables.find((x) => x.pos === G.far).act(); __sim(0.2);
  const S = I.chests.find((c) => c.kind === 'S'); p.pos.copy(S.pos).add(new p.pos.constructor(0, 0, 1.5)); __sim(0.1); g.interactables.find((x) => x.pos === S.pos).act(); __sim(0.5);
  return `fire lit ${F.lit} lastFire ${g.holds.state(I.hold).lastFire} crack open ${C.open} gate open ${G.open} hidden chest ${S.opened} drops ${g.drops.length}`; }));
// the master
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; const B = g.interior.enemies.find((e) => e.holdKey === 'boss'); p.pos.set(B.pos.x, 0, B.pos.z + 9); __sim(0.4); const card = __director.shot?.card?.en || __director.shot?.line?.text; __director.skip(); await new Promise((r) => setTimeout(r, 50));
  const seen = new Set(); for (let i = 0; i < 180; i++) { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; p.invuln = 0.2; __sim(0.1); if (B.curMove) seen.add(B.curMove); if (i === 70) B.hp = B.maxHp * 0.45; }
  const r = `master ${B.name} card "${card}" p2 ${!!B.p2} moves ${[...seen].join(',')}`; if (B.ghost) { B.mv = null; B.curMove = null; B.ghost = false; B.rig.visible = true; } g.damageEnemy(B, B.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.4); __director.skip?.(); await new Promise((r2) => setTimeout(r2, 60)); __sim(0.4);
  const T = I.chests.find((c) => c.kind === 'T'); p.pos.copy(T.pos).add(new p.pos.constructor(0, 0, 1.5)); __sim(0.1); g.interactables.find((x) => x.pos === T.pos).act();
  return r + ` | dead ${B.dead} done ${g.holds.state(I.hold).done} chest ${T.opened} quest ${g.quests.find((q) => q.id === g.interior.def.id || q.id === I.hold)?.done}`; }));
// a fall inside wakes him at the fire; then out
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; p.hp = 0; g.playerDeath(); await g.respawn(); __sim(0.2); const at = p.pos.clone(); await g.holds.exit(); __sim(0.2); return `woke at ${at.toArray().map((v) => v.toFixed(0)).join(',')} (fire ${I.fires[g.holds.state(I.hold).lastFire]?.pos.toArray().map((v) => v.toFixed(0)).join(',')}) | out: interior ${!!g.interior} camAction ${g.camAction} pos ${p.pos.toArray().map((v) => v.toFixed(0)).join(',')}`; }));
console.log(log.join('\n'));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none'); await b.close();
