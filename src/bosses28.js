// Round 28: one more move for every kind of boss that still fought with its base kit, or one short of the rest.
//   field captains (one per affix, alternating with the affix's own trick):
//     Swift: three dash-cuts down marked lanes. Ironclad: a ground slam ring. Volley: arrow rain on marked spots.
//     Firebrand: a ring of fire with one gap. Rallying: a war cry that calls two men (once). Snaring: a net cast down a
//     marked lane that pins. Reed-born: he drops from sight and strikes from behind a marked ring.
//   dungeon bosses (by the dungeon's style; contracts and trials fought on that ground too):
//     cistern: a sluice of slowing water. lower kilns: the vents ring fire. granary: stacks fall toward Salim.
//     reed warren: a line of burning huts. salt: a burst of salt shards. palace: the tiles burst in two waves.
//     siege mines (Round 31): a lane of roof brought down, the fallen earth left as cover.
//     older grounds: a ground slam.
//   act bosses, last quarter (a third signature, opening the last phase):
//     Bardanes javelins, Kallinikos siphon sweep, Krateros smoke rush, Arsaber flurry.
//   Hamrin masters (holds.js MOVES): Krambonites propfall, Charsianites wallvolley, Pankalos gorgerush, Tatzates threeshafts.
// Every move is told by a callout and a marker on the ground before it lands.
import * as THREE from 'three';
import { resolve, buildGrid } from './collision.js';
import { colliders } from './buildings.js';
import { heightAt } from './terrain.js';
import { t } from './i18n.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();
const dirTo = (a, b) => V(b.x - a.x, 0, b.z - a.z).normalize();
const ground = (q) => { q.y = q.x > 150 ? 0 : heightAt(q.x, q.z); return q; };
const say = (g, e, txt) => { if (!(e.barOn && g.ui.bossCall?.(t(txt)))) g.ui.damageNumber(e.pos, t(txt), 'stagger'); };
const once = (g, key, txt) => { g.m28told ||= {}; if (g.m28told[key] || g.cinematic) return; g.m28told[key] = true; g.ui.toast(t(txt), 'quest'); };
// a lane of marks from a point along a direction (the same marks as Bardanes' charge)
// (onDone rides on the last mark, so it lands on the game clock: a pause holds it)
function laneMarks(g, from, d, len, r, delay, n = Math.max(3, Math.round(len / 2.2)), onDone = null) {
  for (let i = 1; i <= n; i++) { const q = ground(from.clone().addScaledVector(d, len * i / n)); g.telegraph(q, r, delay, i === n ? onDone : null); }
}
const onLane = (p, from, d, len, w) => { const dx = p.x - from.x, dz = p.z - from.z, al = dx * d.x + dz * d.z, sd = Math.abs(dx * d.z - dz * d.x); return al > -0.5 && al < len + 0.5 && sd < w; };
const hurt = (g, e, k, src = e.pos) => { if (!g.player.dead && !(g.player.rollT > 0 && g.player.invuln > 0)) g.damagePlayer(e.dmg * k, src, e); };
const fireAt = (g, q, r, life, dmg) => { g.decal(q, r * 2, 'scorch'); g.fires2.push({ pos: q.clone(), r, life, t: 0, tick: 0, dmg }); };

