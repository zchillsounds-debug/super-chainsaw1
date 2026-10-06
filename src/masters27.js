// Round 27: a phase-two move for each of the sixteen story-hold masters (the captain halfway and the lieutenant of the
// eight holds in storyholds.js). Merged into holds.js MOVES by makeMoves27(), which hands over the telegraph helpers.
//   the Sawad:    Lalakon sluice, Photeinos bandon, Bryennios bellows, Olbianos chainsweep
//   the marshes:  Kourkouas causeway, Katakylas reedfire, Tzantzes hooks, Petronas polesweep
//   al-Karkh:     Mousele roofs, Narses testudo (holds.js, Round 26), Gongylios crossfire, Kalokyros embertrail
//   the quays:    Aetios slipway, Rhentakios cargonet, Monomachos chainpull, Skleros feintstrike
// Every move is told by a callout over the master and a marker on the ground before it lands.
import * as THREE from 'three';
import { resolve } from './collision.js';
import { t } from './i18n.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();
const toward = (e, p) => V(p.x - e.pos.x, 0, p.z - e.pos.z).normalize();
const say = (g, e, txt) => { if (!(e.barOn && g.ui.bossCall?.(t(txt)))) g.ui.damageNumber(e.pos, t(txt), 'stagger'); };
const once = (g, key, txt) => { g.m27told ||= {}; if (g.m27told[key] || g.cinematic) return; g.m27told[key] = true; g.ui.toast(t(txt), 'quest'); };
const done = (dur) => (g, e, dt, M) => { M.t += dt; e.st.actionT = Math.min(1, M.t / dur); return M.t >= dur; };

