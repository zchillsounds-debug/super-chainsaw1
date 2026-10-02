// Performance HUD (toggle: F3, ?perf, or Settings): fps, frame time, draw calls, triangles, lights, quality tier.
export class PerfHUD {
  constructor(renderer, getInfo) {
    this.r = renderer; this.get = getInfo; this.el = document.createElement('div'); this.el.id = 'perf'; this.el.className = 'hidden';
    document.body.appendChild(this.el); this.acc = 0; this.n = 0; this.worst = 0; this.t = 0;
    addEventListener('keydown', (e) => { if (e.key === 'F3') { e.preventDefault(); this.toggle(); } });
    if (new URLSearchParams(location.search).has('perf')) this.toggle(true);
  }
  toggle(v) { this.on = v ?? !this.on; this.el.classList.toggle('hidden', !this.on); }
  frame(dt) {
    if (!this.on) return;
    this.acc += dt; this.n++; this.worst = Math.max(this.worst, dt); this.t += dt;
    if (this.t < 0.5) return;
    const i = this.r.info, x = this.get();
    const fps = this.n / this.acc, ms = this.acc / this.n * 1000;
    const budget = fps >= 55 ? 'ok' : fps >= 28 ? 'warn' : 'bad';
    this.el.innerHTML = `<b class="${budget}">${fps.toFixed(0)} fps</b> ${ms.toFixed(1)} ms (worst ${(this.worst * 1000).toFixed(0)})<br>draws ${i.render.calls} · tris ${(i.render.triangles / 1000).toFixed(0)}k · geo ${i.memory.geometries} · tex ${i.memory.textures}<br>${x}`;
    this.acc = 0; this.n = 0; this.worst = 0; this.t = 0;
  }
}