// ------------------------------------------------------------------ captain and dungeon-boss moves
// each: start(g, e) -> state; tick(g, e, dt, M) -> true when done. While a move runs the foe stands and acts it.
const MOVES = {
  dashcuts: { cd: 9, range: [3, 14], say: 'Blades!',
    start(g, e) { return { t: 0, n: 0, lane: null }; },
    tick(g, e, dt, M) {
      M.t += dt; const p = g.player;
      if (!M.lane) { if (M.n >= 3) return true; const d = dirTo(e.pos, p.pos), len = Math.min(12, e.pos.distanceTo(p.pos) + 3); M.lane = { from: e.pos.clone(), d, len, w: 0, hit: false }; laneMarks(g, e.pos, d, len, 1.2, 0.55, 4); M.t = 0; e.st.action = 'command'; e.facing = Math.atan2(d.x, d.z); }
      const L = M.lane;
      if (M.t < 0.55) return false;
      e.st.action = 'thrust'; e.st.actionT = 0.4; const step = 22 * dt; L.w += step; e.pos.addScaledVector(L.d, step); resolve(e.pos, e.radius); ground(e.pos);
      if (!L.hit && e.pos.distanceTo(p.pos) < 1.7) { L.hit = true; hurt(g, e, 0.8); }
      if (L.w >= L.len) { M.lane = null; M.n++; g.fx.dust(e.pos, 6, 1); }
      return false;
    } },
  slam: { cd: 8, range: [0, 6], say: 'Ground slam!',
    start(g, e) { e.st.action = 'slam'; e.st.actionT = 0; const c = e.pos.clone(); g.telegraph(c, 3.4, 1.05, () => { g.audio.boom?.(); g.shake = Math.max(g.shake, 0.5); g.fx.dust(c, 20, 2.2); g.fx.ring(c, new THREE.Color(2, 1.6, 1.1), 0.5, 3.6, 0.4); if (g.player.pos.distanceTo(c) < 3.4) { hurt(g, e, 1.4, c); g.player.knock = (g.player.knock || V(0, 0, 0)).addScaledVector(dirTo(c, g.player.pos), 10); } }); return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.3); return M.t > 1.4; } },
  rain: { cd: 9, range: [4, 22], say: 'Arrow rain!',
    start(g, e) { e.st.action = 'shoot'; e.st.actionT = 0.2; const p = g.player.pos;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + rand(0, 0.6), r = i ? rand(1.6, 3.8) : 0, q = ground(V(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r));
        g.telegraph(q, 1.5, 1.1 + i * 0.12, () => { g.fx.dust(q, 5, 0.8); g.audio.at?.(q, () => g.audio.whoosh?.()); if (g.player.pos.distanceTo(q) < 1.5) hurt(g, e, 0.55, q); }); }
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; return M.t > 1.0; } },
  firering: { cd: 11, range: [0, 14], say: 'Ring of fire!',
    start(g, e) { e.st.action = 'command'; e.st.actionT = 0; const c = g.player.pos.clone(), gapAt = Math.random() * Math.PI * 2, dmg = e.dmg * 0.3;
      g.m27band?.(c, 2.6, 4.6, 1.4, () => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt))) < 0.5) continue; fireAt(g, ground(V(c.x + Math.cos(a) * 3.6, 0, c.z - Math.sin(a) * 3.6)), 1.2, 4, dmg); } g.audio.boom?.(); }, gapAt, 0.9);
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t); return M.t > 1.2; } },
  warcry: { cd: 99, range: [0, 16], say: 'To me!', once: true,
    start(g, e) { e.st.action = 'command'; e.st.actionT = 0; g.audio.roar?.();
      const kinds = e.guardKinds || ['bandit', 'spearman'], p = g.player.pos;
      for (let i = 0; i < 2; i++) { const a = rand(0, 6.28), m = g.spawnPack(kinds[i % kinds.length], e.pos.x + Math.cos(a) * 3, e.pos.z + Math.sin(a) * 3, 1, Math.max(1, e.level - 1), { spread: 0, interior: !!e.interior })[0]; if (!m) continue; m.alerted = true; m.summoned = true; m.rallyT = 6; m.speed = m.T.speed * 1.25; if (e.interior) { m.interior = true; g.interior?.enemies.push(m); } g.fx.dust(m.pos, 10, 1.2); }
      void p; return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.1); return M.t > 1.2; } },
  netline: { cd: 9, range: [3, 13], say: 'Net!',
    start(g, e) { const d = dirTo(e.pos, g.player.pos), from = e.pos.clone(), len = 13; e.facing = Math.atan2(d.x, d.z); e.st.action = 'throw'; e.st.actionT = 0; laneMarks(g, from, d, len, 1.0, 0.95, 6);
      return { t: 0, d, from, len, done: false }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.1);
      if (!M.done && M.t > 0.95) { M.done = true; g.audio.whoosh?.(); for (let k = 1; k < 6; k++) g.fx.dust(tmp.copy(M.from).addScaledVector(M.d, k * 2.4), 2, 0.6);
        const p = g.player; if (onLane(p.pos, M.from, M.d, M.len, 1.0) && !(p.rollT > 0)) { p.netT = Math.max(p.netT || 0, 1.6); hurt(g, e, 0.4); g.ui.damageNumber(p.pos, t('Pinned'), 'stagger'); } }
      return M.t > 1.2; } },
  reedstrike: { cd: 10, range: [0, 14], say: 'From the reeds!',
    start(g, e) { for (let i = 0; i < 18; i++) g.fx.dust(tmp.set(e.pos.x + rand(-1, 1), e.pos.y, e.pos.z + rand(-1, 1)), 1, 1.2); e.ghost = true; e.rig.visible = false; return { t: 0, ph: 0 }; },
    tick(g, e, dt, M) { M.t += dt; const p = g.player;
      if (M.ph === 0 && M.t > 1.1) { M.ph = 1; const a = (p.facing ?? 0) + Math.PI + rand(-0.5, 0.5); e.pos.set(p.pos.x + Math.sin(a) * 2.2, 0, p.pos.z + Math.cos(a) * 2.2); resolve(e.pos, e.radius); ground(e.pos); e.ghost = false; e.rig.visible = true; e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z); e.st.action = 'slam'; e.st.actionT = 0; M.c = e.pos.clone(); g.telegraph(M.c, 2.6, 0.7, () => { g.fx.dust(M.c, 10, 1.4); if (p.pos.distanceTo(M.c) < 2.6) hurt(g, e, 1.3, M.c); }); g.fx.dust(e.pos, 12, 1.2); }
      if (M.ph === 1) e.st.actionT = Math.min(1, (M.t - 1.1) / 0.8);
      return M.t > 2.0; } },
  // ---- dungeon grounds
  sluice: { cd: 11, range: [0, 18], say: 'Open the sluice!',
    start(g, e) { const p = g.player.pos, a = rand(0, 6.28), d = V(Math.sin(a), 0, Math.cos(a)), from = p.clone().addScaledVector(d, -7); from.y = 0; e.st.action = 'command';
      laneMarks(g, from, d, 14, 1.5, 1.1, 6, () => { if (e.dead || g.cinematic) return; g.m27zone?.('lane', from, { dir: d, len: 14, w: 3.2, life: 5, slow: 0.45 }); g.audio.boom?.(); if (onLane(g.player.pos, from, d, 14, 1.6)) { hurt(g, e, 0.7, from); g.player.knock = (g.player.knock || V(0, 0, 0)).addScaledVector(d, 9); } });
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t); return M.t > 1.2; } },
  vents: { cd: 11, range: [0, 16], say: 'The vents!',
    start(g, e) { e.st.action = 'command'; const c = g.player.pos.clone(), gapAt = Math.random() * Math.PI * 2;
      g.m27band?.(c, 2.4, 5.0, 1.5, () => { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - gapAt), Math.cos(a - gapAt))) < 0.5) continue; fireAt(g, ground(V(c.x + Math.cos(a) * 3.7, 0, c.z - Math.sin(a) * 3.7)), 1.3, 2.4, e.dmg * 0.3); } g.audio.boom?.(); const pp = g.player.pos, dd = Math.hypot(pp.x - c.x, pp.z - c.z), aa = Math.atan2(-(pp.z - c.z), pp.x - c.x); if (dd > 2.4 && dd < 5 && Math.abs(Math.atan2(Math.sin(aa - gapAt), Math.cos(aa - gapAt))) > 0.45) hurt(g, e, 0.9, c); }, gapAt, 0.9);
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t); return M.t > 1.2; } },
  stacks: { cd: 10, range: [0, 16], say: 'Bring the stacks down!',
    start(g, e) { e.st.action = 'command'; const p = g.player.pos, d = dirTo(e.pos, p);
      for (let k = 0; k < 3; k++) { const q = ground(p.clone().addScaledVector(d, (k - 1) * 2.6)); g.telegraph(q, 1.9, 0.9 + k * 0.45, () => { g.fx.dust(q, 16, 1.8); g.audio.boom?.(); g.shake = Math.max(g.shake, 0.35); if (g.player.pos.distanceTo(q) < 1.9) hurt(g, e, 1.0, q); }); }
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t); return M.t > 1.1; } },
  hutfire: { cd: 11, range: [2, 16], say: 'Fire the huts!',
    start(g, e) { e.st.action = 'throw'; e.st.actionT = 0; const d = dirTo(e.pos, g.player.pos), from = e.pos.clone().addScaledVector(d, 1.5); laneMarks(g, from, d, 12, 1.3, 1.0, 6, () => { if (e.dead || g.cinematic) return; for (let k = 1; k <= 6; k++) fireAt(g, ground(from.clone().addScaledVector(d, k * 2)), 1.3, 4.5, e.dmg * 0.3); g.audio.boom?.(); });
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.1); return M.t > 1.2; } },
  saltburst: { cd: 10, range: [0, 7], say: 'Salt in your eyes!',
    start(g, e) { e.st.action = 'slam'; e.st.actionT = 0; const c = e.pos.clone();
      g.m27band?.(c, 0.8, 4.2, 1.1, () => { for (let i = 0; i < 24; i++) g.fx.glow.spawn({ pos: { x: c.x, y: 1, z: c.z }, vel: { x: rand(-6, 6), y: rand(1, 4), z: rand(-6, 6) }, life: 0.6, size: 0.18, size1: 0.04, color: new THREE.Color(3, 3, 2.8), drag: 1 }); g.audio.boom?.();
        if (g.player.pos.distanceTo(c) < 4.2) { hurt(g, e, 0.9, c); g.shake = Math.max(g.shake, 0.3); } });
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.2); return M.t > 1.3; } },
  // Round 31: the siege mines: he fires a prop and a lane of roof comes down; the fallen earth stays a while as cover
  cavein: { cd: 10, range: [2, 15], say: 'Bring down the roof!',
    start(g, e) { e.st.action = 'throw'; e.st.actionT = 0; const d = dirTo(e.pos, g.player.pos), from = e.pos.clone().addScaledVector(d, 1.2), len = 12;
      g.fx.fire(tmp.copy(from).setY(1.4), 0.8);
      laneMarks(g, from, d, len, 1.4, 1.0, 6, () => { if (e.dead || g.cinematic) return;
        g.audio.boom?.(); g.shake = Math.max(g.shake, 0.45);
        for (let k = 1; k <= 6; k++) g.fx.dust(ground(from.clone().addScaledVector(d, len * k / 6)), 12, 1.8);
        if (onLane(g.player.pos, from, d, len, 1.5)) hurt(g, e, 1.1, from);
        // three heaps of fallen earth along the lane: cover for 6 s (interior colliders, gone with the dungeon)
        const I = g.interior?.I; if (!I) return; const mat = (g.m31spoil ||= new THREE.MeshStandardMaterial({ color: 0x45362a, roughness: 1 })), made = [];
        for (const k of [0.3, 0.55, 0.8]) { const q = ground(from.clone().addScaledVector(d, len * k)); if (q.distanceTo(g.player.pos) < 1.3) continue;
          const h = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.0, 0.6, 0.85), mat); h.position.copy(q); h.rotation.y = rand(0, 6); h.castShadow = true; I.group.add(h);
          const c = { type: 'circle', x: q.x, z: q.z, r: 0.9, interior: true }; colliders.push(c); made.push([h, c]); }
        buildGrid();
        g.telegraph(from, 0.01, 6, () => { for (const [h, c] of made) { h.parent?.remove(h); h.geometry.dispose(); const ci = colliders.indexOf(c); if (ci >= 0) colliders.splice(ci, 1); } buildGrid(); });
      });
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.1); return M.t > 1.2; } },
  tiles: { cd: 10, range: [0, 16], say: 'The tiles!',
    start(g, e) { e.st.action = 'command'; const p = g.player.pos.clone();
      for (let w = 0; w < 2; w++) for (const [sx, sz] of w ? [[1, -1], [-1, 1]] : [[1, 1], [-1, -1]]) { const q = ground(V(p.x + sx * 1.6, 0, p.z + sz * 1.6)); g.telegraph(q, 1.7, 0.95 + w * 0.7, () => { g.fx.dust(q, 12, 1.4); g.audio.boom?.(); if (g.player.pos.distanceTo(q) < 1.7) hurt(g, e, 0.9, q); }); }
      return { t: 0 }; },
    tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t); return M.t > 1.1; } },
};
const AFFIX_MOVE = { swift: 'dashcuts', ironclad: 'slam', volley: 'rain', firebrand: 'firering', rally: 'warcry', snare: 'netline', ambush: 'reedstrike' };
const STYLE_MOVE = { mines: 'cavein', cistern: 'sluice', kiln2: 'vents', grainvault: 'stacks', warren: 'hutfire', salt: 'saltburst', palace: 'tiles' };

