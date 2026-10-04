import * as THREE from 'three';
import { camel, animateCamel, horse, animateHorse } from './characters.js';
import { IS_CITY } from './region.js';
import { resolve } from './collision.js';
import { heightAt } from './terrain.js';
import { haptic } from './sheets.js';

// Round 21: in al-Karkh and on the quays Salim rides a horse instead (faster, and nimbler in the lanes), and he
// whistles it up: two fingers to the lips, and the beast trots in from behind before he climbs on.
// Round 20: a riding camel for getting about the overworld maps. Travel only: Salim never fights from the
// saddle. The camel button (or V) calls it; he climbs down by himself when foes come at him, when he attacks
// or uses a skill, when he goes underground, when a cutscene starts, or when he taps the button again.
const SPEED = IS_CITY ? 1.9 : 1.65; // times walking pace
const ICON = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 30c1-6 4-9 8-9 3 0 4-5 8-5s5 5 8 5c3 0 4-4 6-6l3 2-2 3c-1 2-2 6-2 10"/><path d="M12 30v10M18 31v9M31 31v9M36 30v10"/><path d="M38 15l4-3"/></svg>';

const HORSE_ICON = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 29c1-5 4-8 9-8h11c3 0 4-4 6-8l2-4 2 3 1 4c0 3-2 5-4 6"/><path d="M12 29l-1 11M17 30l1 10M30 30l-2 10M34 28l2 12"/><path d="M9 29c-2 1-3 4-4 7"/></svg>';
export function setupMount(g) {
  const rig = IS_CITY ? horse(0x6a4228, 0x1f3f5c) : camel(0xc09060, 0x1f3f5c); rig.visible = false; g.scene.add(rig);
  const animate = IS_CITY ? animateHorse : animateCamel;
  const cst = { phase: 0, walkBlend: 0, seed: 1.3, speedK: 1 };
  const p = g.player, body = rig.userData.parts.body, seat = IS_CITY ? new THREE.Vector3(0.02, -0.66, 0) : new THREE.Vector3(-0.05, -0.03, 0), tmp = new THREE.Vector3();
  const M = g.mount = { rig, on: false, horse: IS_CITY };
  p.mountK = 1;

  const foesNear = (r) => g.enemies.some((e) => !e.dead && !e.hidden && e.alerted && e.pos.distanceTo(p.pos) < r);
  const puff = () => { g.fx.dust(tmp.copy(p.pos).setY(p.pos.y + 0.2), 14, 1.3); g.audio.step?.('sand', 1.4); };
  // the call: a whistle, then the beast trots in from behind and he climbs on when it reaches him
  M.call = () => {
    if (M.on || M.coming) return;
    if (g.interior) return g.ui.toast(IS_CITY ? 'No horses underground' : 'No camels underground');
    if (g.cinematic || p.dead) return;
    if (foesNear(22) || g.bossActive) return g.ui.toast('Not with foes so near');
    p.st.action = 'whistle'; p.st.actionT = 0; p.actionDur = 0.8; p.hitApplied = true; p.target = null;
    g.audio.whistle?.(); haptic(10);
    const back = tmp.set(-Math.sin(p.facing) * 7 + Math.cos(p.facing) * 2, 0, -Math.cos(p.facing) * 7 - Math.sin(p.facing) * 2);
    M.coming = { t: 0, pos: p.pos.clone().add(back) }; resolve(M.coming.pos, 0.9);
  };
  M.mount = () => {
    if (M.on) return;
    if (g.interior) return g.ui.toast(IS_CITY ? 'No horses underground' : 'No camels underground');
    if (g.cinematic || p.dead) return;
    if (foesNear(22) || g.bossActive) return g.ui.toast('Not with foes so near');
    M.coming = null; M.on = true; p.st.mounted = true; p.mountK = SPEED; p.st.action = null; p.target = null; p.whirlT = 0;
    rig.visible = true; puff(); haptic(14); btn.classList.add('on');
    if (!M.told) { M.told = true; g.ui.toast('Mounted. You climb down by yourself when foes come.'); }
  };
  M.dismount = (quiet) => {
    if (!M.on) return;
    M.on = false; p.st.mounted = false; p.mountK = 1; rig.visible = false; btn.classList.remove('on');
    // step down beside the camel
    p.pos.x += Math.cos(p.facing) * 0.9; p.pos.z -= Math.sin(p.facing) * 0.9; resolve(p.pos, 0.45);
    p.rig.position.copy(p.pos); if (!quiet) { puff(); haptic(8); }
  };
  M.toggle = () => (M.on ? M.dismount() : M.coming ? null : M.call());

  // called at the end of updatePlayer, after the rig has been placed and animated
  M.tick = (dt) => {
    btn.classList.toggle('hide', !g.started || !!g.interior || p.dead);
    if (M.coming) {
      // trotting in after the whistle; called off if foes come, he is hurt, he fights or a scene starts
      const c = M.coming; c.t += dt;
      if (g.interior || p.dead || g.cinematic || foesNear(18) || (p.target && !p.target.dead) || p.rollT > 0 || c.t > 4) { M.coming = null; rig.visible = false; return; }
      if (c.t > 0.45) {
        rig.visible = true;
        const dx = p.pos.x - c.pos.x, dz = p.pos.z - c.pos.z, d = Math.hypot(dx, dz), sp = 9;
        if (d > 1.2) { c.pos.x += dx / d * Math.min(d, sp * dt); c.pos.z += dz / d * Math.min(d, sp * dt); c.yaw = Math.atan2(dx, dz); }
        c.pos.y = heightAt(c.pos.x, c.pos.z);
        rig.position.copy(c.pos); rig.rotation.y = (c.yaw ?? p.facing) - Math.PI / 2;
        cst.walkBlend = d > 1.2 ? 1 : cst.walkBlend * 0.9; cst.speedK = 1.8; cst.phase += dt * sp * 0.8; animate(rig, cst, g.t);
        const step = Math.floor(cst.phase / Math.PI); if (step !== M.lastStep && d > 1.2) { M.lastStep = step; g.fx.dust(tmp.copy(c.pos).setY(c.pos.y + 0.1), 3, 0.6); g.audio.step?.(IS_CITY ? 'brick' : 'sand', 1.3); }
        if (d <= 1.2 && !p.st.action) { p.facing = (c.yaw ?? p.facing); M.mount(); }
      }
      return;
    }
    if (!M.on) return;
    if (g.interior || p.dead || g.cinematic || foesNear(14) || p.st.action || (p.target && !p.target.dead) || p.rollT > 0) { M.dismount(); return; }
    rig.position.copy(p.pos); rig.rotation.y = p.facing - Math.PI / 2;
    const vv = Math.hypot(p.vel?.x || 0, p.vel?.z || 0);
    cst.walkBlend = p.st.walkBlend; cst.speedK = vv / 6.4; cst.phase += dt * vv * (IS_CITY ? 1.0 : 0.8);
    animate(rig, cst, g.t);
    rig.updateMatrixWorld(true);
    body.localToWorld(tmp.copy(seat)); p.rig.position.copy(tmp); p.rig.rotation.y = p.facing; p.rig.updateMatrixWorld(true);
    // the camel's footfalls kick up sand
    const step = Math.floor(cst.phase / Math.PI); if (step !== M.lastStep && cst.walkBlend > 0.3) { M.lastStep = step; g.fx.dust(tmp.copy(p.pos).setY(p.pos.y + 0.1), 3, 0.6); g.audio.step?.('sand', 1.2); }
  };

  // a button on screen (in the thumb cluster on touch), and V on the keyboard
  const btn = document.createElement('div'); btn.id = 'mountbtn'; btn.className = 'hide'; btn.title = IS_CITY ? 'Horse (V)' : 'Camel (V)'; btn.innerHTML = IS_CITY ? HORSE_ICON : ICON;
  document.getElementById('ui').appendChild(btn);
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!g.started || g.paused) return; M.toggle(); });
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'v' && g.started && !g.paused && !g.ui.dialogOpen) M.toggle(); });
  return M;
}
