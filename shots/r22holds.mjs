// node shots/r22holds.mjs <dam|kilns|stockade|sunken|quarter|vaults|shipyard|hulks> [outdir]: a story hold end to end:
// its door in the region, the trail to it, the lock on the second hold, the close camera, the hazards, the captain
// halfway, the fire, the cracked wall, the gate, the lieutenant (his own fight, his last words, the quest), the way out
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id = 'dam', out] = process.argv.slice(2);
const REG = { dam: 'sawad', kilns: 'sawad', stockade: 'marsh', sunken: 'marsh', quarter: 'karkh', vaults: 'karkh', shipyard: 'docks', hulks: 'docks' }[id];
const LVL = { sawad: 3, marsh: 9, karkh: 12, docks: 15 }[REG];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:5173/?play&mobile&q=${out ? 'high' : 'low'}&noadapt&region=${REG}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (name) => { if (!out) return; await pg.waitForTimeout(700); await pg.screenshot({ path: `${out}/${id}-${name}.png`, timeout: 180000 }); };
const log = [];
// the door, the trail, the lock
log.push(await pg.evaluate(async ([id, LVL]) => { const g = __game, p = g.player; p.level = LVL; g.recalcStats(); p.hp = p.stats.maxHp; g.briefed = true;
  const door = g.interactables.find((x) => x.area === id), H = g.holds; const second = !!(H.locked(id) !== null || id.match(/kilns|sunken|vaults|hulks/));
  const lockedMsg = H.locked(id);
  // the first hold's quest done, if this is the second
  if (second) for (const q of g.quests.slice(0, 1)) g.completeQuest(q.id, true);
  const { objectiveTarget } = await import('/src/guide.js'); const tg = objectiveTarget(g);
  return `door ${!!door} at ${door?.pos.toArray().map((v) => v.toFixed(0))} label "${door?.label}" locked-before "${lockedMsg}" locked-now "${H.locked(id)}" trail->door ${tg && door ? tg.distanceTo(door.pos).toFixed(1) : 'none'} chief ${g.chief} second ${g.matriarch}`; }, [id, LVL]));
log.push(await pg.evaluate(async (id) => { const g = __game, p = g.player, door = g.interactables.find((x) => x.area === id); p.pos.copy(door.pos); __sim(0.2); await door.act(); __sim(0.3); const I = g.interior.I;
  return `entered ${!!g.interior?.hold} theme ${I.theme} camAction ${g.camAction} level ${g.interior.def.level} tiles ${I.W}x${I.H} foes ${g.interior.enemies.length} bosses ${g.interior.enemies.filter((e) => e.holdBoss).map((e) => e.name + ':' + e.maxHp + (e.quest ? '(q ' + e.quest + ')' : '')).join(',')} fires ${I.fires.length} gates ${I.gates.length} cracks ${I.cracks.length} chests ${I.chests.length} vents ${I.vents.length} hoists ${I.hoists.length} shallows ${I.water.length} objective "${I.objective()[1]}"`; }, id));
await shot('entrance');
log.push(await pg.evaluate(() => { const g = __game, p = g.player, z0 = p.pos.z; for (let i = 0; i < 8; i++) { g.joy = { x: 0, y: -1 }; __sim(0.15); } g.joy = null; __sim(0.3); return 'walked ' + (z0 - p.pos.z).toFixed(1) + ' m forward, surface ' + g.surfaceAt(p.pos); }));
// hazards: stand by a vent, a hoist, in the shallows
log.push(await pg.evaluate(() => { const g = __game, p = g.player, I = g.interior.I; const hp0 = p.stats.maxHp; let r = '';
  for (const e of g.interior.enemies) if (!e.holdBoss) e.alerted = false;
  if (I.vents.length) { p.hp = hp0; p.pos.copy(I.vents[0].pos); for (let i = 0; i < 70; i++) { p.dead = false; __sim(0.1); p.pos.copy(I.vents[0].pos); } r += `vent: hp ${p.hp.toFixed(0)}/${hp0} fires ${g.fires2.length} `; }
  if (I.hoists.length) { p.hp = hp0; const n0 = g.projectiles.length; p.pos.copy(I.hoists[0].pos); let seen = 0; for (let i = 0; i < 40; i++) { p.dead = false; __sim(0.1); seen = Math.max(seen, g.projectiles.length - n0); } r += `hoist: stones ${seen} hp ${p.hp.toFixed(0)} `; }
  if (I.water.length) { const w = I.water[0]; p.pos.set(I.X(w.c), 0, I.Z(w.r)); __sim(0.1); r += `shallows: surface ${g.surfaceAt(p.pos)} slow ${g.hazSlowK}`; }
  p.hp = hp0; return r || 'no hazards'; }));
