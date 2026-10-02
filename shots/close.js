// usage: eval in page. window.__close(angleDeg, dist, height, lookY, target='player')
window.__close = (ang = 20, dist = 3.2, h = 1.6, ly = 1.15, who) => {
  const g = window.__game, T = () => who ? who() : g.player.rig.position;
  g.updateCamera = function () {
    const p = T(), a = ang * Math.PI / 180;
    const f = g.player.facing;
    this.camera.position.set(p.x + Math.sin(f + a) * dist, p.y + h, p.z + Math.cos(f + a) * dist);
    this.camera.lookAt(p.x, p.y + ly, p.z);
  };
  document.getElementById('ui').style.display = 'none';
};
window.__nearest = (pred = (e) => !e.boss) => { const g = window.__game, P = g.player.pos; let best = null, bd = 1e9; for (const e of g.enemies) { if (e.dead || !pred(e)) continue; const d = e.pos.distanceTo(P); if (d < bd) { bd = d; best = e; } } return best; };
window.__look = (e, ang = 0, dist = 3.2, h = 1.5, ly = 1.0) => { const g = window.__game; g.player.pos.set(e.pos.x + 9, e.pos.y, e.pos.z + 9); __close(ang, dist, h, ly, () => e.rig.position); g.player.facing = e.facing; };
