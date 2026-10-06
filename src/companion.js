import { addOutline } from './outline.js';
import * as THREE from 'three';
import { humanoid, animateHumanoid, camel, animateCamel, horse, animateHorse } from './characters.js';
import { IS_CITY } from './region.js';
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
// Round 21: foes that can't reach Salim go for the guard instead. Beaten down, he falls and waits to be helped up
// (stand beside him for a few seconds), or gets up by himself once the fight has moved away. Two more hires:
// Tamim, a naft-thrower, and Talha, an 'ayyar with two knives. When Salim rides, the guard rides a camel too.
//   Follow: keeps at Salim's shoulder and fights whatever comes near him.
//   Hold:   stands where he was told and fights what comes to him.
//   Attack: goes after Salim's target, or the nearest foe, further afield.
const KINDS = {
  spear: { name: 'Ma\'n', role: 'Spearman', desc: 'Spear and shield. Holds foes off you up close.', mult: 0.55, range: 2.5, cd: 1.15, action: 'thrust', weight: 0.6,
    look: { robe: '#2a2a2e', robe2: '#8a6a3a', qaba: true, turban: null, helm: true, mail: true, weapon: 'spear', offhand: 'shield', beard: 0x2a1a10, skin: 0x9a6a44, sash: 0x1f3f5c, armour: 'lamellar', leather: 0x1c2430, build: 1.08, detail: 'hi' } },
  bow: { name: 'Dirar', role: 'Archer', desc: 'A bowman. Shoots from range and keeps his distance.', mult: 0.42, range: 13, cd: 1.35, action: 'shoot', weight: 0.3,
    look: { robe: '#3a4230', robe2: '#a88a4a', qaba: true, turban: 0xc8b890, weapon: 'bow', beard: 0x1e140c, beardLen: 0.4, skin: 0xa8714a, sash: 0x1f3f5c, armour: 'leather', leather: 0x4a3420, build: 0.98, detail: 'hi' } },
};
KINDS.naft = { name: 'Tamim', role: 'Naft-thrower', desc: 'Throws pots of naft that burn where they land. Fights from a few paces back.', mult: 0.5, range: 9, cd: 2.4, action: 'throw', weight: 0.4,
  look: { robe: '#4a2a1a', robe2: '#c8782a', qaba: true, turban: null, cap: 0x2a1a12, capBand: 0x6a3a1a, weapon: 'torch', beard: 0x2a1a10, beardLen: 0.6, skin: 0x9a6a44, sash: 0x1f3f5c, armour: 'leather', leather: 0x3a2414, build: 1.02, detail: 'hi' } };
KINDS.knives = { name: 'Talha', role: '\'Ayyar', desc: 'Two knives and quick feet. Slips round to the foe\'s back and cuts.', mult: 0.34, range: 1.7, cd: 0.55, action: 'attack', weight: 0.25, backstab: 1.8,
  look: { robe: '#2e2a26', robe2: '#5a4a3a', qaba: false, turban: 0x3a3430, mask: 0x2a2622, weapon: 'dagger', beard: null, skin: 0xa8714a, sash: 0x1f3f5c, armour: 'leather', leather: 0x2a2018, build: 0.94, detail: 'hi' } };
