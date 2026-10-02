import * as THREE from 'three';
import { SITES, heightAt } from './terrain.js';
import { resolve, buildGrid } from './collision.js';
import { colliders, mats } from './buildings.js';
import { npc } from './hub.js';
import { SIDE, CODEX, questState, setQuest, converse, unlock, giveItem } from './narrative.js';
import { makeItem } from './items.js';
import * as SCENES from './scenes.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

// Round 10 content: named elites with affixes, a new area per act (each held by a named captain), three more
// side tasks, the siege engines at the arch, Ghassan's final duel, and New Game+.

const tmp = new THREE.Vector3();
const AFFIX = {
  swift: { label: 'Swift', apply: (e) => { e.speed *= 1.45; e.T = { ...e.T, atk: e.T.atk * 0.75 }; } },
  ironclad: { label: 'Ironclad', apply: (e) => { e.maxHp = e.hp = Math.round(e.maxHp * 1.3); e.maxPoise = e.poise = e.maxPoise * 3; } },
  volley: { label: 'Volley', apply: () => {} },
  firebrand: { label: 'Firebrand', apply: () => {} },
  rally: { label: 'Rallying', apply: () => {} },
};
// named captains in the open field, two per act
const NAMED = [
  { id: 'uqba', act: 1, name: '\'Uqba', type: 'bandit', at: [36, 26], level: 2, affix: 'swift', guard: ['bandit', 'archer'] },
  { id: 'nasr', act: 1, name: 'Nasr', type: 'archer', at: [SITES.serai.x + 18, SITES.serai.z + 22], level: 2, affix: 'volley', guard: ['bandit', 'bandit'] },
  { id: 'bakr', act: 2, name: 'Bakr', type: 'deserter', at: [-30, -52], level: 3, affix: 'swift', guard: ['deserter', 'deserter'] },
  { id: 'hamdan', act: 2, name: 'Hamdan', type: 'spearman', at: [SITES.kiln.x + 20, SITES.kiln.z + 18], level: 3, affix: 'ironclad', guard: ['spearman', 'deserter'] },
  { id: 'rabia', act: 3, name: 'Rabi\'a', type: 'naffat', at: [SITES.arch.x - 22, SITES.arch.z + 26], level: 5, affix: 'firebrand', guard: ['naffat', 'archer'] },
  { id: 'jarir', act: 3, name: 'Jarir', type: 'spearman', at: [SITES.arch.x + 24, SITES.arch.z + 22], level: 5, affix: 'rally', guard: ['spearman', 'bandit', 'archer'] },
];
// a new area per act; each ends in a named captain guarding the chest
const AREAS = [
  { id: 'cellar', act: 1, style: 'cellar', at: [SITES.serai.x + 9, SITES.serai.z + 9], seed: 761, rooms: 6, level: 2, title: 'The Caravanserai Storerooms', sub: 'Vaulted stores beneath Farud\'s camp', pool: ['bandit', 'bandit', 'archer'], bossType: 'archer', bossName: 'Qays', label: 'Go down into the storerooms', icon: '▼', look: 'mud' },
  { id: 'pit', act: 2, style: 'pit', at: [SITES.kiln.x - 16, SITES.kiln.z + 14], seed: 806, rooms: 7, level: 3, title: 'The Clay Pits', sub: 'Where the kiln yard digs its clay', pool: ['deserter', 'deserter', 'spearman'], bossType: 'spearman', bossName: 'Thabit', label: 'Climb down into the clay pits', icon: '▼', look: 'clay' },
  { id: 'vault', act: 3, style: 'vault', at: [SITES.arch.x + 30, SITES.arch.z + 12], seed: 637, rooms: 8, level: 5, title: 'The Sasanian Vaults', sub: 'Brick halls older than Baghdad', pool: ['naffat', 'spearman', 'archer', 'deserter'], bossType: 'spearman', bossName: 'Mundhir', label: 'Enter the Sasanian vaults', icon: '▼', look: 'brick' },
];

