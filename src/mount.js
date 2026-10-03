import * as THREE from 'three';
import { camel, animateCamel } from './characters.js';
import { resolve } from './collision.js';
import { haptic } from './sheets.js';

// Round 20: a riding camel for getting about the overworld maps. Travel only: Salim never fights from the
// saddle. The camel button (or V) calls it; he climbs down by himself when foes come at him, when he attacks
// or uses a skill, when he goes underground, when a cutscene starts, or when he taps the button again.
const SPEED = 1.65; // times walking pace
const ICON = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 30c1-6 4-9 8-9 3 0 4-5 8-5s5 5 8 5c3 0 4-4 6-6l3 2-2 3c-1 2-2 6-2 10"/><path d="M12 30v10M18 31v9M31 31v9M36 30v10"/><path d="M38 15l4-3"/></svg>';

export function setupMount(g) {
  const rig = camel(0xc09060, 0x1f3f5c); rig.visible = false; g.scene.add(rig);
  const cst = { phase: 0, walkBlend: 0, seed: 1.3 };
  const p = g.player, body = rig.userData.parts.body, seat = new THREE.Vector3(-0.05, -0.03, 0), tmp = new THREE.Vector3();
  const M = g.mount = { rig, on: false };
  p.mountK = 1;

  const foesNear = (r) => g.enemies.some((e) => !e.dead && !e.hidden && e.alerted && e.pos.distanceTo(p.pos) < r);
  const puff = () => { g.fx.dust(tmp.copy(p.pos).setY(p.pos.y + 0.2), 14, 1.3); g.audio.step?.('sand', 1.4); };
  M.mount = () => {
    if (M.on) return;
    if (g.interior) return g.ui.toast('No camels underground');
    if (g.cinematic || p.dead) return;
    if (foesNear(22) || g.bossActive) return g.ui.toast('Not with foes so near');
    M.on = true; p.st.mounted = true; p.mountK = SPEED; p.st.action = null; p.target = null; p.whirlT = 0;
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
  M.toggle = () => (M.on ? M.dismount() : M.mount());

  // called at the end of updatePlayer, after the rig has been placed and animated
  M.tick = (dt) => {
    btn.classList.toggle('hide', !g.started || !!g.interior || p.dead);
    if (!M.on) return;
    if (g.interior || p.dead || g.cinematic || foesNear(14) || p.st.action || (p.target && !p.target.dead) || p.rollT > 0) { M.dismount(); return; }
    rig.position.copy(p.pos); rig.rotation.y = p.facing - Math.PI / 2;
    cst.walkBlend = p.st.walkBlend; cst.phase += dt * Math.hypot(p.vel?.x || 0, p.vel?.z || 0) * 0.8;
    animateCamel(rig, cst, g.t);
    rig.updateMatrixWorld(true);
    body.localToWorld(tmp.copy(seat)); p.rig.position.copy(tmp); p.rig.rotation.y = p.facing; p.rig.updateMatrixWorld(true);
    // the camel's footfalls kick up sand
    const step = Math.floor(cst.phase / Math.PI); if (step !== M.lastStep && cst.walkBlend > 0.3) { M.lastStep = step; g.fx.dust(tmp.copy(p.pos).setY(p.pos.y + 0.1), 3, 0.6); g.audio.step?.('sand', 1.2); }
  };

  // a button on screen (in the thumb cluster on touch), and V on the keyboard
  const btn = document.createElement('div'); btn.id = 'mountbtn'; btn.className = 'hide'; btn.title = 'Camel (V)'; btn.innerHTML = ICON;
  document.getElementById('ui').appendChild(btn);
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!g.started || g.paused) return; M.toggle(); });
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'v' && g.started && !g.paused && !g.ui.dialogOpen) M.toggle(); });
  return M;
}
