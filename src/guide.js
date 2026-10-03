import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { findPath } from './nav.js';
import { SITES } from './terrain.js';
import { STORY } from './region.js';

// Objective guidance: a trail of glowing chevrons on the ground, flowing from the hero along a navigable
// path toward the current objective (refreshed as the hero moves). It shows the next ~45 m and fades out
// near the goal, in cutscenes and while the hero fights.
const MAX = 40, GAP = 1.25, AHEAD = 46;

function chevronTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 34, 2, 32, 34, 30); g.addColorStop(0, 'rgba(255,230,160,0.55)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#fff6dc'; x.lineWidth = 11; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(14, 42); x.lineTo(32, 22); x.lineTo(50, 42); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// where the trail leads: the chest (then the way out) underground, otherwise the first unfinished act goal
export function objectiveTarget(g) {
  if (g.interior) { const I = g.interior.I; return I.chest && !I.chest.opened ? I.chest.pos : I.entrance; }
  if (!g.briefed) return null;
  const tr = g.trackTarget?.(); if (tr?.pos) return tr.pos;
  const q = g.quests.find((x) => !x.done); if (!q) return null;
  const alive = (e) => e && !e.dead ? e.pos : null;
  if (q.id === STORY.chief) return alive(g.chief) || SITES.serai;
  if (q.id === STORY.second) return alive(g.matriarch) || SITES.kiln;
  if (q.id === STORY.boss) return alive(g.boss) || SITES.arch;
  return null;
}

export class Guide {
  constructor(g) {
    this.g = g; this.path = null; this.repath = 0; this.flow = 0; this.vis = 0;
    const geo = new THREE.PlaneGeometry(1.25, 1.25).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: chevronTexture(), color: new THREE.Color(3.2, 2.3, 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.count = 0; g.scene.add(this.mesh);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(); this.p = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0); this.c = new THREE.Color();
  }
  update(dt) {
    const g = this.g, P = g.player.pos;
    const goal = this.enabled === false || g.cinematic || g.player.dead ? null : objectiveTarget(g);
    const far = goal && Math.hypot(goal.x - P.x, goal.z - P.z) > 7;
    // fade out while fighting so it never competes with combat
    if ((this.labelT = (this.labelT || 0) - dt) <= 0) {
      this.labelT = 0.4;
      const q = g.interior ? null : g.briefed && g.quests.find((x) => !x.done);
      const tr = g.interior ? null : g.trackTarget?.();
      const text = g.interior ? (g.interior.I.chest && !g.interior.I.chest.opened ? 'Find the chest' : 'Climb back to the surface') : tr?.text || q?.text;
      g.ui.objective(g.cinematic ? null : text, goal ? Math.hypot(goal.x - P.x, goal.z - P.z) : null);
    }
    const fighting = g.player.target && !g.player.target.dead;
    this.vis += ((far && !fighting ? 1 : 0) - this.vis) * Math.min(1, dt * 3);
    if (this.vis < 0.02 || !goal) { this.mesh.count = 0; return; }
    if ((this.repath -= dt) <= 0 || !this.path) {
      this.repath = 0.6;
      const p = findPath(P, goal, 60000);
      this.path = p ? [{ x: P.x, z: P.z }, ...p] : [{ x: P.x, z: P.z }, { x: goal.x, z: goal.z }];
    } else this.path[0] = { x: P.x, z: P.z };
    this.flow = (this.flow + dt * 1.6) % GAP;
    // walk the polyline, placing a chevron every GAP metres (shifted by the flow so they stream forward)
    const pts = this.path; let seg = 0, along = 1.4 + this.flow, segStart = 0, n = 0;
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const end = Math.min(AHEAD, total - 2.5);
    while (n < MAX && along < end && seg < pts.length - 1) {
      const a = pts[seg], b = pts[seg + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
      if (along > segStart + L) { segStart += L; seg++; continue; }
      const u = L > 0 ? (along - segStart) / L : 0, x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
      const y = (g.interior ? P.y : heightAt(x, z)) + 0.07;
      this.q.setFromAxisAngle(this.up, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI);
      this.p.set(x, y, z); this.s.setScalar(1);
      this.m.compose(this.p, this.q, this.s); this.mesh.setMatrixAt(n, this.m);
      // fade in near the hero, out toward the end of the visible stretch
      const f = Math.min(1, (along - 1.4) / 2.5) * Math.min(1, (end - along) / 8) * this.vis;
      this.c.setScalar(Math.max(0, f)); this.mesh.setColorAt(n, this.c);
      n++; along += GAP;
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}