export function setupContent(game) {
  const p = game.player; game.fires2 = []; game.named = {};
  Object.assign(SIDE, {
    satchel: { t: 'The Courier\'s Satchel', giver: 'Rafi\'', steps: ['Qays took a barid courier\'s satchel into the storerooms under the caravanserai. Recover it.', 'You have the satchel. Return it to Rafi\' in the suq.', 'The letters reached Baghdad.'] },
    ingots: { t: 'Indian Steel', giver: 'Bishr', steps: ['Thabit\'s men carried off Bishr\'s Indian steel ingots to the clay pits by the kilns. Bring them back.', 'You have the ingots. Take them to Bishr.', 'Bishr has his steel again.'] },
    engines: { t: 'Ash for the Engines', giver: '\'Amr', steps: ['Ghassan has three mangonels on the approach to the arch. Burn them before you face him (0/3).', 'The engines are ash. Tell \'Amr.', 'Ghassan fights without his engines.'] },
  });
  Object.assign(CODEX, {
    teacher: { t: 'The Teacher', cat: 'People', x: 'Salim never learns his name; his students only ever say "the Teacher". He taught wherever people would listen, lived simply, and spoke plainly to men who preferred flattery. He was held for years in a prison beside the Tigris and died there in 799. His sayings were copied and passed hand to hand, because written words outlive the people who try to silence them.' },
    ctesiphon: { t: 'The Arch of Ctesiphon', cat: 'Places', x: 'The Sasanian kings\' palace at Ctesiphon, downriver from where Baghdad would rise, was crowned by a vast brick vault, the Taq Kasra, built in the 6th century. Its single span of about 25 metres made it one of the largest brick vaults ever raised. Later writers tell that al-Mansur thought of pulling it down for bricks for his new city, and gave up when the cost of demolition outran the value of the bricks.' },
    mangonel: { t: 'Mangonels', cat: 'War', x: 'The manjaniq was a beam sling engine worked by teams pulling ropes. It threw stones and pots of naft over walls. Both sides set them up in Baghdad in 812–813, and the chroniclers blame them for much of the damage to houses and markets.' },
    steel: { t: 'Indian Steel', cat: 'Craft', x: 'Crucible steel came west from India and Sri Lanka as small ingots. Smiths prized it for blades that took a hard, keen edge, and its watered pattern became famous. Merchants carried it through the Gulf ports to Basra and up to Baghdad.' },
  });
  // ---------------------------------------------------------------- named captains in the field
  const prevKill = game.onKill;
  for (const N of NAMED) spawnNamed(game, N);
  game.onKill = (e) => {
    prevKill?.(e);
    if (e.namedId) { (p.named ||= {})[e.namedId] = true; game.ui.toast(`${t('Captain slain')}: <b>${t(e.baseName)}</b>`, 'quest'); }
    if (e.bossOf === 'cellar' && questState(p, 'satchel') <= 0) { giveItem(game, questItem('satchel', 'The Courier\'s Satchel', 'Sealed letters of the barid.')); if (questState(p, 'satchel') === 0) setQuest(game, 'satchel', 1); }
    if (e.bossOf === 'pit' && questState(p, 'ingots') <= 0) { giveItem(game, questItem('ingots', 'Indian Steel Ingots', 'Heavy, dark and finely grained.')); if (questState(p, 'ingots') === 0) setQuest(game, 'ingots', 1); }
    if (e.bossOf === 'vault') unlock(game, 'ctesiphon');
  };
  // ---------------------------------------------------------------- new areas
  for (const A of AREAS) addEntrance(game, A);
  // ---------------------------------------------------------------- Rafi', a wounded courier of the barid
  const rafi = npc(game, { robe: '#3a4a5a', robe2: '#c8b070', turban: 0x2a3440, beard: 0x2a1c12, beardLen: 0.4, skin: 0x8a5a3a, weapon: null, sash: 0x2a3440, build: 0.95 }, [14, 86], -2.2, 'Rafi\'', 'Courier', () => {
    const s = questState(p, 'satchel'), has = bagHas(p, 'satchel');
    if (has && s < 2) {
      return game.director.play(SCENES.conversation(game, rafi, [
        { who: 'Salim', text: 'Your satchel. The seals are unbroken.' },
        { who: 'Rafi\'', text: 'Unbroken! Then the postmaster in Baghdad will have his reports by tomorrow, and I will keep my post. Take this, and my thanks.' },
      ])).then(() => { takeItem(p, 'satchel'); p.gold += 120 + p.level * 15; game.audio.gold(); giveItem(game, makeItem(p.level + 1, 'rare', 'ring')); setQuest(game, 'satchel', 2); unlock(game, 'barid'); });
    }
    converse(game, { start: { who: 'Rafi\'', text: s === -1 ? 'Forgive me, I cannot stand for long. Brigands ran down my horse on the Khurasan road and took my satchel.' : s === 2 ? 'The relay horses run again. If you ever need a letter carried, ask for Rafi\'.' : 'Qays and his archers hide in the storerooms under the caravanserai. Be careful.', choices: [
      ...(s === -1 ? [{ label: 'What was in it?', to: 'what' }] : []),
      { label: 'What is the barid?', to: 'barid', fx: () => unlock(game, 'barid') },
      { label: 'Farewell.' },
    ] },
    what: { who: 'Rafi\'', text: 'Letters for the postmaster in Baghdad: reports on prices and governors, sealed. If they are opened or lost, I lose my post. Qays took them into the storerooms under the caravanserai.', choices: [{ label: 'I will bring it back.', fx: () => setQuest(game, 'satchel', 0) }, { label: 'Not now.' }] },
    barid: { who: 'Rafi\'', text: 'The caliph\'s post. Relays of horses along the great roads, a fresh mount at every station. We carry the state\'s letters, and the postmasters write to Baghdad about everything they see.', choices: [{ label: 'Back.', to: 'start' }] },
    });
  });
  const satchelMark = questMark(rafi.rig);
  // ---------------------------------------------------------------- Bishr: the Indian steel
  const bishr = game.npcs.find((n) => n.name === 'Bishr'), bTalk = bishr?.talk;
  if (bishr) bishr.talk = () => {
    const s = questState(p, 'ingots');
    if (bagHas(p, 'ingots') && s < 2) return game.director.play(SCENES.conversation(game, bishr, [
      { who: 'Salim', text: 'Your ingots, from the clay pits. Thabit will not need them.' },
      { who: 'Bishr', text: 'Ha! Feel the weight of that. I will forge you something worthy of it, and your next tempering is on my anvil, free.' },
    ])).then(() => { takeItem(p, 'ingots'); p.freeTemper = (p.freeTemper || 0) + 1; giveItem(game, makeItem(p.level + 2, 'rare', 'weapon')); setQuest(game, 'ingots', 2); unlock(game, 'steel'); });
    converse(game, { start: { who: 'Bishr', text: s === -1 ? 'Mind the sparks. You have the look of someone who could do me a favour.' : 'The forge is hot. What do you need?', choices: [
      { label: 'Show me the forge.', fx: () => setTimeout(bTalk, 0) },
      ...(s === -1 ? [{ label: 'What favour?', to: 'favour' }] : []),
      { label: 'Farewell.' },
    ] },
    favour: { who: 'Bishr', text: 'Six ingots of Indian steel, come up from Basra, and Thabit\'s men took them off the cart at the kilns. They will be hiding in the clay pits. Steel like that does not come twice a year.', choices: [{ label: 'I will get them back.', fx: () => { setQuest(game, 'ingots', 0); unlock(game, 'steel'); } }, { label: 'Not now.' }] },
    });
  };
  // ---------------------------------------------------------------- 'Amr: the engines at the arch
  const amr = game.npcs.find((n) => n.name === '\'Amr'), aTalk = amr?.talk;
  if (amr) amr.talk = () => {
    const s = questState(p, 'engines');
    if (s === 1) return game.director.play(SCENES.conversation(game, amr, [
      { who: '\'Amr', text: 'I saw the smoke from here. Without his engines, Ghassan is just a big man with a sword. Here, for the road.' },
    ])).then(() => { p.gold += 180; p.potions += 2; setQuest(game, 'engines', 2); });
    if (s === -1 && (game.act || 1) >= 3) return converse(game, { start: { who: '\'Amr', text: 'One more thing, before you go south. Ghassan has mangonels on the road to the arch. If he gets them loosing naft at you, you will burn. Burn them first.', choices: [{ label: 'Consider it done.', fx: () => { setQuest(game, 'engines', 0); unlock(game, 'mangonel'); } }, { label: 'Later.', fx: () => setTimeout(aTalk, 0) }] } });
    aTalk();
  };
  game.engines = [];
  for (const [dx, dz, r] of [[-14, 30, 0.3], [6, 34, -0.2], [20, 28, 0.5]]) addEngine(game, SITES.arch.x + dx, SITES.arch.z + dz, r);
  // ---------------------------------------------------------------- per-frame
  let t0 = 0;
  game.contentTick = (dt) => {
    t0 += dt;
    satchelMark.visible = questState(p, 'satchel') === -1 || bagHas(p, 'satchel');
    tickAffixes(game, dt);
    tickFires(game, dt);
    if (game.boss && !game.boss.dead) tickDuel(game, game.boss, dt);
  };
}

