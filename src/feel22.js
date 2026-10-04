import * as THREE from 'three';
import { setupFoes22, DIFFICULTY } from './foes22.js';
import { saveGame } from './save.js';
import { haptic } from './sheets.js';
import { t } from './i18n.js';

// Round 22: gameplay. Combat feel (heavier hit-stop, a kill beat, a clearer and slightly wider parry window), smarter
// auto-target on touch, the new foes mixed into the packs, pack leaders, the difficulty setting, and the close camera
// as a choice anywhere (Settings → Controls).
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();

export function setupFeel22(g) {
  const p = g.player;
  setupFoes22(g);
  g.diff = () => DIFFICULTY[g.difficulty] || DIFFICULTY.normal;

  // ---------------- smarter auto-target: what he faces (or steers toward), the wounded, the man already fought
  g.pickTarget = (r) => {
    if (g.hover && !g.hover.dead && g.hover.pos.distanceTo(p.pos) < r) return g.hover;
    if (g.lockOn && !g.lockOn.dead && !g.lockOn.ghost && g.lockOn.pos.distanceTo(p.pos) < r * 1.3) return g.lockOn;
    if (p.target && !p.target.dead && !p.target.ghost && p.target.pos.distanceTo(p.pos) < r * 1.15) return p.target; // sticky
    const j = g.joyWorld ? g.joyWorld() : null, steer = j && Math.hypot(j.x, j.z) > 0.25 ? Math.atan2(j.x, j.z) : p.facing;
    const fx = Math.sin(steer), fz = Math.cos(steer);
    let best = null, bs = 1e9;
    for (const e of g.enemies) {
      if (e.dead || e.hidden || e.ghost || e.parked || e.rig.visible === false) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz); if (d > r) continue;
      const facing = d > 0.01 ? (dx * fx + dz * fz) / d : 1; // 1 ahead, -1 behind
      let sc = d + (1 - facing) * 2.6;
      if (e.hp < e.maxHp * 0.3) sc -= 1.2;            // finish the wounded
      if (e === g.lastTarget && g.lastTargetT > 0) sc -= 1.5;
      if (e.leader) sc -= 0.8;                          // leaders are worth turning for
      if (e.T?.static) sc += 3;                         // engines last
      if (sc < bs) { bs = sc; best = e; }
    }
    return best;
  };
  // game-time timers (they pause with the game and run under __sim in tests, unlike setTimeout)
  const timers = []; g.after = (sec, fn) => timers.push({ t: sec, fn });
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => { prevTick?.(dt); g.lastTargetT = Math.max(0, (g.lastTargetT || 0) - dt); for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const T = timers.splice(i, 1)[0]; T.fn(); } tick(dt); };

  // ---------------- combat feel
  const dmgE = g.damageEnemy.bind(g);
  g.damageEnemy = (e, d, crit, src, kind = 'normal', o = {}) => {
    const wasAlive = !e.dead, before = g.hitStop || 0;
    dmgE(e, d, crit, src, kind, o);
    if (kind === 'dot' || !wasAlive) return;
    // heavier hit-stop on solid blows (most of all for the heavy weapons), and a short beat on a kill
    if (g.hitStop > before) g.hitStop = Math.min(0.16, g.hitStop * 1.35);
    if (e.dead) { g.hitStop = Math.max(g.hitStop, e.elite || e.leader ? 0.11 : 0.06); if (e.elite || e.leader) { g.slowMo = Math.max(g.slowMo || 0, 0.25); g.shake = Math.max(g.shake, 0.3); } haptic(e.elite ? 22 : 9); }
    else if (crit) haptic(12);
  };
  // the parry cue: the glint is bigger and brighter, a ring flashes under the attacker, the phone ticks
  const tell = g.telegraphTell.bind(g);
  g.telegraphTell = (e) => {
    tell(e);
    if (e.pos.distanceTo(p.pos) < 7) { g.fx.ring?.(V(e.pos.x, e.pos.y + 0.06, e.pos.z), new THREE.Color(3, 2.5, 1.4), 0.3, 1.5, 0.3); haptic(6); }
  };
  // difficulty on the blows Salim takes; a parry (now 0.26 s into the evade, game.js) heals a little and fills mana
  const hurt = g.damagePlayer.bind(g);
  g.damagePlayer = (d, src, attacker = null) => {
    const hp0 = p.hp; hurt(d * g.diff().dmg, src, attacker);
    if (p.hp === hp0 && attacker && p.rollT > 0 && p.rollAge < 0.26) { p.mp = Math.min(p.stats.maxMp, p.mp + 8); p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.03); }
  };

  // when a leader falls, his men falter
  const prevKill = g.onKill;
  g.onKill = (e) => {
    prevKill?.(e);
    if (!e.leader) return;
    let n = 0;
    for (const m of g.enemies) if (!m.dead && m !== e && m.rallyBy === e) { m.rallyBy = null; m.dmg = m.baseDmg ?? m.dmg; m.staggerT = Math.max(m.staggerT || 0, 1.3); m.st.action = null; n++; }
    if (n) { g.ui.damageNumber(e.pos, t('They falter'), 'stagger'); g.audio.stinger?.('phase'); }
  };
  // hard: a little more of the loot is rare
  const drop = g.dropItem.bind(g);
  g.dropItem = (item, at) => { if (g.diff().loot && item.slot && item.rarity === 'magic' && Math.random() < g.diff().loot * 4) item.rarity = 'rare'; return drop(item, at); };
  // a share of the XP by difficulty
  const xpFor = g.xpFor.bind(g);
  g.xpFor = (l) => Math.round(xpFor(l) / g.diff().xp);

  function tick(dt) {
    // leaders rally the men round them (+20% damage while he stands and the fight is on)
    for (const L of g.enemies) {
      if (!L.leader || L.dead || L.parked) continue;
      if (L.pennant) L.pennant.rotation.y = Math.sin(g.t * 3 + L.pos.x) * 0.4;
      if (!L.alerted) continue;
      for (const m of g.enemies) if (!m.dead && m !== L && !m.leader && !m.boss && m.pos.distanceTo(L.pos) < 9) { if (m.rallyBy !== L) { m.rallyBy = L; m.dmg = (m.baseDmg ?? m.dmg) * 1.2; } }
    }
    // a bowman sheltering behind his shield-bearer drifts to his back
    for (const pv of g.enemies) if (pv.type === 'pavise' && pv.ward && !pv.dead && pv.alerted) { const B = pv.ward; if (B.dead || !B.moveHint || B.st.action) continue; tmp.subVectors(B.moveHint, B.pos).setY(0); const l = tmp.length(); if (l > 0.3) B.pos.addScaledVector(tmp.divideScalar(l), Math.min(l, 3 * dt)); }
  }
  g.saveDifficulty = () => saveGame(g);
}
