// Character studio (eval in page after close.js and audit.js).
// Builds rigs next to the (hidden) player and drives their animation directly, so shots are repeatable
// and nothing else in the game (AI, culling, other actors) moves them.
//   await __studio([{ cls: 'rami' }, { type: 'bandit' }, { look: {...} }], { gap: 1.6 })
//   __step(seconds, { walk: 1.4, act: 'shoot', actT: 0.5 })   advance every studio rig
//   __frame(i, ang, dist, h, ly)                              aim the camera at rig i
window.__studio = async (list, { gap = 1.7, face = 0, at = null } = {}) => {
  const g = window.__game, H = await import('/src/human.js'), A = await import('/src/anim.js');
  const { CLASSES } = await import('/src/classes.js'), { TYPES } = await import('/src/entities.js');
  const { heightAt } = await import('/src/terrain.js');
  for (const r of window.__rigs || []) r.rig.parent?.remove(r.rig);
  g.player.rig.visible = false; g.player.invuln = 1e9;
  for (const e of g.enemies) e.rig.visible = false;
  const P = at ? new (g.player.pos.constructor)(at[0], 0, at[1]) : g.player.pos.clone(); window.__hAt = heightAt;
  if (at) { g.player.pos.set(at[0] + 2, 0, at[1] + 6); window.__sim(0.2); }
  window.__rigs = list.map((d, i) => {
    const rig = d.cls ? H.humanoid(CLASSES[d.cls].look) : d.type ? window.__typeRig(TYPES, d.type) : H.humanoid(d.look);
    const x = P.x + (i - (list.length - 1) / 2) * gap, z = P.z;
    rig.position.set(x, heightAt(x, z), z); rig.rotation.y = face; g.scene.add(rig);
    return { rig, st: { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, dead: false, deadT: 0, fallDir: 1 }, x0: x, z0: z };
  });
  window.__H = H; A.CharLOD.center.copy(window.__rigs[0].rig.position);
  window.__step(0.6);
  return window.__rigs.length;
};
// enemy rigs come from the game's own archetypes (random colour picks fixed with a seed)
window.__typeRig = (TYPES, t) => { const r = Math.random; let s = 7; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647); try { return TYPES[t].build(); } finally { Math.random = r; } };
window.__step = (sec, { walk = 0, act = null, actT = null, dead = false } = {}) => {
  const dt = 1 / 30;
  for (let k = 0; k < sec / dt; k++) {
    window.__T = (window.__T || 0) + dt;
    for (const R of window.__rigs) {
      const r = R.rig;
      if (walk) { r.position.x += Math.sin(r.rotation.y) * walk * dt; r.position.z += Math.cos(r.rotation.y) * walk * dt; r.position.y = window.__hAt(r.position.x, r.position.z); }
      R.st.walkBlend = walk ? 1 : 0; R.st.action = act; R.st.dead = dead;
      if (act) R.st.actionT = actT ?? Math.min(1, (R.st.actionT || 0) + dt / 0.6);
      window.__H.animateHumanoid(r, R.st, window.__T, dt);
    }
  }
};
window.__frame = (i, ang = 25, dist = 3.4, h = 1.3, ly = 1.0) => {
  const R = window.__rigs[i]; window.__aim({ pos: () => R.rig.position, facing: () => R.rig.rotation.y }, ang, dist, h, ly);
};
// all rigs in one frame, seen from the front
window.__lineup = (dist = 6.5, h = 1.4, ly = 1.0) => {
  const rs = window.__rigs, c = rs[0].rig.position.clone().add(rs[rs.length - 1].rig.position).multiplyScalar(0.5);
  window.__aim({ pos: () => c, facing: () => rs[0].rig.rotation.y }, 0, dist, h, ly);
};