// ------------------------------------------------------------------ named captains
function spawnNamed(game, N) {
  if (game.player.named?.[N.id]) return;
  const [x, z] = N.at, lvl = N.level;
  const guard = game.spawnPack(N.guard, x, z, N.guard.length, lvl, { spread: 4 });
  const e = game.spawnPack(N.type, x, z, 1, lvl + 1, { elite: true, spread: 0, name: `${N.name} · ${AFFIX[N.affix].label}` })[0];
  e.namedId = N.id; e.baseName = N.name; e.affix = N.affix; e.affixT = 2 + Math.random() * 2; AFFIX[N.affix].apply(e);
  e.guards = guard; game.named[N.id] = e;
}
function tickAffixes(game, dt) {
  const p = game.player;
  for (const e of Object.values(game.named)) {
    if (e.dead || !e.alerted || game.interior) continue;
    e.affixT -= dt; if (e.affixT > 0) continue;
    const d = e.pos.distanceTo(p.pos);
    if (e.affix === 'volley' && d < 16) { e.affixT = 4.5; for (let i = 0; i < 3; i++) setTimeout(() => !e.dead && game.shootArrow(e), i * 160); }
    else if (e.affix === 'firebrand') { e.affixT = 5; if (d < 14) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, q = p.pos.clone().add(tmp.set(Math.cos(a) * 2.5 * i, 0, Math.sin(a) * 2.5 * i)); q.y = heightAt(q.x, q.z); enemyFire(game, q, 2.2, 4.5, e.dmg * 0.35, 0.9 + i * 0.35); } }
    else if (e.affix === 'rally') { e.affixT = 1; for (const g of e.guards || []) if (!g.dead) { g.speed = g.T.speed * 1.3; g.alerted = true; } }
    else e.affixT = 3;
  }
}