// the custom AI: a running move is played out here (the base AI is skipped); otherwise a move starts when it is off
// cooldown and Salim is in its range, and the foe's own AI (if any) or the base one runs
function wrapAI(g, e, key) {
  const base = e.T.ai, M0 = MOVES[key];
  e.m28key = key; e.m28cd = 3 + Math.random() * 2;
  e.T = { ...e.T, ai(G, x, dt, dist) {
    if (x !== e) return base ? base(G, x, dt, dist) : undefined;
    if (e.m28 && (e.dead || G.cinematic)) { e.m28 = null; e.ghost = false; e.rig.visible = true; }
    if (e.m28) {
      if (M0.tick(G, e, dt, e.m28)) { e.m28 = null; e.st.action = null; e.atkCd = Math.max(e.atkCd || 0, 0.8); }
      if (e.staggerT > 0 && !e.ghost) { e.m28 = null; e.st.action = null; } // a stagger breaks the move off
      e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend || 0, 0, Math.min(1, dt * 8)); e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; G.animEnemy(e, dt, dist);
      return 'skip';
    }
    e.m28cd -= dt;
    if (e.m28cd <= 0 && e.alerted && !G.player.dead && !(e.staggerT > 0) && !e.st.action && dist >= M0.range[0] && dist <= M0.range[1] && !(M0.once && e.m28used)) {
      e.m28cd = M0.cd * rand(0.9, 1.2); e.m28used = true; say(G, e, M0.say); once(G, e.namedId ? 'm28cap' : 'm28dung', e.namedId ? 'Captains have a second trick now. Watch the ground.' : 'This captain knows his ground. Watch for the marks.');
      e.m28 = M0.start(G, e) || { t: 0 }; e.st.actionT = 0; return 'skip';
    }
    return base ? base(G, x, dt, dist) : undefined;
  } };
}

