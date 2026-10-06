// Round 25: combat feel and the act bosses.
// - Boss stagger: every act boss has a poise bar (under his life bar). Filling it breaks him for ~3 s: he reels,
//   takes bonus damage (the old staggered ×1.5), and the next break needs a little more.
// - Melee combos: up close a boss strings two swings and a heavy finisher. The finisher flashes a glint and can be
//   parried (an evade started just before it lands), which tears off half his poise.
// - A signature move each: Bardanes charges behind his shield, Kallinikos sends liquid fire spreading across the ground
//   in lanes, Krateros brings the burning stalls down in a ring around Salim (one way out), Arsaber stands on guard and
//   ripostes anyone who strikes into it.
// - The last foe of a fight falls in a short slow-motion beat.
// Round 26: the second half of each fight plays differently (sig2, alternating with the first signature):
//   Bardanes calls up a standard and two men and charges twice; Kallinikos sends liquid fire out in rings with gaps;
//   Krateros drags burning beams down lanes that keep burning; Arsaber feints (a first glint with no blow behind it).
import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { resolve } from './collision.js';
import { t } from './i18n.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const GOLD = new THREE.Color(3.2, 2.4, 1.0), WHITE = new THREE.Color(3.4, 3.2, 2.8), FIRE = new THREE.Color(3.5, 1.2, 0.25);

// per boss type: the combo (clip, duration, hit point 0..1, reach, damage ×, arc) and the signature move
const KITS = {
  commander: { combo: [['slashA', 0.8, 0.55, 3.0, 0.7], ['slashB', 0.75, 0.55, 3.0, 0.7], ['slam', 1.25, 0.62, 3.4, 1.35, 'ring']], sig: 'charge', sig2: 'doubleCharge', sigCd: 13 },
  rawh: { combo: [['sweep', 0.85, 0.55, 3.2, 0.7], ['chop', 1.15, 0.62, 3.0, 1.25, 'ring']], sig: 'fireline', sig2: 'firewave', sigCd: 12 },
  utba: { combo: [['slashA', 0.75, 0.55, 3.0, 0.65], ['thrust', 0.7, 0.55, 3.6, 0.7], ['slam', 1.2, 0.62, 3.4, 1.3, 'ring']], sig: 'collapse', sig2: 'beams', sigCd: 14 },
  ghanim: { combo: [['thrust', 0.6, 0.55, 3.8, 0.65], ['thrustHigh', 0.6, 0.55, 3.8, 0.65], ['sweep', 1.0, 0.6, 3.4, 1.25, 'arc']], sig: 'guard', sig2: 'feint', sigCd: 9 },
  // Round 26: Arsaber's second half: a false glint first, then the real blow on the second glint
  ghanimFeint: [['thrustHigh', 0.55, 0.6, 3.8, 0, 'feint'], ['sweep', 0.85, 0.55, 3.6, 1.35, 'arc']],
};

