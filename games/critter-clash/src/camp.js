// Critter Camp: the whole team roams the meadow. Tap a critter to pet it (hearts, and a little
// XP the first time each day) or feed it a berry earned from battles for a big XP boost.
import * as THREE from 'three';
import { CRITTERS, TYPES, gearFor, GEAR } from './data.js';
import { save, persist, grantXp, xpNeeded } from './save.js';
import { sfx } from './audio.js';
import { toon, inked, canvasTex } from './toon.js';
import { newBadges } from './screens.js';

const FEED_XP = 45, PET_XP = 10;
const today = () => new Date().toISOString().slice(0, 10);
const hearts = (pets = 0) => Math.min(5, Math.floor(pets / 4));
const v = new THREE.Vector3();

export class Camp {
  constructor(screens, team) {
    this.S = screens;
    this.g = screens.game;
    this.team = team;
    this.sel = null;
    this.t = 0;
    this.props = buildProps();
    this.g.scene.add(this.props);
    // soft ring under whoever is selected
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.g.scene.add(this.ring);
    // scatter the team around the field, each with its own wander plan
    this.g.showcase.forEach((c, i) => {
      const a = (i / Math.max(1, team.length)) * Math.PI * 2;
      c.camp = { x: Math.cos(a) * 3, z: Math.sin(a) * 2.2, tx: 0, tz: 0, wait: Math.random() * 2, face: a + Math.PI, munch: 0, pet: 0 };
      for (const [px, pz, pr] of this.props.userData.keepOut) {
        const ox = c.camp.x - px, oz = c.camp.z - pz, od = Math.hypot(ox, oz) || 1e-3;
        if (od < pr) { c.camp.x = px + ox / od * pr; c.camp.z = pz + oz / od * pr; }
      }
      c.root.position.set(c.camp.x, 0, c.camp.z);
    });
  }

  dispose() {
    this.g.scene.remove(this.props, this.ring);
    this.ring.geometry.dispose(); this.ring.material.dispose();
    this.props.traverse((o) => { o.geometry?.dispose(); });
  }

