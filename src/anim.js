import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { QUALITY } from './graphics.js';

// Procedural animation for the skinned humanoid.
// Layers: locomotion (planted feet, two-bone leg IK, pelvis bob/sway, counter-rotation, arm swing)
// -> upper-body action clips (keyframed with anticipation / strike / follow-through / recovery)
// -> additive flinch -> face (blink, jaw, brow) -> cloth and spring bones.
export const CharLOD = { center: new THREE.Vector3(), simDist: 24 };
// Round 21: facial expressions. brow: both brows up (+) or down (-); inner: the inner ends lift (+, grief, worry)
// or knot down (-, anger); lid: eyes wide (+) or narrowed (-); smile: mouth corners up (+) or down (-); jaw: open.
// A cutscene sets one by name on the speaker (rig.userData.expr, see cinema.js); fights set their own.
export const EXPR = {
  neutral: {}, listen: { brow: 0.2, inner: 0.15 },
  grief: { brow: -0.15, inner: 1, lid: -0.35, smile: -0.8, jaw: 0.04 }, sad: { inner: 0.6, lid: -0.2, smile: -0.45 },
  anger: { brow: -1, inner: -0.9, lid: -0.3, smile: -0.45, jaw: 0.06 }, stern: { brow: -0.5, inner: -0.5, lid: -0.15, smile: -0.2 },
  resolve: { brow: -0.35, inner: -0.25, lid: -0.1, smile: -0.1 }, surprise: { brow: 1, inner: 0.3, lid: 0.7, jaw: 0.35 },
  fear: { brow: 0.6, inner: 0.9, lid: 0.45, smile: -0.4, jaw: 0.18 }, warm: { brow: 0.2, inner: 0.25, lid: -0.15, smile: 0.75 },
  pain: { brow: -0.6, inner: 0.7, lid: -0.65, smile: -0.6, jaw: 0.22 }, effort: { brow: -0.8, inner: -0.6, lid: -0.25, smile: -0.35 },
  wary: { brow: -0.2, inner: -0.1, lid: -0.3 }, whistle: { brow: 0.3, lid: -0.1, jaw: 0.05, smile: -0.3 },
};
const EX_KEYS = ['brow', 'inner', 'lid', 'smile', 'jaw'];
const LOW = QUALITY === 'low';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _eu = new THREE.Euler();
const sm = (t) => t * t * (3 - 2 * t), clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const EASE = { io: sm, out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, lin: (t) => t, snap: (t) => 1 - Math.pow(1 - t, 5) };