const ICONS = { spear: '⛨', bow: '➶', naft: '♨', knives: '⚔' };
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
    const rig = humanoid(K.look); g.scene.add(rig); addOutline(rig, 'ally');
    const back = tmp.set(-Math.sin(p.facing), 0, -Math.cos(p.facing));
    const pos = p.pos.clone().addScaledVector(back, 2).add(new THREE.Vector3(1, 0, 0)); resolve(pos, 0.4); pos.y = heightAt(pos.x, pos.z);
    C = { kind, K, rig, pos, facing: p.facing, cd: 0, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0 }, holdAt: pos.clone(), path: null, radius: 0.45, hp: 1, maxHp: 1, down: false, helpT: 0, upT: 0 };
    C.maxHp = C.hp = maxHp();
    g.companion = C;
    btn.classList.remove('hide'); label();
  }
  function despawn() { if (C) { g.scene.remove(C.rig); C = null; g.companion = null; } btn.classList.add('hide'); camelRig.visible = false; }
  const maxHp = () => Math.round((p.stats?.maxHp || 100) * 0.8);
  // his own camel, made at load and hidden; shown while Salim rides and the guard follows
  const camelRig = IS_CITY ? horse(0x3a2a20, 0x6a1a14) : camel(0xa88050, 0x6a1a14); camelRig.visible = false; g.scene.add(camelRig);
  const ride = IS_CITY ? animateHorse : animateCamel;
  const cst = { phase: 0, walkBlend: 0, seed: 2.7, speedK: 1.5 }, seat = IS_CITY ? new THREE.Vector3(0.02, -0.66, 0) : new THREE.Vector3(-0.05, -0.03, 0);

  // ---------------- wounds: foes call this when a blow lands on him (game.js updateEnemies)
  g.hurtCompanion = (dmg, from) => {
    if (!C || C.down || g.cinematic) return;
    const d = Math.max(1, Math.round(dmg * 0.6)); C.hp -= d; C.st.hitT = 0.6; C.hurtT = 0.4;
    if (from) { const hx = from.x - C.pos.x, hz = from.z - C.pos.z, hl = Math.hypot(hx, hz) || 1; C.st.hitFrom = { x: hx / hl, z: hz / hl }; }
    g.ui.damageNumber(C.pos, d, 'player'); g.fx.blood(tmp.copy(C.pos).setY(C.pos.y + 1.2)); g.audio.at?.(C.pos, () => g.audio.grunt?.());
    if (C.hp <= 0) knockDown();
    bar();
  };
  function knockDown() {
    C.down = true; C.hp = 0; C.st.action = null; C.st.mounted = false; camelRig.visible = false; C.st.dead = true; C.st.deadT = 0; C.st.deathKind = 1; C.st.fallDir = 1; C.helpT = 0; C.upT = 0;
    g.ui.toast(`${t(C.K.name)} ${t('is down. Stand beside him to help him up.')}`); haptic(30);
  }
  function getUp(k) {
    C.down = false; C.st.dead = false; C.st.deadT = 0; C.hp = Math.round(C.maxHp * k); C.helpT = 0; C.upT = 0;
    C.rig.children[0].rotation.x = 0; C.rig.children[0].position.y = 0;
    g.fx.dust(C.pos, 8, 0.8); g.ui.toast(`${t(C.K.name)} ${t('is back on his feet')}`); bar();
  }

  // ---------------- hiring
  function panel() {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const cur = p.companion?.kind;
    const rows = Object.entries(KINDS).map(([k, K]) => `<div class="srow"><div class="bico">${ICONS[k]}</div><div class="sinfo"><span>${t(K.name)} · ${t(K.role)}</span><small>${t(K.desc)}</small></div>${cur === k ? `<b class="btaken">${t('With you')}</b>` : `<button class="sbtn" data-k="${k}" ${p.gold < fee() ? 'disabled' : ''}>${t('Hire')} · ◉ ${fee()}</button>`}</div>`).join('');
    const orders = cur ? `<div class="cgroup"><div class="ch">${t('Orders')}</div><div class="chips">${ORDERS.map((o) => `<button class="chip ${p.companion.order === o ? 'on' : ''}" data-o="${o}">${t(ORDER_NAME[o])}</button>`).join('')}</div></div><div class="row2"><button class="sbtn" data-dismiss="1">${t('Dismiss')}</button></div>` : '';
    const w = document.createElement('div'); w.id = 'shop'; w.className = 'panel';
    w.innerHTML = `<div class="ptitle">${t('Guards for Hire')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody"><div class="slabel">${t('One fee, and he stays with you until you send him home. If he is beaten down, stand beside him to help him up. Give orders with his button or G.')}</div><div class="slist">${rows}</div>${orders}</div><div class="sfoot"><span>◉ <b>${p.gold}</b></span></div>`;
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
  const label = () => { if (!C) return; btn.innerHTML = `<span class="ci">${ICONS[C.kind]}</span><span class="co">${t(ORDER_NAME[p.companion?.order || 'follow'])}</span><span class="chp"><i></i></span>`; bar(); };
  // his health under the order label; while he is down it fills green as Salim helps him up
  const bar = () => { const i = btn.querySelector('.chp i'); if (!i || !C) return; const k = C.down ? C.helpT : C.hp / C.maxHp; i.style.width = Math.round(Math.max(0, Math.min(1, k)) * 100) + '%'; btn.classList.toggle('down', C.down); };
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
    } else if (C.kind === 'naft') {
      // a pot of naft lobbed onto the foe: it bursts and burns there for a few seconds (the hero's own flask)
      const to = e.pos.clone(); to.y = heightAt(to.x, to.z);
      g.throwFlask(C.pos.clone().setY(C.pos.y + 1.6), to, K.mult);
    } else if (e.pos.distanceTo(C.pos) < K.range + e.radius + 0.6) {
      let mult = K.mult;
      if (K.backstab) { const fx = C.pos.x - e.pos.x, fz = C.pos.z - e.pos.z, fl = Math.hypot(fx, fz) || 1; if ((fx * Math.sin(e.facing) + fz * Math.cos(e.facing)) / fl < -0.3 && !e.boss) mult *= K.backstab; }
      const r = g.rollDamage(mult); g.damageEnemy(e, r.d, r.crit, C.pos, 'normal', { weight: K.weight });
    }
  }
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (!C && p.companion?.kind && KINDS[p.companion.kind]) spawn(p.companion.kind); // hired before a reload or a journey
    if (!C) return;
    const K = C.K, hero = p.pos;
    C.rig.visible = !g.cinematic;
    C.maxHp = maxHp(); C.hurtT = Math.max(0, (C.hurtT || 0) - dt);
    if (C.down) {
      // lying where he fell: Salim standing close helps him up; or he rises once no foe is near for a while
      C.st.deadT += dt;
      const near = !p.dead && C.pos.distanceTo(hero) < 2.4, foes = g.enemies.some((e) => live(e) && e.alerted && e.pos.distanceTo(C.pos) < 16);
      if (near) { C.helpT = Math.min(1, C.helpT + dt / 2.6); if (Math.random() < 0.1) g.fx.glow?.spawn({ pos: { x: C.pos.x, y: C.pos.y + 0.6, z: C.pos.z }, vel: { x: 0, y: 0.8, z: 0 }, life: 0.6, size: 0.2, size1: 0.02, color: new THREE.Color(1.4, 2.2, 1.2) }); }
      else C.helpT = Math.max(0, C.helpT - dt * 0.5);
      C.upT = foes ? 0 : C.upT + dt;
      if (C.helpT >= 1) getUp(0.5); else if (C.upT > 14) getUp(0.3);
      bar(); C.rig.position.copy(C.pos); animateHumanoid(C.rig, C.st, g.t, dt); camelRig.visible = false;
      return;
    }
    // he mends between fights
    if (!g.enemies.some((e) => live(e) && e.alerted && e.pos.distanceTo(C.pos) < 18)) C.hp = Math.min(C.maxHp, C.hp + C.maxHp * 0.04 * dt);
    if ((C.barT = (C.barT || 0) - dt) <= 0) { C.barT = 0.25; bar(); }
    // left far behind (a fast-travel, a descent, a long ride): he catches up out of sight
    if (C.pos.distanceTo(hero) > 26) { const back = tmp.set(-Math.sin(p.facing), 0, -Math.cos(p.facing)); C.pos.copy(hero).addScaledVector(back, 2.2); resolve(C.pos, 0.4); C.path = null; if (p.companion.order === 'hold') C.holdAt.copy(C.pos); }
    C.cd -= dt;
    const e = p.dead ? null : pickTarget();
    let want = null, spd = 6.6 * (p.mountK > 1 && p.companion.order === 'follow' ? 1.75 : 1);
    if (!e && p.companion.order === 'follow') spd *= 1 + Math.min(0.6, Math.max(0, (C.pos.distanceTo(hero) - 4) / 8)); // catch up when left behind
    if (e) {
      const d = e.pos.distanceTo(C.pos);
      if (C.kind === 'bow' || C.kind === 'naft') {
        if (d > K.range || !navClear(C.pos.x, C.pos.z, e.pos.x, e.pos.z)) want = e.pos;
        else if (d < (C.kind === 'naft' ? 4 : 5)) { const away = tmp.copy(C.pos).sub(e.pos).setY(0).normalize(); want = { x: C.pos.x + away.x * 3, z: C.pos.z + away.z * 3 }; }
      } else if (K.backstab && d < 4 && !e.boss) {
        // the 'ayyar works round to the foe's back while it is busy with someone else
        const bx = e.pos.x - Math.sin(e.facing) * (K.range + e.radius * 0.6), bz = e.pos.z - Math.cos(e.facing) * (K.range + e.radius * 0.6);
        if (Math.hypot(bx - C.pos.x, bz - C.pos.z) > 0.5) want = { x: bx, z: bz };
      } else if (d > K.range + e.radius) want = e.pos;
      C.facing += angDiff(C.facing, Math.atan2(e.pos.x - C.pos.x, e.pos.z - C.pos.z)) * Math.min(1, dt * 8);
      if (!C.st.action && C.cd <= 0 && (C.kind === 'bow' || C.kind === 'naft' ? d <= K.range && navClear(C.pos.x, C.pos.z, e.pos.x, e.pos.z) : d <= K.range + e.radius + 0.3)) {
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
    // riding: Salim is mounted and the guard follows, so he rides his own camel alongside
    const riding = !!g.mount?.on && p.companion.order === 'follow' && !e && !g.interior;
    camelRig.visible = riding && !g.cinematic;
    if (riding !== !!C.st.mounted) { C.st.mounted = riding; g.fx.dust(C.pos, 8, 1); if (!riding) { C.rig.position.copy(C.pos); } }
    if (riding) {
      camelRig.position.copy(C.pos); camelRig.rotation.y = C.facing - Math.PI / 2;
      cst.walkBlend = C.st.walkBlend; cst.phase += dt * (moving ? spd * 0.8 : 0); ride(camelRig, cst, g.t); camelRig.updateMatrixWorld(true);
      camelRig.userData.parts.body.localToWorld(tmp.copy(seat)); C.rig.position.copy(tmp);
    } else C.rig.position.copy(C.pos);
    C.rig.rotation.y = C.facing;
    animateHumanoid(C.rig, C.st, g.t, dt);
  };

  g.__companion = { spawn, despawn, panel, setOrder, KINDS, knockDown: () => C && knockDown(), getUp: (k) => C && getUp(k) };
}