// ------------------------------------------------------------------ hostile ground fire (telegraphed)
function enemyFire(game, pos, r, life, dmg, delay = 0.8) {
  game.telegraph(pos, r, delay, () => {
    game.fx.flash(tmp.copy(pos).setY(pos.y + 1.5), 0xff6020, 20, 0.3, 10); game.audio.boom?.();
    game.decal(pos, r * 2, 'scorch');
    game.fires2.push({ pos: pos.clone(), r, life, t: 0, tick: 0, dmg });
  });
}
function tickFires(game, dt) {
  const p = game.player;
  for (let i = game.fires2.length - 1; i >= 0; i--) {
    const f = game.fires2[i]; f.t += dt;
    if (Math.random() < 0.9) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * f.r; game.fx.fire(tmp.set(f.pos.x + Math.cos(a) * r, f.pos.y + 0.1, f.pos.z + Math.sin(a) * r), 0.6); }
    f.tick -= dt;
    if (f.tick <= 0) { f.tick = 0.5; if (!p.dead && Math.hypot(p.pos.x - f.pos.x, p.pos.z - f.pos.z) < f.r) game.damagePlayer(f.dmg, f.pos); }
    if (f.t >= f.life) game.fires2.splice(i, 1);
  }
}

// ------------------------------------------------------------------ area entrances (stairs down)
function addEntrance(game, A) {
  const p = new THREE.Vector3(A.at[0], 0, A.at[1]); resolve(p, 2.4); p.y = heightAt(p.x, p.z);
  const col = { mud: 0x8a6a4a, clay: 0x7a4a30, brick: 0x6a5a4a }[A.look];
  const grp = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 1 });
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050302 })); dark.position.y = 0.03; grp.add(dark);
  for (const sx of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 3.2), m); w.position.set(sx, 0.4, 0); w.castShadow = true; grp.add(w); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.4), m); back.position.set(0, 0.75, -1.6); back.castShadow = true; grp.add(back);
  if (A.look === 'brick') { const arch = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.22, 6, 12, Math.PI), m); arch.position.set(0, 1.4, -1.6); grp.add(arch); }
  grp.position.copy(p); game.scene.add(grp);
  colliders.push({ type: 'box', x: p.x, z: p.z - 1.6, hw: 1.5, hd: 0.3, rot: 0 }); buildGrid();
  game.lightPool?.add({ pos: p.clone().add(new THREE.Vector3(0, 1, 0.5)), color: 0xff7a30, power: 6, dist: 6, flicker: 1.2 });
  game.interactables.push({ pos: p, r: 3, label: A.label, act: () => game.zones.enter({ kind: A.id, style: A.style, seed: A.seed, rooms: A.rooms, level: A.level, title: A.title, sub: A.sub, pool: A.pool, bossType: A.bossType, bossName: A.bossName, bossOf: A.id }) });
  game.pois?.push({ x: p.x, z: p.z, icon: A.icon, color: '#c09060' });
}

