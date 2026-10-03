import { haptic } from './sheets.js';

export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || new URLSearchParams(location.search).has('mobile');

// Touch controls: left virtual joystick + tap-to-move/attack + right-side skill cluster.
export function setupMobile(game, ui) {
  document.body.classList.add('touch');
  const root = document.getElementById('ui');
  const wrap = document.createElement('div'); wrap.id = 'touch';
  const ic = (d) => `<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#f2d27a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${d}</g></svg>`;
  const TILES = [
    ['bag', 'Inventory', ic('<path d="M12 18h24l-2 22H14z"/><path d="M18 18v-4a6 6 0 0 1 12 0v4"/><path d="M18 26h12"/>')],
    ['skills', 'Disciplines', ic('<circle cx="24" cy="10" r="4"/><circle cx="12" cy="36" r="4"/><circle cx="36" cy="36" r="4"/><circle cx="24" cy="36" r="4"/><path d="M24 14v18M24 22l-12 10M24 22l12 10"/>')],
    ['journal', 'Journal', ic('<path d="M10 8h22a6 6 0 0 1 6 6v26H16a6 6 0 0 1-6-6z"/><path d="M16 16h14M16 23h14M16 30h9"/>')],
    ['codex', 'Codex', ic('<path d="M24 12c-5-4-12-4-16-2v28c4-2 11-2 16 2 5-4 12-4 16-2V10c-4-2-11-2-16 2z"/><path d="M24 12v28"/>')],
    ['renown', 'Renown', ic('<circle cx="24" cy="20" r="11"/><path d="M18 30l-4 12 10-5 10 5-4-12"/><path d="M19 20l4 4 7-8"/>')],
    ['map', 'Map', ic('<path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4z"/><path d="M18 8v28M30 12v28"/>')],
    ['settings', 'Settings', ic('<circle cx="24" cy="24" r="6"/><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/>')],
  ];
  wrap.innerHTML = `<div id="joy"><div id="knob"></div></div>
    <div id="tskills"></div>
    <button id="tmenu" class="tbtn" aria-label="Menu"><i></i><i></i><i></i></button>
    <div id="tmenupop" class="panel hidden"><div class="grab"></div><div class="tiles">${TILES.map(([k, l, svg]) => `<button class="tile" data-m="${k}">${svg}<span>${l}</span></button>`).join('')}</div></div>`;
  root.appendChild(wrap);
  // the menu is a bottom sheet of large tiles; picking one opens that sheet in its place
  const pop = wrap.querySelector('#tmenupop');
  game.sheets?.watch(pop);
  wrap.querySelector('#tmenu').addEventListener('pointerdown', (e) => { e.preventDefault(); haptic(10); const show = pop.classList.contains('hidden'); game.sheets?.closeAll(); pop.classList.toggle('hidden', !show); });
  pop.addEventListener('click', (e) => {
    const m = e.target.closest('.tile')?.dataset.m; if (!m) return;
    pop.classList.add('hidden');
    if (m === 'bag') { ui.toggleInventory(true); game.refreshInv(); }
    if (m === 'map') document.body.classList.add('mapopen');
    if (m === 'skills') game.openPanel?.('skills');
    if (m === 'journal') game.journal?.('journal');
    if (m === 'codex') game.journal?.('codex');
    if (m === 'settings') game.settings?.open();
    if (m === 'renown') game.renownPanel?.();
  });
  // collapsible quest tracker and minimap (collapsed by default)
  const q = document.getElementById('quest');
  q.addEventListener('pointerdown', (e) => { e.preventDefault(); haptic(6); const k = e.target.closest('[data-k]'); if (k && q.classList.contains('open')) { game.track?.(k.dataset.k); return; } q.classList.toggle('open'); });
  // small round map top-left; tap it to open the large map, tap again to close
  document.getElementById('minimap').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); haptic(8); if (document.body.classList.contains('mapopen')) game.sheets?.closeAll(); else document.body.classList.add('mapopen'); });
  // controls fade back to translucent shortly after the last touch
  let fadeT = null;
  const wake = () => { document.body.classList.add('tactive'); clearTimeout(fadeT); fadeT = setTimeout(() => document.body.classList.remove('tactive'), 1500); };
  addEventListener('pointerdown', wake, true);
  // the skill slots (they already show cooldowns) live in a thumb cluster; rebuilt when the class changes
  const cl = wrap.querySelector('#tskills');
  const press = (k) => {
    game.audio.init();
    if (!game.started || game.player.dead || ui.dialogOpen || game.paused) return;
    if (k === 'attack') {
      if (game.attackMode === 'toggle') { game.autoAttack = !game.autoAttack; ui.skillEls.attack?.classList.toggle('auto', game.autoAttack); if (!game.autoAttack) game.player.target = null; return; }
      game.atkPressT = game.t; const e = game.player.target && !game.player.target.dead ? game.player.target : game.pickTarget(game.kit.attack.kind === 'melee' ? 5 : game.kit.attack.range); if (e) { game.player.target = e; game.player.moveTo = null; } return;
    }
    const d = game.slotDefs()[k]; if (d?.aim) game.aimAuto();
    game.useSkill(k);
  };
  const wire = (els) => {
    for (const [k, el] of Object.entries(els)) {
      if (el.parentNode !== cl) cl.appendChild(el);
      el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); el.classList.add('down'); haptic(k === 'attack' ? 6 : 12); press(k);
        if (k === 'attack' && game.attackMode !== 'toggle') el._hold = setInterval(() => press('attack'), 150); });
      const up = () => { el.classList.remove('down'); clearInterval(el._hold); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    }
  };
  ui.onSkillsBuilt = wire; ui.buildSkills(game.slotDefs());

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
      if (game.hoverNpc) { game.hoverNpc.talk(); return; }
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