// ---------------------------------------------------------------- action clips
// Each key: [time, pose|null, ease]. A null pose (or a channel a key leaves out) means "the locomotion pose".
// Channels are Euler offsets from the bind pose: right arm (shR/elR/hR), left arm (shL/elL/hL), spine, chest, uc,
// neck, head, hips, plus lunge (forward metres), drop (pelvis metres) and jaw (mouth open 0..1).
const CLIPS = {
  slashA: [[0, null], [0.28, { shR: [-1.3, -0.5, 0.95], elR: [-1.5, 0, 0], hR: [-0.3, 0, -0.5], chest: [0, 0.55, 0], spine: [0, 0.2, 0], hips: [0, 0.25, 0], drop: 0.03 }, 'io'],
    [0.46, { shR: [-1.35, 0.9, -0.35], elR: [-0.15, 0, 0], hR: [0, 0, 0.3], chest: [0.1, -0.65, 0], spine: [0.1, -0.25, 0], hips: [0, -0.3, 0], lunge: 0.18, drop: 0.06, jaw: 0.5 }, 'snap'],
    [0.66, { shR: [-1.0, 1.2, -0.55], elR: [-0.4, 0, 0], chest: [0.12, -0.8, 0], spine: [0.1, -0.3, 0], hips: [0, -0.35, 0], lunge: 0.22, drop: 0.05, jaw: 0.2 }, 'out'], [1, null, 'io']],
  slashB: [[0, null], [0.25, { shR: [-0.6, 1.0, -0.5], elR: [-1.6, 0, 0], hR: [0.4, 0, 0.4], chest: [0.15, -0.6, 0], spine: [0.1, -0.2, 0], hips: [0, -0.25, 0], drop: 0.05 }, 'io'],
    [0.45, { shR: [-2.3, -0.4, 0.8], elR: [-0.3, 0, 0], hR: [-0.6, 0, -0.3], chest: [-0.15, 0.55, 0], spine: [-0.05, 0.2, 0], hips: [0, 0.3, 0], lunge: 0.15, jaw: 0.5 }, 'snap'],
    [0.65, { shR: [-2.5, -0.6, 0.9], elR: [-0.5, 0, 0], chest: [-0.18, 0.65, 0], spine: [-0.05, 0.22, 0], hips: [0, 0.3, 0], lunge: 0.18 }, 'out'], [1, null, 'io']],
  chop: [[0, null], [0.32, { shR: [-2.9, 0, 0.15], elR: [-1.5, 0, 0], hR: [-0.2, 0, 0], shL: [-0.8, 0, -0.2], chest: [-0.3, 0, 0], spine: [-0.15, 0, 0], hips: [-0.08, 0, 0], drop: -0.02 }, 'io'],
    [0.48, { shR: [-0.7, 0, -0.1], elR: [-0.1, 0, 0], hR: [-0.2, 0, 0], shL: [-0.3, 0, -0.3], chest: [0.45, 0, 0], spine: [0.25, 0, 0], hips: [0.1, 0, 0], drop: 0.13, lunge: 0.32, jaw: 0.8 }, 'snap'],
    [0.7, { shR: [-0.45, 0, -0.1], elR: [-0.1, 0, 0], chest: [0.5, 0, 0], spine: [0.28, 0, 0], drop: 0.15, lunge: 0.34, jaw: 0.3 }, 'out'], [1, null, 'io']],
  thrust: [[0, null], [0.4, { shR: [-0.4, 0, 0.1], elR: [-1.6, 0, 0], chest: [0, 0.4, 0], spine: [0, 0.2, 0], hips: [0, 0.2, 0], drop: 0.04 }, 'io'],
    [0.6, { shR: [-1.45, 0, -0.1], elR: [-0.05, 0, 0], chest: [0.15, -0.35, 0], spine: [0.08, -0.15, 0], lunge: 0.3, drop: 0.07, jaw: 0.4 }, 'snap'], [1, null, 'io']],
  throw: [[0, null], [0.45, { shL: [-2.8, 0, -0.3], elL: [-1.2, 0, 0], chest: [-0.1, -0.5, 0], spine: [0, -0.2, 0] }, 'io'],
    [0.62, { shL: [-0.6, 0, 0], elL: [-0.2, 0, 0], chest: [0.12, 0.45, 0], spine: [0.05, 0.2, 0], lunge: 0.1 }, 'snap'], [1, null, 'io']],
  slam: [[0, null], [0.5, { shR: [-3.0, 0, 0.2], shL: [-2.6, 0, -0.2], elR: [-0.8, 0, 0], elL: [-0.8, 0, 0], chest: [-0.35, 0, 0], spine: [-0.15, 0, 0], drop: -0.03 }, 'io'],
    [0.62, { shR: [0.3, 0, -0.1], shL: [-0.2, 0, 0.1], elR: [-0.1, 0, 0], elL: [-0.2, 0, 0], chest: [0.45, 0, 0], spine: [0.25, 0, 0], drop: 0.16, lunge: 0.25, jaw: 1 }, 'snap'], [1, null, 'io']],
  claw: [[0, null], [0.4, { shR: [-2.0, 0, 0.3], shL: [-2.0, 0, -0.3], chest: [-0.2, 0, 0] }, 'io'], [0.6, { shR: [-0.6, 0, 0], shL: [-0.6, 0, 0], chest: [0.4, 0, 0], lunge: 0.2 }, 'snap'], [1, null, 'io']],
  command: [[0, null], [0.4, { shL: [-2.6, 0, -0.3], elL: [-0.2, 0, 0], chest: [-0.15, 0.2, 0], neck: [-0.2, 0, 0], jaw: 0.9 }, 'out'], [0.7, { shL: [-2.5, 0, -0.35], elL: [-0.15, 0, 0], chest: [-0.12, 0.2, 0], neck: [-0.15, 0, 0], jaw: 0.6 }, 'lin'], [1, null, 'io']],
  cast: [[0, null], [0.45, { shL: [-2.2, 0, 0], elL: [-0.3, 0, 0], shR: [-0.8, 0, 0], chest: [-0.1, 0, 0] }, 'out'], [1, null, 'io']],
  shoot: [[0, { shL: [-1.5, 0.3, 0.1], elL: [-0.05, 0, 0], shR: [-1.5, 0, 0], elR: [-0.4, 0, 0], chest: [0, -0.5, 0], neck: [0, 0.4, 0] }], [0.7, { shL: [-1.5, 0.3, 0.1], elL: [-0.05, 0, 0], shR: [-1.4, 0.2, 0.2], elR: [-1.9, 0, 0], chest: [0, -0.5, 0], neck: [0, 0.4, 0] }, 'io'], [1, null, 'out']],
  // Round 20: more attack variations (each weapon cycles three moves; the third is the heavy finisher)
  stabA: [[0, null], [0.3, { shR: [-0.6, 0.2, 0.2], elR: [-1.8, 0, 0], hR: [0.2, 0, 0], chest: [0, 0.35, 0], spine: [0, 0.15, 0], drop: 0.04 }, 'io'],
    [0.45, { shR: [-1.5, -0.1, 0], elR: [-0.1, 0, 0], chest: [0.15, -0.3, 0], spine: [0.08, -0.12, 0], hips: [0, -0.15, 0], lunge: 0.28, drop: 0.06, jaw: 0.4 }, 'snap'],
    [0.62, { shR: [-1.4, -0.1, 0], elR: [-0.25, 0, 0], chest: [0.15, -0.32, 0], lunge: 0.3, drop: 0.06 }, 'out'], [1, null, 'io']],
  stabB: [[0, null], [0.28, { shR: [-1.2, 1.1, -0.4], elR: [-1.7, 0, 0], hR: [0.3, 0, 0.3], chest: [0.1, -0.6, 0], spine: [0.05, -0.2, 0], hips: [0, -0.2, 0], drop: 0.05 }, 'io'],
    [0.46, { shR: [-1.2, -0.8, 0.7], elR: [-0.3, 0, 0], hR: [-0.2, 0, -0.3], chest: [0.05, 0.6, 0], spine: [0.05, 0.2, 0], hips: [0, 0.3, 0], lunge: 0.16, drop: 0.07, jaw: 0.5 }, 'snap'],
    [0.66, { shR: [-1.0, -1.0, 0.8], elR: [-0.4, 0, 0], chest: [0.05, 0.7, 0], spine: [0.05, 0.22, 0], hips: [0, 0.32, 0], lunge: 0.18, drop: 0.06 }, 'out'], [1, null, 'io']],
  stabC: [[0, null], [0.34, { shR: [-0.2, 0, 0.1], elR: [-1.4, 0, 0], shL: [-0.3, 0, -0.2], elL: [-1.2, 0, 0], chest: [0.35, 0, 0], spine: [0.2, 0, 0], drop: 0.14 }, 'io'],
    [0.5, { shR: [-2.4, 0, -0.1], elR: [-0.2, 0, 0], shL: [-1.3, 0, -0.2], elL: [-0.3, 0, 0], chest: [-0.2, 0, 0], spine: [-0.1, 0, 0], drop: -0.03, lunge: 0.3, jaw: 0.8 }, 'snap'],
    [0.7, { shR: [-2.2, 0, -0.1], elR: [-0.3, 0, 0], shL: [-1.1, 0, -0.2], chest: [-0.15, 0, 0], drop: 0, lunge: 0.32 }, 'out'], [1, null, 'io']],
  thrustHigh: [[0, null], [0.4, { shR: [-2.6, 0, 0.3], elR: [-1.4, 0, 0], chest: [-0.15, 0.3, 0], spine: [-0.05, 0.15, 0], drop: 0.02 }, 'io'],
    [0.58, { shR: [-1.7, 0, 0], elR: [-0.05, 0, 0], chest: [0.25, -0.3, 0], spine: [0.12, -0.1, 0], lunge: 0.36, drop: 0.08, jaw: 0.5 }, 'snap'], [1, null, 'io']],
  sweep: [[0, null], [0.38, { shR: [-1.0, 1.2, -0.3], shL: [-1.0, 0, -0.2], elR: [-0.6, 0, 0], chest: [0, -0.7, 0], spine: [0, -0.25, 0], hips: [0, -0.2, 0], drop: 0.06 }, 'io'],
    [0.56, { shR: [-1.0, -1.2, 0.6], shL: [-0.8, 0, -0.1], elR: [-0.2, 0, 0], chest: [0.05, 0.7, 0], spine: [0.05, 0.25, 0], hips: [0, 0.35, 0], drop: 0.1, lunge: 0.12, jaw: 0.6 }, 'snap'], [1, null, 'io']],
  shootQuick: [[0, { shL: [-1.3, 0.35, 0.1], elL: [-0.1, 0, 0], shR: [-1.3, 0, 0], elR: [-0.6, 0, 0], chest: [0.05, -0.6, 0], neck: [0, 0.5, 0] }], [0.5, { shL: [-1.3, 0.35, 0.1], elL: [-0.1, 0, 0], shR: [-1.25, 0.2, 0.2], elR: [-1.8, 0, 0], chest: [0.05, -0.65, 0], neck: [0, 0.5, 0] }, 'snap'], [1, null, 'out']],
  shootKneel: [[0, { shL: [-1.5, 0.3, 0.1], elL: [-0.05, 0, 0], shR: [-1.5, 0, 0], elR: [-0.4, 0, 0], chest: [0.1, -0.5, 0], spine: [0.12, 0, 0], neck: [-0.1, 0.4, 0], drop: 0.2 }],
    [0.7, { shL: [-1.55, 0.3, 0.1], elL: [-0.05, 0, 0], shR: [-1.45, 0.2, 0.2], elR: [-1.9, 0, 0], chest: [0.1, -0.5, 0], spine: [0.12, 0, 0], neck: [-0.1, 0.4, 0], drop: 0.22 }, 'io'], [1, null, 'out']],
  throwSide: [[0, null], [0.42, { shL: [-1.2, -1.0, 0.3], elL: [-1.0, 0, 0], chest: [0, -0.6, 0], spine: [0, -0.25, 0], drop: 0.05 }, 'io'],
    [0.6, { shL: [-1.3, 0.9, -0.2], elL: [-0.2, 0, 0], chest: [0.05, 0.6, 0], spine: [0.03, 0.25, 0], lunge: 0.12, drop: 0.06 }, 'snap'], [1, null, 'io']],
  throwLow: [[0, null], [0.42, { shL: [0.6, 0, -0.2], elL: [-0.3, 0, 0], chest: [0.2, -0.2, 0], spine: [0.15, 0, 0], drop: 0.12 }, 'io'],
    [0.6, { shL: [-1.9, 0, -0.1], elL: [-0.2, 0, 0], chest: [-0.1, 0.2, 0], spine: [-0.05, 0.1, 0], lunge: 0.15, drop: 0.02 }, 'snap'], [1, null, 'io']],
};
CLIPS.aimXbow = [[0, null], [0.25, { shR: [-1.35, 0.35, 0.1], elR: [-1.25, 0, 0], hR: [0.1, 0, 0], shL: [-1.45, -0.35, 0], elL: [-0.7, 0, 0], chest: [0, -0.15, 0], neck: [0.05, 0.12, 0], drop: 0.04 }, 'io'],
  [0.62, { shR: [-1.35, 0.35, 0.1], elR: [-1.25, 0, 0], hR: [0.1, 0, 0], shL: [-1.45, -0.35, 0], elL: [-0.7, 0, 0], chest: [0, -0.15, 0], neck: [0.05, 0.12, 0], drop: 0.04 }, 'lin'],
  [0.7, { shR: [-1.5, 0.35, 0.1], elR: [-1.0, 0, 0], shL: [-1.6, -0.35, 0], elL: [-0.6, 0, 0], chest: [-0.08, -0.15, 0], neck: [0.05, 0.12, 0] }, 'snap'], [1, null, 'io']];
