import * as THREE from 'three';
import { heightAt, ROADS } from './terrain.js';
import { REGION, HUB } from './region.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { freeSpot } from './sidequests.js';
import { spawnCaptain, affixLabel } from './content.js';
import { makeItem, makeWantedUnique } from './items.js';
import { TYPES } from './entities.js';
import { crate, jar } from './props.js';
import { mulberry32 } from './noise.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

// Round 31: the Wanted board. Each camp posts five of Arsaber's captains, one above the other: beat the one at the
// bottom and the next poster goes up. Each holds out in his own camp on the roads with his men, has his trick (the
// affix and its move) and pays his own reward; the fifth pays the region's own legendary. When a region's five are
// down, one captain a week is posted there for a legendary and a large purse.
// State: p.wanted31[region] = { rank: 0..5, on: bool (a hunt is out), week: { n, done } }.

const LADDER = {
  sawad: [
    { name: 'Kaminas', type: 'bandit', affix: 'swift', guard: ['bandit', 'archer'], crime: 'Robs the grain carts on the canal road.' },
    { name: 'Patzes', type: 'archer', affix: 'volley', guard: ['bandit', 'spearman'], crime: 'Shoots at the men who mend the dykes.' },
    { name: 'Kalokyres', type: 'kontaratos', affix: 'ironclad', guard: ['spearman', 'deserter'], crime: 'Holds the ford and takes a toll from everyone who crosses.' },
    { name: 'Lykastes', type: 'naffat', affix: 'firebrand', guard: ['naffat', 'deserter'], crime: 'Burned three threshing floors before the harvest was in.' },
    { name: 'Taronas', type: 'spearman', affix: 'rally', guard: ['spearman', 'archer', 'bandit'], crime: 'Leads what is left of the foragers. His men would scatter without him.' },
  ],
  marsh: [
    { name: 'Phokinos', type: 'netter', affix: 'snare', guard: ['netter', 'slinger'], crime: 'Nets the fishermen\'s boats and sells the catch back to them.' },
    { name: 'Lekkas', type: 'slinger', affix: 'volley', guard: ['slinger', 'bandit'], crime: 'Stones the boats that carry reeds to the city.' },
    { name: 'Gongyles', type: 'reedman', affix: 'ambush', guard: ['reedman', 'reedman'], crime: 'Waits in the reeds on the causeways. Nobody sees him first.' },
    { name: 'Synadenos', type: 'kynegos', affix: 'swift', guard: ['bandit', 'netter'], crime: 'Hunts the buffalo herders with his dogs.' },
    { name: 'Kinnamos', type: 'spearman', affix: 'ironclad', guard: ['spearman', 'slinger', 'netter'], crime: 'Holds the sluice gates and lets the water out when the villages will not pay.' },
  ],
  karkh: [
    { name: 'Sklerenos', type: 'guard', affix: 'ironclad', guard: ['guard', 'deserter'], crime: 'Shakes down the bakers of the Karkh lanes every morning.' },
    { name: 'Mesopotamites', type: 'archer', affix: 'volley', guard: ['guard', 'archer'], crime: 'Shoots from the rooftops at anyone carrying water.' },
    { name: 'Xiphilinos', type: 'naffat', affix: 'firebrand', guard: ['naffat', 'guard'], crime: 'Set fire to the paper-sellers\' lane.' },
    { name: 'Hikanatos', type: 'sapper', affix: 'swift', guard: ['sapper', 'deserter'], crime: 'Digs under the houses and robs them from below.' },
    { name: 'Pakourianos', type: 'kontaratos', affix: 'rally', guard: ['guard', 'spearman', 'archer'], crime: 'Holds the burned suq with a company of his own.' },
  ],
  docks: [
    { name: 'Glabas', type: 'crossbow', affix: 'volley', guard: ['crossbow', 'guard'], crime: 'Shoots the boatmen from the warehouse roofs.' },
    { name: 'Kastamonites', type: 'guard', affix: 'rally', guard: ['guard', 'deserter', 'crossbow'], crime: 'Runs the press-gang on the quays.' },
    { name: 'Laskaris', type: 'engineer', affix: 'firebrand', guard: ['engineer', 'guard'], crime: 'Burns the boats he cannot steal.' },
    { name: 'Vatatzes', type: 'deserter', affix: 'swift', guard: ['deserter', 'spearman'], crime: 'Cuts purses on the quays and is gone before anyone turns.' },
    { name: 'Choirosphaktes', type: 'guard', affix: 'ironclad', guard: ['guard', 'crossbow', 'spearman'], crime: 'Holds the customs house and takes the river\'s tolls for himself.' },
  ],
  hamrin: [
    { name: 'Philanthropenos', type: 'crossbow', affix: 'volley', guard: ['crossbow', 'guard'], crime: 'Shoots down at the shepherds from the high paths.' },
    { name: 'Strategopoulos', type: 'spearman', affix: 'ironclad', guard: ['spearman', 'guard'], crime: 'Holds the wells in the dry valley.' },
    { name: 'Tzamplakon', type: 'kontaratos', affix: 'rally', guard: ['guard', 'spearman', 'crossbow'], crime: 'Gathers deserters from every broken company.' },
    { name: 'Botaneiates', type: 'akontistes', affix: 'swift', guard: ['akontistes', 'deserter'], crime: 'Raids the salt caravans and is back in the hills by dark.' },
    { name: 'Kantakouzenos', type: 'guard', affix: 'firebrand', guard: ['guard', 'crossbow', 'spearman'], crime: 'Means to burn the passes behind the army when it goes.' },
  ],
}[REGION] || [];
const WEEKLY_NAMES = ['Opsaras', 'Mouzakios', 'Lampardas', 'Petraliphas', 'Branas', 'Asanes', 'Zygabenos'];
const REWARD = ['A rare weapon', 'A rare coat or cap', 'A rare ring and three gems', 'A legendary', 'The legendary of this land'];
const BASE = { sawad: 2, marsh: 7, karkh: 10, docks: 13, hamrin: 20 }[REGION];
const today = () => Math.floor(Date.now() / 864e5);
const V3 = (x, z, y = 0) => new THREE.Vector3(x, heightAt(x, z) + y, z);

