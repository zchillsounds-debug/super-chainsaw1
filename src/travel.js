import * as THREE from 'three';
import { findPath, navClear, blockedAt } from './nav.js';
import { SITES, heightAt, mapColor } from './terrain.js';
import { REGION, HUB } from './region.js';
import { haptic } from './sheets.js';
import { t } from './i18n.js';

// Round 19: camera zoom (pinch / mouse wheel), a full-screen map you can pan and pinch, walk-to targets that
// follow a navigable path (from the map, or from a long tap-to-move on the ground), and fast travel between
// places already reached.
export const ZOOM_MIN = 0.5, ZOOM_MAX = 1.7;
const SITE_NAMES = {
  sawad: { village: 'The Village', serai: 'Old Caravanserai', kiln: 'Kiln Yard', arch: 'Persian Arch' },
  marsh: { village: 'Reed Village', serai: 'Reed Camp', kiln: 'Fish Racks', arch: 'Old Weir' },
  karkh: { village: 'The Khan', serai: 'Burned Suq', kiln: 'Paper-Sellers\' Lane', arch: 'The Square' },
}[REGION];
const KEY = 'sob.zoom';

export function setupTravel(g) {
  // ---------------------------------------------------------------- zoom
  try { const z = +localStorage.getItem(KEY); if (z) g.camZoom = THREE.MathUtils.clamp(z, ZOOM_MIN, ZOOM_MAX); } catch { /* storage off */ }
  let saveT = null;
  const setZoom = (z) => {
    g.camZoom = THREE.MathUtils.clamp(z, ZOOM_MIN, ZOOM_MAX);
    clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, String(g.camZoom.toFixed(3))); } catch { /* storage off */ } }, 400);
  };
  g.setZoom = setZoom;
  const canvas = g.renderer.domElement;
  addEventListener('wheel', (e) => { if (!g.started || g.cinematic || e.target !== canvas) return; setZoom(g.camZoom * Math.exp(Math.sign(e.deltaY) * 0.09)); }, { passive: true });
  // pinch: two fingers on the play area (the joystick finger is never part of a pinch)
  const pts = new Map(); let pinch = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ids = [...pts.keys()].filter((id) => id !== g.joyId);
    if (ids.length >= 2 && g.started && !g.cinematic) {
      const [a, b] = ids.map((id) => pts.get(id));
      pinch = { ids: ids.slice(0, 2), d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: g.camZoom };
      g.pinching = true; g.player.moveTo = null; g.walk = null; g.marker && (g.marker.material.opacity = 0);
    }
  }, true);
  addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!pinch) return;
    const a = pts.get(pinch.ids[0]), b = pts.get(pinch.ids[1]); if (!a || !b) return;
    setZoom(pinch.z0 * pinch.d0 / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)));
  });
  const up = (e) => { pts.delete(e.pointerId); if (pinch && pinch.ids.includes(e.pointerId)) { pinch = null; setTimeout(() => { g.pinching = false; }, 120); } };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);

  // ---------------------------------------------------------------- walk-to (path following)
  g.walkTo = (x, z, label) => {
    const P = g.player.pos;
    const path = findPath(P, { x, z }, 90000);
    if (!path) { g.ui.toast(t('No way there')); return false; }
    g.walk = { goal: new THREE.Vector3(x, heightAt(x, z), z), path, i: 0, label: label || 'Walking to the marker' };
    g.player.target = null; g.player.pickup = null;
    return true;
  };
  // long taps on the ground: walk around walls rather than into them
  const baseSet = g.setMoveTarget.bind(g);
  g.setMoveTarget = () => {
    baseSet(); g.walk = null;
    const m = g.player.moveTo, P = g.player.pos; if (!m || g.interior) return;
    if (Math.hypot(m.x - P.x, m.z - P.z) > 6 && !navClear(P.x, P.z, m.x, m.z)) { const path = findPath(P, m, 40000); if (path) g.walk = { goal: m.clone(), path, i: 0, label: null }; }
  };
  g.walkTick = () => {
    const w = g.walk, p = g.player; if (!w) return;
    const joyOn = g.joy && Math.hypot(g.joy.x, g.joy.y) > 0.15;
    if (joyOn || p.dead || g.cinematic || (p.target && !p.target.dead) || (g.t - (g.atkPressT ?? -9)) < 0.3) { g.walk = null; return; }
    let wp = w.path[w.i];
    while (wp && w.i < w.path.length - 1 && Math.hypot(wp.x - p.pos.x, wp.z - p.pos.z) < 1.3) wp = w.path[++w.i];
    if (!wp) { g.walk = null; return; }
    if (w.i === w.path.length - 1 && Math.hypot(wp.x - p.pos.x, wp.z - p.pos.z) < 0.5) { g.walk = null; p.moveTo = null; return; }
    if (!p.moveTo) p.moveTo = new THREE.Vector3();
    p.moveTo.set(wp.x, p.pos.y, wp.z);
  };

  // ---------------------------------------------------------------- places and fast travel
  const visited = () => ((g.player.visited ||= {})[REGION] ||= {});
  const places = () => {
    const out = [];
    const add = (id, x, z, name, icon) => out.push({ id, x, z, name, icon });
    add('hub', HUB.spawn[0], HUB.spawn[1], SITE_NAMES.village, '⌂');
    for (const k of ['serai', 'kiln', 'arch']) add(k, SITES[k].x, SITES[k].z + 8, SITE_NAMES[k], '⚑');
    for (const it of g.interactables) {
      if (it.interior || !it.pos) continue;
      if (it.area) add('a:' + it.area, it.pos.x, it.pos.z, it.label.replace(/^(Descend|Enter|Go down)( into)? /, '').replace(/^the /, 'The '), '◈');
      else if (/qanat/i.test(it.label)) add('qanat', it.pos.x, it.pos.z, 'Qanat Shaft', '◈');
      else if (/contract/i.test(it.label)) add('contracts', it.pos.x, it.pos.z, 'Contracts Board', '▤');
    }
    return out;
  };
  let visT = 0;
  g.travelTick = (dt) => {
    g.walkTick();
    if ((visT -= dt) > 0 || g.interior) return; visT = 1;
    const P = g.player.pos, v = visited();
    for (const pl of places()) if (!v[pl.id] && Math.hypot(pl.x - P.x, pl.z - P.z) < 16) { v[pl.id] = 1; if (g.started && pl.id !== 'hub') g.ui.toast(t('Waypoint found') + ': ' + t(pl.name)); }
  };
  const fightNear = () => g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(g.player.pos) < 22);
  const travelBlock = () => g.interior ? 'Not underground' : (g.bossActive || (g.boss && !g.boss.dead && g.boss.engaged)) ? 'Not while a captain fights you' : fightNear() ? 'Not in a fight' : g.cinematic ? 'Not now' : null;
  g.fastTravel = async (pl) => {
    const why = travelBlock(); if (why) { g.ui.toast(t(why)); haptic(30); return; }
    g.walk = null; g.player.moveTo = null; g.player.target = null;
    g.ui.fade(1); g.paused = true; await new Promise((r) => setTimeout(r, 650));
    // land beside the place, on a free cell
    const a = Math.random() * Math.PI * 2; let x = pl.x, z = pl.z;
    for (let r = 2.5; r < 9; r += 1.5) { const tx = pl.x + Math.cos(a) * r, tz = pl.z + Math.sin(a) * r; if (navClear(tx, tz, tx + 0.1, tz + 0.1)) { x = tx; z = tz; break; } }
    g.player.pos.set(x, heightAt(x, z), z); g.player.vel?.set(0, 0, 0); g.camInit = false;
    for (const f of g.followers || []) f.pos?.set(x + 1, heightAt(x + 1, z + 1), z + 1);
    g.world.cull?.(g.player.pos, 95);
    await new Promise((r) => setTimeout(r, 250));
    g.paused = false; g.ui.fade(0); g.ui.banner(t(pl.name), '', 1800);
  };

  // ---------------------------------------------------------------- the full-screen map
  // a painted survey of the region, made once on first open: ground colour with hill shading, the
  // walls and houses inked in from the nav grid, and a parchment mottle
  let painted = null;
  function paintedMap() {
    if (painted) return painted;
    const R = 2, N = 280 * R, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    const im = x.createImageData(N, N), d = im.data, pc = new THREE.Color();
    const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
    const H = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H[j * (N + 1) + i] = heightAt(i / R - 140, j / R - 140);
    const B = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) B[j * N + i] = blockedAt(i / R - 140, j / R - 140) ? 1 : 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = i / R - 140, wz = j / R - 140, mc = mapColor(wx, wz); pc.set(mc); const wet = mc === '#2a6a6a' || mc === '#1e4a4c' || mc === '#3a6a5e';
      const h = H[j * (N + 1) + i], dx = H[j * (N + 1) + i + 1] - h, dz = H[(j + 1) * (N + 1) + i] - h;
      let sh = 1 + (-dx * 0.9 - dz * 0.6) * R * 0.9; sh = Math.min(1.35, Math.max(0.6, sh));
      const mot = 0.9 + 0.2 * (hash(i >> 3, j >> 3) * 0.6 + hash(i >> 1, j >> 1) * 0.4);
      let r = pc.r * sh * mot, gg = pc.g * sh * mot, b = pc.b * sh * mot;
      const k = j * N + i;
      if (B[k] && !wet && wx < 139 && wz < 139) {
        const edge = !B[k - 1] || !B[k + 1] || !B[k - N] || !B[k + N];
        if (edge) { r = 0.16; gg = 0.1; b = 0.06; } else { r = 0.62; gg = 0.5; b = 0.36; }
      }
      // warm parchment cast
      r = r * 1.05 + 0.1; gg = gg * 1.0 + 0.08; b = b * 0.85 + 0.05;
      d[k * 4] = Math.min(255, r * 255); d[k * 4 + 1] = Math.min(255, gg * 255); d[k * 4 + 2] = Math.min(255, b * 255); d[k * 4 + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return (painted = c);
  }
  g.openMap = () => {
    if (document.getElementById('shop')) return;
    g.sheets?.closeAll();
    const W = document.createElement('div'); W.id = 'shop'; W.className = 'panel bigmap';
    W.innerHTML = `<div class="ptitle">${t('Map')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="mapwrap"><canvas></canvas><div class="mapcard hidden"></div><div class="maphint">${t('Tap to walk · tap a waypoint to travel')}</div></div>`;
    g.ui.root.appendChild(W);
    W.querySelector('.close').onclick = () => g.sheets?.closeAll();
    const cv = W.querySelector('canvas'), wrap = W.querySelector('.mapwrap'), card = W.querySelector('.mapcard');
    const x = cv.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
    // view: world centre (cx, cz) and pixels per metre
    const P = g.player.pos; const view = { cx: P.x, cz: P.z, s: 0 };
    const fit = () => { const r = wrap.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; if (!view.s) view.s = Math.min(r.width, r.height) / 190; };
    const toS = (wx, wz) => [(wx - view.cx) * view.s * dpr + cv.width / 2, (wz - view.cz) * view.s * dpr + cv.height / 2];
    const toW = (sx, sy) => [(sx * dpr - cv.width / 2) / (view.s * dpr) + view.cx, (sy * dpr - cv.height / 2) / (view.s * dpr) + view.cz];
    let sel = null;
    const draw = () => {
      if (!W.isConnected) return;
      x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#120c07'; x.fillRect(0, 0, cv.width, cv.height);
      const img = paintedMap(), [ox, oy] = toS(-140, -140), sz = 280 * view.s * dpr;
      x.imageSmoothingEnabled = true; x.globalAlpha = 0.95; x.drawImage(img, ox, oy, sz, sz); x.globalAlpha = 1;
      // parchment wash and a soft edge
      const gr = x.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * 0.3, cv.width / 2, cv.height / 2, Math.max(cv.width, cv.height) * 0.75);
      gr.addColorStop(0, 'rgba(60,40,20,0)'); gr.addColorStop(1, 'rgba(10,6,3,0.7)'); x.fillStyle = gr; x.fillRect(0, 0, cv.width, cv.height);
      const v = visited(), F = 13 * dpr;
      // walk path
      if (g.walk) { x.strokeStyle = 'rgba(255,220,140,0.85)'; x.lineWidth = 3 * dpr; x.setLineDash([6 * dpr, 6 * dpr]); x.beginPath(); x.moveTo(...toS(g.player.pos.x, g.player.pos.z)); for (const p of g.walk.path.slice(g.walk.i)) x.lineTo(...toS(p.x, p.z)); x.stroke(); x.setLineDash([]); }
      for (const pl of places()) {
        const [sx, sy] = toS(pl.x, pl.z), on = !!v[pl.id];
        x.beginPath(); x.arc(sx, sy, 11 * dpr, 0, 7); x.fillStyle = on ? (sel === pl ? '#ffd870' : 'rgba(30,20,10,0.85)') : 'rgba(30,20,10,0.5)'; x.fill();
        x.lineWidth = 2 * dpr; x.strokeStyle = on ? '#e8c070' : '#6a5a48'; x.stroke();
        x.fillStyle = sel === pl ? '#1a1008' : on ? '#ffe8b0' : '#8a7a68'; x.font = `bold ${F}px Cinzel, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(pl.icon, sx, sy + 1);
        if (on && view.s > 1.6) { x.font = `${12 * dpr}px Amiri, serif`; x.fillStyle = '#f0e0c0'; x.shadowColor = '#000'; x.shadowBlur = 4 * dpr; x.fillText(t(pl.name), sx, sy + 20 * dpr); x.shadowBlur = 0; }
      }
      // objective, enemies, hero
      const goal = g.walk?.goal; if (goal) { const [gx, gy] = toS(goal.x, goal.z); x.strokeStyle = '#ffd870'; x.lineWidth = 2.5 * dpr; x.beginPath(); x.arc(gx, gy, 7 * dpr, 0, 7); x.stroke(); }
      for (const e of g.enemies) if (!e.dead && (e.boss || e.elite)) { const [sx, sy] = toS(e.pos.x, e.pos.z); x.fillStyle = e.boss ? '#ff6020' : '#ffd040'; x.beginPath(); x.arc(sx, sy, 3.5 * dpr, 0, 7); x.fill(); }
      const [hx, hy] = toS(g.player.pos.x, g.player.pos.z), f = g.player.facing;
      x.save(); x.translate(hx, hy); x.rotate(-f + Math.PI); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.5 * dpr;
      x.beginPath(); x.moveTo(0, -9 * dpr); x.lineTo(6 * dpr, 7 * dpr); x.lineTo(0, 3 * dpr); x.lineTo(-6 * dpr, 7 * dpr); x.closePath(); x.fill(); x.stroke(); x.restore();
      requestAnimationFrame(draw);
    };
    const showCard = (pl) => {
      sel = pl; if (!pl) { card.classList.add('hidden'); return; }
      const why = travelBlock();
      card.innerHTML = `<b>${t(pl.name)}</b><div class="mcb"><button class="go">${t('Walk there')}</button><button class="ft" ${why ? 'disabled' : ''}>${t('Fast travel')}</button></div>${why ? `<i>${t(why)}</i>` : ''}`;
      card.classList.remove('hidden');
      card.querySelector('.go').onclick = () => { if (g.walkTo(pl.x, pl.z, pl.name)) g.sheets?.closeAll(); };
      card.querySelector('.ft').onclick = () => { g.sheets?.closeAll(); g.fastTravel(pl); };
    };
    // pan with one finger, pinch with two; a short tap selects a waypoint or walks to the spot
    const ptr = new Map(); let gest = null, moved = 0;
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const list = [...ptr.values()]; moved = ptr.size > 1 ? 99 : 0;
      gest = list.length >= 2 ? { d: Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y), s: view.s } : null;
    });
    cv.addEventListener('pointermove', (e) => {
      const o = ptr.get(e.pointerId); if (!o) return;
      const dx = e.clientX - o.x, dy = e.clientY - o.y; ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size >= 2 && gest) { const l = [...ptr.values()]; view.s = THREE.MathUtils.clamp(gest.s * Math.hypot(l[0].x - l[1].x, l[0].y - l[1].y) / (gest.d || 1), 0.8, 9); return; }
      moved += Math.abs(dx) + Math.abs(dy); view.cx -= dx / view.s; view.cz -= dy / view.s;
    });
    cv.addEventListener('pointerup', (e) => {
      ptr.delete(e.pointerId); if (ptr.size) return;
      if (moved > 10) return;
      const r = cv.getBoundingClientRect(), [wx, wz] = toW(e.clientX - r.left, e.clientY - r.top), v = visited();
      let best = null, bd = 18 / view.s;
      for (const pl of places()) { const d = Math.hypot(pl.x - wx, pl.z - wz); if (d < bd) { bd = d; best = pl; } }
      if (best && v[best.id]) { haptic(8); showCard(best); return; }
      if (best) { g.ui.toast(t('Not yet found')); return; }
      showCard(null);
      if (Math.abs(wx) > 138 || Math.abs(wz) > 138) return;
      if (g.walkTo(wx, wz)) { haptic(10); g.sheets?.closeAll(); }
    });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); view.s = THREE.MathUtils.clamp(view.s * Math.exp(-Math.sign(e.deltaY) * 0.15), 0.8, 9); }, { passive: false });
    requestAnimationFrame(() => { fit(); draw(); });
  };
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'm' && g.started && !g.cinematic && !e.target.closest?.('input,textarea')) { if (document.querySelector('#shop.bigmap')) g.sheets?.closeAll(); else g.openMap(); } });
}
