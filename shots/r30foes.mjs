// node shots/r30foes.mjs [region] [out]: the Round 30 troops. A mounted lancer (lines up, shows his lane, charges, rides a
// standing hero down, wheels, is thrown below half life) and a dog handler (slips two dogs, they bite; cut him down and
// the dogs run off). Also counts the new troops placed on the map. Prints the numbers; shots go to [out].
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' '))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}&${process.env.SPOT || "x=-44&z=22"}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const shot = async (n) => { if (!out) return; await pg.screenshot({ path: `${out}/${region}-f30-${n}.png`, timeout: 180000 }); console.log('shot', n); };
const NEW = ['kontophoros', 'kynegos', 'molossos'];
console.log('placed on the map:', JSON.stringify(await pg.evaluate((NEW) => { const c = {}; for (const e of __game.enemies) if (NEW.includes(e.type)) c[e.type] = (c[e.type] || 0) + 1; return c; }, NEW)));
const setup = () => pg.evaluate(() => {
  const g = __game, p = g.player; g.briefed = true; p.invuln = 1e9; p.hp = p.stats.maxHp; g.tutorialOn = false;
  for (const e of g.enemies) if (!e.dead) { e.dead = true; e.removed = true; e.rig.visible = false; }
  g.enemies = g.enemies.filter((e) => !e.removed);
  window.ahead = (d, s = 0) => { const c = g.camera.position, dx = p.pos.x - c.x, dz = p.pos.z - c.z, L = Math.hypot(dx, dz) || 1, ax = dx / L, az = dz / L; return [p.pos.x + ax * d - az * s, p.pos.z + az * d + ax * s]; };
  window.wake = (list) => { for (const e of list) { e.hidden = false; e.riseT = 1; e.alerted = true; e.rig.visible = true; } };
});
// ---- 1. the lancer
await setup();
const r1 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(14);
  const L = g.spawnPack('kontophoros', x, z, 1, p.level, { spread: 0 })[0]; wake([L]); L.atkCd = 0.5; L.hp = L.maxHp = 5000;
  const seen = {}; let laneSeen = false, hit = 0;
  p.invuln = 0; p.hp = p.stats.maxHp; const hp0 = p.hp;
  for (let i = 0; i < 120; i++) { __sim(0.05); const s = L.ch30?.s; if (s) seen[s] = (seen[s] || 0) + 1; if (L.lane?.visible) laneSeen = true; if (s === 'wheel' && seen.charge) break; }
  hit = hp0 - p.hp; p.invuln = 1e9;
  // below half: thrown, fights on as a braced spearman
  L.hp = L.maxHp * 0.4; __sim(0.2); const foot = g.enemies.find((e) => e.name === 'Unhorsed Kontophoros' || e.type === 'kontaratos');
  return { states: seen, laneSeen, dmgToStillHero: Math.round(hit), thrown: !!L.thrown30, onFoot: !!foot };
});
console.log('kontophoros:', JSON.stringify(r1));
await setup();
await pg.evaluate(() => { const g = __game, p = g.player, [x, z] = ahead(13, 2); const L = g.spawnPack('kontophoros', x, z, 1, p.level, { spread: 0 })[0]; wake([L]); L.atkCd = 0; for (let i = 0; i < 40; i++) { __sim(0.05); if (L.ch30?.s === 'aim' && L.ch30.t > 0.6) break; } });
await shot('lane');
// ---- 2. the dog handler
await setup();
const r2 = await pg.evaluate(() => {
  const g = __game, p = g.player, [x, z] = ahead(8);
  const H = g.spawnPack('kynegos', x, z, 1, p.level, { spread: 0 })[0]; wake([H]); __sim(0.3);
  const dogs = H.dogs || [];
  p.invuln = 0; p.hp = p.stats.maxHp; const hp0 = p.hp; let lunges = 0;
  for (let i = 0; i < 60; i++) { __sim(0.05); for (const d of dogs) if (d.dog30?.s === 'lunge') lunges++; }
  const bit = hp0 - p.hp; p.invuln = 1e9;
  const keep = H.pos.distanceTo(p.pos);
  g.killEnemy(H, H.pos); let fled = 0; for (let i = 0; i < 40; i++) { __sim(0.1); }
  for (const d of dogs) if (d.dog30?.s === 'flee' || d.removed) fled++;
  return { dogs: dogs.length, lungeFrames: lunges, bitDmg: Math.round(bit), handlerKeep: keep.toFixed(1), fledAfterHandler: fled, gone: dogs.filter((d) => d.removed).length };
});
console.log('kynegos:', JSON.stringify(r2));
await setup();
await pg.evaluate(() => { const g = __game, p = g.player, [x, z] = ahead(6, 1); const H = g.spawnPack('kynegos', x, z, 1, p.level, { spread: 0 })[0]; wake([H]); __sim(1.2); });
await shot('dogs');
// a dog killed outright lies down (the quadruped never runs the humanoid death)
const r3 = await pg.evaluate(() => { const g = __game, d = g.enemies.find((e) => e.type === 'molossos' && !e.dead); if (!d) return null; g.killEnemy(d, d.pos); __sim(1.0); return { lying: +d.rig.rotation.z.toFixed(2) }; });
console.log('dead dog:', JSON.stringify(r3));
console.log('errors:', errs.join('\n') || 'none'); await b.close();
