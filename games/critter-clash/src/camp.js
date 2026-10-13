// Critter Camp: the whole team roams the meadow. Tap a critter to pet it (hearts, and a little
// XP the first time each day) or feed it a berry earned from battles for a big XP boost.
import * as THREE from 'three';
import { CRITTERS, TYPES, gearFor, GEAR } from './data.js';
import { save, persist, grantXp, xpNeeded } from './save.js';
import { sfx } from './audio.js';
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
    // scatter the team around the field, each with its own wander plan
    this.g.showcase.forEach((c, i) => {
      const a = (i / Math.max(1, team.length)) * Math.PI * 2;
      c.camp = { x: Math.cos(a) * 3, z: Math.sin(a) * 2.2, tx: 0, tz: 0, wait: Math.random() * 2, face: a + Math.PI, munch: 0, pet: 0 };
      c.root.position.set(c.camp.x, 0, c.camp.z);
    });
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
    for (const c of this.g.showcase) {
      const m = c.camp;
      if (!m) continue;
      const P = c.pose;
      c.resetPose();
      m.wait -= dt;
      const dx = m.tx - m.x, dz = m.tz - m.z, d = Math.hypot(dx, dz);
      let walking = false;
      if (m.wait <= 0 && d > 0.15) {
        const sp = 1.3 * dt;
        m.x += dx / d * Math.min(sp, d); m.z += dz / d * Math.min(sp, d);
        m.face = Math.atan2(dx, dz);
        walking = true;
      } else if (m.wait <= 0) {
        // pick a new spot to amble to, then idle for a bit
        const r = 1 + Math.random() * 4.2, ang = Math.random() * Math.PI * 2;
        m.tx = Math.cos(ang) * r; m.tz = Math.sin(ang) * r * 0.75;
        m.wait = 1 + Math.random() * 3;
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