export function setupBosses28(g) {
  g.m28wrap = (e, key) => wrapAI(g, e, key); // for tests

  // a band material made at load (the band telegraph's program then never compiles in the open field)
  { const m = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.2, 8), new THREE.MeshBasicMaterial({ color: 0xff3010, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); m.position.set(0, -500, 0); g.scene.add(m); }
  // captains and dungeon bosses get their move the first time they are updated
  const upd = g.updateEnemies.bind(g);
  g.updateEnemies = (dt) => {
    for (const e of g.enemies) {
      if (e.dead || e.m28key !== undefined) continue;
      if (e.namedId && e.affix && AFFIX_MOVE[e.affix]) { e.guardKinds = (e.guards || []).map((q) => q.type); wrapAI(g, e, AFFIX_MOVE[e.affix]); }
      else if (e.dboss) wrapAI(g, e, STYLE_MOVE[g.interior?.def?.style || g.interior?.style] || 'slam');
      else e.m28key = null;
    }
    // a boss hidden in his smoke whose move was cut short (a break, a scene) comes back into view
    // (or whose move stopped being ticked: the duel at a quarter of his life and the scenes take over his AI)
    const B = g.boss; if (B?.m28hid && (!B.r25?.sig || g.t - (B.m28tick ?? g.t) > 0.25)) { B.m28hid = false; B.ghost = false; B.rig.visible = true; if (B.r25) B.r25.sig = null; }
    return upd(dt);
  };
  // a scene starting (the duel at a quarter of his life) brings a boss hidden in his smoke back for the camera
  const cine = g.cineTick.bind(g);
  g.cineTick = (dt) => { const B = g.boss; if (B?.m28hid) { B.m28hid = false; B.ghost = false; B.rig.visible = true; if (B.r25) B.r25.sig = null; } return cine(dt); };
  setupActBosses28(g);
}

