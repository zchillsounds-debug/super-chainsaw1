import * as THREE from 'three';
import { humanoid } from './characters.js';
import { LOOK, byzify } from './byz.js';
import { heightAt } from './terrain.js';
import { resolve } from './collision.js';
import { t } from './i18n.js';

// Round 31: the sapper, the man who dug the mines under the walls in the siege.
//   sapper: close up he fights with his pick. Further off he goes to ground: a burst of dust, and then a ridge of
//           broken earth runs under the floor toward Salim. Where it stops a ring is marked, and 0.8 s later he
//           bursts up out of it with the pick. Keep moving and the ridge has to chase you; once he is up he is winded
//           for a moment and takes more damage.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const UP_R = 1.9; // the eruption ring

export const TYPES31 = {
  sapper: {
    name: 'Sapper', hp: 44, dmg: 11, speed: 4.2, range: 1.9, atk: 1.5, xp: 32, radius: 0.48, action: 'attack',
    build: (x) => humanoid(byzify({ ...LOOK.mechanikos(), weapon: 'pick', robe: '#6a5638', robe2: '#4a3a26', sash: 0x2a2018, build: 1.04, belly: 0.05, hunch: 0.12, armour: 'leather', leather: 0x4a3420, ...x })),
    ai: sapperAI,
  },
};

const ours = (g, e) => e.alerted && !g.player.dead && !(e.staggerT > 0) && !e.hidden && (e.riseT ?? 1) >= 1;
function settle(g, e, dt, dist) {
  resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z);
  e.st.walkBlend = THREE.MathUtils.lerp(e.st.walkBlend || 0, 0, Math.min(1, dt * 8));
  e.rig.position.copy(e.pos); e.rig.rotation.y = e.facing; g.animEnemy(e, dt, dist);
  return 'skip';
}
// the ridge of heaved earth that follows him under the floor: a few clods, re-used
function ridge(g) {
  if (g.ridge31) return g.ridge31;
  const m = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 }), grp = new THREE.Group();
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.07, 0), m); c.position.set((i % 2 ? 0.3 : -0.3) * Math.random(), 0.05, (i - 3) * 0.22); c.rotation.set(i, i * 2, 0); grp.add(c); }
  grp.position.set(0, -500, 0); g.scene.add(grp);
  return (g.ridge31 = grp);
}

function sapperAI(g, e, dt, dist) {
  const S = (e.s31 ||= { s: 'fight', cd: 2.5 + Math.random() * 2, t: 0 }), p = g.player;
  if (e.dead) { if (S.s !== 'fight') { e.ghost = false; e.rig.visible = true; } return; }
  // a scene or a break mid-dig: he comes up where he is
  if (S.s !== 'fight' && (g.cinematic || p.dead)) { S.s = 'fight'; e.ghost = false; e.rig.visible = true; if (g.ridge31) g.ridge31.position.y = -500; }
  S.cd -= dt;
  if (S.s === 'fight') {
    if (e.winded > 0) e.winded -= dt;
    if (!ours(g, e) || S.cd > 0 || dist < 4 || dist > 15 || e.st.action) return;
    // go to ground
    S.s = 'down'; S.t = 0; e.st.action = 'slam'; e.st.actionT = 0;
    if (!g.sapWarned) { g.sapWarned = true; g.ui.toast(t('A sapper digs toward you: keep moving, then hit him as he comes up'), 'quest'); }
    return settle(g, e, dt, dist);
  }
  S.t += dt;
  if (S.s === 'down') { // 0.6 s: he swings the pick into the floor and sinks in a cloud of dust
    e.st.actionT = Math.min(1, S.t / 0.6);
    if (S.t > 0.6) { S.s = 'under'; S.t = 0; g.fx.dust(e.pos, 18, 1.6); g.audio.at?.(e.pos, () => g.audio.boom?.()); e.ghost = true; e.rig.visible = false; ridge(g); }
    return settle(g, e, dt, dist);
  }
  if (S.s === 'under') { // the ridge chases Salim for up to 2.2 s, a little slower than a run
    const R = ridge(g), d = tmp.set(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z), dd = d.length();
    if (dd > 0.4) { d.multiplyScalar(1 / dd); const step = Math.min(dd, 5.6 * dt); e.pos.addScaledVector(d, step); resolve(e.pos, e.radius); e.pos.y = heightAt(e.pos.x, e.pos.z); e.facing = Math.atan2(d.x, d.z); }
    R.position.set(e.pos.x, e.pos.y, e.pos.z); R.rotation.y = e.facing;
    if (Math.random() < dt * 14) g.fx.dust(e.pos, 2, 0.7);
    if (S.t > 2.2 || dd < 0.6) {
      S.s = 'mark'; S.t = 0; S.at = e.pos.clone(); R.position.y = -500;
      g.telegraph(S.at, UP_R, 0.8, () => {
        if (e.dead || g.cinematic || S.s !== 'mark') return;
        S.s = 'up'; S.t = 0; e.ghost = false; e.rig.visible = true; e.pos.copy(S.at); e.facing = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        e.st.action = 'slam'; e.st.actionT = 0.5;
        g.fx.dust(S.at, 26, 2.2); g.audio.boom?.(); g.shake = Math.max(g.shake || 0, 0.3);
        if (p.pos.distanceTo(S.at) < UP_R && !(p.rollT > 0 && p.invuln > 0)) { g.damagePlayer(e.dmg * 1.3, S.at, e); p.knock = (p.knock || V(0, 0, 0)).add(tmp.set(p.pos.x - S.at.x, 0, p.pos.z - S.at.z).normalize().multiplyScalar(8)); }
      });
    }
    return 'skip';
  }
  if (S.s === 'mark') { if (S.t > 1.6) { S.s = 'up'; S.t = 0; e.ghost = false; e.rig.visible = true; } return 'skip'; }
  if (S.s === 'up') { // winded: 1.2 s on the spot, taking more damage
    e.st.actionT = Math.min(1, 0.5 + S.t / 1.2); e.winded = 1.2;
    if (S.t > 1.2) { S.s = 'fight'; S.cd = 7 + Math.random() * 3; e.st.action = null; e.atkCd = Math.max(e.atkCd || 0, 0.6); }
    return settle(g, e, dt, dist);
  }
}

export function setupFoes31(g) {
  // the winded sapper takes 35% more
  const dm = g.dmgMod;
  g.dmgMod = (e) => (dm ? dm(e) : 1) * (e.winded > 0 ? 1.35 : 1);
}