  pick(clientX, clientY) {
    const cam = this.g.camera, rect = this.g.renderer.domElement.getBoundingClientRect();
    let best = null, bestD = Math.max(60, rect.width * 0.06);
    for (const c of this.g.showcase) {
      v.set(c.root.position.x, 0.7, c.root.position.z).project(cam);
      const sx = rect.left + (v.x + 1) / 2 * rect.width, sy = rect.top + (1 - v.y) / 2 * rect.height;
      const d = Math.hypot(sx - clientX, sy - clientY);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  tap(x, y) {
    const c = this.pick(x, y);
    if (!c) return;
    this.select(c);
    this.pet(c);
  }

  select(c) {
    this.popCard = this.sel !== c;
    this.sel = c;
    this.ring.visible = true;
    c.camp.wait = 2.5; c.camp.tx = c.camp.x; c.camp.tz = c.camp.z;
    this.panel();
  }

  pet(c) {
    const id = c.def.id, prog = save.critters[id];
    const before = hearts(prog.pets);
    prog.pets = (prog.pets || 0) + 1;
    c.camp.pet = 0.9;
    c.emote('happy', 'open', 0.9);
    sfx.voice(c.def.voice, 'win');
    const p = c.root.position;
    for (let k = 0; k < 6; k++) this.g.fx.spawn({ x: p.x + (Math.random() - 0.5) * 0.8, y: 1.2 + Math.random() * 0.5, z: p.z + (Math.random() - 0.5) * 0.4, vy: 1.4 + Math.random(), vx: (Math.random() - 0.5) * 0.6, color: 0xff6fa8, size: 0.55, life: 1.2, shape: 'heart', additive: false, drag: 1 });
    (save.petDay ||= {});
    if (save.petDay[id] !== today()) {
      save.petDay[id] = today();
      this.xp(c, PET_XP, `${c.def.name} is happy to see you! +${PET_XP} XP`);
    } else persist();
    this.badges();
    if (hearts(prog.pets) > before) { this.S.toast(`💗 ${c.def.name}'s friendship grew!`); sfx.jingle(1); }
    this.panel();
  }

  feed() {
    const c = this.sel;
    if (!c) return;
    if (!(save.berries > 0)) { sfx.ui('back'); this.S.toast('Win battles to earn berries 🍓'); return; }
    save.berries--;
    save.stats.fed = (save.stats.fed || 0) + 1;
    c.camp.munch = 1.4; c.camp.wait = Math.max(c.camp.wait, 1.6);
    c.emote('happy', 'grin', 1.4);
    sfx.pickup();
    const p = c.root.position;
    this.g.fx.burst({ x: p.x, y: 1.0, z: p.z }, { n: 10, speed: 2, up: 2, color: 0xff3f6c, size: 0.14, life: 0.6, shape: 'puff', additive: false, grav: 6 });
    this.xp(c, FEED_XP, `Yum! ${c.def.name} +${FEED_XP} XP`);
    this.panel();
  }

  xp(c, n, msg) {
    const lv = grantXp(c.def.id, n);
    persist();
    this.badges();
    if (lv.to > lv.from) {
      this.S.toast(`${c.def.name} grew to Lv ${lv.to}!`);
      sfx.jingle(2);
      if (gearFor(lv.to) > gearFor(lv.from)) setTimeout(() => this.S.mode === 'camp' && this.S.toast(`${GEAR[gearFor(lv.to) - 1].icon} New gear: ${GEAR[gearFor(lv.to) - 1].name}!`), 2300);
    } else this.S.toast(msg);
  }

  badges() {
    newBadges().forEach((b, k) => setTimeout(() => { if (this.S.mode === 'camp') { this.S.toast(`${b.icon} Badge earned: ${b.name}`); sfx.jingle(2); } }, 1200 + k * 2300));
  }

  panel() {
    const el = this.S.root.querySelector('.camp-panel');
    if (!el) return;
    this.S.root.querySelector('.camp-berries b').textContent = save.berries || 0;
    const c = this.sel;
    if (!c) { el.innerHTML = '<div class="camp-hint">Tap a critter to pet it 💗</div>'; return; }
    const def = CRITTERS.find((d) => d.id === c.def.id), prog = save.critters[def.id];
    const h = hearts(prog.pets);
    el.innerHTML = `<div class="camp-card${this.popCard ? ' pop' : ''}" style="--tc:${TYPES[def.type].color}">
      <img src="${this.g.portrait(c.def)}" alt="">
      <div class="camp-info"><b>${def.name} <small>Lv ${prog.level}</small></b>
        <div class="camp-hearts" title="Friendship">${'💗'.repeat(h)}${'🤍'.repeat(5 - h)}</div>
        <div class="xpbar"><i style="width:${(prog.xp / xpNeeded(prog.level)) * 100}%"></i></div></div>
    </div>`;
    this.popCard = false;
    const b = this.S.btn(`Feed 🍓 <small>+${FEED_XP} XP</small>`, save.berries > 0 ? 'primary' : 'ghost-dark', () => this.feed());
    b.classList.add('camp-feed');
    el.querySelector('.camp-card').appendChild(b);
  }

  update(dt) {
    this.t += dt;
    const cam = this.g.camera, port = cam.aspect < 1;
    const a = Math.sin(this.t * 0.1) * 0.25, D = port ? 10.5 : 8;
    cam.position.set(Math.sin(a) * D, port ? 7 : 4.2, Math.cos(a) * D);
    cam.lookAt(0, port ? 0.6 : 0, 0.4);
    cam.fov = Math.min(70, 40 * Math.max(1, 1.5 / cam.aspect));
    cam.updateProjectionMatrix();
    if (this.sel) { const p = this.sel.root.position; this.ring.position.set(p.x, 0.03, p.z); this.ring.scale.setScalar(1 + Math.sin(this.t * 5) * 0.06); }
    // campfire flicker
    const fp = this.props.userData.fire;
    if (Math.random() < dt * 24) this.g.fx.spawn({ x: fp.x + (Math.random() - 0.5) * 0.3, y: 0.55, z: fp.z + (Math.random() - 0.5) * 0.3, vy: 1.4 + Math.random(), color: Math.random() < 0.5 ? 0xff8a2a : 0xffd04a, size: 0.42, life: 0.55, shape: 'glow', grow: -0.8 });
    this.props.userData.flames.forEach((fl, k) => { const f = 1 + Math.sin(this.t * (11 + k * 4)) * 0.12 + Math.sin(this.t * 23) * 0.06; fl.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f)); fl.rotation.y = this.t * (k ? -2 : 1.5); });
    if (Math.random() < dt * 2) this.g.fx.spawn({ x: fp.x, y: 0.9, z: fp.z, vy: 0.8, vx: 0.2, color: 0xb8b0a8, size: 0.4, life: 1.6, shape: 'puff', additive: false, grow: 1.2, alpha: 0.5 });
    for (const c of this.g.showcase) {
      const m = c.camp;
      if (!m) continue;
      const P = c.pose;
      c.resetPose();
      m.wait -= dt;
      const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
      let walking = false;
      if (m.wait <= 0 && d > 0.15) {
        // steer toward the target, curving around props and other critters instead of through them
        let sx = dx / d, sz = dz / d;
        for (const [px, pz, pr] of this.props.userData.keepOut) {
          const ox = m.x - px, oz = m.z - pz, od = Math.hypot(ox, oz) || 1e-3, reach = pr + 0.7;
          if (od < reach) {
            const w = (reach - od) / 0.7 * 1.6;
            // push out, plus a sideways nudge so they walk around rather than stall against it
            const side = Math.sign(ox * sz - oz * sx) || 1;
            sx += (ox / od) * w + (-oz / od) * side * w * 0.8; sz += (oz / od) * w + (ox / od) * side * w * 0.8;
          }
        }
        for (const o of this.g.showcase) {
          if (o === c || !o.camp) continue;
          const ox = m.x - o.camp.x, oz = m.z - o.camp.z, od = Math.hypot(ox, oz);
          if (od < 0.9 && od > 1e-3) { const w = (0.9 - od) / 0.9; sx += ox / od * w; sz += oz / od * w; }
        }
        const sl = Math.hypot(sx, sz) || 1, sp = 1.3 * dt;
        m.x += sx / sl * Math.min(sp, d); m.z += sz / sl * Math.min(sp, d);
        for (const [px, pz, pr] of this.props.userData.keepOut) {
          const ox = m.x - px, oz = m.z - pz, od = Math.hypot(ox, oz) || 1e-3, lim = pr * 0.8;
          if (od < lim) { m.x = px + ox / od * lim; m.z = pz + oz / od * lim; }
        }
        m.walkT = (m.walkT || 0) + dt;
        // give up on a target that can't be reached and pick another
        if (m.walkT > 8) { m.tx = m.x; m.tz = m.z; m.walkT = 0; }
        m.face = Math.atan2(sx, sz);
        walking = true;
      } else if (m.wait <= 0) {
        // pick a new spot to amble to, then idle for a bit
        for (let tries = 0; tries < 6; tries++) {
          const r = 1 + Math.random() * 4.2, ang = Math.random() * Math.PI * 2;
          m.tx = Math.cos(ang) * r; m.tz = Math.sin(ang) * r * 0.75;
          if (!this.props.userData.keepOut.some(([px, pz, pr]) => Math.hypot(m.tx - px, m.tz - pz) < pr)) break;
        }
        m.wait = 1 + Math.random() * 3;
        m.walkT = 0;
      }
      // the selected critter turns to face the camera
      const want = c === this.sel && !walking ? Math.atan2(cam.position.x - m.x, cam.position.z - m.z) : m.face;
      let dy = want - c.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      c.root.rotation.y += dy * Math.min(1, dt * 6);
      c.root.position.set(m.x, 0, m.z);
      const ph = c.t * 9;
      if (walking) {
        P.y = Math.abs(Math.sin(ph)) * 0.12;
        P.legL = Math.sin(ph) * 0.7; P.legR = -Math.sin(ph) * 0.7;
        P.armLx = -Math.sin(ph) * 0.5; P.armRx = Math.sin(ph) * 0.5;
        P.lean = 0.12; P.tail = 0.6;
      } else {
        const br = Math.sin(c.t * 2.2 + c.idx);
        P.sy = 1 + br * 0.025; P.sx = 1 - br * 0.015;
        P.headRoll = Math.sin(c.t * 1.3 + c.idx) * 0.1; P.tail = 0.4 + br * 0.3;
      }
      if (m.pet > 0) {
        m.pet -= dt;
        P.y = Math.abs(Math.sin(m.pet * 10)) * 0.35; P.armLz = P.armRz = 2.2; P.headRoll = Math.sin(m.pet * 14) * 0.25;
      }
      if (m.munch > 0) {
        m.munch -= dt;
        P.head = 0.25 + Math.abs(Math.sin(m.munch * 16)) * 0.2; P.armLx = P.armRx = -1.3; P.sx = 1.05;
      }
      c.update(dt);
    }
  }
}

