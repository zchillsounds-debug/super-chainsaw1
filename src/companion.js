import * as THREE from 'three';
import { humanoid, animateHumanoid } from './characters.js';
import { heightAt } from './terrain.js';
import { HUB } from './region.js';
import { resolve } from './collision.js';
import { navClear } from './nav.js';
import { npc } from './hub.js';
import { freeSpot } from './sidequests.js';
import { saveGame } from './save.js';
import { haptic } from './sheets.js';
import { t } from './i18n.js';

// Round 20: a hired guard who fights beside Salim. Kathir, a captain of guards for hire, stands in every hub with
// two of his men: Ma'n with a spear and shield, or Dirar with a bow. One fee, and the guard stays until dismissed
// (he travels between regions and goes underground too). He can't be killed. Orders, from his button or G:
//   Follow: keeps at Salim's shoulder and fights whatever comes near him.
//   Hold:   stands where he was told and fights what comes to him.
//   Attack: goes after Salim's target, or the nearest foe, further afield.
const KINDS = {
  spear: { name: 'Ma\'n', role: 'Spearman', desc: 'Spear and shield. Holds foes off you up close.', mult: 0.55, range: 2.5, cd: 1.15, action: 'thrust', weight: 0.6,
    look: { robe: '#2a2a2e', robe2: '#8a6a3a', qaba: true, turban: null, helm: true, mail: true, weapon: 'spear', offhand: 'shield', beard: 0x2a1a10, skin: 0x9a6a44, sash: 0x1f3f5c, armour: 'lamellar', leather: 0x1c2430, build: 1.08, detail: 'hi' } },
  bow: { name: 'Dirar', role: 'Archer', desc: 'A bowman. Shoots from range and keeps his distance.', mult: 0.42, range: 13, cd: 1.35, action: 'shoot', weight: 0.3,
    look: { robe: '#3a4230', robe2: '#a88a4a', qaba: true, turban: 0xc8b890, weapon: 'bow', beard: 0x1e140c, beardLen: 0.4, skin: 0xa8714a, sash: 0x1f3f5c, armour: 'leather', leather: 0x4a3420, build: 0.98, detail: 'hi' } },
};
const ORDERS = ['follow', 'hold', 'attack'];
const ORDER_NAME = { follow: 'Follow', hold: 'Hold', attack: 'Attack' };
const tmp = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function setupCompanion(g) {
  const p = g.player;
  const fee = () => 80 + 30 * p.level;
  let C = null;

  // ---------------- the captain of guards in the hub
  {
    const [x, z] = freeSpot(HUB.ishaq[0] + 8, HUB.ishaq[1] + 3, 1.2);
    const n = npc(g, { robe: '#2a2a2e', robe2: '#b8913e', qaba: true, cap: 0x1e1a16, capBand: 0x6a1a14, beard: 0x8a8070, beardLen: 0.8, skin: 0x9a6a44, weapon: 'sword', sash: 0x6a1a14, armour: 'lamellar', leather: 0x2a1a14 },
      [x, z], Math.atan2(HUB.spawn[0] - x, HUB.spawn[1] - z), 'Kathir', 'Guards for hire', () => panel());
    g.pois?.push({ x, z, icon: '⛨', color: '#c0a070' });
    g.kathir = n;
  }

  function spawn(kind) {
    despawn();
    const K = KINDS[kind];
    const rig = humanoid(K.look); g.scene.add(rig);
    const back = tmp.set(-Math.sin(p.facing), 0, -Math.cos(p.facing));
    const pos = p.pos.clone().addScaledVector(back, 2).add(new THREE.Vector3(1, 0, 0)); resolve(pos, 0.4); pos.y = heightAt(pos.x, pos.z);
    C = { kind, K, rig, pos, facing: p.facing, cd: 0, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0 }, holdAt: pos.clone(), path: null };
    g.companion = C;
    btn.classList.remove('hide'); label();
  }
  function despawn() { if (C) { g.scene.remove(C.rig); C = null; g.companion = null; } btn.classList.add('hide'); }

  // ---------------- hiring
  function panel() {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const cur = p.companion?.kind;
    const rows = Object.entries(KINDS).map(([k, K]) => `<div class="srow"><div class="bico">${k === 'spear' ? '⛨' : '➶'}</div><div class="sinfo"><span>${t(K.name)} · ${t(K.role)}</span><small>${t(K.desc)}</small></div>${cur === k ? `<b class="btaken">${t('With you')}</b>` : `<button class="sbtn" data-k="${k}" ${p.gold < fee() ? 'disabled' : ''}>${t('Hire')} · ◉ ${fee()}</button>`}</div>`).join('');
    const orders = cur ? `<div class="cgroup"><div class="ch">${t('Orders')}</div><div class="chips">${ORDERS.map((o) => `<button class="chip ${p.companion.order === o ? 'on' : ''}" data-o="${o}">${t(ORDER_NAME[o])}</button>`).join('')}</div></div><div class="row2"><button class="sbtn" data-dismiss="1">${t('Dismiss')}</button></div>` : '';
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel';
    w.innerHTML = `<div class="ptitle">${t('Guards for Hire')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody"><div class="slabel">${t('One fee, and he stays with you until you send him home. He cannot be killed. Give orders with his button or G.')}</div><div class="slist">${rows}</div>${orders}</div><div class="sfoot"><span>◉ <b>${p.gold}</b></span></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { if (p.gold < fee()) return; p.gold -= fee(); p.companion = { kind: b.dataset.k, order: 'follow' }; spawn(b.dataset.k); g.audio.gold?.(); g.ui.toast(t(KINDS[b.dataset.k].name) + ' ' + t('joins you')); saveGame(g); panel(); });
    w.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { setOrder(b.dataset.o); panel(); });
    w.querySelector('[data-dismiss]')?.addEventListener('click', () => { p.companion = null; despawn(); saveGame(g); panel(); });
  }
  function setOrder(o) {
    if (!p.companion || !C) return;
    p.companion.order = o; if (o === 'hold') C.holdAt.copy(C.pos);
    label(); haptic(10); g.ui.toast(`${t(C.K.name)}: ${t(ORDER_NAME[o])}`);
  }

  // ---------------- order button (touch: above the joystick side; desktop: beside the camel button) and G
  const btn = document.createElement('div'); btn.id = 'compbtn'; btn.className = 'hide'; btn.title = 'Guard orders (G)';
  document.getElementById('ui').appendChild(btn);
  const label = () => { if (!C) return; btn.innerHTML = `<span class="ci">${C.kind === 'spear' ? '⛨' : '➶'}</span><span class="co">${t(ORDER_NAME[p.companion?.order || 'follow'])}</span>`; };
  const cycle = () => { if (!C) return; setOrder(ORDERS[(ORDERS.indexOf(p.companion.order) + 1) % ORDERS.length]); };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (g.started && !g.paused) cycle(); });
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'g' && g.started && !g.paused && !g.ui.dialogOpen) cycle(); });

  // ---------------- behaviour
  const live = (e) => e && !e.dead && !e.hidden && !e.removed;
  function pickTarget() {
    const o = p.companion.order, from = o === 'hold' ? C.holdAt : p.pos, r = o === 'attack' ? 16 : o === 'hold' ? 7 : 9;
    if (o !== 'hold' && live(p.target) && p.target.pos.distanceTo(p.pos) < r + 4) return p.target;
    let best = null, bd = 1e9;
    for (const e of g.enemies) { if (!live(e) || (!e.alerted && o !== 'attack')) continue; const d = e.pos.distanceTo(from); if (d < r && d < bd) { bd = d; best = e; } }
    return best;
  }
  function strike(e) {
    const K = C.K;
    if (C.kind === 'bow') {
      const from = C.pos.clone(); from.y += 1.4; const to = e.pos.clone(); to.y += 1.1; const dir = to.sub(from).normalize();
      const m = new THREE.Mesh(g.arrowGeo, g.arrowMat); m.position.copy(from); m.lookAt(from.clone().add(dir)); g.scene.add(m);
      g.projectiles.push({ mesh: m, vel: dir.multiplyScalar(30), grav: 0, life: 0.7, owner: 'player', kind: 'pshot', o: { mult: K.mult, weight: K.weight }, hit: new Set(), pierce: 0 });
      g.audio.at(C.pos, () => g.audio.whoosh?.());
    } else if (e.pos.distanceTo(C.pos) < K.range + e.radius + 0.6) {
      const r = g.rollDamage(K.mult); g.damageEnemy(e, r.d, r.crit, C.pos, 'normal', { weight: K.weight });
    }
  }
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (!C && p.companion?.kind && KINDS[p.companion.kind]) spawn(p.companion.kind); // hired before a reload or a journey
    if (!C) return;
    const K = C.K, hero = p.pos;
    C.rig.visible = !g.cinematic;
    // left far behind (a fast-travel, a descent, a long ride): he catches up out of sight
    if (C.pos.distanceTo(hero) > 26) { const back = tmp.set(-Math.sin(p.facing), 0, -Math.cos(p.facing)); C.pos.copy(hero).addScaledVector(back, 2.2); resolve(C.pos, 0.4); C.path = null; if (p.companion.order === 'hold') C.holdAt.copy(C.pos); }
    C.cd -= dt;
    const e = p.dead ? null : pickTarget();
    let want = null, spd = 6.6 * (p.mountK > 1 && p.companion.order === 'follow' ? 1.6 : 1);
    if (e) {
      const d = e.pos.distanceTo(C.pos);
      if (C.kind === 'bow') {
        if (d > K.range || !navClear(C.pos.x, C.pos.z, e.pos.x, e.pos.z)) want = e.pos;
        else if (d < 5) { const away = tmp.copy(C.pos).sub(e.pos).setY(0).normalize(); want = { x: C.pos.x + away.x * 3, z: C.pos.z + away.z * 3 }; }
      } else if (d > K.range + e.radius) want = e.pos;
      C.facing += angDiff(C.facing, Math.atan2(e.pos.x - C.pos.x, e.pos.z - C.pos.z)) * Math.min(1, dt * 8);
      if (!C.st.action && C.cd <= 0 && (C.kind === 'bow' ? d <= K.range && navClear(C.pos.x, C.pos.z, e.pos.x, e.pos.z) : d <= K.range + e.radius + 0.3)) {
        C.st.action = K.action; C.st.actionT = 0; C.hitDone = false; C.cd = K.cd * (0.9 + Math.random() * 0.25); C.foe = e;
      }
    } else if (p.companion.order === 'hold') want = C.holdAt;
    else { const back = Math.atan2(-Math.sin(p.facing), -Math.cos(p.facing)) + 0.6; want = { x: hero.x + Math.sin(back) * 2.4, z: hero.z + Math.cos(back) * 2.4 }; }
    if (C.st.action) {
      C.st.actionT += dt / 0.7;
      if (!C.hitDone && C.st.actionT > 0.55) { C.hitDone = true; if (live(C.foe)) strike(C.foe); }
      if (C.st.actionT >= 1) C.st.action = null;
    }
    let moving = false;
    if (want && Math.hypot(want.x - C.pos.x, want.z - C.pos.z) > (e ? 0.4 : 1.2)) {
      const wp = g.steer(C, want), dir = tmp.set(wp.x - C.pos.x, 0, wp.z - C.pos.z); const dl = dir.length();
      if (dl > 1e-3) { dir.divideScalar(dl); const far = Math.hypot(want.x - C.pos.x, want.z - C.pos.z); C.pos.addScaledVector(dir, Math.min(far, spd * (C.st.action ? 0.4 : 1) * Math.min(1, 0.35 + far / 3)) * dt); moving = true;
        if (!e) C.facing += angDiff(C.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 8); }
    }
    // keep out of Salim's way
    { const dx = C.pos.x - hero.x, dz = C.pos.z - hero.z, d = Math.hypot(dx, dz); if (d < 1.0 && d > 1e-3) { C.pos.x += dx / d * (1.0 - d); C.pos.z += dz / d * (1.0 - d); } }
    resolve(C.pos, 0.4); C.pos.y = heightAt(C.pos.x, C.pos.z);
    C.st.walkBlend = THREE.MathUtils.lerp(C.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 8)); C.st.phase += dt * (moving ? spd * 1.4 : 0);
    C.rig.position.copy(C.pos); C.rig.rotation.y = C.facing;
    animateHumanoid(C.rig, C.st, g.t, dt);
  };

  g.__companion = { spawn, despawn, panel, setOrder, KINDS };
}
