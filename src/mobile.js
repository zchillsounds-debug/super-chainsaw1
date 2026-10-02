import * as THREE from 'three';

export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || new URLSearchParams(location.search).has('mobile');

// Touch controls: left virtual joystick + tap-to-move/attack + right-side skill cluster.
export function setupMobile(game, ui) {
  document.body.classList.add('touch');
  const root = document.getElementById('ui');
  const wrap = document.createElement('div'); wrap.id = 'touch';
  wrap.innerHTML = `<div id="joy"><div id="knob"></div></div>
    <div id="tskills"></div>
    <button id="tbag" class="tbtn" aria-label="Inventory">Bag</button>
    <button id="tcfg" class="tbtn" aria-label="Settings">⚙</button>
    <button id="tmap" class="tbtn" aria-label="Map">Map</button>
    <div id="tsettings" class="panel hidden">
      <div class="ptitle">Controls <span class="close">✕</span></div>
      <label>Button size <input id="tsz" type="range" min="0.6" max="1.2" step="0.05"></label>
      <label>Button opacity <input id="top" type="range" min="0.25" max="1" step="0.05"></label>
    </div>`;
  root.appendChild(wrap);
  // control size / opacity, remembered per device
  const store = { get: (k, d) => { try { return parseFloat(localStorage.getItem(k)) || d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  const apply = (sz, op) => { document.body.style.setProperty('--tscale', sz); document.body.style.setProperty('--topa', op); };
  const tsz = wrap.querySelector('#tsz'), top = wrap.querySelector('#top');
  tsz.value = store.get('sob.tscale', 0.8); top.value = store.get('sob.topa', 0.6); apply(tsz.value, top.value);
  tsz.oninput = () => { apply(tsz.value, top.value); store.set('sob.tscale', tsz.value); };
  top.oninput = () => { apply(tsz.value, top.value); store.set('sob.topa', top.value); };
  const cfg = wrap.querySelector('#tsettings');
  wrap.querySelector('#tcfg').addEventListener('pointerdown', (e) => { e.preventDefault(); cfg.classList.toggle('hidden'); });
  cfg.querySelector('.close').addEventListener('pointerdown', () => cfg.classList.add('hidden'));
  // collapsible quest tracker and minimap (collapsed by default)
  const q = document.getElementById('quest');
  q.addEventListener('pointerdown', (e) => { e.preventDefault(); q.classList.toggle('open'); });
  wrap.querySelector('#tmap').addEventListener('pointerdown', (e) => { e.preventDefault(); document.body.classList.toggle('mapopen'); });
  // controls fade back to translucent shortly after the last touch
  let fadeT = null;
  const wake = () => { document.body.classList.add('tactive'); clearTimeout(fadeT); fadeT = setTimeout(() => document.body.classList.remove('tactive'), 1500); };
  addEventListener('pointerdown', wake, true);
  // move the existing skill slots (they already show cooldowns) into a thumb cluster
  const cl = wrap.querySelector('#tskills');
  const order = ['attack', 'naft', 'whirl', 'dash', 'ward', 'potion'];
  for (const k of order) { const el = ui.skillEls[k]; if (el) { el.classList.add('t-' + k); cl.appendChild(el); } }
  const nearest = (r = 9) => {
    let best = null, bd = r;
    for (const e of game.enemies) { if (e.dead || e.hidden) continue; const d = e.pos.distanceTo(game.player.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  };
  const aim = () => {
    const p = game.player, e = nearest(14);
    const at = e ? e.pos.clone() : p.pos.clone().add(new THREE.Vector3(Math.sin(p.facing) * 6, 0, Math.cos(p.facing) * 6));
    const v = at.project(game.camera); game.mouse.set(v.x, v.y);
  };
  const press = (k) => {
    game.audio.init();
    if (!game.started || game.player.dead || ui.dialogOpen) return;
    if (k === 'attack') { const e = nearest(); if (e) { game.player.target = e; game.player.moveTo = null; } return; }
    if (k === 'naft' || k === 'dash') aim();
    game.useSkill(k);
  };
  for (const k of order) {
    const el = ui.skillEls[k]; if (!el) continue;
    el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); el.classList.add('down'); press(k);
      if (k === 'attack') el._hold = setInterval(() => press('attack'), 300); });
    const up = () => { el.classList.remove('down'); clearInterval(el._hold); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  }
  wrap.querySelector('#tbag').addEventListener('pointerdown', (e) => { e.preventDefault(); ui.toggleInventory(); game.refreshInv(); });

  // joystick (left half of the screen, appears where the thumb lands)
  const joy = wrap.querySelector('#joy'), knob = wrap.querySelector('#knob');
  let jid = null, jx = 0, jy = 0;
  const canvas = game.renderer.domElement;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    game.audio.init();
    if (!game.started || ui.dialogOpen) return;
    if (e.clientX < innerWidth * 0.4 && jid === null) {
      jid = e.pointerId; jx = e.clientX; jy = e.clientY;
      joy.style.left = jx + 'px'; joy.style.top = jy + 'px'; joy.classList.add('on');
      canvas.setPointerCapture(e.pointerId);
    } else {
      // tap to move / attack
      game.mouseScreen.x = e.clientX; game.mouseScreen.y = e.clientY;
      game.mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      game.pickHover();
      if (game.hoverNpc) { game.talkToNpc(); return; }
      if (game.hover) { game.player.target = game.hover; game.player.moveTo = null; }
      else { game.player.target = null; game.setMoveTarget(); game.showMarker(); }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== jid) return;
    let dx = e.clientX - jx, dy = e.clientY - jy; const l = Math.hypot(dx, dy), R = 50;
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.joy = l > 8 ? { x: dx / R, y: dy / R } : null;
  });
  const end = (e) => { if (e.pointerId !== jid) return; jid = null; game.joy = null; joy.classList.remove('on'); knob.style.transform = ''; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
}