// ------------------------------------------------------------------ siege engines (mangonels) at the arch
function mangonel() {
  const g = new THREE.Group(), w = mats().wood, rope = new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 1 });
  const box = (sx, sy, sz, x, y, z, m = w, rz = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); b.position.set(x, y, z); b.rotation.z = rz; b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  for (const s of [-0.9, 0.9]) { box(3.2, 0.25, 0.25, 0, 0.12, s); box(0.22, 2.6, 0.22, -0.6, 1.2, s, w, 0.35); box(0.22, 2.6, 0.22, 0.6, 1.2, s, w, -0.35); }
  box(0.25, 0.25, 2.1, 0, 2.35, 0);
  const arm = new THREE.Group(); arm.position.set(0, 2.35, 0); g.add(arm);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 0.18), w); beam.position.x = 1.2; beam.castShadow = true; arm.add(beam);
  const sling = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 4), rope); sling.position.set(3.8, -0.7, 0); arm.add(sling);
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.9 })); pot.position.set(3.8, -1.45, 0); arm.add(pot);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 3), rope); r.position.set(-1.4, -1.1, (i - 2.5) * 0.15); arm.add(r); }
  arm.rotation.z = 0.5;
  g.userData.arm = arm; g.userData.dynamic = true;
  return g;
}
function addEngine(game, x, z, ry) {
  const p = new THREE.Vector3(x, 0, z); resolve(p, 2.5); p.y = heightAt(p.x, p.z);
  const m = mangonel(); m.position.copy(p); m.rotation.y = ry; game.scene.add(m);
  colliders.push({ type: 'circle', x: p.x, z: p.z, r: 1.8 }); buildGrid();
  const E = { pos: p, mesh: m, burnt: false };
  game.engines.push(E);
  game.spawnPack(['naffat', 'spearman'], p.x, p.z + 3, 2, 5, { spread: 3 });
  game.interactables.push({ pos: p, r: 3.4, label: 'Set the engine alight', act: () => burnEngine(game, E) });
  game.pois?.push({ x: p.x, z: p.z, icon: '✕', color: '#d06030' });
}
function burnEngine(game, E, quiet = false) {
  if (E.burnt) return; E.burnt = true;
  game.interactables = game.interactables.filter((i) => i.pos !== E.pos);
  if (quiet) { E.mesh.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.25); } }); return; }
  game.audio.boom?.(); game.shake = 0.4; game.fx.flash(tmp.copy(E.pos).setY(E.pos.y + 2), 0xff7020, 60, 0.6, 16);
  E.mesh.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.25); } });
  game.world.fires.push({ pos: E.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), intensity: 1.4 });
  setTimeout(() => game.world.fires.splice(game.world.fires.findIndex((f) => f.pos.distanceTo(E.pos) < 2), 1), 14000);
  game.decal(E.pos, 5, 'scorch'); unlock(game, 'mangonel');
  const n = game.engines.filter((e) => e.burnt).length, p = game.player;
  if (questState(p, 'engines') === 0) {
    SIDE.engines.steps[0] = SIDE.engines.steps[0].replace(/\(\d\/3\)/, `(${n}/3)`);
    if (n >= 3) setQuest(game, 'engines', 1); else { game.ui.toast(`${t('Engines burned')}: ${n}/3`, 'quest'); game.refreshTracker?.(); }
  } else game.ui.toast(`${t('Engines burned')}: ${n}/3`, 'quest');
  p.enginesBurnt = n;
}