// ------------------------------------------------------------------ act bosses: a third signature in the last quarter
function setupActBosses28(g) {
  const SIGS = g.SIGS25, KITS = g.KITS25; if (!SIGS || !KITS) return;
  Object.assign(KITS.commander, { sig3: 'javelins' }); Object.assign(KITS.rawh, { sig3: 'siphon' }); Object.assign(KITS.utba, { sig3: 'smokerush' }); Object.assign(KITS.ghanim, { sig3: 'flurry' });
  const callout = (b, txt) => (g.ui.bossCall?.(t(txt)) || g.ui.damageNumber(b.pos, t(txt), 'stagger'));
  // Bardanes: three javelins at Salim, each thrown where he will be (a lead on his running), then the shield comes up
  SIGS.javelins = (b) => {
    const p = g.player; if (b.pos.distanceTo(p.pos) > 20) return null;
    callout(b, 'Javelins!'); b.st.action = 'command'; b.st.actionT = 0; let n = 0, w = 0.4;
    return (dt) => {
      w -= dt; b.facing = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z); if (w > 0) return true;
      if (n >= 3) { b.st.action = null; return false; }
      const lead = p.vel ? tmp.set(p.vel.x, 0, p.vel.z).multiplyScalar(0.7) : tmp.set(0, 0, 0), q = ground(p.pos.clone().add(lead));
      b.st.action = 'throw'; b.st.actionT = 0.3; g.audio.whoosh?.();
      g.telegraph(q, 1.6, 0.75, () => { g.fx.dust(q, 8, 1.2); g.audio.boom?.(); if (p.pos.distanceTo(q) < 1.6) g.damagePlayer(b.dmg * 0.8, q, b); });
      n++; w = 0.55; return true;
    };
  };
  // Kallinikos: the siphon sweeps a fan of liquid fire across the ground in front of him, left to right
  SIGS.siphon = (b) => {
    const p = g.player, d0 = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z); if (b.pos.distanceTo(p.pos) > 16) return null;
    callout(b, 'The siphon!'); b.st.action = 'command'; b.st.actionT = 0; let k = 0, w = 0.6; const from = b.pos.clone();
    return (dt) => {
      w -= dt; if (w > 0) return true; if (k >= 6) { b.st.action = null; return false; }
      const a = d0 - 0.75 + k * 0.3, d = V(Math.sin(a), 0, Math.cos(a)); b.facing = a; b.st.action = 'throw'; b.st.actionT = 0.4;
      const kk = k; laneMarks(g, from, d, 10, 1.1, 0.7, 4, () => { if (b.dead || g.cinematic) return; for (let i = 1; i <= 4; i++) fireAt(g, ground(from.clone().addScaledVector(d, i * 2.5)), 1.15, 4.5 - kk * 0.3, b.dmg * 0.22); if (onLane(p.pos, from, d, 10, 1.1)) g.damagePlayer(b.dmg * 0.5, from, b); });
      k++; w = 0.32; return true;
    };
  };
  // Krateros: a smoke pot at his feet; out of the smoke he comes at Salim's back, the blow marked a breath before
  SIGS.smokerush = (b) => {
    const p = g.player; callout(b, 'Behind you!'); let ph = 0, tt = 0, c = null;
    for (let i = 0; i < 24; i++) g.fx.smoke.spawn({ pos: { x: b.pos.x + rand(-1.2, 1.2), y: b.pos.y + rand(0, 1.6), z: b.pos.z + rand(-1.2, 1.2) }, vel: { x: rand(-0.4, 0.4), y: 0.6, z: rand(-0.4, 0.4) }, life: 2.2, size: 1, size1: 3, color: new THREE.Color(0.5, 0.48, 0.45), alpha: 0.6, drag: 0.5 });
    return (dt) => {
      tt += dt; b.m28tick = g.t;
      if (ph === 0 && tt > 0.6) { ph = 1; b.rig.visible = false; b.ghost = true; b.m28hid = true; }
      if (ph === 1 && tt > 1.4) { ph = 2; const a = (p.facing ?? 0) + Math.PI; b.pos.set(p.pos.x + Math.sin(a) * 2.4, 0, p.pos.z + Math.cos(a) * 2.4); resolve(b.pos, b.radius); ground(b.pos); b.rig.visible = true; b.ghost = false; b.m28hid = false; b.facing = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z); b.st.action = 'slam'; b.st.actionT = 0.1; c = b.pos.clone().addScaledVector(dirTo(b.pos, p.pos), 1.2);
        g.telegraph(c, 2.4, 0.65, () => { g.fx.dust(c, 12, 1.6); g.audio.boom?.(); if (p.pos.distanceTo(c) < 2.4) g.damagePlayer(b.dmg * 1.3, c, b); }); }
      if (ph === 2) { b.st.actionT = Math.min(1, 0.1 + (tt - 1.4) / 0.8); if (tt > 2.3) { b.st.action = null; return false; } }
      return true;
    };
  };
  // Arsaber: a flurry of five thrusts, stepping in; only the last glints, and only it can be parried
  SIGS.flurry = (b) => {
    if (b.pos.distanceTo(g.player.pos) > 6 || !g.startCombo25) return null;
    callout(b, 'Flurry!');
    g.startCombo25(b, [['thrust', 0.42, 0.5, 3.9, 0.45], ['thrustHigh', 0.42, 0.5, 3.9, 0.45], ['thrust', 0.42, 0.5, 4.0, 0.45], ['thrustHigh', 0.42, 0.5, 4.0, 0.45], ['sweep', 0.95, 0.6, 3.6, 1.2, 'arc']]);
    return null;
  };
  // the selector: under a quarter of his life the boss opens with the new move, then cycles new, second, new, first
  g.pickSig28 = (b, R) => {
    if (!(R.K.sig3 && b.hp < b.maxHp * 0.3)) return null;
    if (!R.p3) { R.p3 = true; R.n3 = 0; once(g, 'p3' + b.type, 'His last stand: watch for a new move.'); }
    return [R.K.sig3, R.K.sig2 || R.K.sig, R.K.sig3, R.K.sig][R.n3++ % 4];
  };
}

