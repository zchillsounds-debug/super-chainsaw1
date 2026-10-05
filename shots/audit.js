// Character audit helpers (eval in page after close.js).
// __aim(target): frame a rig. target = { pos(), facing() }; ang in degrees from the target's front.
window.__aim = (tg, ang = 25, dist = 3.4, h = 1.3, ly = 1.0) => {
  const g = window.__game;
  g.updateCamera = function () {
    const p = tg.pos(), a = ang * Math.PI / 180, f = tg.facing();
    this.camera.position.set(p.x + Math.sin(f + a) * dist, p.y + h, p.z + Math.cos(f + a) * dist);
    this.camera.lookAt(p.x, p.y + ly, p.z);
  };
  document.getElementById('ui').style.display = 'none';
};
// park the player out of aggro range (enemies alert at 13-16 m) so the subject stays idle
window.__park = (p, off = 19) => { const g = window.__game; g.player.pos.set(p.x + off, 0, p.z + off * 0.4); g.player.invuln = 1e9; };
window.__tgEnemy = (e) => ({ pos: () => e.rig.position, facing: () => e.rig.rotation.y });
window.__tgRig = (r) => ({ pos: () => r.position, facing: () => r.rotation.y });
window.__tgPlayer = () => { const g = window.__game; return { pos: () => g.player.rig.position, facing: () => g.player.facing }; };
window.__enemy = (pred) => { const g = window.__game; return g.enemies.find((e) => !e.dead && pred(e)); };
// pick an enemy, unhide it, park the player and frame it; s = 'body' | 'side' | 'face'
window.__shootEnemy = (pred, s) => {
  const e = window.__enemy(pred); if (!e) { window.__log = (window.__log || '') + ' missing:' + pred; return; }
  e.hidden = false; e.riseT = 1; e.alerted = false; window.__park(e.pos);
  for (const q of window.__game.enemies) q.rig.visible = q === e;
  const k = e.rig.children[0].scale.x, sc = (e.boss ? 1 : 1) * k;
  const [ang, d, h, ly] = s === 'face' ? [20, 0.9, 1.72, 1.72] : s === 'side' ? [90, 3.4, 1.3, 1.0] : [25, 3.4, 1.3, 1.0];
  window.__aim(window.__tgEnemy(e), ang, d * sc, h * sc, ly * sc);
};
window.__shootNpc = (name, s) => {
  const g = window.__game, n = g.npcs.find((q) => q.name === name); if (!n) { window.__log = (window.__log || '') + ' missing:' + name; return; }
  window.__park(n.pos, 6);
  const [ang, d, h, ly] = s === 'face' ? [20, 0.9, 1.72, 1.72] : s === 'side' ? [90, 3.4, 1.3, 1.0] : [25, 3.4, 1.3, 1.0];
  window.__aim(window.__tgRig(n.rig), ang, d, h, ly);
};
// Ghassan only appears at the arch fight; build one in the open for the audit
window.__ghassan = (x = 22, z = 36) => { const g = window.__game; return g.spawnPack('commander', x, z, 1, 6, { spread: 0 })[0]; };