// ------------------------------------------------------------------ Ghassan's final duel (below a quarter of his life)
function tickDuel(game, b, dt) {
  const p = game.player;
  if (!b.duel && b.hp < b.maxHp * 0.25 && !b.st.action) {
    b.duel = true; b.speed *= 1.6; b.lungeCd = 2.5; b.ringT = 0;
    // the shield goes down, the fire ring goes up
    const sh = b.rig.userData.parts?.shield; if (sh) sh.visible = false;
    game.director?.play(SCENES.bossDuel(game, b, (p.enginesBurnt || 0) >= 3));
    b.arena = b.pos.clone();
    // a glowing ring of burning naft marks the duel ground (segments follow the terrain)
    const ring = new THREE.Group(), gm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.9, 0.2), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2, x = b.arena.x + Math.cos(a) * 15, z = b.arena.z + Math.sin(a) * 15;
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.7).rotateX(-Math.PI / 2), gm); seg.position.set(x, heightAt(x, z) + 0.08, z); seg.rotation.y = -a + Math.PI / 2; ring.add(seg);
    }
    game.scene.add(ring); b.ringMesh = ring;
    const prev = b.onDeath; b.onDeath = (e) => { prev?.(e); game.scene.remove(ring); };
    return;
  }
  if (!b.duel) return;
  // fire ring: stepping outside it burns
  b.ringT -= dt;
  if (b.ringT <= 0) {
    b.ringT = 0.05; const R = 15;
    for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28; game.fx.fire(tmp.set(b.arena.x + Math.cos(a) * R, heightAt(b.arena.x + Math.cos(a) * R, b.arena.z + Math.sin(a) * R) + 0.1, b.arena.z + Math.sin(a) * R), 0.9); }
    b.ringMesh.children[0].material.opacity = 0.7 + Math.random() * 0.25;
    if (Math.hypot(p.pos.x - b.arena.x, p.pos.z - b.arena.z) > R) { b.ringHurt = (b.ringHurt || 0) + 0.12; if (b.ringHurt > 0.5) { b.ringHurt = 0; game.damagePlayer(b.dmg * 0.25, b.arena); } }
  }
  // lunge: a telegraphed rush along a line
  b.lungeCd -= dt;
  if (b.lungeCd <= 0 && !b.st.action && !b.lunge) {
    const d = b.pos.distanceTo(p.pos); if (d < 4 || d > 14) return;
    b.lungeCd = 4; const dir = tmp.copy(p.pos).sub(b.pos).setY(0).normalize().clone();
    const end = b.pos.clone().addScaledVector(dir, Math.min(12, d + 2)); end.y = heightAt(end.x, end.z);
    for (let i = 1; i <= 4; i++) { const q = b.pos.clone().lerp(end, i / 4); q.y = heightAt(q.x, q.z); game.telegraph(q, 1.6, 0.7, null); }
    b.lunge = { dir, end, wait: 0.7, hit: false };
  }
  if (b.lunge) {
    const L = b.lunge;
    if (L.wait > 0) { L.wait -= dt; b.moving = false; b.facing = Math.atan2(L.dir.x, L.dir.z); return; }
    b.pos.addScaledVector(L.dir, 26 * dt); resolve(b.pos, b.radius); b.pos.y = heightAt(b.pos.x, b.pos.z);
    if (Math.random() < 0.6) game.fx.dust(b.pos, 3, 1);
    if (!L.hit && b.pos.distanceTo(p.pos) < 2.2) { L.hit = true; game.damagePlayer(b.dmg * 1.2, b.pos, b); game.shake = 0.5; }
    if (b.pos.distanceTo(L.end) < 1 || tmp.copy(L.end).sub(b.pos).dot(L.dir) < 0) { b.lunge = null; game.audio.boom?.(); game.fx.ring(b.pos, new THREE.Color(2, 1.4, 0.8), 0.5, 3, 0.35); }
  }
}