// Round 21: two fingers to the lips to whistle up the mount; an arm flung out to point (the falcon, a direction)
{ const w = { shR: [-1.25, -0.45, 0.25], elR: [-2.35, 0, 0], hR: [0.3, 0, 0], neck: [-0.12, 0, 0], head: [-0.12, 0, 0], chest: [-0.05, 0, 0], jaw: 0.08 };
  CLIPS.whistle = [[0, null], [0.28, w, 'io'], [0.78, w, 'lin'], [1, null, 'io']];
  const pt = { shR: [-1.55, 0.1, 0.05], elR: [-0.08, 0, 0], hR: [-0.1, 0, 0], chest: [0, 0.18, 0], neck: [0, 0.15, 0] };
  CLIPS.point = [[0, null], [0.25, pt, 'snap'], [0.8, pt, 'lin'], [1, null, 'io']];
  // both hands into the chest of someone too close: a shove
  CLIPS.shove = [[0, null], [0.4, { shR: [-0.5, 0, 0.3], elR: [-1.9, 0, 0], shL: [-0.5, 0, -0.3], elL: [-1.9, 0, 0], chest: [-0.1, 0, 0], drop: 0.06 }, 'io'],
    [0.55, { shR: [-1.45, 0, 0.15], elR: [-0.2, 0, 0], shL: [-1.45, 0, -0.15], elL: [-0.2, 0, 0], chest: [0.2, 0, 0], spine: [0.1, 0, 0], lunge: 0.25, drop: 0.04, jaw: 0.4 }, 'snap'], [1, null, 'io']]; }