// the mid captain
log.push(await pg.evaluate(async () => { const g = __game, p = g.player; for (const e of g.interior.enemies) if (!e.holdBoss) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
  const M = g.interior.enemies.find((e) => e.holdKey === 'mid'); p.pos.set(M.pos.x, 0, M.pos.z + 9); __sim(0.4); const card = __director.shot?.card?.en; __director.skip(); await new Promise((r) => setTimeout(r, 50));
  const seen = new Set(); for (let i = 0; i < 160; i++) { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; __sim(0.1); if (M.curMove) seen.add(M.curMove); if (i === 60) M.hp = M.maxHp * 0.4; }
  return `mid ${M.name} card "${card}" engaged ${M.engaged} p2 ${!!M.p2} moves ${[...seen].join(',')}`; }));
await pg.evaluate(() => { const g = __game, M = g.interior.enemies.find((e) => e.holdKey === 'mid'); g.lockOn = M; g.player.target = M; __sim(0.4); });
await shot('midfight');
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, M = g.interior.enemies.find((e) => e.holdKey === 'mid'); g.damageEnemy(M, M.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.5); __director.skip?.(); await new Promise((r) => setTimeout(r, 50)); return 'mid dead ' + M.dead + ' objective "' + g.interior.I.objective()[1] + '"'; }));
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I, F = I.fires[I.fires.length - 1];
  p.pos.copy(F.pos).add(new p.pos.constructor(0, 0, 1.6)); __sim(0.2); g.interactables.find((x) => x.pos === F.pos).act(); document.getElementById('shop')?.remove();
  const C = I.cracks[0]; p.pos.set(C.x, 0, C.z + 3); __sim(0.1); g.interactables.find((x) => x.label === 'Break through the cracked wall').act(); __sim(0.2);
  const G = I.gates[0]; p.pos.copy(G.far); __sim(0.1); g.interactables.find((x) => x.pos === G.far).act(); __sim(0.2);
  const S = I.chests.find((c) => c.kind === 'S'); p.pos.copy(S.pos).add(new p.pos.constructor(0, 0, 1.5)); __sim(0.1); g.interactables.find((x) => x.pos === S.pos).act(); __sim(0.5);
  return `fire lit ${F.lit} crack open ${C.open} gate open ${G.open} hidden chest ${S.opened}`; }));
// the lieutenant
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; const B = g.interior.enemies.find((e) => e.holdKey === 'boss'); p.pos.set(B.pos.x, 0, B.pos.z + 9); __sim(0.4); const card = __director.shot?.card?.en; __director.skip(); await new Promise((r) => setTimeout(r, 50));
  const seen = new Set(); let own = 0; for (let i = 0; i < 200; i++) { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; p.invuln = 0.2; __sim(0.1); if (B.curMove) seen.add(B.curMove); if (B.hook || B.smoke) own++; if (i === 80) B.hp = B.maxHp * 0.45; }
  const r = `master ${B.name} card "${card}" p2 ${!!B.p2} moves ${[...seen].join(',')} own-fight frames ${own}`;
  const act0 = g.act; g.damageEnemy(B, B.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.3); const line = __director.def?.shots?.find((s) => s.line)?.line?.text; let n = 0; while (g.cinematic && n++ < 20) { __director.skip?.(); await new Promise((r2) => setTimeout(r2, 80)); __sim(0.2); }
  const T = I.chests.find((c) => c.kind === 'T'); p.pos.copy(T.pos).add(new p.pos.constructor(0, 0, 1.5)); __sim(0.1); g.interactables.find((x) => x.pos === T.pos).act();
  return r + ` | dead ${B.dead} last words "${line}" done ${g.holds.state(I.hold).done} chest ${T.opened} quest ${g.quests.find((q) => q.id === B.quest)?.done} act ${act0}->${g.act}`; }));
await shot('master');
log.push(await pg.evaluate(async () => { const g = __game, p = g.player, I = g.interior.I; p.hp = 0; g.playerDeath(); await g.respawn(); __sim(0.2); await g.holds.exit(); __sim(0.2);
  const { objectiveTarget } = await import('/src/guide.js'); const tg = objectiveTarget(g); const q = g.quests.find((x) => !x.done);
  return `out: interior ${!!g.interior} camAction ${g.camAction} next quest "${q?.text}" trail ${tg ? tg.x.toFixed(0) + ',' + tg.z.toFixed(0) : 'none'}`; }));
await shot('out');
console.log(log.join('\n'));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none'); await b.close();
