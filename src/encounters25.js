// Round 25: designed fights on each region's main path, so the walk between story sites has a rhythm.
// - Two ambushes per region (hub → first site, second site → last fight): Arsaber's men rise from cover around Salim,
//   and when the first wave is nearly down a second comes in from a flank with archers. Clearing it pays out.
// - One champion per region camped beside the path between the first two sites: a named elite with his retinue,
//   who calls out when he sees Salim and drops a guaranteed rare (sometimes legendary).
// Spawned with types the region already uses, so nothing new is sculpted or compiled mid-play.
import * as THREE from 'three';
import { SITES, heightAt, waterDepth } from './terrain.js';
import { findPath } from './nav.js';
import { resolve } from './collision.js';
import { REGION } from './region.js';
import { makeItem } from './items.js';
import { t } from './i18n.js';

const ROSTER = {
  sawad: { light: ['bandit', 'bandit', 'spearman'], ranged: ['archer', 'crossbow'], champ: 'guard', retinue: ['spearman', 'archer', 'bandit'], name: 'Rhaptes',
    call: 'Arsaber pays by the head. Yours will do.' },
  marsh: { light: ['reedman', 'netter', 'bandit'], ranged: ['slinger', 'slinger'], champ: 'netter', retinue: ['reedman', 'slinger', 'netter'], name: 'Kontos',
    call: 'The reeds are ours now, Baghdadi.' },
  karkh: { light: ['bandit', 'deserter', 'spearman'], ranged: ['archer', 'crossbow'], champ: 'guard', retinue: ['spearman', 'naffat', 'archer'], name: 'Mylonas',
    call: 'Your city burned before we came. We only warm our hands.' },
  docks: { light: ['guard', 'netter', 'bandit'], ranged: ['crossbow', 'archer'], champ: 'guard', retinue: ['crossbow', 'guard', 'netter'], name: 'Karykes',
    call: 'One more crate for the ship. You will fit in it.' },
}[REGION];

// a point a fraction of the way along a polyline (by length)
function along(path, f) {
  let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  let want = L * f;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], l = Math.hypot(b.x - a.x, b.z - a.z);
    if (want <= l) { const k = l ? want / l : 0; return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: (b.x - a.x) / (l || 1), dz: (b.z - a.z) / (l || 1) }; }
    want -= l;
  }
  const e = path[path.length - 1]; return { x: e.x, z: e.z, dx: 1, dz: 0 };
}
const dry = (x, z) => !(waterDepth?.(x, z) > 0.35);