// pooled meshes for the lasting ground (made once by setupMasters27): water and mud that slow, the fire ring band with
// its gap, the chain's reach, and the log down the slipway
export function setupMasters27(g) {
  const add = (geo, color, opacity, additive = false) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !additive, side: THREE.DoubleSide })); m.visible = false; m.renderOrder = 2; g.scene.add(m); return m; };
  const Z = (g.m27 = { zones: [], bands: [], log: null });
  for (let i = 0; i < 6; i++) Z.zones.push({ m: add(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), 0x3a5a62, 0.55), disc: add(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), 0x3b2e1e, 0.75), life: 0 });
  for (let i = 0; i < 4; i++) Z.bands.push({ m: null, life: 0 });
  // a log: a peeled trunk with two iron bands
  const log = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.85 }), iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.5, metalness: 0.6 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 2.6, 12).rotateZ(Math.PI / 2), wood); trunk.castShadow = true; log.add(trunk);
  for (const x of [-0.8, 0.8]) log.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.12, 12).rotateZ(Math.PI / 2).translate(x, 0, 0), iron));
  for (const x of [-1.31, 1.31]) log.add(new THREE.Mesh(new THREE.CircleGeometry(0.55, 12).rotateY(Math.PI / 2).translate(x, 0, 0), new THREE.MeshStandardMaterial({ color: 0xc8a676, roughness: 0.9, side: THREE.DoubleSide })));
  log.visible = false; g.scene.add(log); Z.log = { m: log, on: false };
  const bandMat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.22, 0.05), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  // a band telegraph: from inner to outer radius, with an optional gap (the way out), filling in until it lands
  g.m27band = (c, inner, outer, delay, onDone, gapAt = null, gap = 0) => {
    const geo = new THREE.RingGeometry(inner, outer, 56, 1, gapAt === null ? 0 : gapAt + gap / 2, Math.PI * 2 - (gapAt === null ? 0 : gap)).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, bandMat()); m.position.set(c.x, 0.09, c.z); m.renderOrder = 3; g.scene.add(m);
    g.hazards.push({ kind: 'm27band', mesh: m, t: 0, life: delay, onDone });
  };
  // slowing ground: a lane of water (sluice) or a patch of mud (causeway)
  g.m27zone = (kind, at, o) => {
    const z = Z.zones.find((q) => q.life <= 0) || Z.zones[0]; z.kind = kind; z.life = o.life; z.t = 0; z.at = at.clone(); z.o = o; z.tick = 0;
    if (kind === 'lane') { z.m.visible = true; z.disc.visible = false; z.m.position.set(at.x + o.dir.x * o.len / 2, 0.05, at.z + o.dir.z * o.len / 2); z.m.rotation.set(0, Math.atan2(o.dir.x, o.dir.z), 0); z.m.scale.set(o.w, 1, o.len); }
    else { z.disc.visible = true; z.m.visible = false; z.disc.position.set(at.x, 0.05, at.z); z.disc.scale.setScalar(o.r); }
  };
  const prev = g.tickExtra;
  g.tickExtra = (dt) => {
    prev?.(dt);
    const p = g.player;
    // band telegraphs (held in g.hazards, whose loop in game.js advances their clocks)
    for (let i = g.hazards.length - 1; i >= 0; i--) { const H = g.hazards[i]; if (H.kind !== 'm27band') continue; const k = H.t / H.life; H.mesh.material.opacity = 0.3 + 0.55 * k * (0.75 + 0.25 * Math.sin(H.t * 22));
      if (k >= 1) { g.scene.remove(H.mesh); H.mesh.geometry.dispose(); H.mesh.material.dispose(); g.hazards.splice(i, 1); if (!g.cinematic) H.onDone?.(); } }
    for (const z of Z.zones) { if (z.life <= 0) continue; z.life -= dt; z.t += dt;
      const fade = Math.min(1, z.life / 0.8, z.t / 0.3); (z.kind === 'lane' ? z.m : z.disc).material.opacity = (z.kind === 'lane' ? 0.55 : 0.75) * fade;
      if (z.life <= 0) { z.m.visible = z.disc.visible = false; continue; }
      if (p.dead || g.cinematic) continue;
      let inside = false;
      if (z.kind === 'lane') { const dx = p.pos.x - z.at.x, dz = p.pos.z - z.at.z, al = dx * z.o.dir.x + dz * z.o.dir.z, sd = Math.abs(dx * z.o.dir.z - dz * z.o.dir.x); inside = al > 0 && al < z.o.len && sd < z.o.w / 2; }
      else inside = Math.hypot(p.pos.x - z.at.x, p.pos.z - z.at.z) < z.o.r;
      if (inside) { g.hazSlowK = Math.min(g.hazSlowK ?? 1, z.o.slow); if (z.o.dmg && (z.tick -= dt) <= 0) { z.tick = 0.6; g.damagePlayer(z.o.dmg, z.at); }
        if (Math.random() < 0.25) g.fx.dust(p.pos, 1, 0.5); }
    }
    // the log rolling down the slipway
    const L = Z.log; if (L.on) { L.t += dt; const k = L.t / L.dur; L.m.position.copy(L.from).addScaledVector(L.dir, k * L.len).setY(0.6); L.spin += dt * 10; L.m.rotation.set(0, Math.atan2(L.dir.x, L.dir.z) + Math.PI / 2, 0); L.m.rotateX(L.spin);
      if (!L.hit && !p.dead && Math.hypot(p.pos.x - L.m.position.x, p.pos.z - L.m.position.z) < 1.5 && !(p.rollT > 0)) { L.hit = true; g.damagePlayer(L.dmg, L.m.position); p.knock = (p.knock || new THREE.Vector3()).addScaledVector(L.dir, 16); }
      if (Math.random() < 0.5) g.fx.dust(L.m.position.clone().setY(0), 2, 0.7);
      if (k >= 1) { L.on = false; L.m.visible = false; g.fx.dust(L.m.position.clone().setY(0), 14, 1.4); g.audio.boom?.(); } }
  };
  // a hold reset or leaving the hold clears what is still lying about
  g.m27clear = () => { for (const z of Z.zones) { z.life = 0; z.m.visible = z.disc.visible = false; } Z.log.on = false; Z.log.m.visible = false;
    for (let i = g.hazards.length - 1; i >= 0; i--) if (g.hazards[i].kind === 'm27band') { g.scene.remove(g.hazards[i].mesh); g.hazards.splice(i, 1); } };
}