// campfire, tent, picnic blanket and a berry basket, kept at the edges so the critters have room
function buildProps() {
  const g = new THREE.Group();
  const OL = 0.03;
  // campfire: ring of stones, crossed logs, warm point light
  const fire = new THREE.Group();
  fire.position.set(-2.9, 0, -1.3);
  fire.scale.setScalar(1.4);
  const stone = toon(0x9a9aa6);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const st = inked(new THREE.SphereGeometry(0.16, 10, 8), stone, OL * 0.6);
    st.scale.set(1, 0.6, 0.9); st.position.set(Math.cos(a) * 0.48, 0.08, Math.sin(a) * 0.48);
    fire.add(st);
  }
  const wood = toon(0x8a5a32);
  for (let i = 0; i < 3; i++) {
    const log = inked(new THREE.CylinderGeometry(0.07, 0.08, 0.75, 8), wood, OL * 0.6);
    log.rotation.set(Math.PI / 2 - 0.5, i * Math.PI * 2 / 3, 0, 'YXZ');
    log.position.y = 0.2;
    fire.add(log);
  }
  // solid toon flames that flicker in update()
  const flames = [];
  for (const [col, r, h, y] of [[0xff7a1a, 0.26, 0.7, 0.45], [0xffd04a, 0.15, 0.45, 0.4]]) {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), new THREE.MeshBasicMaterial({ color: col }));
    fl.position.y = y;
    fire.add(fl); flames.push(fl);
  }
  g.add(fire);
  // tent: a striped triangular prism
  const tentTex = canvasTex(128, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fff4e0' : '#ff8a5a'; x.fillRect(i * w / 8, 0, w / 8, h); } });
  const tri = new THREE.Shape([new THREE.Vector2(-1, 0), new THREE.Vector2(1, 0), new THREE.Vector2(0, 1.35)]);
  const tentGeo = new THREE.ExtrudeGeometry(tri, { depth: 2, bevelEnabled: false });
  tentGeo.translate(0, 0, -1);
  // stripes run across the roof: map them from x
  const uv = tentGeo.attributes.uv, pos = tentGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 1) / 2, pos.getY(i) / 1.35);
  const tent = inked(tentGeo, toon(0xffffff, { map: tentTex }), OL);
  const tentG = new THREE.Group();
  tentG.add(tent);
  tentG.position.set(3.3, 0, -2.5); tentG.rotation.y = -0.6;
  const flapS = new THREE.Shape([new THREE.Vector2(-0.4, 0), new THREE.Vector2(0.4, 0), new THREE.Vector2(0, 0.85)]);
  const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapS), toon(0x5a3a2a));
  flap.position.set(0, 0.01, 1.01);
  tentG.add(flap);
  g.add(tentG);
  // picnic blanket with a basket of berries
  const checker = canvasTex(64, 64, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#ff5a6e' : '#fff6ea'; x.fillRect(i * w / 4, j * h / 4, w / 4, h / 4); } });
  const blanket = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), toon(0xffffff, { map: checker }));
  blanket.rotation.set(-Math.PI / 2, 0, 0.3);
  blanket.position.set(2.6, 0.02, 1.9);
  blanket.receiveShadow = true;
  g.add(blanket);
  const basket = inked(new THREE.CylinderGeometry(0.3, 0.24, 0.3, 14), toon(0xd8a060), OL * 0.6);
  basket.position.set(2.8, 0.17, 1.8);
  g.add(basket);
  const berry = toon(0xff3f6c);
  for (let i = 0; i < 5; i++) {
    const b = inked(new THREE.SphereGeometry(0.1, 10, 8), berry, OL * 0.4);
    b.position.set(2.8 + Math.cos(i * 1.3) * 0.13, 0.36 + (i % 2) * 0.05, 1.8 + Math.sin(i * 1.3) * 0.13);
    g.add(b);
  }
  g.traverse((o) => { if (o.isMesh && !o.userData.hull) o.castShadow = true; });
  // no lights here: adding one would recompile every shader on the way in and out
  g.userData = { fire: fire.position, flames, keepOut: [[-2.9, -1.3, 1.0], [3.3, -2.5, 1.7], [2.6, 1.9, 1.3]] };
  return g;
}