const COMBO = ['slashA', 'slashB', 'chop'];
// which moves an action cycles through, by weapon; a chain resets after a pause
const VARIANTS = { attack: { sword: COMBO, mallet: ['chop', 'slashA', 'chop'], dagger: ['stabA', 'stabB', 'stabC'], spear: ['thrust', 'thrustHigh', 'sweep'] }, thrust: ['thrust', 'thrustHigh', 'sweep'], shoot: ['shoot', 'shootQuick', 'shootKneel'], throw: ['throw', 'throwSide', 'throwLow'] };
const CH = ['hips', 'spine', 'chest', 'uc', 'neck', 'head', 'shR', 'elR', 'hR', 'shL', 'elL', 'hL'];
function samplePose(clip, k, base, out) {
  let i = 0; while (i < clip.length - 2 && k >= clip[i + 1][0]) i++;
  const [t0, p0] = clip[i], [t1, p1, ez = 'io'] = clip[i + 1];
  const e = EASE[ez](clamp01((k - t0) / (t1 - t0 || 1)));
  for (const ch of CH) {
    const a = p0?.[ch] ?? base[ch], b = p1?.[ch] ?? base[ch], o = out[ch];
    o[0] = a[0] + (b[0] - a[0]) * e; o[1] = a[1] + (b[1] - a[1]) * e; o[2] = a[2] + (b[2] - a[2]) * e;
  }
  for (const s of ['lunge', 'drop', 'jaw']) { const a = p0?.[s] ?? 0, b = p1?.[s] ?? 0; out[s] = a + (b - a) * e; }
}
const newPose = () => { const p = {}; for (const c of CH) p[c] = [0, 0, 0]; p.lunge = 0; p.drop = 0; p.jaw = 0; return p; };

