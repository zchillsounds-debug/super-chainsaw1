// node shots/r29foes.mjs [region] [out] [spot]: the Round 29 troops. A javelin man (keeps his distance, throws with a
// lead, javelins land), a braced spearman (the wedge, walking in vs dashing in, open after), a caltrop thrower (a
// patch that slows and cuts) and a field surgeon (drags a hurt man back, binds him; a blow breaks it off).
// Also counts the new troops placed on the map. Prints the numbers; shots go to [out].
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out, spot = 'x=-44&z=22'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}&${spot}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const shot = async (n) => { if (!out) return; await pg.evaluate(() => document.querySelectorAll('.hint, #hint, .tip').forEach((h) => h.remove())); await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const NEW = ['akontistes', 'kontaratos', 'tribolos', 'deputatos'];
const counts = await pg.evaluate((NEW) => { const c = {}; for (const e of __game.enemies) if (NEW.includes(e.type)) c[e.type] = (c[e.type] || 0) + 1; return c; }, NEW);
console.log('placed on the map:', JSON.stringify(counts));
const setup = () => pg.evaluate(() => {
  const g = __game, p = g.player; g.briefed = true; p.invuln = 1e9; p.hp = p.stats.maxHp; g.tutorialOn = false;
  for (const e of g.enemies) { if (!e.dead) { e.dead = true; e.removed = true; e.rig.visible = false; } }
  g.enemies = g.enemies.filter((e) => !e.removed); g.caltropsClear29?.();
  window.ahead = (d, s = 0) => { const c = g.camera.position, dx = p.pos.x - c.x, dz = p.pos.z - c.z, L = Math.hypot(dx, dz) || 1, ax = dx / L, az = dz / L; return [p.pos.x + ax * d - az * s, p.pos.z + az * d + ax * s]; };
  window.wake = (list) => { for (const e of list) { e.hidden = false; e.riseT = 1; e.alerted = true; e.rig.visible = true; } };
});
// ---- 1. the javelin man
await setup();
const r1 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(5, 2);
  const a = g.spawnPack('akontistes', x, z, 1, p.level, { spread: 0 })[0]; wake([a]); a.atkCd = 3;
  __sim(2.5); const keep = a.pos.distanceTo(p.pos);
  // let him throw at a hero standing still (invulnerable off), then count javelins seen in flight
  p.invuln = 0; p.hp = p.stats.maxHp; const hp0 = p.hp; let seen = 0, maxN = 0;
  for (let i = 0; i < 40; i++) { __sim(0.1); const n = g.projectiles.filter((q) => q.jav).length; if (n > maxN) maxN = n; if (n) seen++; }
  const took = hp0 - p.hp; p.invuln = 1e9;
  return { keepDist: keep.toFixed(1), javInFlightFrames: seen, maxInFlight: maxN, dmgToStillHero: Math.round(took), backT: (a.backT || 0).toFixed(2) };
});
console.log('akontistes:', JSON.stringify(r1));
await pg.evaluate(() => { const g = __game, a = g.enemies.find((e) => e.type === 'akontistes'); a.atkCd = 0; for (let i = 0; i < 12; i++) { __sim(0.05); if (a.st.action === 'javelin' && a.st.actionT > 0.4) break; } });
await shot('akontistes');
// ---- 2. the braced spear
await setup();
const r2 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(5);
  const k = g.spawnPack('kontaratos', x, z, 1, p.level, { spread: 0 })[0]; wake([k]); k.hp = k.maxHp = 5000; k.facing = Math.atan2(p.pos.x - k.pos.x, p.pos.z - k.pos.z); k.braceCd = 0;
  let braced = false; for (let i = 0; i < 20 && !braced; i++) { __sim(0.05); braced = k.braceT > 0; }
  const wedge = !!k.wedge?.visible;
  // walk into the wedge
  p.invuln = 0; p.hp = p.stats.maxHp; let hp0 = p.hp; __sim(0.4); p.pos.set(k.pos.x + Math.sin(k.braceDir) * 2.5, p.pos.y, k.pos.z + Math.cos(k.braceDir) * 2.5); __sim(0.25);
  const walkDmg = hp0 - p.hp;
  // wait the brace out: he is open after
  __sim(1.2); const open = k.recoverT > 0; const h0 = k.hp; g.damageEnemy(k, 100, false, p.pos.clone(), 'normal', {}); const openDmg = h0 - k.hp;
  __sim(1.5); k.recoverT = 0; k.staggerT = 0;
  // dash into a fresh brace from 6 m
  p.invuln = 1e9; p.pos.set(k.pos.x + Math.sin(k.facing) * 6, p.pos.y, k.pos.z + Math.cos(k.facing) * 6); k.braceCd = 0; k.st.action = null;
  let b2 = false; for (let i = 0; i < 30 && !b2; i++) { __sim(0.05); b2 = k.braceT > 0; }
  __sim(0.4); p.invuln = 0; p.hp = p.stats.maxHp; hp0 = p.hp;
  p.vel = p.vel || new (p.pos.constructor)(); p.vel.set(k.pos.x - p.pos.x, 0, k.pos.z - p.pos.z).normalize().multiplyScalar(6);
  g.useSkill('dodge'); __sim(0.5); const dashDmg = hp0 - p.hp; p.invuln = 1e9;
  return { braced, wedge, walkDmg: Math.round(walkDmg), openK: (openDmg / 100).toFixed(2), wasOpen: open, braced2: b2, dashDmg: Math.round(dashDmg) };
});
console.log('kontaratos:', JSON.stringify(r2));
await pg.evaluate(() => { const g = __game, p = g.player, k = g.enemies.find((e) => e.type === 'kontaratos'); k.recoverT = 0; k.braceT = 0; k.braceCd = 0; k.st.action = null; p.pos.set(k.pos.x + Math.sin(k.facing) * 5.5, p.pos.y, k.pos.z + Math.cos(k.facing) * 5.5); for (let i = 0; i < 30; i++) { __sim(0.05); if (k.braceT > 0 && k.braceT < 0.9) break; } });
await shot('kontaratos');
// ---- 3. the caltrop thrower
await setup();
const r3 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(8, -2);
  const men = g.spawnPack(['bandit', 'spearman'], x, z, 2, p.level, { spread: 2 }); const c = g.spawnPack('tribolos', x + 2, z + 2, 1, p.level, { spread: 0 })[0];
  for (const m of men) m.hp = m.maxHp = 5000; wake([...men, c]); c.atkCd = 0;
  let thrown = false; for (let i = 0; i < 40 && !thrown; i++) { __sim(0.1); thrown = c.didHit && c.st.action === null; }
  __sim(1.0);
  // stand in the patch
  const P = g.player; p.invuln = 0; p.hp = p.stats.maxHp; const hp0 = p.hp;
  const patch = { on: false };
  // the patch was thrown at the hero: he is standing in it
  let slowSeen = 1; for (let i = 0; i < 20; i++) { __sim(0.1); slowSeen = Math.min(slowSeen, g.hazSlowK ?? 1); }
  const cut = hp0 - p.hp; p.invuln = 1e9;
  return { thrown, keepDist: c.pos.distanceTo(p.pos).toFixed(1), cutDmg: Math.round(cut) };
});
console.log('caltrops:', JSON.stringify(r3));
await pg.evaluate(() => { const g = __game; for (const e of g.enemies) e.st.action = null; __sim(0.2); });
await shot('caltrops');
// ---- 4. the field surgeon
await setup();
const r4 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(6);
  const men = g.spawnPack(['bandit', 'spearman'], x, z, 2, p.level, { spread: 2 }); const d = g.spawnPack('deputatos', x + 3, z + 3, 1, p.level, { spread: 0 })[0];
  wake([...men, d]); const hurt = men[0]; hurt.hp = Math.round(hurt.maxHp * 0.3); const hp0 = hurt.hp;
  let dragged = false, tending = false, from = null;
  for (let i = 0; i < 60; i++) { __sim(0.1); if (d.dragging) { dragged = true; from ||= hurt.pos.clone(); } if (d.tending) tending = true; if (hurt.patched) break; }
  const healed = hurt.hp - hp0, movedBack = from ? hurt.pos.distanceTo(from) : 0;
  // a second hurt man: hit the surgeon while he binds
  const m2 = men[1]; m2.hp = Math.round(m2.maxHp * 0.3); const h2 = m2.hp; let broke = false;
  for (let i = 0; i < 60; i++) { __sim(0.1); if (d.tending) { g.damageEnemy(d, 1, false, p.pos.clone(), 'normal', {}); broke = !d.tending; break; } }
  return { dragged, tending, healed, patched: !!hurt.patched, movedBack: movedBack.toFixed(1), brokeOff: broke, m2Healed: m2.hp - h2 };
});
console.log('deputatos:', JSON.stringify(r4));
await pg.evaluate(() => { const g = __game, d = g.enemies.find((e) => e.type === 'deputatos'); const m = g.enemies.find((e) => e !== d && !e.dead && !e.patched); if (m) { m.hp = Math.round(m.maxHp * 0.3); for (let i = 0; i < 50; i++) { __sim(0.1); if (d.tending && d.tendT > 0.6) break; } } });
await shot('deputatos');
await pg.evaluate(() => { __game.camZoom = 0.55; __sim(0.3); }); await shot('deputatos-close');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
