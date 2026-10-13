// Critter Camp: the whole team roams the meadow. Tap a critter to pet it (hearts, and a little
// XP the first time each day) or feed it a berry earned from battles for a big XP boost.
import * as THREE from 'three';
import { CRITTERS, TYPES, gearFor, GEAR, CUPS } from './data.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
    this.props = buildProps(save.cups || {});
    this.g.scene.add(this.props);
    // soft ring under whoever is selected
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.g.scene.add(this.ring);
    // a striped play ball for fetch
    const ballTex = canvasTex(64, 32, (x, w, h) => { for (let i = 0; i < 6; i++) { x.fillStyle = ['#ff5a6e', '#ffd04a', '#5ab8ff'][i % 3]; x.fillRect(i * w / 6, 0, w / 6, h); } });
    this.ball = inked(new THREE.SphereGeometry(0.2, 16, 12), toon(0xffffff, { map: ballTex }), 0.025);
    this.ball.castShadow = true;
    this.ball.visible = false;
    this.g.scene.add(this.ball);
    this.fetch = null;
    // scatter the team around the field, each with its own wander plan
    this.g.showcase.forEach((c, i) => {
      // big teams spread over two rings so nobody starts in a huddle
      const a = (i / Math.max(1, team.length)) * Math.PI * 2, rr = team.length > 7 ? (i % 2 ? 2.2 : 3.8) : 3;
      c.camp = { x: Math.cos(a) * rr * (screens.game.camera.aspect < 1 ? 0.8 : 1.3), z: Math.sin(a) * rr * 0.7 - 0.3, tx: 0, tz: 0, wait: Math.random() * 2, face: a + Math.PI, munch: 0, pet: 0 };
      for (const [px, pz, pr] of this.props.userData.keepOut) {
        const ox = c.camp.x - px, oz = c.camp.z - pz, od = Math.hypot(ox, oz) || 1e-3;
        if (od < pr) { c.camp.x = px + ox / od * pr; c.camp.z = pz + oz / od * pr; }
      }
      c.camp.tx = c.camp.x; c.camp.tz = c.camp.z; // start by idling where they stand
      c.root.position.set(c.camp.x, 0, c.camp.z);
    });
  }

  dispose() {
    this.g.scene.remove(this.props, this.ring, this.ball);
    this.ball.traverse((o) => { o.geometry?.dispose(); });
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
    c.camp.wait = 2.5; c.camp.tx = c.camp.x; c.camp.tz = c.camp.z; c.camp.act = c.camp.doing = null;
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
    if (hearts(prog.pets) > before) { this.S.toast(hearts(prog.pets) >= 5 ? `💗 Best friends! ${c.def.name} now starts battles with super meter` : `💗 ${c.def.name}'s friendship grew!`); sfx.jingle(1); }
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

  // fetch: the ball arcs onto the field, everyone races for it and the winner gets a friendship point
  toss() {
    if (this.fetch) return;
    const port = this.g.camera.aspect < 1;
    let tx = 0, tz = 0;
    for (let tries = 0; tries < 10; tries++) {
      const r = 1.5 + Math.random() * 2.5, ang = Math.random() * Math.PI * 2;
      tx = Math.cos(ang) * r * (port ? 0.7 : 1); tz = Math.sin(ang) * r * 0.75;
      if (!this.props.userData.keepOut.some(([px, pz, pr]) => Math.hypot(tx - px, tz - pz) < pr + 0.3)) break;
    }
    const T = 0.9, from = new THREE.Vector3(0, 2.6, 4.5);
    this.fetch = { phase: 'fly', t: 0, pos: from.clone(), vel: new THREE.Vector3((tx - from.x) / T, 0, (tz - from.z) / T), winner: null };
    // solve the vertical launch so it lands at y = 0.2 after T seconds under gravity 14
    this.fetch.vel.y = (0.2 - from.y + 0.5 * 14 * T * T) / T;
    this.ball.visible = true;
    this.ball.position.copy(from);
    sfx.ui('ok');
    this.S.root.querySelector('.camp-toy')?.classList.add('busy');
  }

  updateFetch(dt) {
    const F = this.fetch;
    if (!F) return;
    F.t += dt;
    const b = this.ball;
    if (F.phase === 'fly' || F.phase === 'roll') {
      F.vel.y -= 14 * dt;
      F.pos.addScaledVector(F.vel, dt);
      if (F.pos.y < 0.2) {
        F.pos.y = 0.2;
        if (F.vel.y < -1.5) { F.vel.y *= -0.45; sfx.ui('bounce'); if (F.phase === 'fly') this.g.fx.dust(F.pos, 4, 0.6); }
        else F.vel.y = 0;
        F.vel.x *= 0.7; F.vel.z *= 0.7;
        F.phase = 'roll';
      }
      b.position.copy(F.pos);
      b.rotation.x += F.vel.z * dt * 5; b.rotation.z -= F.vel.x * dt * 5;
      if (F.phase === 'roll') {
        // everyone chases the ball; the first to reach it wins
        for (const c of this.g.showcase) {
          const m = c.camp;
          if (!m) continue;
          if (!m.chase) { m.chase = true; m.act = m.doing = null; m.wait = Math.random() * 0.25; c.emote('open', 'o', 0.6); }
          m.tx = F.pos.x; m.tz = F.pos.z;
          if (Math.hypot(m.x - F.pos.x, m.z - F.pos.z) < 0.55) { F.winner = c; break; }
        }
        if (F.winner) {
          F.phase = 'caught'; F.t = 0;
          for (const c of this.g.showcase) if (c.camp) { c.camp.chase = false; c.camp.tx = c.camp.x; c.camp.tz = c.camp.z; if (c !== F.winner) { c.camp.wait = 1.2; c.emote('closed', 'wobbly', 1); } }
          this.select(F.winner);
          this.pet(F.winner);
          this.S.toast(`${F.winner.def.name} caught the ball!`);
        } else if (F.t > 10) this.endFetch();
      }
    } else if (F.phase === 'caught') {
      // the winner shows off the ball above its head, then it pops away
      const p = F.winner.root.position;
      b.position.set(p.x, 1.75 + Math.abs(Math.sin(F.t * 8)) * 0.15, p.z);
      if (F.t > 1.6) this.endFetch();
    }
  }

  endFetch() {
    if (this.fetch?.winner) { const p = this.ball.position; this.g.fx.burst({ x: p.x, y: p.y, z: p.z }, { n: 8, speed: 2, up: 1, color: 0xffd04a, size: 0.16, life: 0.4, shape: 'star' }); }
    for (const c of this.g.showcase) if (c.camp) c.camp.chase = false;
    this.fetch = null;
    this.ball.visible = false;
    this.S.root.querySelector('.camp-toy')?.classList.remove('busy');
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
        <div class="camp-hearts" title="Friendship">${'💗'.repeat(h)}${'🤍'.repeat(5 - h)}${h >= 5 ? '<em>Best friends! Starts battles with super meter</em>' : ''}</div>
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
    // portrait looks down more steeply so the field, not the stands, fills the tall screen
    const a = Math.sin(this.t * 0.1) * (port ? 0.12 : 0.25), D = port ? 9 : 8.6;
    cam.position.set(Math.sin(a) * D, port ? 8 : 5.4, Math.cos(a) * D);
    cam.lookAt(0, 0, port ? -0.6 : 0.4);
    cam.fov = port ? Math.min(78, 2 * Math.atan(Math.tan(0.33) / cam.aspect) * 180 / Math.PI) : 40 * Math.max(1, 1.5 / cam.aspect);
    cam.updateProjectionMatrix();
    this.updateFetch(dt);
    if (this.sel) { const p = this.sel.root.position; this.ring.position.set(p.x, 0.03, p.z); this.ring.scale.setScalar(1 + Math.sin(this.t * 5) * 0.06); }
    // campfire flicker
    const fp = this.props.userData.fire;
    if (Math.random() < dt * 24) this.g.fx.spawn({ x: fp.x + (Math.random() - 0.5) * 0.3, y: 0.55, z: fp.z + (Math.random() - 0.5) * 0.3, vy: 1.4 + Math.random(), color: Math.random() < 0.5 ? 0xff8a2a : 0xffd04a, size: 0.42, life: 0.55, shape: 'glow', grow: -0.8 });
    const bal = this.props.userData.balloon;
    if (bal) { bal.position.y = Math.sin(this.t * 0.9) * 0.12; bal.rotation.z = Math.sin(this.t * 0.7) * 0.04; }
    for (const pn of this.props.userData.pennants) pn.rotation.x = Math.sin(this.t * 2.2 + pn.userData.ph) * 0.25;
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
        for (const [j, [px, pz, pr]] of this.props.userData.keepOut.entries()) {
          if (m.act && m.act.prop === j && d < 1.6) continue; // let them walk up to the prop they're visiting
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
        const sl = Math.hypot(sx, sz) || 1, sp = (m.chase ? 2.8 : 1.3) * dt;
        m.x += sx / sl * Math.min(sp, d); m.z += sz / sl * Math.min(sp, d);
        for (const [px, pz, pr] of this.props.userData.keepOut) {
          const ox = m.x - px, oz = m.z - pz, od = Math.hypot(ox, oz) || 1e-3, lim = pr * 0.8;
          if (od < lim) { m.x = px + ox / od * lim; m.z = pz + oz / od * lim; }
        }
        m.walkT = (m.walkT || 0) + dt;
        // give up on a target that can't be reached and pick another
        if (m.walkT > 8 && !m.chase) { m.tx = m.x; m.tz = m.z; m.walkT = 0; m.act = null; }
        m.face = Math.atan2(sx, sz);
        // on arrival most of them turn round to look out at you, so the camp shows faces, not backs
        if (Math.hypot(m.tx - m.x, m.tz - m.z) <= 0.15 && !m.act && !m.chase && Math.random() < 0.75) m.face = Math.atan2(cam.position.x - m.x, cam.position.z - m.z) + (Math.random() - 0.5) * 1.4;
        walking = true;
      } else if (m.wait <= 0 && !m.chase && !(m.act && !m.doing)) {
        // pick a new spot to amble to, then idle for a bit; sometimes settle in at a prop instead
        const was = m.act;
        m.act = m.doing = null;
        const free = this.props.userData.spots.filter((sp) => sp !== was && !this.g.showcase.some((o) => o.camp?.act === sp));
        if (!was && free.length && Math.random() < 0.4) {
          m.act = free[Math.floor(Math.random() * free.length)];
          m.tx = m.act.x; m.tz = m.act.z;
        } else for (let tries = 0; tries < 6; tries++) {
          const r = 1 + Math.random() * 4.2, ang = Math.random() * Math.PI * 2;
          // keep the wander zone a little back from the camera so the front row doesn't wall off the camp
          m.tx = Math.cos(ang) * r * (port ? 0.7 : 1.45); m.tz = Math.min(port ? 3.6 : 2.4, Math.sin(ang) * r * (port ? 1.05 : 0.75) - 0.3);
          // keep targets inside what the camera can see (the view widens toward the back)
          const xm = (port ? 2.6 : 3.7) - m.tz * (port ? 0.25 : 0.35);
          m.tx = Math.max(-xm, Math.min(xm, m.tx));
          if (!this.props.userData.keepOut.some(([px, pz, pr]) => Math.hypot(m.tx - px, m.tz - pz) < pr)
            && !this.g.showcase.some((o) => o !== c && o.camp && Math.hypot(m.tx - o.camp.tx, m.tz - o.camp.tz) < 1.3)) break;
        }
        m.wait = m.act ? 0 : 1 + Math.random() * 3;
        m.walkT = 0;
      }
      if (m.act && !m.doing && !walking && Math.hypot(m.x - m.act.x, m.z - m.act.z) < 0.3) {
        // arrived: settle in for a while
        m.doing = m.act.kind; m.wait = 5 + Math.random() * 4; m.face = m.act.face;
      }
      if (!walking && !m.doing) {
        // standing critters shuffle apart so nobody idles inside a friend
        for (const o of this.g.showcase) {
          if (o === c || !o.camp) continue;
          const ox = m.x - o.camp.x, oz = m.z - o.camp.z, od = Math.hypot(ox, oz);
          if (od < 0.85 && od > 1e-3) { const k = (0.85 - od) * dt * 2; m.x += ox / od * k; m.z += oz / od * k; if (!m.chase) { m.tx = m.x; m.tz = m.z; } }
        }
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
      if (m.doing && !walking && c !== this.sel) {
        const br = Math.sin(c.t * 1.6 + c.idx);
        if (m.doing === 'fire') {
          // sit and hold paws out to the warmth
          P.y = -0.12; P.legL = P.legR = -1.3; P.armLx = P.armRx = -1.1 + Math.sin(c.t * 3) * 0.08; P.lean = 0.1;
          if (m.wait < 4 && m.wait > 3.9) c.emote('happy', 'smile', 1);
        } else if (m.doing === 'nap') {
          // curl up and snooze, with a floating z now and then
          P.y = -0.2; P.legL = P.legR = -1.3; P.head = 0.35 + br * 0.04; P.headRoll = 0.25; P.sy = 1 + br * 0.04; P.armLx = P.armRx = -0.4;
          c.emote('closed', 'o', 0.2);
          if (Math.random() < dt * 0.8) this.g.fx.text({ x: m.x + 0.3, y: 1.4, z: m.z }, 'z', 'zzz', 1.4);
        } else if (m.doing === 'picnic') {
          P.y = -0.12; P.legL = P.legR = -1.3;
          if (Math.sin(c.t * 0.9 + c.idx) > 0.3) { P.head = 0.25 + Math.abs(Math.sin(c.t * 16)) * 0.2; P.armLx = P.armRx = -1.3; c.emote('happy', 'grin', 0.2); }
        }
      }
      // now and then an idle critter shows off a little type quirk
      if (!walking && !m.doing && !m.chase && c !== this.sel && !(m.pet > 0) && !(m.munch > 0) && !m.quirk && Math.random() < dt * 0.05) m.quirk = 2.2;
      if (m.quirk > 0) {
        m.quirk -= dt;
        if (walking || c === this.sel) m.quirk = 0; else quirk(c, P, 2.2 - m.quirk, m, this.g.fx);
        if (m.quirk <= 0) m.quirk = 0;
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

// idle quirks, by type (and a couple of species): k = seconds in, 0..2.2
function quirk(c, P, k, m, fx) {
  const at = (y, sp = 0.5) => ({ x: m.x + (Math.random() - 0.5) * sp, y, z: m.z + (Math.random() - 0.5) * sp });
  const id = c.def.id, type = c.def.type;
  if (id === 'diggles') { // ducks into the ground and pops back up
    const d = k < 0.4 ? k / 0.4 : k < 1.4 ? 1 : Math.max(0, 1 - (k - 1.4) / 0.2);
    P.y = -d * 1.1; P.armLz = P.armRz = 2.4;
    if (k > 0.3 && k < 1.5 && Math.random() < 0.4) fx.spawn({ ...at(0.1, 0.7), vy: 1.5, color: 0x8a6a4a, size: 0.35, life: 0.5, shape: 'puff', additive: false, grav: 5 });
    if (k > 1.6) { c.emote('happy', 'grin', 0.3); P.sy = 1.15; }
    return;
  }
  if (id === 'ripples') { // rolls onto its back for a little float
    const d = k < 0.3 ? k / 0.3 : k < 1.8 ? 1 : Math.max(0, 1 - (k - 1.8) / 0.3);
    P.lean = -1.0 * d; P.legL = P.legR = -0.8 * d; P.armLx = P.armRx = -1.4 * d; P.armLz = P.armRz = 0.5 + Math.abs(Math.sin(k * 8)) * 0.4 * d;
    c.emote('happy', 'grin', 0.2);
    if (Math.random() < 0.1) fx.spawn({ ...at(0.6, 0.6), vy: 0.8, color: 0x9fe0ff, size: 0.35, life: 1, shape: 'ring', additive: false, alpha: 0.7 });
    return;
  }
  if (id === 'lilypop') { // big hop
    const ph = Math.min(1, k / 0.8);
    P.y = Math.sin(ph * Math.PI) * 0.8; P.legL = P.legR = ph < 0.5 ? -0.9 : 0.6; P.armLz = P.armRz = 1;
    c.emote('happy', 'open', 0.2);
    return;
  }
  c.emote('happy', k < 1.2 ? 'open' : 'grin', 0.2);
  if (type === 'fire') { P.sy = 1.08; P.head = -0.3; if (Math.random() < 0.5) fx.spawn({ ...at(1.3), vy: 1.5, color: Math.random() < 0.5 ? 0xff8a2a : 0xffd04a, size: 0.3, life: 0.5, shape: 'glow', grow: -0.6 }); }
  else if (type === 'water') { P.head = -0.25; if (Math.random() < 0.15) fx.spawn({ ...at(1.3, 0.3), vy: 0.8, vx: (Math.random() - 0.5), color: 0x9fe0ff, size: 0.35, life: 1.2, shape: 'ring', additive: false, alpha: 0.7 }); }
  else if (type === 'leaf') { P.armLz = P.armRz = 2.2 + Math.sin(k * 10) * 0.2; if (Math.random() < 0.2) fx.spawn({ ...at(1.8, 1.2), vy: -0.6, color: 0x7cff6a, size: 0.25, life: 1.4, shape: 'leaf', additive: false, spin: 5, drag: 1 }); }
  else if (type === 'spark') { P.roll = Math.sin(k * 40) * 0.12; if (Math.random() < 0.35) fx.spawn({ ...at(0.6 + Math.random() * 0.8, 0.9), color: 0xfff060, size: 0.5, life: 0.12, shape: 'bolt', rot: Math.random() * 6 }); }
  else if (type === 'stone') { P.armLx = P.armRx = -1.2; P.armLz = 1.6 + Math.sin(k * 6) * 0.6; P.armRz = 1.6 - Math.sin(k * 6) * 0.6; P.sy = 1.05; }
  else { P.yaw = (k / 2.2) * Math.PI * 2; P.armLz = P.armRz = 1.4; if (Math.random() < 0.2) fx.spawn({ ...at(0.5, 1.2), vy: 1.4, color: 0xffffff, size: 0.28, life: 0.5, shape: 'leaf', additive: false, spin: 6 }); }
}

// campfire, tent, picnic blanket and a berry basket, kept at the edges so the critters have room
function buildProps(cups) {
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
  // no lights here: adding one would recompile every shader on the way in and out
  // spots where a critter can settle in: warm up by the fire, nap at the tent door, picnic on the blanket
  const spots = [];
  for (const a of [-1.0, -1.6, -2.2]) spots.push({ kind: 'fire', prop: 0, x: -2.9 + Math.cos(a) * 1.15, z: -1.3 + Math.sin(a) * 1.15, face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
  const td = -0.6; // the tent faces along its rotated +z
  spots.push({ kind: 'nap', prop: 1, x: 3.3 + Math.sin(td) * 1.5, z: -2.5 + Math.cos(td) * 1.5, face: td });
  for (const a of [Math.PI + 0.4, Math.PI * 1.5 + 0.2]) spots.push({ kind: 'picnic', prop: 2, x: 2.6 + Math.cos(a) * 1.15, z: 1.9 + Math.sin(a) * 1.15, face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
  const keepOut = [[-2.9, -1.3, 1.0], [3.3, -2.5, 1.7], [2.6, 1.9, 1.3]];
  // trophies: a bunting line with a pennant for every cup cleared, and a hot-air balloon once the Sky Cup is won
  const won = CUPS.filter((c) => cups[c.id]);
  const pennants = [];
  if (won.length) {
    const x0 = -2.8, x1 = 1.8, z = -4.3, H = 1.9, pole = toon(0xb07a4a);
    for (const x of [x0, x1]) {
      const p = inked(new THREE.CylinderGeometry(0.06, 0.07, H + 0.2, 8), pole, OL * 0.5);
      p.position.set(x, (H + 0.2) / 2, z); g.add(p);
      const knob = inked(new THREE.SphereGeometry(0.1, 10, 8), toon(0xffd04a), OL * 0.4);
      knob.position.set(x, H + 0.25, z); g.add(knob);
    }
    // the string sags between the poles
    const N = 24, sag = (u) => H - Math.sin(u * Math.PI) * 0.35, ropePts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; ropePts.push(new THREE.Vector3(x0 + (x1 - x0) * u, sag(u), z)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts), 32, 0.022, 5), toon(0xfff4e0)));
    const tri = new THREE.Shape([new THREE.Vector2(-0.24, 0), new THREE.Vector2(0.24, 0), new THREE.Vector2(0, -0.5)]);
    const triG = new THREE.ShapeGeometry(tri);
    won.forEach((c, i) => {
      const u = (i + 1) / (won.length + 1);
      const pn = new THREE.Group();
      pn.position.set(x0 + (x1 - x0) * u, sag(u), z);
      pn.userData.ph = i * 1.3;
      const flag = new THREE.Mesh(triG, toon(new THREE.Color(c.color).getHex(), { side: THREE.DoubleSide }));
      pn.add(flag);
      const star = new THREE.Mesh(new THREE.CircleGeometry(0.07, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      star.position.set(0, -0.17, 0.005); pn.add(star);
      g.add(pn); pennants.push(pn);
    });
  }
  if (cups.grove) {
    // the Glowcap Cup prize: a cluster of glowing toadstools
    const shroom = new THREE.Group();
    shroom.position.set(4.6, 0, 0.6);
    const stalk = toon(0xf4e8d0), glowM = new THREE.MeshBasicMaterial({ color: 0x9affd8 });
    for (const [x, z, sc, col] of [[0, 0, 1, 0x2fc8a8], [0.55, 0.35, 0.6, 0xff7ab0], [-0.45, 0.3, 0.5, 0x8a6aff]]) {
      const st = inked(new THREE.CylinderGeometry(0.12 * sc, 0.18 * sc, 0.8 * sc, 8), stalk, OL * 0.5);
      st.position.set(x, 0.4 * sc, z); shroom.add(st);
      const cap = inked(new THREE.SphereGeometry(0.5 * sc, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(col), OL * 0.6);
      cap.scale.set(1, 0.75, 1); cap.position.set(x, 0.75 * sc, z); shroom.add(cap);
      for (let k = 0; k < 4; k++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.07 * sc, 6, 4), glowM);
        const a = k * 1.6 + x; d.position.set(x + Math.cos(a) * 0.3 * sc, 0.75 * sc + 0.28 * sc, z + Math.sin(a) * 0.3 * sc); shroom.add(d);
      }
    }
    g.add(shroom);
    keepOut.push([4.6, 0.6, 0.9]);
  }
  let balloon = null;
  if (cups.sky) {
    const tex = canvasTex(128, 64, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#fff4e0' : '#ff6a8a'; c.fillRect(k * w / 8, 0, w / 8 + 1, h); } });
    const bg = new THREE.Group(); // the whole balloon bobs
    const env = new THREE.SphereGeometry(1.15, 22, 16); env.scale(1, 1.18, 1);
    const e = inked(env, toon(0xffffff, { map: tex, rim: 0.3 }), OL * 1.2);
    e.position.y = 3.25; bg.add(e);
    const bask = inked(new THREE.CylinderGeometry(0.42, 0.34, 0.5, 12), toon(0x9a6a3a), OL * 0.7);
    bask.position.y = 0.55; bg.add(bask);
    const ropes = [];
    for (let k = 0; k < 4; k++) { const rg = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4); rg.translate(Math.cos(k * 1.57 + 0.78) * 0.36, 1.55, Math.sin(k * 1.57 + 0.78) * 0.36); ropes.push(rg); }
    bg.add(new THREE.Mesh(mergeGeometries(ropes), toon(0x6a4a3a)));
    const bw = new THREE.Group();
    bw.position.set(-4.4, 0, -3.0);
    bw.scale.setScalar(0.72);
    bw.add(bg);
    // tether stake and line
    const stake = inked(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), toon(0x8a5a32), OL * 0.4);
    stake.position.set(0.7, 0.2, 0.3); bw.add(stake);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 4), toon(0xfff4e0));
    line.position.set(0.5, 0.4, 0.2); line.rotation.z = 0.9; bw.add(line);
    g.add(bw);
    balloon = bg;
    keepOut.push([-4.4, -3.0, 0.8]);
  }
  g.traverse((o) => { if (o.isMesh && !o.userData.hull) o.castShadow = true; });
  g.userData = { fire: fire.position, flames, spots, keepOut, balloon, pennants };
  return g;
}