export function setupEncounters25(g) {
  if (!ROSTER || !SITES?.village) return;
  const ENC = g.enc25 = [];
  const tmp = new THREE.Vector3();
  const rand = (a, b) => a + Math.random() * (b - a);

  const plan = () => {
    const V = SITES.village, S = SITES.serai, K = SITES.kiln, A = SITES.arch;
    const legs = [[V, S, 0.55, 'ambush'], [S, K, 0.5, 'champion'], [K, A, 0.5, 'ambush']];
    for (const [a, b, f, kind] of legs) {
      if (!a || !b) continue;
      const path = findPath(new THREE.Vector3(a.x, 0, a.z), new THREE.Vector3(b.x, 0, b.z), 60000) || [a, b];
      let q = along(path, f);
      for (let k = 0; k < 6 && !dry(q.x, q.z); k++) q = along(path, f + (k % 2 ? -1 : 1) * 0.06 * (1 + (k >> 1)));
      ENC.push({ kind, x: q.x, z: q.z, dx: q.dx, dz: q.dz, state: 'idle', foes: [], wave: 0 });
    }
  };

  const spawnRing = (types, n, cx, cz, r0, r1, arc0 = 0, arc = Math.PI * 2, level) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = arc0 + (arc * (i + rand(0.2, 0.8))) / n, r = rand(r0, r1);
      let x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (!dry(x, z)) { x = cx + Math.cos(a) * r0 * 0.6; z = cz + Math.sin(a) * r0 * 0.6; }
      const e = g.spawnPack(types[i % types.length], x, z, 1, level, { spread: 0.5 })[0];
      e.alerted = true; e.riseT = 0; e.st.crouch = 1; e.facing = Math.atan2(cx - e.pos.x, cz - e.pos.z);
      g.fx.dust(e.pos, 12, 1.2); out.push(e);
    }
    return out;
  };

  const champion = (E) => {
    const side = { x: -E.dz, z: E.dx }, cx = E.x + side.x * 7, cz = E.z + side.z * 7;
    const lv = Math.max(2, g.player.level + 1);
    const c = g.spawnPack(ROSTER.champ, cx, cz, 1, lv, { elite: true, name: `${ROSTER.name} · Champion`, spread: 0 })[0];
    c.enc25 = E; E.champ = c; E.foes = [c, ...g.spawnPack(ROSTER.retinue, cx, cz, 3, lv - 1, { spread: 4 })];
    E.state = 'camp';
  };

  const pay = (E, at, rich) => {
    const lv = Math.max(1, g.player.level);
    g.dropItem({ gold: Math.round(rand(14, 22) * lv * (rich ? 2 : 1)), rarity: 'common' }, at);
    const rar = rich ? (Math.random() < 0.3 ? 'legendary' : 'rare') : (Math.random() < 0.5 ? 'rare' : 'magic');
    try { g.dropItem(makeItem(lv, rar), tmp.copy(at).add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)))); } catch (e) { /* no item this time */ }
  };

  const busy = () => g.cinematic || g.interior || g.player.dead || g.bossActive;
  let quietT = 0;
  g.enc25Tick = (dt) => {
    const p = g.player;
    // pacing: an ambush only springs after some quiet (no foe alerted nearby for a while)
    let fighting = false;
    for (const e of g.enemies) if (!e.dead && e.alerted && Math.abs(e.pos.x - p.pos.x) < 20 && Math.abs(e.pos.z - p.pos.z) < 20) { fighting = true; break; }
    quietT = fighting ? 0 : quietT + dt;
    for (const E of ENC) {
      const d = Math.hypot(p.pos.x - E.x, p.pos.z - E.z);
      if (E.kind === 'ambush') {
        if (E.state === 'idle' && d < 8 && quietT > 6 && !busy() && g.player.level >= 1) {
          E.state = 'w1'; const lv = Math.max(1, p.level);
          g.audio.stinger?.('ambush'); g.shake = Math.max(g.shake, 0.35);
          g.ui.toast('Ambush!', 'quest'); setTimeout(() => g.enc25Say?.('ambush'), 900);
          E.foes = spawnRing(ROSTER.light, 4 + (p.level > 8 ? 1 : 0), p.pos.x, p.pos.z, 6.5, 9, Math.random() * 6, Math.PI * 2, lv);
        } else if (E.state === 'w1' && E.foes.filter((e) => !e.dead).length <= 1) {
          E.state = 'w2'; const lv = Math.max(1, p.level);
          const a = Math.random() * Math.PI * 2;
          g.ui.toast('More on the flank!', 'quest');
          E.foes = E.foes.concat(spawnRing(ROSTER.ranged, 2, p.pos.x, p.pos.z, 12, 14, a, 0.9, lv), spawnRing(ROSTER.light, 2 + (p.level > 12 ? 1 : 0), p.pos.x, p.pos.z, 9, 11, a - 0.3, 1.2, lv));
        } else if (E.state === 'w2' && E.foes.every((e) => e.dead)) {
          E.state = 'done'; g.ui.toast('The road is clear.', 'quest'); pay(E, p.pos.clone(), false);
          g.player.renown = (g.player.renown || 0) + 2;
        }
      } else if (E.kind === 'champion') {
        const c = E.champ; if (!c) continue;
        if (E.state === 'camp' && !c.dead && c.alerted) { E.state = 'fight'; g.ui.toast(`${t(ROSTER.name)}: "${t(ROSTER.call)}"`, 'quest'); g.audio.stinger?.('ambush'); setTimeout(() => g.enc25Say?.('champion'), 2500); }
        if (E.state !== 'done' && c.dead && E.foes.every((e) => e.dead)) { E.state = 'done'; g.ui.toast(`${t(ROSTER.name)} · ${t('Down. His purse is yours.')}`, 'quest'); pay(E, c.pos.clone(), true); }
      }
    }
  };
  // planned at load (the nav grid is built), so the champion's sculpt happens under the loader
  try { plan(); for (const E of ENC) if (E.kind === 'champion') champion(E); } catch (e) { console.warn('encounters', e); }
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => { prevTick?.(dt); if (g.started) g.enc25Tick(dt); };
}