// ------------------------------------------------------------------ Hamrin masters (merged into holds.js MOVES)
export function makeMoves28({ lineTele, inLine }) {
  const tk = (dur) => (g, e, dt, M) => { M.t += dt; e.st.actionT = Math.min(1, M.t / dur); return M.t >= dur; };
  const call = (g, e, txt) => say(g, e, txt);
  return {
    // Krambonites: "Pull the props!": the gallery roof comes down in a ring round Salim, with one way out
    propfall: { range: [0, 30], cd: 11, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; call(g, e, 'Pull the props!'); const c = g.player.pos.clone().setY(0), gapAt = Math.random() * Math.PI * 2;
        g.m27band?.(c, 2.2, 5.2, 1.5, () => { g.audio.boom?.(); g.shake = Math.max(g.shake, 0.5); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fx.dust(V(c.x + Math.cos(a) * 3.7, 0, c.z - Math.sin(a) * 3.7), 6, 1.6); }
          const pp = g.player.pos, dd = Math.hypot(pp.x - c.x, pp.z - c.z), aa = Math.atan2(-(pp.z - c.z), pp.x - c.x); if (dd > 2.2 && dd < 5.2 && Math.abs(Math.atan2(Math.sin(aa - gapAt), Math.cos(aa - gapAt))) > 0.45) g.damagePlayer(e.dmg * 1.3, c, e); }, gapAt, 0.9); },
      tick: tk(1.3) },
    // Charsianites: "Loose!": the archers on the wall rake a fan of marked ground in front of him
    wallvolley: { range: [3, 30], cd: 10, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; call(g, e, 'Loose!'); const d0 = Math.atan2(g.player.pos.x - e.pos.x, g.player.pos.z - e.pos.z);
        for (let i = 0; i < 9; i++) { const a = d0 + rand(-0.5, 0.5), r = rand(3, 11), q = V(e.pos.x + Math.sin(a) * r, 0, e.pos.z + Math.cos(a) * r); if (g.holdWalk && !g.holdWalk(q)) continue;
          g.telegraph(q, 1.5, 1.1 + i * 0.08, () => { g.fx.dust(q, 4, 0.8); if (g.player.pos.distanceTo(q) < 1.5) g.damagePlayer(e.dmg * 0.6, q, e); }); }
        const q0 = g.player.pos.clone().setY(0); g.telegraph(q0, 1.5, 1.2, () => { if (g.player.pos.distanceTo(q0) < 1.5) g.damagePlayer(e.dmg * 0.6, q0, e); }); },
      tick: tk(1.2) },
    // Pankalos: down a marked lane at a run with the spear levelled, through Salim and on
    gorgerush: { range: [4, 20], cd: 9, start(g, e) { const d = dirTo(e.pos, g.player.pos), from = e.pos.clone().setY(0), len = Math.min(18, e.pos.distanceTo(g.player.pos) + 5); e.facing = Math.atan2(d.x, d.z); e.st.action = 'command'; e.mv = { t: 0, d, from, len, run: 0, hit: false }; call(g, e, 'The gorge path!');
        lineTele(g, from, d, len, 2.2, 0.9, () => {}); },
      tick(g, e, dt, M) { M.t += dt; if (M.t < 0.9) { e.st.actionT = M.t / 0.9; return false; }
        e.st.action = 'thrust'; e.st.actionT = 0.4; const s = 20 * dt; M.run += s; e.pos.addScaledVector(M.d, s); resolve(e.pos, e.radius); e.pos.y = 0; if (Math.random() < 0.6) g.fx.dust(e.pos, 2, 0.9);
        if (!M.hit && inLine(g.player.pos, { from: M.from, dir: M.d, len: M.run, w: 2.2 }) && g.player.pos.distanceTo(e.pos) < 2) { M.hit = true; g.damagePlayer(e.dmg * 1.4, e.pos, e); g.player.knock = (g.player.knock || V(0, 0, 0)).addScaledVector(M.d, 12); }
        return M.run >= M.len; } },
    // Tatzates: three shafts down three marked lines that cross where Salim stands
    threeshafts: { range: [4, 30], cd: 10, start(g, e) { e.st.action = 'shoot'; call(g, e, 'Three shafts'); const p = g.player.pos.clone().setY(0), a0 = Math.random() * Math.PI; e.mv = { t: 0, n: 0, p, a0 }; },
      // the three lines are laid one after another on the move's own clock (a pause holds them)
      tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.6);
        while (M.n < 3 && M.t >= M.n * 0.42) { const a = M.a0 + M.n * Math.PI / 3, d = V(Math.sin(a), 0, Math.cos(a)), from = M.p.clone().addScaledVector(d, -12), H = { from, dir: d, len: 24, w: 1.2 }; M.n++;
          lineTele(g, from, d, 24, 1.2, 0.85, () => { g.audio.whoosh?.(); for (let i = 0; i < 8; i++) g.fx.glow.spawn({ pos: { x: from.x + d.x * i * 3, y: 1.3, z: from.z + d.z * i * 3 }, life: 0.3, size: 0.3, size1: 0.05, color: new THREE.Color(3, 2.6, 2) }); if (inLine(g.player.pos, H)) g.damagePlayer(e.dmg * 0.9, from, e); }); }
        return M.t >= 1.6; } },
  };
}