export class Animator {
  constructor(root, parts, o) {
    this.root = root; this.p = parts; this.o = o;
    this.base = newPose(); this.act = newPose();
    this.feet = [0, 1].map((i) => ({ i, side: i ? 1 : -1, pos: new THREE.Vector3(), yaw: 0, swing: false, s: 0, dur: 0.3, from: new THREE.Vector3(), lift: 0.07, pitch: 0, bootstrap: true }));
    this.prev = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.speed = 0; this.gp = Math.random(); this.inited = false;
    this.armed = o.weapon === 'sword' || o.weapon === 'spear' || o.weapon === 'torch' || o.weapon === 'dagger' || o.weapon === 'mallet' || o.weapon === 'crossbow';
    this.shield = o.offhand === 'shield';
    this.blinkT = 1 + Math.random() * 3; this.blink = 0; this.combo = 0; this.lastAtkEnd = -9; this.clip = null; this.lastK = 0; this.actW = 0;
    this.dd = null; this.t = 0;
    const B = parts.bones;
    this.chan = { hips: B.hips, spine: B.spine, chest: B.chest, uc: B.upperChest, neck: B.neck, head: B.head, shR: B.armR, elR: B.foreR, hR: B.handR, shL: B.armL, elL: B.foreL, hL: B.handL };
    this.caps = [0, 1, 2, 3, 4, 5].map(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.1 }));
    if (parts.skirt) parts.skirt.colliders = this.caps.slice(0, 5);
    if (parts.mantle) parts.mantle.colliders = this.caps;
  }
  restSpot(f, out) {
    const r = this.root, S = this.S, fy = r.rotation.y, fwd = _e.set(Math.sin(fy), 0, Math.cos(fy));
    const stagger = this.armed ? (f.side < 0 ? 0.08 : -0.06) : 0;
    return out.set(r.position.x + Math.cos(fy) * f.side * 0.12 * S + fwd.x * stagger * S, 0, r.position.z - Math.sin(fy) * f.side * 0.12 * S + fwd.z * stagger * S);
  }
  resetFeet() { for (const f of this.feet) { this.restSpot(f, f.pos); f.pos.y = heightAt(f.pos.x, f.pos.z); f.swing = false; f.yaw = this.root.rotation.y; } }

  update(st, t, dt) {
    const r = this.root, p = this.p, B = p.bones, o = this.o;
    dt = Math.min(dt, 0.05); this.t += dt;
    const S = this.S = p.body.scale.x;
    // ---------------- velocity from actual root motion
    if (!this.inited || this.prev.distanceToSquared(r.position) > 9) { this.prev.copy(r.position); this.inited = true; this.resetFeet(); }
    if (dt > 0) { _a.subVectors(r.position, this.prev).setY(0).divideScalar(dt); this.vel.lerp(_a, Math.min(1, dt * 12)); }
    this.prev.copy(r.position);
    const speed = st.mounted ? 0 : this.vel.length(), v = speed / S;

    if (st.dead) { this.death(st, t, dt); this.finish(st, t, dt, false); return; }
    if (this.dd) { this.dd = null; p.body.rotation.set(0, 0, 0); p.body.position.y = 0; this.resetFeet(); }

    // ---------------- gait
    const moving = v > 0.3;
    const runK = clamp01((v - 2.2) / 3), walkK = clamp01(v / 1.2);
    const fy = r.rotation.y, fwdX = Math.sin(fy), fwdZ = Math.cos(fy), rgtX = Math.cos(fy), rgtZ = -Math.sin(fy);
    // strafing (moving across the way the body faces, e.g. kiting a target): shorter, quicker side-steps
    // with a wider stance, hips and feet turned into the step while the chest stays on the target
    const lat = moving ? (this.vel.x * rgtX + this.vel.z * rgtZ) / Math.max(speed, 1e-4) : 0, latK = Math.abs(lat) * (1 - runK * 0.5);
    this.lat = (this.lat || 0) + (lat * (1 - runK * 0.5) - (this.lat || 0)) * Math.min(1, dt * 8);
    const stepLen = Math.min(1.35, 0.34 + 0.19 * v) * (1 - 0.4 * latK), rate = moving ? v / (2 * stepLen) : 0;
    const duty = 0.62 - 0.26 * runK;
    this.gp += rate * dt;
    const footYaw = fy - this.lat * 0.55;
    for (const f of this.feet) {
      const other = this.feet[1 - f.i];
      const u = ((this.gp + f.i * 0.5) % 1 + 1) % 1;
      if (!f.swing) {
        let go = false;
        if (moving && u >= duty && (!other.swing || runK > 0.3)) { go = true; f.dur = Math.max(0.12, (1 - duty) / Math.max(rate, 0.01)); f.lift = (0.06 + 0.08 * runK) * S; }
        else if (!moving && !other.swing) {
          this.restSpot(f, _a); const off = Math.hypot(_a.x - f.pos.x, _a.z - f.pos.z);
          const yawOff = Math.abs(Math.atan2(Math.sin(fy - f.yaw), Math.cos(fy - f.yaw)));
          if (off > 0.16 * S || yawOff > 0.7) { go = true; f.dur = 0.26; f.lift = 0.06 * S; }
        }
        if (Math.hypot(f.pos.x - r.position.x, f.pos.z - r.position.z) > 1.1 * S) { this.restSpot(f, f.pos); f.pos.y = heightAt(f.pos.x, f.pos.z); f.yaw = fy; }
        if (go) { f.swing = true; f.s = 0; f.from.copy(f.pos); }
      }
      if (f.swing) {
        f.s = Math.min(1, f.s + dt / f.dur);
        // landing target: where the hip will be at mid-stance
        if (moving) {
          const ahead = (1 - f.s) * f.dur + duty / Math.max(rate, 0.01) * 0.5;
          const w = (0.1 + 0.07 * latK) * S; _a.set(r.position.x + this.vel.x * ahead + rgtX * f.side * w, 0, r.position.z + this.vel.z * ahead + rgtZ * f.side * w);
        } else this.restSpot(f, _a);
        const e = sm(f.s);
        f.pos.x = f.from.x + (_a.x - f.from.x) * e; f.pos.z = f.from.z + (_a.z - f.from.z) * e;
        f.pos.y = heightAt(f.pos.x, f.pos.z);
        f.yaw = f.yaw + Math.atan2(Math.sin(footYaw - f.yaw), Math.cos(footYaw - f.yaw)) * Math.min(1, dt / Math.max(0.05, f.dur * (1 - f.s) + 0.02) );
        f.pitch = f.s < 0.35 ? 0.5 * (1 - f.s / 0.35) * walkK : -0.32 * sm(clamp01((f.s - 0.35) / 0.5)) * (1 - sm(clamp01((f.s - 0.85) / 0.15))) * walkK;
        if (f.s >= 1) { f.swing = false; f.pitch = 0; f.yaw = footYaw; this.onStep?.(f.pos, v); }
      }
    }

    // ---------------- base (locomotion) pose
    const b = this.base, ph = this.gp * Math.PI * 2;
    const swing = moving ? Math.sin(ph) : 0;
    const fL = (this.feet[0].pos.x - r.position.x) * fwdX + (this.feet[0].pos.z - r.position.z) * fwdZ;
    const fR = (this.feet[1].pos.x - r.position.x) * fwdX + (this.feet[1].pos.z - r.position.z) * fwdZ;
    const lean = st.lean || 0, fl = st.fwdLean || 0, breathe = Math.sin(t * 2.1) * (1 - walkK * 0.7);
    const hipYaw = (fL - fR) / S * 0.28 * walkK, twist = -this.lat * 0.4 * walkK;
    b.hips[0] = 0.04 * runK; b.hips[1] = hipYaw + twist; b.hips[2] = -lean * 0.3 + (moving ? Math.cos(ph) * (0.035 + 0.03 * latK) * walkK : 0) + this.lat * 0.05 * walkK;
    b.spine[0] = (o.hunch || 0) * 0.6 + fl * 0.12 + runK * 0.1; b.spine[1] = -hipYaw * 0.5 - twist * 0.6; b.spine[2] = -lean * 0.08;
    b.chest[0] = (o.hunch || 0) * 0.4 + fl * 0.1 + breathe * 0.012 + runK * 0.06; b.chest[1] = -hipYaw * 0.6 - twist * 0.4; b.chest[2] = -lean * 0.06;
    b.uc[0] = breathe * 0.01; b.uc[1] = -hipYaw * 0.2; b.uc[2] = 0;
    b.neck[0] = -(b.spine[0] + b.chest[0]) * 0.45 - runK * 0.05; b.neck[1] = hipYaw * 0.5; b.neck[2] = lean * 0.1;
    b.head[0] = -(b.spine[0] + b.chest[0]) * 0.25 + (st.nod || 0); b.head[1] = (st.headYaw || 0); b.head[2] = 0;
    // arms: swing opposite to the leg on the same side, pump when running
    const armK = 1.25 / S;
    const swR = THREE.MathUtils.clamp(fL * armK, -0.9, 0.9) * walkK, swL = THREE.MathUtils.clamp(fR * armK, -0.9, 0.9) * walkK;
    const elB = -(0.18 + runK * 1.05);
    if (o.weapon === 'torch') {
      // Round 20: a torch is carried up, flame above the fist and out from the body, never levelled like a spear
      b.shR[0] = -0.12 - swR * 0.35 + breathe * 0.02; b.shR[1] = 0.1; b.shR[2] = -0.42 + runK * 0.05;
      b.elR[0] = -0.75 - runK * 0.2; b.elR[1] = 0; b.elR[2] = 0;
      b.hR[0] = -0.55 + runK * 0.1; b.hR[1] = 0; b.hR[2] = 0.3;
    } else if (this.armed) {
      const g = 1 - walkK * 0.5;
      // sword low and forward, edge angled out
      b.shR[0] = -0.2 * g - swR * 0.6; b.shR[1] = 0.25; b.shR[2] = -0.12 + runK * 0.05;
      b.elR[0] = -0.55 * g + elB * 0.5; b.elR[1] = 0; b.elR[2] = 0;
      b.hR[0] = 0.55 * g + breathe * 0.03 + walkK * 0.3; b.hR[1] = 0; b.hR[2] = 0.35;
    } else {
      b.shR[0] = -swR + breathe * 0.02; b.shR[1] = 0; b.shR[2] = -0.26 + runK * 0.1;
      b.elR[0] = elB - Math.max(0, swR) * 0.35; b.elR[1] = 0; b.elR[2] = 0; b.hR[0] = 0; b.hR[1] = 0; b.hR[2] = 0;
    }
    if (this.shield) {
      b.shL[0] = -0.3 - swL * 0.4; b.shL[1] = 0.35; b.shL[2] = 0.12; b.elL[0] = -1.15 + runK * 0.2; b.elL[1] = 0; b.elL[2] = 0;
    } else {
      b.shL[0] = -swL + breathe * 0.02; b.shL[1] = 0; b.shL[2] = 0.26 - runK * 0.1;
      b.elL[0] = elB - Math.max(0, swL) * 0.35; b.elL[1] = 0; b.elL[2] = 0;
    }
    b.hL[0] = 0; b.hL[1] = 0; b.hL[2] = 0; b.lunge = 0; b.drop = 0; b.jaw = 0;

    // ---------------- action layer
    const act = st.action;
    let pose = b;
    if (act) {
      let clipName = act === 'attack' ? null : act;
      const V = VARIANTS[act], list = V && (Array.isArray(V) ? V : V[o.weapon] || COMBO);
      if (list) {
        if (this.clip === null || this.lastAct !== act || st.actionT < this.lastK - 0.3) {
          this.combo = this.t - this.lastAtkEnd < 0.7 ? (this.combo + 1) % 3 : 0;
          st.combo = this.combo;
        }
        clipName = list[this.combo];
      }
      this.clip = clipName; this.lastK = st.actionT;
      const clip = CLIPS[clipName];
      if (clip && act !== 'spin') { samplePose(clip, clamp01(st.actionT), b, this.act); pose = this.act; }
      else if (act === 'spin') {
        const a = this.act; for (const c of CH) a[c] = b[c].slice();
        a.shR = [-1.5, 0, 1.2]; a.elR = [-0.1, 0, 0]; a.shL = [-1.2, 0, -1.0]; a.chest = [0.12, 0, 0]; a.spine = [0.08, 0, 0]; a.lunge = 0; a.drop = 0.12; a.jaw = 0.4;
        pose = a;
      }
      this.actW = 1;
    } else {
      if (VARIANTS[this.lastAct]) this.lastAtkEnd = this.t;
      this.clip = null;
    }
    this.lastAct = act;

    // ---------------- additive layers: flinch, crouch
    // Round 20: flinch away from where the blow came from (st.hitFrom: world direction toward the attacker)
    const hit = clamp01(st.hitT || 0);
    if (hit <= 0) { this.hitSide = null; this.hitFront = null; }
    if (this.hitSide == null && hit > 0) {
      const hf = st.hitFrom;
      if (hf) { this.hitFront = hf.x * fwdX + hf.z * fwdZ; this.hitSide = THREE.MathUtils.clamp(-(hf.x * rgtX + hf.z * rgtZ), -1, 1); }
      else { this.hitFront = 1; this.hitSide = Math.random() < 0.5 ? -1 : 1; }
    }
    const hs = this.hitSide ?? 0, hfr = this.hitFront ?? 1, hfK = hfr > -0.3 ? 1 : -0.8; // a blow from behind pitches the chest forward
    const hc = hit * hit;
    const crouch = st.crouch || 0;
    const C = this.chan;
    for (const c of CH) {
      const bone = C[c], br = bone.userData.bindRot, q = pose[c];
      let x = q[0], y = q[1], z = q[2];
      if (c === 'chest') { x -= hc * 0.35 * hfK; z += hs * hc * 0.22; y += hs * hc * 0.18; x += crouch * 0.25; }
      if (c === 'spine') { x -= hc * 0.12 * hfK; z += hs * hc * 0.08; x += crouch * 0.45; }
      if (c === 'neck') { x -= hc * 0.3 * hfK; y += hs * hc * 0.3; x -= crouch * 0.3; }
      if (c === 'shR') { z += hc * 0.3; x -= crouch * 0.3; }
      if (c === 'shL') { z -= hc * 0.3; x -= crouch * 0.3; }
      if (c === 'elR' || c === 'elL') x -= hc * 0.3;
      bone.rotation.set(br.x + x, br.y + y, br.z + z);
    }
    // pelvis height: bob, crouch, attack drop, and reach down to the lower foot on slopes
    const bob = moving ? (Math.cos(ph * 2) * (0.018 - 0.05 * runK)) * walkK : breathe * 0.004;
    const footLow = Math.min(this.feet[0].pos.y, this.feet[1].pos.y);
    const slope = THREE.MathUtils.clamp(r.position.y - footLow, 0, 0.3) / S;
    const drop = 0.03 + 0.045 * runK + crouch * 0.4 + pose.drop + slope - bob + hc * 0.04;
    B.hips.position.set(0, 1.0 - drop, pose.lunge / S * 0.6 + fl * 0.03);
    this.jawT = pose.jaw;

    // ---------------- leg IK (a rider's legs straddle the saddle instead: Round 20)
    r.updateMatrixWorld(true);
    if (st.mounted) {
      B.hips.position.set(0, 1.0, 0);
      for (const [S2, s] of [['L', -1], ['R', 1]]) {
        const set = (bn, x, y, z) => { const bone = B[bn], br = bone.userData.bindRot; bone.rotation.set(br.x + x, br.y + y, br.z + z); };
        set('thigh' + S2, -1.25, 0, s * 0.55); set('shin' + S2, 1.35, 0, -s * 0.2); set('foot' + S2, 0.35, 0, 0);
      }
      r.updateMatrixWorld(true);
    } else for (const f of this.feet) this.solveLeg(f, fy);
    this.finish(st, t, dt, true);
  }

  solveLeg(f, fy) {
    const B = this.p.bones, S = this.S, side = f.i ? 'R' : 'L';
    const thigh = B['thigh' + side], shin = B['shin' + side], foot = B['foot' + side];
    const L1 = 0.44 * S, L2 = 0.43 * S;
    const A = thigh.getWorldPosition(_a);
    const lift = f.swing ? Math.sin(Math.PI * f.s) * f.lift : 0;
    const T = _b.set(f.pos.x, f.pos.y + 0.08 * S + lift + Math.max(0, Math.sin(f.pitch)) * 0.1 * S, f.pos.z);
    // the planted foot moves with lunges a little so the stance stays believable
    const D = _c.subVectors(T, A); let d = D.length();
    const maxd = (L1 + L2) * 0.999; if (d > maxd) { D.multiplyScalar(maxd / d); d = maxd; T.copy(A).add(D); }
    d = Math.max(d, 0.05 * S); D.normalize();
    const pole = _d.set(Math.sin(fy) + Math.cos(fy) * f.side * 0.15, 0, Math.cos(fy) - Math.sin(fy) * f.side * 0.15);
    pole.addScaledVector(D, -pole.dot(D)).normalize();
    const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
    const K = _e.copy(A).addScaledVector(D, cosA * L1).addScaledVector(pole, sinA * L1);
    // thigh: -Y toward the knee, +Z toward the pole
    const qThigh = this.basisQ(A, K, pole, _q);
    const parentQ = thigh.parent.getWorldQuaternion(_q2);
    thigh.quaternion.copy(parentQ.invert().multiply(qThigh));
    thigh.updateMatrixWorld(true);
    const qShin = this.basisQ(K, T, pole, new THREE.Quaternion());
    shin.quaternion.copy(qThigh.clone().invert().multiply(qShin));
    shin.updateMatrixWorld(true);
    const toeOut = f.side * 0.08;
    const qFoot = _q2.setFromEuler(_eu.set(f.pitch, (f.swing ? f.yaw : f.yaw) + toeOut, 0, 'YXZ'));
    foot.quaternion.copy(qShin.invert().multiply(qFoot));
    foot.updateMatrixWorld(true);
  }
  basisQ(from, to, pole, out) {
    const Y = new THREE.Vector3().subVectors(from, to).normalize();
    const Z = pole.clone().addScaledVector(Y, -pole.dot(Y)).normalize();
    const X = new THREE.Vector3().crossVectors(Y, Z);
    return out.setFromRotationMatrix(_m.makeBasis(X, Y, Z));
  }

  death(st, t, dt) {
    const p = this.p, B = p.bones, S = this.S;
    // kinds (Round 20): 0 knocked back off the feet, 1 crumple to the knees then forward on the face, 2 twist and fall
    if (!this.dd) { const kind = st.deathKind || 0; this.dd = { th: 0, w: 0, t: 0, side: kind === 1 ? -1 : st.fallDir || 1, settle: 0, kind, tw: st.twist || 1 }; }
    const d = this.dd; d.t += dt;
    // a cutscene can declare someone long dead (st.deadT): skip straight to lying still
    if ((st.deadT || 0) > d.t + 0.5) { d.t = st.deadT; d.th = Math.PI / 2; d.w = 0; }
    const kneel = d.kind === 1, delay = kneel ? 0.55 : 0.12;
    const buckle = sm(clamp01(d.t / (kneel ? 0.4 : 0.32))) * (kneel ? 1.5 : 1);
    if (d.kind === 2) p.body.rotation.y = d.tw * 0.9 * sm(clamp01(d.t / 0.7));
    if (d.t > delay) {
      d.w += 13 * Math.sin(d.th + 0.15) * dt; d.th += d.w * dt;
      if (d.th >= Math.PI / 2) { d.th = Math.PI / 2; d.w = Math.abs(d.w) > 0.6 ? -d.w * 0.25 : 0; }
      // never left hanging part-way: after a second and a half the body is brought the rest of the way down
      if (d.t > 1.5 && d.th < Math.PI / 2) d.th = Math.min(Math.PI / 2, d.th + dt * 2.5);
    }
    const lie = d.th / (Math.PI / 2), sd = d.side;
    p.body.rotation.x = -d.th * sd; p.body.position.y = Math.sin(d.th) * 0.17 * S; // the back rests on the ground, not in it
    const set = (bn, x, y, z) => { const bone = B[bn], br = bone.userData.bindRot; bone.rotation.set(br.x + x, br.y + y, br.z + z); };
    const limp = Math.sin(clamp01(d.t * 1.6) * Math.PI) * (1 - lie * 0.5);
    set('hips', 0, 0, 0);
    B.hips.position.set(0, 1.0 - 0.28 * buckle * (1 - lie), 0);
    set('spine', 0.25 * buckle * (1 - lie) * sd, 0, 0); set('chest', 0.2 * buckle * (1 - lie) * sd, 0.1, 0); set('upperChest', 0, 0, 0);
    set('neck', -0.4 * lie * sd, 0.5 * lie, 0); set('head', -0.2 * lie * sd, 0.2 * lie, 0);
    for (const [S2, s] of [['L', -1], ['R', 1]]) {
      set('arm' + S2, (-0.9 * sd * limp) - 0.3 * lie, 0, s * (0.15 + 0.75 * lie));
      set('fore' + S2, -0.3 - 0.4 * limp, 0, 0); set('hand' + S2, 0.2, 0, 0);
      set('thigh' + S2, (-0.7 * buckle * (1 - lie)) + (s > 0 ? 0.12 : -0.05) * lie * sd, 0, s * 0.1 * lie);
      set('shin' + S2, 1.3 * buckle * (1 - lie) + 0.25 * lie, 0, 0); set('foot' + S2, 0.3 * lie, 0, 0);
    }
    this.jawT = 0.35 * lie;
    this.root.updateMatrixWorld(true);
  }

  finish(st, t, dt, alive) {
    const p = this.p, r = this.root, S = this.S;
    // face: blink, jaw, brow
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 2 + Math.random() * 4; }
    this.blink = Math.max(0, this.blink - dt * 7);
    // expression: a named one from the scene (or the state), else the fight's own (effort, pain), eased toward
    const ename = st.exprName || r.userData.expr || (st.hitT > 0.25 ? 'pain' : st.action === 'whistle' ? 'whistle' : st.action ? 'effort' : null);
    const tgt = typeof st.expr === 'object' && st.expr ? st.expr : EXPR[ename] || EXPR.neutral, ex = this.ex ||= { brow: 0, inner: 0, lid: 0, smile: 0, jaw: 0 };
    const ek = Math.min(1, dt * (ename === 'pain' || ename === 'effort' ? 14 : 5));
    for (const k of EX_KEYS) ex[k] += ((tgt[k] || 0) - ex[k]) * ek;
    const closed = st.dead ? 1 : Math.max(Math.sin(this.blink * Math.PI), st.eyesClosed || 0, clamp01(st.hitT || 0) * 0.6);
    const lw = closed > 0.5 ? 0 : ex.lid; // a blink always closes fully
    for (const l of p.lids) { l.up.rotation.x = -0.36 + closed * 0.86 - lw * 0.24; l.lo.rotation.x = 0.3 - closed * 0.1 + Math.min(0, lw) * 0.22; } // Round 20: relaxed lids cover the top of the iris
    const jaw = Math.max(this.jawT || 0, st.talk ? Math.max(0, Math.sin(t * 13) * Math.sin(t * 5.3)) * 0.6 : 0, ex.jaw);
    p.jaw.rotation.x = jaw * 0.28;
    if (p.browL) {
      for (const [bn, sd] of [[p.browL, -1], [p.browR, 1]]) { bn.position.copy(bn.userData.bindPos); bn.position.y += ex.brow * 0.0045 + ex.inner * 0.0012; bn.rotation.set(-ex.brow * 0.06, 0, -sd * ex.inner * 0.24); }
      for (const [bn, sd] of [[p.mouthL, -1], [p.mouthR, 1]]) { bn.position.copy(bn.userData.bindPos); bn.position.x += sd * Math.max(0, ex.smile) * 0.0016; bn.position.y += ex.smile * 0.0036 - jaw * 0.002; bn.position.z -= Math.abs(ex.smile) * 0.0012; }
    }
    if (st.lookAt && alive) {
      const h = p.head; h.updateMatrixWorld(); const hp = h.getWorldPosition(_a);
      const dir = _b.subVectors(st.lookAt, hp); const yaw = Math.atan2(dir.x, dir.z) - r.rotation.y;
      const yy = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      h.rotation.y += THREE.MathUtils.clamp(yy, -0.9, 0.9) * 0.6; p.neck.rotation.y += THREE.MathUtils.clamp(yy, -0.9, 0.9) * 0.3;
    }
    r.updateMatrixWorld(true);
    // pose folds in the cloth shader: elbow bend from the forearm, knee bend from the shin's rotation
    const ub = p.mat?.userData.uni?.uBend;
    if (ub) { const kb = (bn) => Math.min(1, 2 * Math.acos(Math.min(1, Math.abs(bn.quaternion.w))) / 1.6); ub.value.set(Math.min(1, Math.max(0, -p.bones.foreL.rotation.x) / 1.6), Math.min(1, Math.max(0, -p.bones.foreR.rotation.x) / 1.6), kb(p.bones.shinL), kb(p.bones.shinR)); }
    // cloth colliders from the posed skeleton
    const B = p.bones, c = this.caps;
    B.thighL.getWorldPosition(c[0].a); B.shinL.getWorldPosition(c[0].b); c[0].r = 0.092 * S;
    B.thighR.getWorldPosition(c[1].a); B.shinR.getWorldPosition(c[1].b); c[1].r = 0.092 * S;
    c[2].a.copy(c[0].b); B.footL.getWorldPosition(c[2].b); c[2].r = 0.065 * S;
    c[3].a.copy(c[1].b); B.footR.getWorldPosition(c[3].b); c[3].r = 0.065 * S;
    B.hips.getWorldPosition(c[4].a); B.spine.getWorldPosition(c[4].b); c[4].a.lerp(c[0].a, 0.0); c[4].r = 0.14 * S * (this.o.girth || 1);
    B.spine.getWorldPosition(c[5].a); B.upperChest.getWorldPosition(c[5].b); c[5].r = 0.12 * S * (this.o.build || 1);
    const near = !LOW && r.position.distanceTo(CharLOD.center) < CharLOD.simDist;
    const g = r.position.y + 0.02;
    const sw = { x: 0.1 + (st.walkBlend || 0) * 0.25 + (st.fwdLean || 0) * 0.4 + Math.sin(t * 3 + r.id) * 0.03, z: (st.lean || 0) * 0.35 };
    for (const cl of p.cloths) cl.update(dt, near, g, sw, near ? 0.6 : 0);
    if (!LOW || near) for (const j of p.jiggles) j.update(dt);
    // contact shadows
    const bl = p.blobs;
    if (bl) {
      B.hips.getWorldPosition(_a); r.worldToLocal(_a); bl[0].position.set(_a.x, 0.035, _a.z); bl[0].visible = true;
      for (let i = 0; i < 2; i++) {
        const f = this.feet[i]; _a.copy(f.pos); r.worldToLocal(_a);
        bl[i + 1].position.set(_a.x, f.pos.y - r.position.y + 0.04, _a.z); bl[i + 1].rotation.y = f.yaw - r.rotation.y;
        bl[i + 1].visible = alive && !(f.swing && Math.sin(Math.PI * f.s) > 0.6);
      }
      if (!alive) { B.hips.getWorldPosition(_a); r.worldToLocal(_a); bl[0].position.set(_a.x * 0.5, 0.035, _a.z * 0.5); bl[0].scale.set(1.2 * S, 1, 1.4 * S); }
      else bl[0].scale.set(0.95 * S, 1, 0.75 * S);
      p.blobSync?.();
    }
  }
}