// ------------------------------------------------------------------ helpers
function questItem(id, name, flavor) { return { id: 9100 + id.length, slot: 'amulet', rarity: 'legendary', name, base: 'Quest item', level: 1, stats: {}, questId: id, flavor: `"${flavor}"` }; }
function bagHas(p, id) { return p.bag.some((it) => it?.questId === id); }
function takeItem(p, id) { const i = p.bag.findIndex((it) => it?.questId === id); if (i >= 0) p.bag[i] = null; }
function questMark(rig) {
  const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.3 }));
  mark.position.y = 2.6; rig.add(mark); return mark;
}

// saved progress: captains already slain stay dead, burnt engines stay burnt
export function restoreContent(game) {
  const p = game.player;
  for (const id of Object.keys(p.named || {})) { const e = game.named[id]; if (!e || e.dead) continue; e.dead = true; e.st.dead = true; e.st.deadT = 9; e.hp = 0; e.rig.visible = false; if (e.aura) e.aura.visible = false; }
  const n = p.enginesBurnt || 0; for (let i = 0; i < n && i < game.engines.length; i++) burnEngine(game, game.engines[i], true);
}

// ------------------------------------------------------------------ New Game+
// Keeps the hero (level, gear, disciplines, stash, codex); the world resets, four levels harder per cycle.
export function startNewGamePlus(game) {
  const p = game.player, ng = (game.ng || 0) + 1;
  game.act = 1; game.ng = ng;
  for (const q of game.quests) q.done = false;
  p.side = {}; p.named = {}; p.enginesBurnt = 0;
  saveGame(game);
  try { sessionStorage.setItem('sob.autocontinue', '1'); } catch { /* ignore */ }
  location.reload();
}
export function applyNG(game) {
  const ng = game.ng || 0; if (!ng) return;
  for (const e of game.enemies) { if (e.dead || e.ngScaled) continue; scaleNG(e, ng); }
  const spawn = game.spawnPack.bind(game);
  game.spawnPack = (type, x, z, n, level, opts = {}) => { const out = spawn(type, x, z, n, level, opts); for (const e of out) scaleNG(e, ng); return out; };
  game.ui.toast(`${t('New Game+')} ${ng}: ${t('foes are stronger')}`, 'lvl');
}
function scaleNG(e, ng) {
  e.ngScaled = true; e.level += ng * 4;
  e.maxHp = e.hp = Math.round(e.maxHp * (1 + ng * 1.4)); e.dmg *= 1 + ng * 0.8; e.xp *= 1 + ng;
  e.maxPoise = e.poise = Math.round(e.maxPoise * (1 + ng * 0.5));
}
