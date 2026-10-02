import * as THREE from 'three';

// Torch light pool: many emitters (camp fires, lanterns, wall torches), a handful of real point lights.
// Every few frames the nearest emitters to the camera focus get a light; lights fade in and out as they move,
// so dozens of torches can light the scene for the cost of 4 (phone) or 8 (desktop) lights.
export class LightPool {
  constructor(scene, n = 6) {
    this.emitters = []; this.lights = []; this.t = 0;
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 12, 2); l.userData = { em: null, cur: 0 };
      scene.add(l); this.lights.push(l);
    }
  }
  // em: { pos: Vector3, color, power, dist, flicker, intensity? }
  add(em) { em.color = em.color ?? 0xff8a3a; em.power = em.power ?? 20; em.dist = em.dist ?? 12; em.flicker = em.flicker ?? 1; em.seed = Math.random() * 100; this.emitters.push(em); return em; }
  remove(pred) { this.emitters = this.emitters.filter((e) => !pred(e)); for (const l of this.lights) if (l.userData.em && pred(l.userData.em)) l.userData.em = null; }
  update(dt, focus, scale = 1) {
    this.t += dt; this.reT = (this.reT || 0) - dt;
    if (this.reT <= 0) {
      this.reT = 0.25;
      const ranked = this.emitters.filter((e) => !e.off).map((e) => [e, e.pos.distanceToSquared(focus) / (e.power / 20)]).sort((a, b) => a[1] - b[1]).slice(0, this.lights.length).map((a) => a[0]);
      const keep = new Set(ranked);
      const free = this.lights.filter((l) => !l.userData.em || !keep.has(l.userData.em));
      for (const l of this.lights) if (l.userData.em && keep.has(l.userData.em)) keep.delete(l.userData.em);
      for (const em of keep) { const l = free.shift(); if (!l) break; l.userData.next = em; }
    }
    for (const l of this.lights) {
      const u = l.userData;
      if (u.next) { u.cur = Math.max(0, u.cur - dt * 6); if (u.cur <= 0) { u.em = u.next; u.next = null; } }
      else if (u.em) u.cur = Math.min(1, u.cur + dt * 3);
      const em = u.em;
      if (!em) { l.intensity = 0; continue; }
      l.position.copy(em.pos); l.color.set(em.color); l.distance = em.dist;
      const fl = 1 + (Math.sin(this.t * 13 + em.seed) * 0.12 + (Math.random() - 0.5) * 0.18) * em.flicker;
      l.intensity = em.power * fl * u.cur * scale;
    }
  }
}