// a hideout far out on the roads: the same spot for the same captain
function hideout(rank) {
  const rnd = mulberry32([...REGION].reduce((a, c) => a * 31 + c.charCodeAt(0), 11) + rank * 977);
  for (let i = 0; i < 40; i++) {
    const r = ROADS[Math.floor(rnd() * ROADS.length)], k = Math.floor(rnd() * (r.length - 1)), u = 0.2 + rnd() * 0.6;
    const x = r[k][0] + (r[k + 1][0] - r[k][0]) * u, z = r[k][1] + (r[k + 1][1] - r[k][1]) * u;
    if (Math.hypot(x - HUB.spawn[0], z - HUB.spawn[1]) > 50) return freeSpot(x + (rnd() - 0.5) * 8, z + (rnd() - 0.5) * 8, 2);
  }
  return freeSpot(HUB.spawn[0] + 60, HUB.spawn[1], 2);
}

// ------------------------------------------------------------------ the poster: an ink sketch on paper
const KIT = { plume: ['kontaratos', 'guard', 'spearman', 'crossbow', 'engineer'], cap: ['bandit', 'archer', 'deserter', 'naffat', 'sapper', 'akontistes', 'kynegos'], hood: ['netter', 'slinger', 'reedman'] };
export function posterCanvas(C, state, w = 192) {
  const h = Math.round(w * 1.32), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), k = w / 192;
  const rnd = mulberry32([...C.name].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 5));
  // paper: warm, uneven, darker at the edges
  const g = x.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.8); g.addColorStop(0, '#e9d9b4'); g.addColorStop(1, '#b89a68'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(90,60,30,${rnd() * 0.08})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3 * k, 1 + rnd() * 3 * k); }
  x.strokeStyle = '#3a2614'; x.lineWidth = 2 * k; x.strokeRect(7 * k, 7 * k, w - 14 * k, h - 14 * k); x.lineWidth = 0.8 * k; x.strokeRect(11 * k, 11 * k, w - 22 * k, h - 22 * k);
  x.fillStyle = '#5a1a10'; x.textAlign = 'center'; x.font = `700 ${Math.round(19 * k)}px Cinzel, serif`; x.fillText(t('WANTED'), w / 2, 34 * k);
  // the sketch: shoulders, head, the headgear his kind wears, a beard
  const cx = w / 2, cy = 112 * k; x.strokeStyle = '#2a1a0c'; x.fillStyle = 'rgba(40,24,10,0.18)'; x.lineWidth = 2.2 * k; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx - 52 * k, cy + 70 * k); x.quadraticCurveTo(cx - 48 * k, cy + 26 * k, cx - 16 * k, cy + 22 * k); x.lineTo(cx + 16 * k, cy + 22 * k); x.quadraticCurveTo(cx + 48 * k, cy + 26 * k, cx + 52 * k, cy + 70 * k); x.fill(); x.stroke();
  x.beginPath(); x.ellipse(cx, cy - 4 * k, 22 * k, 28 * k, 0, 0, 7); x.fill(); x.stroke();
  const kind = KIT.plume.includes(C.type) ? 'plume' : KIT.hood.includes(C.type) ? 'hood' : 'cap';
  x.fillStyle = 'rgba(40,24,10,0.55)';
  if (kind === 'plume') { x.beginPath(); x.arc(cx, cy - 12 * k, 24 * k, Math.PI, 0); x.fill(); x.stroke(); x.beginPath(); x.moveTo(cx, cy - 36 * k); x.quadraticCurveTo(cx + 18 * k, cy - 58 * k, cx + 30 * k, cy - 40 * k); x.stroke(); for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(cx + i * 6 * k, cy - 40 * k - i * 3 * k); x.lineTo(cx + i * 6 * k + 6 * k, cy - 52 * k); x.stroke(); } x.beginPath(); x.moveTo(cx - 24 * k, cy - 10 * k); x.lineTo(cx - 26 * k, cy + 14 * k); x.moveTo(cx + 24 * k, cy - 10 * k); x.lineTo(cx + 26 * k, cy + 14 * k); x.stroke(); }
  else if (kind === 'cap') { x.beginPath(); x.moveTo(cx - 23 * k, cy - 14 * k); x.quadraticCurveTo(cx - 6 * k, cy - 52 * k, cx + 22 * k, cy - 16 * k); x.closePath(); x.fill(); x.stroke(); }
  else { x.beginPath(); x.moveTo(cx - 30 * k, cy + 18 * k); x.quadraticCurveTo(cx - 34 * k, cy - 40 * k, cx, cy - 38 * k); x.quadraticCurveTo(cx + 34 * k, cy - 40 * k, cx + 30 * k, cy + 18 * k); x.stroke(); }
  // eyes, brows and a beard (cut differently for each man)
  const bw = 0.6 + rnd() * 0.5; x.lineWidth = 1.6 * k;
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 4 * k, cy - 9 * k); x.lineTo(cx + s * 15 * k, cy - 11 * k - rnd() * 3 * k); x.stroke(); x.beginPath(); x.arc(cx + s * 9 * k, cy - 4 * k, 1.8 * k, 0, 7); x.fillStyle = '#2a1a0c'; x.fill(); }
  x.fillStyle = 'rgba(40,24,10,0.6)'; x.beginPath(); x.moveTo(cx - 20 * k, cy + 4 * k); x.quadraticCurveTo(cx, cy + (30 + bw * 16) * k, cx + 20 * k, cy + 4 * k); x.quadraticCurveTo(cx, cy + 14 * k, cx - 20 * k, cy + 4 * k); x.fill();
  if (rnd() < 0.5) { x.strokeStyle = 'rgba(120,20,10,0.7)'; x.beginPath(); x.moveTo(cx + 6 * k, cy - 16 * k); x.lineTo(cx + 14 * k, cy + 2 * k); x.stroke(); } // a scar
  // name and price
  x.fillStyle = '#2a1a0c'; x.font = `700 ${Math.round(15 * k)}px Cinzel, serif`; x.fillText(t(C.name), w / 2, 206 * k);
  x.font = `${Math.round(12 * k)}px Amiri, serif`; x.fillText(`${t(TYPES[C.type]?.name || C.type)} · ${t(affixLabel(C.affix))}`, w / 2, 224 * k);
  x.fillStyle = '#6a3a10'; x.font = `700 ${Math.round(12 * k)}px Cinzel, serif`; x.fillText(`◉ ${C.gold}`, w / 2, 244 * k);
  if (state === 'done') { x.strokeStyle = 'rgba(150,20,10,0.85)'; x.lineWidth = 7 * k; x.beginPath(); x.moveTo(20 * k, 50 * k); x.lineTo(w - 20 * k, h - 30 * k); x.moveTo(w - 20 * k, 50 * k); x.lineTo(20 * k, h - 30 * k); x.stroke(); }
  if (state === 'locked') { x.fillStyle = 'rgba(30,18,8,0.55)'; x.fillRect(0, 0, w, h); x.fillStyle = '#e9d9b4'; x.font = `700 ${Math.round(40 * k)}px Cinzel, serif`; x.fillText('?', w / 2, h / 2 + 12 * k); }
  return c;
}

