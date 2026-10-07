// node shots/r26foes.mjs [region] [out]: the Round 26 troops: a standard-bearer rallying a pack (speed, then the
// waver when he falls), a shield wall (front blows turned, heavy blows break a guard, a blow from behind lands) and a
// horse archer (rides a circle, shoots, is thrown at half health). Prints the numbers; shots go to [out].
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = "sawad", out, spot = ""] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}&${spot}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const shot = async (n) => { if (!out) return; await pg.evaluate(() => document.querySelectorAll('.hint, #hint, .tip').forEach((h) => h.remove())); await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const counts = await pg.evaluate(() => { const c = {}; for (const e of __game.enemies) if (['standard', 'wall', 'hippo'].includes(e.type)) c[e.type] = (c[e.type] || 0) + 1; return c; });
console.log('placed on the map:', JSON.stringify(counts));
// ---- a clear patch beside the hub
const setup = (pg) => pg.evaluate(() => {
  const g = __game, p = g.player; g.briefed = true; p.invuln = 1e9; p.hp = p.stats.maxHp;
  for (const e of g.enemies) { if (!e.dead) { e.dead = true; e.removed = true; e.rig.visible = false; } }
  g.enemies = g.enemies.filter((e) => !e.removed);
  window.ahead = (d, s = 0) => { const c = g.camera.position, dx = p.pos.x - c.x, dz = p.pos.z - c.z, L = Math.hypot(dx, dz) || 1, ax = dx / L, az = dz / L; return [p.pos.x + ax * d - az * s, p.pos.z + az * d + ax * s]; };
  window.wake = (list) => { for (const e of list) { e.hidden = false; e.riseT = 1; e.alerted = true; e.rig.visible = true; } };
});
// ---- 1. the standard
await setup(pg);
const r1 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(7);
  const men = g.spawnPack(['bandit', 'bandit', 'spearman'], x, z, 3, p.level, { spread: 2 });
  const sb = g.spawnPack('standard', x + 1, z + 1, 1, p.level, { spread: 0 })[0];
  wake([...men, sb]); __sim(1.0);
  return { rallied: men.filter((m) => m.rallyT > 0).length, speed: men.map((m) => (m.speed / m.T.speed).toFixed(2)).join(','), ring: sb.rig.userData.rallyRing?.visible, bearerDist: sb.pos.distanceTo(p.pos).toFixed(1) };
});
console.log('standard:', JSON.stringify(r1));
await shot('standard');
await pg.evaluate(() => { __game.camZoom = 0.55; __sim(0.5); }); await shot('standard-close'); await pg.evaluate(() => { __game.camZoom = 1.1; });
const r1b = await pg.evaluate(() => {
  const g = __game, sb = g.enemies.find((e) => e.type === 'standard' && !e.dead);
  g.damageEnemy(sb, 99999, false, g.player.pos, 'normal', { unblockable: true }); __sim(0.2);
  const men = g.enemies.filter((e) => !e.dead && e.type !== 'standard');
  return { bearerDead: sb.dead, wavering: men.filter((m) => m.staggerT > 0).length, of: men.length, speed: men.map((m) => (m.speed / m.T.speed).toFixed(2)).join(',') };
});
console.log('standard falls:', JSON.stringify(r1b));
// ---- 2. the shield wall
await setup(pg);
const r2 = await pg.evaluate(async () => {
  const g = __game, p = g.player, [x, z] = ahead(6);
  const { spawnWall } = await import('/src/foes26.js');
  const men = spawnWall(g, x, z, p.level); wake(men); for (const m of men) m.hp = m.maxHp = 5000; __sim(2.0);
  const mid = men[1], face = mid.facing, toHero = Math.atan2(p.pos.x - mid.pos.x, p.pos.z - mid.pos.z);
  const spread = men.map((m) => m.pos.distanceTo(mid.pos).toFixed(1)).join(',');
  // front blows: from the hero's side
  let blocked = 0; const hp0 = mid.hp;
  for (let i = 0; i < 10; i++) { mid.st.action = null; mid.staggerT = 0; const h = mid.hp; g.damageEnemy(mid, 20, false, p.pos.clone(), 'normal', { weight: 0.6 }); if (h - mid.hp <= 4) blocked++; }
  mid.poise = mid.maxPoise; mid.staggerT = 0;
  // heavy blows until the guard breaks
  let heavy = 0; while (!(mid.staggerT > 0) && heavy < 40 && !mid.dead) { mid.st.action = null; g.damageEnemy(mid, 5, false, p.pos.clone(), 'normal', { weight: 1.6 }); heavy++; }
  // a blow from behind
  const side = men[0]; side.staggerT = 0; side.st.action = null;
  const back = side.pos.clone().addScaledVector(new (p.pos.constructor)(Math.sin(side.facing), 0, Math.cos(side.facing)), -2);
  const hb = side.hp; g.damageEnemy(side, 20, false, back, 'normal', { weight: 0.6 });
  return { spread, faceErr: Math.abs(Math.atan2(Math.sin(toHero - face), Math.cos(toHero - face))).toFixed(2), frontBlocked: blocked + '/10', heavyToBreak: heavy, broken: mid.staggerT > 0, backDmg: hb - side.hp };
});
console.log('shield wall:', JSON.stringify(r2));
await pg.evaluate(() => { const g = __game; for (const e of g.enemies) e.staggerT = 0; __sim(0.6); });
await shot('wall');
const r2b = await pg.evaluate(() => {
  const g = __game, p = g.player; p.invuln = 0; p.hp = p.stats.maxHp; const hp0 = p.hp; const k0 = p.pos.clone();
  const men = g.enemies.filter((e) => e.type === 'wall' && !e.dead);
  for (const m of men) { m.atkCd = 0; m.staggerT = 0; m.st.action = null; m.pos.lerp(p.pos, 0.5); }
  __sim(1.5); const took = hp0 - p.hp, moved = p.pos.distanceTo(k0); p.invuln = 1e9;
  for (const m of men.slice(0, 2)) g.damageEnemy(m, 99999, false, p.pos, 'normal', { unblockable: true });
  __sim(0.2); const last = men[2];
  return { bashDmg: Math.round(took), shovedM: moved.toFixed(1), lastInWall: !!last.wall, lastBlockK: last.blockK };
});
console.log('wall bash and break-up:', JSON.stringify(r2b));
// ---- 3. the horse archer
await setup(pg);
const r3 = await pg.evaluate(async () => {
  const g = __game, p = g.player, [x, z] = ahead(12, 3);
  const h = g.spawnPack('hippo', x, z, 1, p.level, { spread: 0 })[0]; wake([h]);
  let shots = 0; const sa = g.shootArrow; g.shootArrow = (...a) => { if (a[0] === h) shots++; return sa.apply(g, a); }; let dmin = 99, dmax = 0, ang0 = Math.atan2(h.pos.x - p.pos.x, h.pos.z - p.pos.z), turn = 0, last = ang0;
  for (let i = 0; i < 40; i++) { __sim(0.25); const d = h.pos.distanceTo(p.pos); if (i > 8) { dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); } const a = Math.atan2(h.pos.x - p.pos.x, h.pos.z - p.pos.z); turn += Math.atan2(Math.sin(a - last), Math.cos(a - last)); last = a; }
  const { navClear } = await import('/src/nav.js');
  const dbg = { atkCd: h.atkCd.toFixed(2), action: h.st.action, clear: navClear(h.pos.x, h.pos.z, p.pos.x, p.pos.z), dist: h.pos.distanceTo(p.pos).toFixed(1), alerted: h.alerted, dead: h.dead };
  return { dbg, shots, ring: dmin.toFixed(1) + '-' + dmax.toFixed(1), circledRad: turn.toFixed(2) };
});
console.log('horse archer:', JSON.stringify(r3));
await shot('hippo');
const r3b = await pg.evaluate(() => {
  const g = __game, h = g.enemies.find((e) => e.type === 'hippo' && !e.dead);
  g.damageEnemy(h, Math.ceil(h.maxHp * 0.55), false, h.pos.clone().setX(h.pos.x + 1), 'normal', { unblockable: true }); __sim(0.4);
  const foot = g.enemies.find((e) => e.name === 'Unhorsed Hippotoxotes');
  return { thrown: !!h.st.thrown, onFoot: !!foot, footType: foot?.type };
});
console.log('thrown:', JSON.stringify(r3b));
console.log('errors:', errs.filter((e) => !e.includes('CERT')).join('\n') || 'none'); await b.close();