export function makeMoves27({ lineTele, inLine }) {
  return {
    // Lalakon, keeper of the sluices: a gate opened upstream; a wide lane of water bursts across Salim's ground, throws
    // him along it, and leaves the floor flooded (slow) for a while
    sluice: { range: [0, 26], cd: 10, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; const p = g.player.pos, a = Math.random() * Math.PI * 2, d = V(Math.sin(a), 0, Math.cos(a)), from = p.clone().addScaledVector(d, -12).setY(0);
        say(g, e, 'Open the sluice!'); once(g, 'sluice', 'Water comes down the marked lane: step out of it');
        lineTele(g, from, d, 24, 5, 1.3, () => { const H = { from, dir: d, len: 24, w: 5 };
          for (let k = 0; k < 12; k++) g.fx.burst(tmp.copy(from).addScaledVector(d, k * 2).setY(0.3), 6, { speed: 4, life: 0.7, size: 0.4, size1: 0.1, color: new THREE.Color(0.75, 0.85, 0.9), up: 4, drag: 1 });
          g.audio.boom?.(); g.shake = Math.max(g.shake, 0.35);
          if (inLine(g.player.pos, H)) { g.damagePlayer(e.dmg * 0.9, from); g.player.knock = (g.player.knock || new THREE.Vector3()).addScaledVector(d, 15); }
          g.m27zone('lane', from, { dir: d, len: 24, w: 5, life: 5, slow: 0.55 }); }); },
      tick: done(1.3) },
    // Photeinos: his bandon goes up, and his men rally to it (the Round 26 standard-bearer); cut the bearer down to end it
    bandon: { range: [0, 30], cd: 99, once: true, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; say(g, e, 'Raise the standard!');
        const p = g.player.pos, back = toward(e, p).multiplyScalar(-3), at = e.pos.clone().add(back);
        const lv = Math.max(1, e.level - 2), men = [...g.spawnPack('standard', at.x, at.z, 1, lv, { spread: 1, interior: true }), ...g.spawnPack('bandit', at.x, at.z, 2, lv, { spread: 3, interior: true })];
        for (const m of men) { m.alerted = true; m.interior = true; m.summoned = true; m.pos.y = 0; g.interior?.enemies.push(m); g.fx.dust(m.pos, 10, 1.2); }
        once(g, 'bandon', 'A standard rallies his men: cut him down first'); g.audio.roar?.(); },
      tick: done(1.4) },
    // Bryennios, stoker of the kilns: the bellows: a cone of sparks in front, then the floor vents burst in a ring round him
    bellows: { range: [0, 9], cd: 9, start(g, e) { const d = toward(e, g.player.pos); e.facing = Math.atan2(d.x, d.z); e.st.action = 'throw'; e.mv = { t: 0 }; say(g, e, 'Work the bellows!');
        const from = e.pos.clone().setY(0).addScaledVector(d, 0.8);
        lineTele(g, from, d, 7.5, 4.2, 0.8, () => { const H = { from, dir: d, len: 7.5, w: 4.2 };
          for (let k = 0; k < 4; k++) g.fx.burst(tmp.copy(from).addScaledVector(d, 1 + k * 1.8).setY(1), 14, { speed: 5, life: 0.6, size: 0.3, size1: 0.05, color: new THREE.Color(3, 1.3, 0.35), up: 2, drag: 1.5 });
          g.audio.whoosh?.(); if (inLine(g.player.pos, H)) g.damagePlayer(e.dmg * 1.1, e.pos); });
        const c = e.pos.clone().setY(0);
        g.m27band(c, 3.2, 5.6, 1.6, () => { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, q = V(c.x + Math.sin(a) * 4.4, 0, c.z + Math.cos(a) * 4.4); if (g.holdWalk(q)) g.fires2.push({ pos: q, r: 1.3, life: 1.6, t: 0, tick: 0, dmg: e.dmg * 0.35 }); }
          g.audio.boom?.(); const dd = Math.hypot(g.player.pos.x - c.x, g.player.pos.z - c.z); if (dd > 3.2 && dd < 5.6) g.damagePlayer(e.dmg * 0.9, c); }); },
      tick: done(1.6) },
    // Olbianos: the hook's chain swung round him at full length: the band from 3 m out to 7.5 m is struck; close in, or keep off
    chainsweep: { range: [0, 9], cd: 8, start(g, e) { e.st.action = 'sweep'; e.mv = { t: 0 }; say(g, e, 'The chain!'); once(g, 'chainsweep', 'The chain sweeps wide: step in close to him, or stay out of reach');
        const c = e.pos.clone().setY(0);
        g.m27band(c, 3, 7.5, 1.1, () => { g.audio.whoosh?.(); g.audio.clang?.(); g.fx.ring(c, new THREE.Color(2, 1.7, 1.2), 3, 7.5, 0.4); const p = g.player, dd = Math.hypot(p.pos.x - c.x, p.pos.z - c.z);
          if (dd > 3 && dd < 7.7 && !(p.rollT > 0)) { g.damagePlayer(e.dmg * 1.3, c); p.knock = (p.knock || new THREE.Vector3()).addScaledVector(V(p.pos.x - c.x, 0, p.pos.z - c.z).normalize(), 14); } }); },
      tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.4); e.facing += dt * 6; return M.t >= 1.4; } },
    // Kourkouas, warden of the causeways: he breaks the causeway under Salim: marked patches give way to mud that holds his feet
    causeway: { range: [0, 22], cd: 9, start(g, e) { e.st.action = 'slam'; e.mv = { t: 0 }; say(g, e, 'Break the causeway!'); const p = g.player.pos;
        for (let i = 0; i < 3; i++) { const q = V(p.x + (i ? rand(-4.5, 4.5) : 0), 0, p.z + (i ? rand(-4.5, 4.5) : 0)); if (!g.holdWalk(q)) continue;
          g.telegraph(q, 2.6, 1.0 + i * 0.2, () => { g.fx.dust(q, 16, 1.6); g.audio.boom?.(); if (Math.hypot(g.player.pos.x - q.x, g.player.pos.z - q.z) < 2.6) g.damagePlayer(e.dmg * 0.7, q); g.m27zone('mud', q, { r: 2.6, life: 5.5, slow: 0.4 }); }); }
        once(g, 'causeway', 'The causeway breaks into mud: it holds your feet'); },
      tick: done(1.3) },
    // Katakylas: the reed stockade set alight: three rings of fire close in on Salim, each with the same gap: walk out by it
    reedfire: { range: [0, 30], cd: 14, start(g, e) { e.st.action = 'command'; e.mv = { t: 0, n: 0, c: g.player.pos.clone().setY(0), gapAt: Math.random() * Math.PI * 2 }; say(g, e, 'Fire the reeds!'); once(g, 'reedfire', 'The fire closes in: find the gap and walk out through it'); },
      tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.4); const gap = 1.1, c = M.c;
        if (M.n < 3 && M.t >= M.n * 0.9) { const R = [8.5, 6, 3.6][M.n], w = M.n++;
          g.m27band(c, R - 1.1, R + 0.4, 1.0, () => {
            const n = Math.round(R * 2.4); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, da = Math.abs(((a - M.gapAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da < gap / 2 + 0.12) continue;
              const q = V(c.x + Math.cos(a) * (R - 0.35), 0, c.z - Math.sin(a) * (R - 0.35)); if (g.holdWalk(q)) g.fires2.push({ pos: q, r: 1.2, life: 4.2 - w * 0.6, t: 0, tick: 0, dmg: e.dmg * 0.3 }); }
            g.audio.boom?.(); }, M.gapAt, gap); }
        return M.t >= 2.0; } },
    // Tzantzes, captain of the marines: boarding hooks thrown down a lane; caught, Salim is dragged to him
    hooks: { range: [3, 16], cd: 9, start(g, e) { const d = toward(e, g.player.pos), from = e.pos.clone().setY(0); e.facing = Math.atan2(d.x, d.z); e.st.action = 'throw'; e.mv = { t: 0 }; say(g, e, 'Boarding hooks!');
        lineTele(g, from, d, 15, 2.4, 0.95, () => { const H = { from, dir: d, len: 15, w: 2.4 }; g.audio.whoosh?.(); for (let k = 0; k < 6; k++) g.fx.dust(tmp.copy(from).addScaledVector(d, 2 + k * 2.2), 2, 0.6);
          const p = g.player; if (inLine(p.pos, H) && !(p.rollT > 0)) { g.damagePlayer(e.dmg * 0.6, e.pos); g.audio.clang?.(); const back = V(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z), l = back.length(); if (l > 2.2) p.knock = (p.knock || new THREE.Vector3()).addScaledVector(back.normalize(), Math.min(24, l * 2.6)); p.st.hitT = 0.4; e.cds.swing = 0; once(g, 'hooks', 'Hooked! Evade through the lane to slip the hooks'); } }); },
      tick: done(1.2) },
    // Petronas, keeper of the boats: a boat pole swept round him, then driven out in a long jab
    polesweep: { range: [0, 9], cd: 8, start(g, e) { e.st.action = 'sweep'; e.mv = { t: 0, jab: false }; say(g, e, 'The pole!');
        g.telegraph(e.pos.clone(), 4.2, 0.7, () => { const p = g.player; g.audio.at(e.pos, () => g.audio.swing?.()); if (p.pos.distanceTo(e.pos) < 4.4) { g.damagePlayer(e.dmg * 1.0, e.pos, e); p.knock = (p.knock || new THREE.Vector3()).addScaledVector(V(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z).normalize(), 12); } }); },
      tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 0.9);
        if (!M.jab && M.t > 0.9) { M.jab = true; const d = toward(e, g.player.pos), from = e.pos.clone().setY(0); e.facing = Math.atan2(d.x, d.z); e.st.action = 'thrust'; e.st.actionT = 0;
          lineTele(g, from, d, 12, 1.6, 0.6, () => { if (inLine(g.player.pos, { from, dir: d, len: 12, w: 1.6 })) g.damagePlayer(e.dmg * 1.3, e.pos, e); g.audio.whoosh?.(); }); }
        return M.t >= 2.0; } },
    // Mousele, captain of the burned lanes: the roofs come down: three collapses walk toward Salim, one after another
    roofs: { range: [0, 20], cd: 9, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; say(g, e, 'Bring the roofs down!'); const p = g.player.pos, d = toward(e, p), dist = e.pos.distanceTo(p);
        for (let i = 0; i < 3; i++) { const q = e.pos.clone().setY(0).addScaledVector(d, Math.max(2.5, dist - 4 + i * 3.2)); if (!g.holdWalk(q)) continue;
          g.telegraph(q, 2.5, 0.9 + i * 0.45, () => { g.audio.boom?.(); g.shake = Math.max(g.shake, 0.45); g.fx.dust(q, 22, 2); g.fx.burst(tmp.copy(q).setY(2.5), 10, { speed: 2, life: 0.9, size: 0.25, size1: 0.1, color: new THREE.Color(2.4, 1.0, 0.3), up: -2, drag: 0.5 }); g.decal(q, 3.5, 'scorch'); if (Math.hypot(g.player.pos.x - q.x, g.player.pos.z - q.z) < 2.6) g.damagePlayer(e.dmg * 1.25, q); }); } },
      tick: done(1.4) },
    // Gongylios, keeper of the store-rooms: his crossbowmen shoot down three lanes across Salim, a beat apart
    crossfire: { range: [0, 26], cd: 10, start(g, e) { e.st.action = 'command'; e.mv = { t: 0, n: 0, a0: Math.random() * Math.PI }; say(g, e, 'Crossfire!'); },
      tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 1.2);
        if (M.n < 3 && M.t >= M.n * 0.6) { const p = g.player.pos, a = M.a0 + M.n++ * Math.PI / 3, d = V(Math.sin(a), 0, Math.cos(a)), from = p.clone().addScaledVector(d, -12).setY(0);
          lineTele(g, from, d, 24, 1.5, 0.85, () => { g.audio.whoosh?.(); for (let k = 0; k < 8; k++) g.fx.glow.spawn({ pos: { x: from.x + d.x * k * 3, y: 1.2, z: from.z + d.z * k * 3 }, life: 0.25, size: 0.3, size1: 0.05, color: new THREE.Color(2.6, 2.2, 1.6) }); if (inLine(g.player.pos, { from, dir: d, len: 24, w: 1.5 })) g.damagePlayer(e.dmg * 0.85, from); }); }
        return M.t >= 2.1; } },
    // Kalokyros: a naft pot that breaks and spills a trail of fire that follows Salim for three seconds
    embertrail: { range: [0, 18], cd: 11, start(g, e) { e.st.action = 'throw'; e.mv = { t: 0, n: 0, trail: [] }; say(g, e, 'Burn where he walks!'); once(g, 'embertrail', 'The fire follows you: keep moving'); },
      tick(g, e, dt, M) { M.t += dt; e.st.actionT = Math.min(1, M.t / 0.8); M.trail.push(g.player.pos.clone().setY(0));
        if (M.t > 0.5 + M.n * 0.34 && M.n < 9) { M.n++; const q = M.trail[Math.max(0, M.trail.length - 8)].clone(); if (g.holdWalk(q)) g.telegraph(q, 1.6, 0.55, () => { g.decal(q, 2.8, 'scorch'); g.fires2.push({ pos: q, r: 1.6, life: 3, t: 0, tick: 0, dmg: e.dmg * 0.35 }); g.audio.at(q, () => g.audio.boom?.()); }); }
        return M.t >= 3.8; } },
    // Aetios, master of the slips: a log let go down the slipway: the lane is marked, then the log rolls down it
    slipway: { range: [0, 26], cd: 9, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; say(g, e, 'Let the log go!'); const p = g.player.pos, a = Math.random() * Math.PI * 2, d = V(Math.sin(a), 0, Math.cos(a)), from = p.clone().addScaledVector(d, -13).setY(0);
        lineTele(g, from, d, 26, 2.6, 1.1, () => { const L = g.m27.log; Object.assign(L, { on: true, t: 0, dur: 1.3, from, dir: d, len: 26, hit: false, spin: 0, dmg: e.dmg * 1.4 }); L.m.visible = true; g.audio.boom?.(); }); },
      tick: done(1.3) },
    // Rhentakios: a cargo net dropped from the crane onto Salim: it pins him unless he evades out of the marked ring
    cargonet: { range: [0, 22], cd: 10, start(g, e) { e.st.action = 'command'; e.mv = { t: 0 }; say(g, e, 'Drop the net!'); const q = g.player.pos.clone().setY(0);
        g.telegraph(q, 2.4, 1.1, () => { const p = g.player; g.fx.dust(q, 12, 1.4); g.audio.boom?.(); if (Math.hypot(p.pos.x - q.x, p.pos.z - q.z) < 2.4 && !(p.rollT > 0)) { g.damagePlayer(e.dmg * 0.5, q); p.netT = 1.7; p.netPos = p.pos.clone(); once(g, 'cargonet', 'Netted! Evade to cut yourself free'); } }); },
      tick: done(1.2) },
    // Monomachos, keeper of the moorings: a mooring chain swung in an arc: caught in it, Salim is pulled to his feet
    chainpull: { range: [2, 7], cd: 8, start(g, e) { const d = toward(e, g.player.pos); e.facing = Math.atan2(d.x, d.z); e.st.action = 'throwSide'; e.mv = { t: 0 }; say(g, e, 'The mooring chain!');
        const c = e.pos.clone().setY(0), a = Math.atan2(d.x, d.z);
        g.m27band(c, 1.8, 7, 0.95, () => { const p = g.player, dx = p.pos.x - c.x, dz = p.pos.z - c.z, dd = Math.hypot(dx, dz); let da = Math.abs(Math.atan2(dx, dz) - a); if (da > Math.PI) da = Math.PI * 2 - da; g.audio.clang?.(); g.audio.whoosh?.();
          if (dd > 1.8 && dd < 7.2 && da < 1.15 && !(p.rollT > 0)) { g.damagePlayer(e.dmg * 0.8, c); p.knock = (p.knock || new THREE.Vector3()).addScaledVector(V(-dx, 0, -dz).normalize(), Math.min(22, dd * 3)); p.st.hitT = 0.4; e.cds.swing = 0; } },
          // the band is drawn as the arc in front of him: the gap is the rest of the circle
          a + Math.PI / 2, Math.PI * 2 - 2.3); },
      tick: done(1.2) },
    // Skleros: the boathook feint: a first glint with no blow behind it, then the real, wider blow on the second glint
    feintstrike: { range: [0, 4.2], cd: 7, start(g, e) { e.st.action = 'attack'; e.mv = { t: 0, g1: false, g2: false, hit: false }; say(g, e, 'Feint!'); },
      tick(g, e, dt, M) { M.t += dt; const p = g.player; e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        if (!M.g1 && M.t > 0.1) { M.g1 = true; g.telegraphTell(e); once(g, 'feintstrike', 'A feint: wait for the second glint'); }
        e.st.actionT = M.t < 0.6 ? M.t / 0.6 * 0.35 : M.t < 0.95 ? 0.35 - (M.t - 0.6) * 0.5 : Math.min(1, 0.18 + (M.t - 0.95) / 0.9);
        if (!M.g2 && M.t > 0.95) { M.g2 = true; g.telegraphTell(e); g.audio.at(e.pos, () => g.audio.swing?.()); }
        if (!M.hit && M.t > 1.45) { M.hit = true; if (p.pos.distanceTo(e.pos) < e.range + 2.2) g.damagePlayer(e.dmg * 1.6, e.pos, e); }
        return M.t >= 1.85; } },
  };
}