export function setupCombat25(g) {
  const baseAI = g.bossAI.bind(g), baseDmg = g.damageEnemy.bind(g), baseDP = g.damagePlayer.bind(g), baseKill = g.killEnemy.bind(g);

  const init = (b) => {
    if (b.r25) return b.r25;
    const K = KITS[b.type] || null;
    b.maxPoise = b.poise = Math.max(60, Math.round(b.maxHp * 0.022));
    b.staggerT = 0;
    return (b.r25 = { K, combo: null, sig: null, sigCd: 8, breaks: 0, guard: null, parryable: false, hint: false });
  };

  // ---------------------------------------------------------------- poise bar under the boss bar
  let pb = null;
  const poiseBar = (b) => {
    if (!pb) {
      const bar = document.querySelector('#bossbar .bbar'); if (!bar) return;
      pb = document.createElement('div'); pb.className = 'bpoise'; pb.innerHTML = '<i></i>'; bar.after(pb);
    }
    const f = b.staggerT > 0 ? b.staggerT / 3.2 : 1 - Math.max(0, b.poise) / b.maxPoise;
    pb.firstChild.style.width = (Math.min(1, f) * 100).toFixed(1) + '%';
    pb.classList.toggle('broken', b.staggerT > 0);
  };

  const breakBoss = (b, why) => {
    const R = b.r25;
    R.combo = null; R.sig = null; R.guard = null; R.parryable = false; b.lunge = null;
    b.staggerT = 3.2; b.st.action = null; b.moving = false;
    R.breaks++; b.maxPoise = b.poise = Math.round(b.maxPoise * 1.2);
    g.ui.damageNumber(b.pos, why === 'parry' ? 'Parried · Broken!' : 'Broken!', 'stagger');
    g.audio.stagger?.(); g.audio.clang?.(); g.hitStop = Math.max(g.hitStop, 0.16); g.slowMo = Math.max(g.slowMo || 0, 0.5); g.shake = Math.max(g.shake, 0.5);
    g.fx.ring(b.pos, GOLD, 0.6, 5, 0.5, 0.9);
    g.fx.sparks(tmp.copy(b.pos).setY(b.pos.y + 2.6), new THREE.Color(5, 4, 2));
    if (!R.hint && !g.cinematic) { R.hint = true; g.ui.toast('He reels: strike now!', 'quest'); }
  };

  // ---------------------------------------------------------------- melee combo
  const startCombo = (b, steps) => {
    const R = b.r25; R.combo = { steps, i: 0, t: 0, hit: false }; b.moving = false;
    beginStep(b);
  };
  const beginStep = (b) => {
    const C = b.r25.combo, [clip, dur, , reach, , shape] = C.steps[C.i];
    b.st.action = clip; b.st.actionT = 0; C.t = 0; C.hit = false;
    b.r25.parryable = !!shape && shape !== 'feint';
    if (shape) {
      // the finisher: a glint on the blade and its ground marked a beat ahead
      g.telegraphTell(b); setTimeout(() => !b.dead && b.r25.combo && g.telegraphTell(b), 160);
      const at = tmp.set(Math.sin(b.facing), 0, Math.cos(b.facing)).multiplyScalar(shape === 'ring' ? 2.2 : 1.6).add(b.pos);
      at.y = heightAt(at.x, at.z); C.at = at.clone();
      g.telegraph(C.at, reach, dur * 0.62, null);
    }
  };
  const comboTick = (b, dt) => {
    const C = b.r25.combo, p = g.player, [, dur, hitAt, reach, dmgK, shape] = C.steps[C.i];
    C.t += dt; b.st.actionT = Math.min(1, C.t / dur);
    // turn toward Salim until the blow commits, and step into each swing
    if (b.st.actionT < hitAt * 0.8) { const face = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z); b.facing += angDiff(b.facing, face) * Math.min(1, dt * 5); }
    if (b.st.actionT > 0.25 && b.st.actionT < hitAt) { b.pos.addScaledVector(tmp.set(Math.sin(b.facing), 0, Math.cos(b.facing)), dt * 1.8); resolve(b.pos, b.radius); b.pos.y = heightAt(b.pos.x, b.pos.z); }
    if (!C.hit && b.st.actionT >= hitAt && shape === 'feint') {
      C.hit = true; b.r25.parryable = false; g.audio.whoosh?.();
      (g.ui.bossCall?.(t('Feint!')) || g.ui.damageNumber(b.pos, t('Feint!'), 'block'));
      if (!b.r25.feintHint && !g.cinematic) { b.r25.feintHint = true; g.ui.toast('A feint: wait for the second glint', 'quest'); }
    }
    if (!C.hit && b.st.actionT >= hitAt) {
      C.hit = true;
      const c = shape === 'ring' ? C.at : b.pos, d = p.pos.distanceTo(c);
      const fwd = tmp.set(Math.sin(b.facing), 0, Math.cos(b.facing)), to = tmp2.copy(p.pos).sub(b.pos).setY(0).normalize();
      const inArc = shape === 'ring' ? d < reach : d < reach && fwd.dot(to) > (shape === 'arc' ? -0.2 : 0.25);
      if (shape === 'ring') { g.audio.boom(); g.shake = Math.max(g.shake, 0.6); g.fx.ring(c, new THREE.Color(2.2, 1.8, 1.2), 0.6, reach + 0.6, 0.4); g.fx.dust(c, 18, 2); g.decal?.(c, 3, 'scorch'); }
      else { g.audio.whoosh?.(); g.fx.dust(tmp2.copy(b.pos).addScaledVector(fwd, 1.6), 5, 1); }
      if (inArc) g.damagePlayer(b.dmg * dmgK, b.pos, b);
      b.r25.parryable = false;
    }
    if (C.t >= dur) {
      if (++C.i >= C.steps.length) { b.r25.combo = null; b.st.action = null; b.atkCd = 2.4; return; }
      beginStep(b);
    }
  };

  // ---------------------------------------------------------------- signature moves
  const SIGS = {
    // Bardanes lowers his shield and charges down a marked lane; if he misses he is winded (open to blows)
    charge(b, again = false) {
      const p = g.player, dir = tmp.copy(p.pos).sub(b.pos).setY(0); const d = dir.length(); if (d < (again === 'back' ? 1 : 5) || d > 22) return null;
      dir.normalize(); const D = dir.clone(), end = b.pos.clone().addScaledVector(D, Math.min(18, d + 4)); end.y = heightAt(end.x, end.z);
      if (again === 'back') end.copy(b.pos).addScaledVector(D, Math.max(10, d + 5)).setY(0), end.y = heightAt(end.x, end.z);
      for (let i = 1; i <= 6; i++) { const q = b.pos.clone().lerp(end, i / 6); q.y = heightAt(q.x, q.z); g.telegraph(q, 1.7, 0.95, null); }
      b.st.action = 'command'; b.st.actionT = 0.2; g.audio.roar?.();
      (g.ui.bossCall?.(t('Shield charge')) || g.ui.damageNumber(b.pos, t('Shield charge'), 'stagger'));
      let w = 0.95, hit = false;
      return (dt) => {
        b.facing = Math.atan2(D.x, D.z);
        if (w > 0) { w -= dt; b.st.actionT = Math.min(0.9, b.st.actionT + dt); return true; }
        b.st.action = 'thrust'; b.st.actionT = 0.35;
        b.pos.addScaledVector(D, 24 * dt); resolve(b.pos, b.radius); b.pos.y = heightAt(b.pos.x, b.pos.z);
        if (Math.random() < 0.7) g.fx.dust(b.pos, 3, 1.1);
        if (!hit && b.pos.distanceTo(p.pos) < 2.3) { hit = true; g.damagePlayer(b.dmg * 1.15, b.pos, b); g.shake = 0.6; }
        if (b.pos.distanceTo(end) < 1 || tmp2.copy(end).sub(b.pos).dot(D) < 0) {
          g.audio.boom?.(); g.fx.ring(b.pos, new THREE.Color(2, 1.4, 0.8), 0.5, 3.4, 0.35); b.st.action = null;
          if (!hit && again !== true) { b.staggerT = 1.6; g.ui.damageNumber(b.pos, 'Winded', 'stagger'); } // the miss is the punish window
          return false;
        }
        return true;
      };
    },
    // Kallinikos: liquid fire poured from the siphons spreads outward in lanes; stand between them
    fireline(b) {
      const p = g.player, face = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z), n = b.phase >= 2 ? 5 : 3;
      b.st.action = 'cast'; b.st.actionT = 0; g.audio.whoosh?.();
      for (let l = 0; l < n; l++) {
        const a = face + (l - (n - 1) / 2) * (b.phase >= 2 ? 0.42 : 0.55), dx = Math.sin(a), dz = Math.cos(a);
        for (let i = 1; i <= 8; i++) {
          const q = new THREE.Vector3(b.pos.x + dx * (1.4 + i * 2.1), 0, b.pos.z + dz * (1.4 + i * 2.1)); q.y = heightAt(q.x, q.z);
          g.telegraph(q, 1.25, 0.75 + i * 0.13, () => {
            g.fx.burst(tmp.copy(q).setY(q.y + 0.3), 14, { speed: 3, life: 0.5, size: 0.6, size1: 0.1, color: FIRE, up: 2, drag: 2 });
            g.decal(q, 2.4, 'scorch'); g.fires2.push({ pos: q.clone(), r: 1.25, life: 4.5, t: 0, tick: 0, dmg: b.dmg * 0.22 });
            if (p.pos.distanceTo(q) < 1.3) g.damagePlayer(b.dmg * 0.45, q);
          });
        }
      }
      let tt = 0; return (dt) => { tt += dt; b.st.actionT = Math.min(1, tt / 1.2); if (tt > 1.2) { b.st.action = null; return false; } return true; };
    },
    // Krateros: the burning stalls come down in a ring around Salim, with one gap; then the middle falls in
    collapse(b) {
      const p = g.player, c = p.pos.clone(), gap = Math.floor(Math.random() * 9), N = 9, R = 4.6;
      b.st.action = 'command'; b.st.actionT = 0; g.audio.roar?.();
      g.ui.damageNumber(c, 'Find the way out!', 'stagger');
      for (let i = 0; i < N; i++) {
        if (i === gap) continue;
        const a = (i / N) * Math.PI * 2, q = new THREE.Vector3(c.x + Math.cos(a) * R, 0, c.z + Math.sin(a) * R); q.y = heightAt(q.x, q.z);
        g.telegraph(q, 1.9, 1.25, () => { g.fx.dust(q, 10, 1.6); g.decal(q, 3.4, 'scorch'); g.fires2.push({ pos: q.clone(), r: 1.9, life: 5, t: 0, tick: 0, dmg: b.dmg * 0.25 }); if (p.pos.distanceTo(q) < 1.9) g.damagePlayer(b.dmg * 0.5, q); });
      }
      const mid = c.clone(); mid.y = heightAt(mid.x, mid.z);
      g.telegraph(mid, R - 0.4, 2.2, () => {
        g.audio.boom(); g.shake = Math.max(g.shake, 0.7); g.fx.flash(tmp.copy(mid).setY(mid.y + 2), 0xff6020, 30, 0.4, 12);
        g.fx.burst(tmp.copy(mid).setY(mid.y + 0.3), 40, { speed: 6, life: 0.6, size: 0.7, size1: 0.1, color: FIRE, up: 2, drag: 2 }); g.decal(mid, 6, 'scorch');
        if (p.pos.distanceTo(mid) < R - 0.4) g.damagePlayer(b.dmg * 1.1, mid);
      }, true);
      let tt = 0; return (dt) => { tt += dt; b.st.actionT = Math.min(1, tt / 1.4); if (tt > 1.4) { b.st.action = null; return false; } return true; };
    },
    // Arsaber: blade raised on guard. Strike into it and he ripostes (parryable); wait it out and he lunges
    guard(b) {
      const R = b.r25; R.guard = { t: b.phase >= 2 ? 2.0 : 2.6, glintT: 0 };
      (g.ui.bossCall?.(t('On guard')) || g.ui.damageNumber(b.pos, t('On guard'), 'block'));
      return (dt) => {
        const G = R.guard; if (!G) return false;
        b.moving = false; b.st.action = 'thrustHigh'; b.st.actionT = 0.18;
        const p = g.player; b.facing += angDiff(b.facing, Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z)) * Math.min(1, dt * 4);
        if ((G.glintT -= dt) <= 0) { G.glintT = 0.5; g.fx.glow.spawn({ pos: { x: b.pos.x, y: b.pos.y + 2.4, z: b.pos.z }, life: 0.4, size: 0.7, size1: 0.2, color: WHITE }); }
        if ((G.t -= dt) <= 0) { R.guard = null; b.st.action = null; startCombo(b, KITS.ghanim.combo); return false; }
        return true;
      };
    },
    // ---- Round 26: the second half
    // Bardanes: down the lane and straight back up it; only the second miss winds him
    doubleCharge(b) {
      const first = SIGS.charge(b, true); if (!first) return null;
      let second = null;
      return (dt) => {
        if (!second) {
          if (first(dt)) return true;
          second = SIGS.charge(b, 'back'); if (!second) return false;
          (g.ui.bossCall?.(t('Again!')) || g.ui.damageNumber(b.pos, t('Again!'), 'stagger')); return true;
        }
        return second(dt);
      };
    },
    // Kallinikos: fire on the water: two rings of liquid fire roll outward from him, each with a gap to stand in; it burns on
    firewave(b) {
      const p = g.player; b.st.action = 'cast'; b.st.actionT = 0; g.audio.roar?.();
      (g.ui.bossCall?.(t('Fire on the water!')) || g.ui.damageNumber(b.pos, t('Fire on the water!'), 'stagger'));
      const toHero = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
      [[4.2, 0.9], [7.6, 1.6]].forEach(([R, delay], k) => {
        const N = Math.round((Math.PI * 2 * R) / 2.3), gapA = toHero + (k ? 1 : -1) * (0.6 + Math.random() * 1.2);
        for (let i = 0; i < N; i++) {
          const a = (i / N) * Math.PI * 2; if (Math.abs(angDiff(a, gapA)) < 2.4 / R) continue; // the gap: about two flames wide
          const q = new THREE.Vector3(b.pos.x + Math.sin(a) * R, 0, b.pos.z + Math.cos(a) * R); q.y = heightAt(q.x, q.z);
          g.telegraph(q, 1.3, delay + (i % 2) * 0.05, () => {
            g.fx.burst(tmp.copy(q).setY(q.y + 0.3), 10, { speed: 3, life: 0.5, size: 0.6, size1: 0.1, color: FIRE, up: 2, drag: 2 });
            g.decal(q, 2.4, 'scorch'); g.fires2.push({ pos: q.clone(), r: 1.3, life: 6, t: 0, tick: 0, dmg: b.dmg * 0.2 });
            if (p.pos.distanceTo(q) < 1.35) g.damagePlayer(b.dmg * 0.45, q);
          });
        }
      });
      let tt = 0; return (dt) => { tt += dt; b.st.actionT = Math.min(1, tt / 1.3); if (tt > 1.3) { b.st.action = null; return false; } return true; };
    },
    // Krateros: burning beams dragged down three lanes at Salim, one after another; each lane burns on for a while
    beams(b) {
      const p = g.player; b.st.action = 'command'; b.st.actionT = 0; g.audio.roar?.();
      (g.ui.bossCall?.(t('Burning beams!')) || g.ui.damageNumber(b.pos, t('Burning beams!'), 'stagger'));
      for (let n = 0; n < 3; n++) setTimeout(() => {
        if (b.dead || g.cinematic) return;
        const from = b.pos.clone(), d = tmp2.copy(p.pos).sub(from).setY(0); if (d.lengthSq() < 1) return; d.normalize(); const D = d.clone();
        for (let i = 1; i <= 7; i++) {
          const q = from.clone().addScaledVector(D, 1.2 + i * 2); q.y = heightAt(q.x, q.z);
          g.telegraph(q, 1.25, 0.8 + i * 0.07, () => {
            g.fx.dust(q, 6, 1.2); g.decal(q, 2.4, 'scorch'); g.fires2.push({ pos: q.clone(), r: 1.25, life: 6.5, t: 0, tick: 0, dmg: b.dmg * 0.22 });
            if (p.pos.distanceTo(q) < 1.3) g.damagePlayer(b.dmg * 0.55, q);
          });
        }
      }, n * 700);
      let tt = 0; return (dt) => { tt += dt; b.st.actionT = Math.min(1, tt / 2.0); if (tt > 2.0) { b.st.action = null; return false; } return true; };
    },
    // Arsaber: a feint, then the real blow (parry the second glint, not the first)
    feint(b) {
      if (b.pos.distanceTo(g.player.pos) > 5.5) return SIGS.guard(b);
      startCombo(b, KITS.ghanimFeint); return null;
    },
  };
  g.SIGS25 = SIGS; g.KITS25 = KITS; g.startCombo25 = startCombo; // Round 28: bosses28.js adds the last-quarter moves

  const riposte = (b) => {
    const R = b.r25; R.guard = null; R.sig = null;
    g.ui.damageNumber(b.pos, 'Riposte!', 'crit'); g.audio.clang?.();
    g.fx.sparks(tmp.copy(b.pos).setY(b.pos.y + 2), WHITE);
    startCombo(b, [['thrust', 0.5, 0.5, 4.2, 1.4, 'arc']]);
  };

  // ---------------------------------------------------------------- hooks
  g.bossAI = (b, dt) => {
    const R = init(b);
    if (b.rise < 1 || !R.K) { if (R.K) poiseBar(b); return baseAI(b, dt); }
    poiseBar(b);
    if (b.staggerT > 0) {
      g.ui.bossBar(b.name, b.hp / b.maxHp);
      b.staggerT = Math.max(0, b.staggerT - dt); b.moving = false; b.st.action = null; b.st.hitT = Math.max(b.st.hitT || 0, 0.85);
      if (Math.random() < dt * 4) g.fx.glow.spawn({ pos: { x: b.pos.x + (Math.random() - 0.5), y: b.pos.y + 3.1, z: b.pos.z + (Math.random() - 0.5) }, life: 0.5, size: 0.35, size1: 0.05, color: GOLD });
      return;
    }
    if (g.cinematic || b.lunge) return baseAI(b, dt);
    if (b.phase < 2 && b.hp < b.maxHp * (b.kit?.phaseAt ?? 0.6) && !R.combo && !R.sig) return baseAI(b, dt); // Round 26: the phase change (and its scene) is the base AI's
    g.ui.bossBar(b.name, b.hp / b.maxHp);
    if (R.combo) { comboTick(b, dt); return; }
    if (R.sig) { if (!R.sig(dt)) R.sig = null; return; }
    if (!b.st.action) {
      const d = b.pos.distanceTo(g.player.pos);
      R.sigCd -= dt;
      if (b.phase >= 2 && !R.p2) { R.p2 = true; R.sigCd = Math.min(R.sigCd, 1.2); R.alt = false; g.onBossPhase26?.(b); }
      if (R.sigCd <= 0 && !g.player.dead) {
        R.sigCd = R.K.sigCd * (b.phase >= 2 ? 0.8 : 1);
        const k = g.pickSig28?.(b, R) || (b.phase >= 2 && R.K.sig2 && (R.alt = !R.alt) ? R.K.sig2 : R.K.sig); // the second half alternates, opening with the new move; Round 28: the last quarter adds a third (bosses28.js)
        R.sig = SIGS[k](b); if (R.sig || R.combo) return;
      }
      if (d < 4.6 && b.atkCd <= 0 && Math.random() < 0.7) { startCombo(b, R.K.combo); return; }
    }
    b.atkCd = Math.max(b.atkCd, 0); return baseAI(b, dt);
  };

  g.damageEnemy = (e, dmg, crit, src, kind = 'normal', o = {}) => {
    if (e.boss && e.r25?.guard && kind !== 'dot' && !e.dead) { riposte(e); return; }
    const hp0 = e.hp;
    baseDmg(e, dmg, crit, src, kind, o);
    if (e.boss && e.r25?.K && !e.dead && e.hp < hp0 && kind !== 'dot' && e.poise <= 0 && !(e.staggerT > 0)) breakBoss(e);
  };

  g.damagePlayer = (dmg, src, attacker = null) => {
    const p = g.player;
    if (attacker?.boss && attacker.r25?.parryable && p.rollT > 0 && p.rollAge < 0.22 && !p.dead) {
      const b = attacker; b.r25.parryable = false; b.r25.combo = null; b.st.action = null;
      g.ui.damageNumber(p.pos, 'Parry!', 'parry'); g.audio.clang(); g.fx.sparks(tmp.copy(p.pos).lerp(b.pos, 0.5).setY(p.pos.y + 1.3), new THREE.Color(5, 4, 2.4));
      g.hitStop = Math.max(g.hitStop, 0.12); g.slowMo = Math.max(g.slowMo || 0, 0.4); p.nextCrit = true; g.stats.parries = (g.stats.parries || 0) + 1; g.onParry?.();
      b.poise -= b.maxPoise * 0.5; if (b.poise <= 0) breakBoss(b, 'parry'); else b.staggerT = 0.9;
      return;
    }
    return baseDP(dmg, src, attacker);
  };

  // the last foe of a fight falls in a short slow-motion beat (a captain's or boss's has its own scene)
  let recent = 0;
  g.killEnemy = (e, src) => {
    const was = !e.dead && e.alerted;
    const r = baseKill(e, src);
    if (was && e.dead && !e.boss && !g.cinematic) {
      recent = Math.min(8, recent + 1);
      const p = g.player; let left = 0;
      for (const o of g.enemies) if (!o.dead && o.alerted && !o.hidden && Math.abs(o.pos.x - p.pos.x) < 22 && Math.abs(o.pos.z - p.pos.z) < 22) { left++; break; }
      if (!left && recent >= 3) { g.slowMo = Math.max(g.slowMo || 0, 0.55); g.hitStop = Math.max(g.hitStop, 0.08); recent = 0; }
    }
    return r;
  };
  const decay = setInterval(() => { recent = Math.max(0, recent - 1); }, 6000);
  g._combat25 = { KITS, breakBoss, decay };
}

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