// the board in the camp: a taller board under a little roof, five posters in a row
function wantedBoard(posters) {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x5a3e24, roughness: 0.85 });
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), wood); post.position.set(s * 1.35, 1.35, 0); post.castShadow = true; g.add(post); }
  const face = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.3, 0.08), wood); face.position.set(0, 1.65, 0); face.castShadow = true; g.add(face);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.6), wood); roof.position.set(0, 2.5, 0.08); roof.rotation.x = 0.22; roof.castShadow = true; g.add(roof);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0x6a1a14, roughness: 0.9 })); top.position.set(0, 2.38, 0.02); g.add(top);
  const mats = posters.map((cv) => { const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }); });
  mats.forEach((m, i) => { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.6), m); n.position.set(-1.1 + i * 0.55, 1.66 + (i % 2 ? 0.04 : -0.03), 0.05); n.rotation.z = ((i * 7) % 3 - 1) * 0.04; g.add(n); });
  return { group: g, mats };
}

export function setupWanted31(g) {
  if (!LADDER.length) return;
  const p = g.player;
  const S = () => { const w = (p.wanted31 ||= {}); return (w[REGION] ||= { rank: 0, on: false, week: { n: -1, done: false } }); };
  const week = () => Math.floor(today() / 7);
  const lv = (rank) => Math.max(BASE, p.level) + 1 + rank;
  const cap = (rank) => {
    if (rank < 5) { const C = LADDER[rank]; return { ...C, id: `w31_${REGION}_${rank}`, rank, gold: 150 + rank * 90 + lv(rank) * 10, renown: 20 + rank * 10, reward: REWARD[rank] }; }
    const n = week(), base = LADDER[n % 5], name = WEEKLY_NAMES[n % WEEKLY_NAMES.length];
    return { ...base, name, crime: 'Posted this week by the camp. Bring him in.', id: `w31_${REGION}_wk${n}`, rank: 5, weekly: n, gold: 600 + lv(5) * 20, renown: 40, reward: 'A legendary and a large purse' };
  };
  const state = (rank) => { const s = S(); if (rank < 5) return rank < s.rank ? 'done' : rank === s.rank ? 'open' : 'locked'; return s.rank < 5 ? 'locked' : s.week.n === week() && s.week.done ? 'done' : 'open'; };
  // ---- the board (posters redrawn when the ladder moves)
  const board = wantedBoard([0, 1, 2, 3, 4].map((r) => posterCanvas(cap(r), state(r))));
  const [bx, bz] = freeSpot(HUB.ishaq[0] + 9, HUB.ishaq[1] - 1, 1.8);
  board.group.position.copy(V3(bx, bz)); board.group.rotation.y = Math.atan2(HUB.spawn[0] - bx, HUB.spawn[1] - bz);
  g.scene.add(board.group); colliders.push({ type: 'box', x: bx, z: bz, hw: 1.5, hd: 0.3, rot: board.group.rotation.y }); buildGrid();
  g.interactables.push({ pos: board.group.position, r: 3, label: 'Read the Wanted board', act: () => openBoard() });
  g.pois?.push({ x: bx, z: bz, icon: '☗', color: '#e05040' });
  const redraw = () => board.mats.forEach((m, r) => { const old = m.map; m.map = new THREE.CanvasTexture(posterCanvas(cap(r), state(r))); m.map.colorSpace = THREE.SRGBColorSpace; m.needsUpdate = true; old.dispose(); });
  // ---- the hunt
  let live = null; // { C, boss, guard, objs, at }
  function startHunt(rank) {
    if (live) return;
    const C = cap(rank), [x, z] = hideout(rank === 5 ? 5 + (C.weekly % 4) : rank), at = V3(x, z);
    const { boss, guard } = spawnCaptain(g, { id: C.id, name: C.name, type: C.type, at: [x, z], level: lv(rank), affix: C.affix, guard: C.guard });
    if (rank === 5) { boss.maxHp = boss.hp = Math.round(boss.maxHp * 1.5); }
    // his camp: a fire, crates and a jar, a light
    const objs = [];
    for (const [ox, oz, o] of [[2.2, 1.4, crate()], [2.8, 0.2, crate()], [-2.0, 1.8, jar(0x7a5a3a, 1.1)]]) { const [px, pz] = freeSpot(x + ox, z + oz, 0.6); o.position.copy(V3(px, pz)); o.rotation.y = ox; g.scene.add(o); objs.push(o); }
    const lp = { pos: at.clone().add(new THREE.Vector3(0, 1, 0)), color: 0xff7a30, power: 8, dist: 9, flicker: 1.3, wanted: true }; g.lightPool?.add(lp);
    live = { C, boss, guard, objs, at, rank };
    const s = S(); s.on = true; saveGame(g);
    g.track?.('w31'); g.refreshTracker?.();
  }
  function endHunt(won) {
    if (!live) return; const { C, objs, rank, at } = live;
    for (const o of objs) g.scene.remove(o); g.lightPool?.remove((e) => e.wanted);
    live = null; const s = S(); s.on = false;
    if (won) {
      const L = lv(rank) + 1, drop = (it) => g.dropItem(it, at.clone().setY(at.y + 0.6));
      if (rank === 0) drop(makeItem(L, 'rare', 'weapon'));
      else if (rank === 1) drop(makeItem(L, 'rare', Math.random() < 0.5 ? 'armor' : 'helm'));
      else if (rank === 2) { drop(makeItem(L, 'rare', 'ring')); p.mats ||= {}; p.mats.gem = (p.mats.gem || 0) + 3; }
      else if (rank === 3) drop(makeItem(L, 'legendary'));
      else if (rank === 4) drop(makeWantedUnique(L, REGION));
      else drop(makeItem(L + 1, 'legendary'));
      p.gold += C.gold; p.renown = (p.renown || 0) + C.renown;
      if (rank < 5) s.rank = Math.max(s.rank, rank + 1); else s.week = { n: C.weekly, done: true };
      g.audio.legendary?.(); g.ui.banner(`${t('Wanted')}: ${t(C.name)}`, `${t('Taken')} · +${C.gold} ${t('dinars')} · +${C.renown} ${t('Renown')}`, 3200);
      if (rank === 4) setTimeout(() => g.ui.toast(t('Every captain on this board is down. A new one is posted each week.'), 'quest'), 3400);
      redraw();
    }
    if (g.trackedKey?.() === 'w31') g.track?.('w31');
    g.refreshTracker?.(); saveGame(g);
  }
  // ---- the board's panel: the five posters in a row, the weekly one below once the five are down
  function openBoard() {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const s = S(), w = document.createElement('div'); w.id = 'shop'; w.className = 'panel wanted';
    const card = (r) => {
      const C = cap(r), st = state(r), img = posterCanvas(C, st, 160).toDataURL('image/jpeg', 0.82);
      const btn = st === 'done' ? `<b class="bdone">${t('Taken')}</b>` : st === 'locked' ? `<b class="wlock">${t(r < 5 ? 'Beat the one before' : 'Beat all five')}</b>` : live?.rank === r ? `<b class="btaken">${t('Hunting')}</b>` : live ? `<b class="wlock">${t('One hunt at a time')}</b>` : `<button class="sbtn" data-r="${r}">${t('Hunt him')}</button>`;
      const info = st === 'locked' ? '' : `<small>${t(C.crime)}</small><small class="wrew">${t('Reward')}: ${t(C.reward)} · ◉ ${C.gold} · ${t('Renown')} +${C.renown}</small>`;
      return `<div class="wcard ${st}${r === 5 ? ' weekly' : ''}"><img src="${img}" alt=""><div class="wtxt">${r === 5 ? `<em>${t('This week')}</em>` : `<em>${t('Rank')} ${r + 1}</em>`}${info}</div>${btn}</div>`;
    };
    w.innerHTML = `<div class="ptitle">${t('Wanted')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody"><div class="slabel">${t('Beat the captain at the bottom of the board and the next is posted.')}</div><div class="wrow">${[0, 1, 2, 3, 4].map(card).join('')}</div>${s.rank >= 5 ? `<div class="wrow">${card(5)}</div>` : ''}</div><div class="sfoot"><span>${t('Renown')}: <b>${p.renown || 0}</b></span><span>${t('Taken')}: <b>${Math.min(5, s.rank)}/5</b></span></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelectorAll('button[data-r]').forEach((b) => b.onclick = () => { startHunt(+b.dataset.r); w.remove(); g.ui.toast(`${t('Wanted')}: ${t(live?.C.name || '')}. ${t('His camp is marked on the map.')}`, 'quest'); });
  }
  // ---- tracker line, trail and map marker
  const sl = g.sideLines; g.sideLines = () => { const out = sl ? sl() : []; if (live) out.push({ key: 'w31', text: `☗ ${t('Wanted')}: ${t(live.C.name)}`, side: true, on: g.trackedKey?.() === 'w31' }); return out; };
  const target = () => { if (!live) return null; const b = live.boss, any = [b, ...live.guard].find((e) => !e.dead); return { pos: any ? any.pos : live.at, text: `${t('Wanted')}: ${t(live.C.name)}` }; };
  const tt = g.trackTarget; g.trackTarget = () => (g.trackedKey?.() === 'w31' ? target() : tt?.());
  const qm = g.questMarks; g.questMarks = () => { const out = qm ? qm() : []; if (live && !g.interior) { const tg = target(); out.push({ pos: tg.pos, kind: 'wanted', name: live.C.name, key: 'w31', on: g.trackedKey?.() === 'w31' }); } return out; };
  // ---- per frame (sideTick runs only in the open)
  const st0 = g.sideTick; g.sideTick = (dt) => { st0?.(dt); if (live && live.boss.dead) endHunt(true); };
  // ---- after a load: a hunt that was out comes back
  const rs = g.restoreSide; g.restoreSide = () => { rs?.(); const was = S().on; if (live) { for (const e of [live.boss, ...live.guard]) if (!e.dead) { e.dead = true; e.removed = true; g.scene.remove(e.rig); } endHunt(false); } redraw(); const s = S(); if (was) startHunt(s.rank < 5 ? s.rank : 5); };
  g.__wanted = { cap, state, startHunt, endHunt, openBoard, S, get live() { return live; }, board };
}
