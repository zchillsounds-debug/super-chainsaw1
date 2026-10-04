// node shots/r22feel.mjs [region]: Round 22 gameplay: the new foes (hook, shield guard, sling-lad running), pack
// leaders and their men faltering, smarter auto-target, the wider parry, difficulty, the close camera in the world,
// and every class's level-25 skill
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:5173/?play&mobile&q=low&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
const res = await pg.evaluate(async () => {
  const g = __game, p = g.player, log = [], V = (x, y, z) => new p.pos.constructor(x, y, z);
  const keep = () => { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; };
  const clear = () => { for (const e of g.enemies) if (!e.dead && !e.parked && e.pos.distanceTo(p.pos) < 40) { e.dead = true; e.removed = true; g.scene.remove(e.rig); } };
  p.level = 26; g.recalcStats(); keep(); __sim(0.2);
  const lead = g.enemies.filter((e) => e.leader).length, types = {}; for (const e of g.enemies) types[e.type] = (types[e.type] || 0) + 1;
  log.push(`world: leaders ${lead} hookmen ${types.hookman || 0} shield-bearers ${types.pavise || 0} sling-lads ${types.slingboy || 0}`);
  // the hookman
  clear(); const P0 = p.pos.clone();
  const H = g.spawnPack('hookman', P0.x + 6, P0.z, 1, 10, { spread: 0 })[0]; H.alerted = true; H.hookCd = 0; H.pos.set(P0.x + 6, P0.y, P0.z);
  let hooked = false, d0 = H.pos.distanceTo(p.pos); for (let i = 0; i < 30; i++) { keep(); p.invuln = 0; p.rollT = 0; __sim(0.1); if (H.hookMv?.phase === 'drag') hooked = true; }
  log.push(`hookman: hooked ${hooked} dist ${d0.toFixed(1)} -> ${H.pos.distanceTo(p.pos).toFixed(1)}`);
  // the shield-bearer: frontal blows blocked, a heavy blow breaks his guard
  clear(); const S = g.spawnPack('pavise', P0.x, P0.z + 3, 1, 10, { spread: 0 })[0]; S.alerted = true; S.facing = Math.atan2(p.pos.x - S.pos.x, p.pos.z - S.pos.z); __sim(0.1);
  let blocked = 0; for (let i = 0; i < 10; i++) { const hp = S.hp; g.damageEnemy(S, 10, false, p.pos, 'normal', { weight: 0.5 }); if (hp - S.hp <= 2) blocked++; S.guardT = 0; S.staggerT = 0; }
  g.damageEnemy(S, 10, false, p.pos, 'normal', { weight: 1.2 }); const broken = S.guardT > 0;
  log.push(`shield-bearer: blocked ${blocked}/10 guard broken by a heavy blow ${broken}`);
  // the sling-lad runs when Salim closes
  clear(); const L = g.spawnPack('slingboy', P0.x + 3, P0.z, 1, 10, { spread: 0 })[0]; L.alerted = true; L.pos.set(P0.x + 3, P0.y, P0.z); const l0 = L.pos.distanceTo(p.pos); for (let i = 0; i < 12; i++) { keep(); __sim(0.1); }
  log.push(`sling-lad: ran ${l0.toFixed(1)} -> ${L.pos.distanceTo(p.pos).toFixed(1)} m`);
  // a pack with a leader; kill him and his men falter
  clear(); const pack = g.spawnPack(['bandit', 'bandit', 'spearman', 'bandit'], P0.x + 8, P0.z + 8, 5, 10, { noMix: true }); const Ld = pack.find((e) => e.leader);
  for (const e of pack) e.alerted = true; __sim(0.3); const rallied = pack.filter((e) => e.rallyBy === Ld).length;
  g.damageEnemy(Ld, Ld.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.1); const falter = pack.filter((e) => !e.dead && e.staggerT > 0).length;
  log.push(`leader: ${Ld?.name} pennant ${!!Ld?.pennant} rallied ${rallied} faltered ${falter}`);
  // auto-target: prefer the foe in front over a slightly nearer one behind
  clear(); p.facing = 0; p.target = null; g.lastTarget = null; const F = g.spawnPack('bandit', P0.x, P0.z + 5, 1, 10, { spread: 0 })[0]; const Bk = g.spawnPack('bandit', P0.x, P0.z - 4.2, 1, 10, { spread: 0 })[0]; F.pos.set(P0.x, P0.y, P0.z + 5); Bk.pos.set(P0.x, P0.y, P0.z - 4.2); __sim(0.05);
  log.push(`auto-target: picked the one ${g.pickTarget(9) === F ? 'in front' : 'behind'}`);
  // parry at 0.24 s into the evade
  const A = F; A.alerted = true; p.rollT = 0.3; p.rollAge = 0.24; const hp0 = p.hp; g.damagePlayer(20, A.pos, A); log.push(`parry at 0.24 s: ${p.hp === hp0 && A.staggerT > 0}`); p.rollT = 0;
  // difficulty
  g.settings.set('diff', 'hard'); const hard = g.spawnPack('bandit', P0.x + 20, P0.z, 1, 10, { spread: 0 })[0]; g.settings.set('diff', 'story'); const story = g.spawnPack('bandit', P0.x + 20, P0.z, 1, 10, { spread: 0 })[0]; g.settings.set('diff', 'normal');
  log.push(`difficulty: hard hp ${hard.maxHp} story hp ${story.maxHp}`);
  // the close camera in the world
  g.settings.set('cam', 'close'); __sim(0.3); const camY = g.camera.position.y - p.pos.y, ca = g.camAction; g.settings.set('cam', 'overhead'); __sim(0.2);
  log.push(`close camera: on ${ca} height ${camY.toFixed(1)} m, back to overhead ${!g.camAction}`);
  return log.join('\n');
});
console.log(res);
// the level-25 skills, per class
for (const cls of ['faris', 'rami', 'naffat', 'ayyar']) {
  await pg.goto(`http://localhost:5173/?play&mobile&q=low&noadapt&region=${region}&cls=${cls}`);
  await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  console.log(await pg.evaluate(async () => {
    const g = __game, p = g.player; p.level = 26; g.recalcStats(); p.hp = p.stats.maxHp; p.mp = p.stats.maxMp;
    for (const e of g.enemies) if (!e.dead && !e.parked && e.pos.distanceTo(p.pos) < 40) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
    const P0 = p.pos.clone(), foes = g.spawnPack('bandit', P0.x, P0.z + 5, 3, 20, { spread: 1, noLeader: true }); for (const e of foes) { e.alerted = true; e.maxHp = e.hp = 5000; }
    p.facing = 0; g.groundPoint = () => foes[0].pos.clone(); g.hover = foes[0];
    const id = { faris: 'rush', rami: 'longshot', naffat: 'firewall', ayyar: 'shadowstep' }[p.cls];
    (p.loadout ||= {})[p.cls] = { ...(p.loadout[p.cls] || {}), s4: id }; g.ui.refreshSkills?.(); p.cds = {};
    const before = foes.reduce((a, e) => a + e.hp, 0); g.useSkill('s4'); for (let i = 0; i < 30; i++) { p.hp = p.stats.maxHp; __sim(0.1); }
    return `${p.cls} ${id}: damage dealt ${before - foes.reduce((a, e) => a + e.hp, 0)}`;
  }));
}
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none'); await b.close();
