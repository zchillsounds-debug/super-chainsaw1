import * as THREE from 'three';
import { SITES, heightAt } from './terrain.js';
import { REGION, HUB } from './region.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { addEntrance } from './content.js';
import { freeSpot, boardProp } from './sidequests.js';
import { MODS } from './progression.js';
import { makeItem } from './items.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

// Round 17: six new underground styles (each with one hazard), Captain's Contracts, and the Renown board.

// ------------------------------------------------------------------ the six new dungeons, two per region
const ALL = [
  { id: 'cistern', region: 'sawad', style: 'cistern', near: ['village', -30, -20], seed: 1701, rooms: 8, level: 3, title: 'The Old Cistern', sub: 'The water rises and falls here. Keep to the stone landings.', pool: ['bandit', 'archer', 'deserter'], bossType: 'spearman', bossName: 'Wahb', label: 'Go down into the old cistern', look: 'stone' },
  { id: 'kiln2', region: 'sawad', style: 'kiln2', near: ['kiln', 20, 12], seed: 1702, rooms: 8, level: 4, title: 'The Lower Kilns', sub: 'Vents breathe hot smoke. Smoke hides you, and burns.', pool: ['deserter', 'naffat', 'spearman'], bossType: 'naffat', bossName: 'Bujayr', label: 'Descend into the lower kilns', look: 'clay' },
  { id: 'grainvault', region: 'marsh', style: 'grainvault', near: ['serai', 14, 14], seed: 1703, rooms: 8, level: 8, title: 'The Granary Vaults', sub: 'Strike a grain stack to bring it down on your foes.', pool: ['bandit', 'slinger', 'netter', 'spearman'], bossType: 'spearman', bossName: 'Hurayth', label: 'Go down into the granary vaults', look: 'mud' },
  { id: 'warren', region: 'marsh', style: 'warren', near: ['arch', 18, 16], seed: 1704, rooms: 8, level: 9, title: 'The Reed Warren', sub: 'Fire runs from hut to hut. Watch for smoke.', pool: ['reedman', 'netter', 'slinger', 'naffat'], bossType: 'naffat', bossName: 'Sinan', label: 'Enter the reed warren', look: 'reed' },
  { id: 'salt', region: 'karkh', style: 'salt', near: ['arch', -20, 18], seed: 1705, rooms: 9, level: 11, title: 'The Salt Workings', sub: 'Light through the roof cracks dazzles. Step out of it.', pool: ['guard', 'archer', 'deserter'], bossType: 'guard', bossName: 'Unays', label: 'Go down into the salt workings', look: 'salt' },
  // Round 20: Act VI, the river quays
  { id: 'undercroft', region: 'docks', style: 'cistern', near: ['village', 22, -18], seed: 1707, rooms: 8, level: 13, title: 'The Flooded Undercroft', sub: 'The river seeps in and out of these vaults. Keep to the stone landings.', pool: ['guard', 'crossbow', 'deserter'], bossType: 'guard', bossName: 'Hubaysh', label: 'Go down into the flooded undercroft', look: 'stone' },
  { id: 'wharfvault', region: 'docks', style: 'grainvault', near: ['kiln', -20, 16], seed: 1708, rooms: 8, level: 15, title: 'The Wharf Vaults', sub: 'Strike a stack of bales to bring it down on your foes.', pool: ['guard', 'engineer', 'crossbow', 'spearman'], bossType: 'engineer', bossName: 'Mudrik', label: 'Go down into the wharf vaults', look: 'mud' },
  { id: 'palace', region: 'karkh', style: 'palace', near: ['kiln', 18, -12], seed: 1706, rooms: 8, level: 12, title: 'The Palace Cellars', sub: 'Cracked tiles hide triggers. Foes set them off too.', pool: ['guard', 'archer', 'naffat', 'spearman'], bossType: 'guard', bossName: 'Habib', label: 'Go down into the palace cellars', look: 'brick' },
];
export const DUNGEONS = ALL.filter((d) => d.region === REGION);
// grounds a contract can be fought on, per region (older styles included)
const GROUNDS = {
  sawad: [['cistern', 'The Old Cistern'], ['kiln2', 'The Lower Kilns'], ['vault', 'The Sasanian Vaults'], ['pit', 'The Clay Pits']],
  marsh: [['grainvault', 'The Granary Vaults'], ['warren', 'The Reed Warren'], ['flood', 'The Drowned Granary']],
  karkh: [['salt', 'The Salt Workings'], ['palace', 'The Palace Cellars'], ['scorched', 'The Merchants\' Cellars']],
  docks: [['cistern', 'The Flooded Undercroft'], ['grainvault', 'The Wharf Vaults'], ['cellar', 'The Customs Vaults']],
  hamrin: [['salt', 'The Salt Workings'], ['vault', 'The Sasanian Vaults'], ['kiln2', 'The Lower Kilns'], ['cistern', 'The Old Cistern']],
}[REGION];
const BASE = { sawad: 3, marsh: 8, karkh: 11, docks: 14, hamrin: 20 }[REGION];

// ------------------------------------------------------------------ the Renown board: account passives bought with Renown
export const RENOWN = [
  { id: 'purse', name: 'Open Hand', desc: '+10% dinars found', max: 3 },
  { id: 'sherbet', name: 'Deep Flask', desc: '+1 sherbet carried', max: 2 },
  { id: 'stride', name: 'Light Step', desc: '+8% evade distance', max: 3 },
  { id: 'fortune', name: 'Keen Eye', desc: '+4% chance a magic find is rare', max: 3 },
  { id: 'vigor', name: 'Hardy', desc: '+5% maximum life', max: 3 },
  { id: 'edge', name: 'Whetstone', desc: '+4% damage', max: 3 },
  { id: 'swift', name: 'Road-worn', desc: '+3% movement speed', max: 3 },
  { id: 'scholar', name: 'Quick Study', desc: '+8% experience', max: 3 },
  { id: 'ward', name: 'Layered Mail', desc: '+6% armour', max: 3 },
  { id: 'breath', name: 'Second Wind', desc: '+1 life regained per second', max: 3 },
  { id: 'remedy', name: 'Rosewater', desc: 'Sherbet heals 15% more', max: 3 },
  { id: 'hunter', name: 'Captain-Hunter', desc: '+8% damage to captains and elites', max: 3 },
];
export const renownCost = (rank) => 20 + rank * 20; // 20, 40, 60
const rk = (p, id) => (p.rb || {})[id] || 0;

export function setupDungeons(game) {
  const g = game, p = g.player; p.rb ||= {}; p.slain ||= {};
  // ---------------------------------------------------------------- entrances
  for (const D of DUNGEONS) {
    const S = SITES[D.near[0]], [x, z] = freeSpot(S.x + D.near[1], S.z + D.near[2], 2.6);
    addEntrance(g, { ...D, at: [x, z], icon: '▼', extra: { scale: true, hazard: D.style } });
  }
  // dungeons scale with the hero so they stay worth a visit
  const enter = g.zones.enter.bind(g.zones);
  g.zones.enter = (def) => { if (def.scale) def = { ...def, level: Math.max(def.level, p.level) }; return enter(def); };
  // remember every captain the hero fells: they become contract targets
  const prevKill = g.onKill;
  g.onKill = (e) => {
    prevKill?.(e);
    if ((e.elite && (e.bossOf || e.namedId)) || e.contract) {
      const name = (e.baseName || e.name || '').split(' · ')[0];
      if (name && !e.contract) p.slain[name] = { type: e.type, region: REGION };
    }
    if (e.contract && g.interior?.def.contract) g.interior.def.contract.won = true;
  };
  // ---------------------------------------------------------------- renown hooks
  const recalc = g.recalcStats.bind(g);
  g.recalcStats = () => {
    recalc(); const s = p.stats;
    s.maxHp = Math.round(s.maxHp * (1 + rk(p, 'vigor') * 0.05));
    if (rk(p, 'edge')) { const k = 1 + rk(p, 'edge') * 0.04; s.min = Math.round(s.min * k); s.max = Math.round(s.max * k); }
    s.move = (s.move || 0) + rk(p, 'swift') * 3;
    s.armor = Math.round(s.armor * (1 + rk(p, 'ward') * 0.06));
    s.regen = (s.regen || 0) + rk(p, 'breath');
    p.potCap = rk(p, 'sherbet'); p.evadeK = 1 + rk(p, 'stride') * 0.08; p.xpK = 1 + rk(p, 'scholar') * 0.08; p.healK = 1 + rk(p, 'remedy') * 0.15;
    p.hp = Math.min(p.hp, s.maxHp);
  };
  g.recalcStats();
  const drop = g.dropItem.bind(g);
  g.dropItem = (item, at) => {
    if (item.gold) item.gold = Math.round(item.gold * (1 + rk(p, 'purse') * 0.1));
    if (item.rarity === 'magic' && item.slot && Math.random() < rk(p, 'fortune') * 0.04) item = makeItem(item.level, 'rare', item.slot);
    return drop(item, at);
  };
  const dmgMod = g.dmgMod;
  g.dmgMod = (e) => (dmgMod ? dmgMod(e) : 1) * (e.elite || e.boss ? 1 + rk(p, 'hunter') * 0.08 : 1);
  g.renownPanel = () => renownPanel(g);
  addEventListener('keydown', (e) => { if ((e.key === 'n' || e.key === 'N') && g.started && !g.cinematic && !g.ui.dialogOpen) { if (document.querySelector('#shop.renown')) document.getElementById('shop').remove(); else renownPanel(g); } });
  // ---------------------------------------------------------------- the contract board in the hub
  {
    const [bx, bz] = freeSpot(HUB.ishaq[0] - 5, HUB.ishaq[1] - 3, 1.4), board = boardProp();
    board.position.set(bx, heightAt(bx, bz), bz); board.rotation.y = Math.atan2(HUB.spawn[0] - bx, HUB.spawn[1] - bz);
    board.traverse((o) => { if (o.isMesh && o.geometry.type === 'PlaneGeometry') { o.material = o.material.clone(); o.material.color.set(0xd8b878); } });
    g.scene.add(board); colliders.push({ type: 'box', x: bx, z: bz, hw: 1.1, hd: 0.3, rot: board.rotation.y }); buildGrid();
    g.interactables.push({ pos: board.position, r: 2.8, label: 'Read the captains\' contracts', act: () => contractPanel(g) });
    g.pois?.push({ x: bx, z: bz, icon: '⚑', color: '#e09050' });
    g.contractBoard = board.position;
  }
  // ---------------------------------------------------------------- hazards
  const H = { t: 0, prevStyle: null };
  const glare = document.createElement('div'); glare.id = 'glare'; document.body.appendChild(glare);
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => { prevTick?.(dt); hazardTick(g, H, dt, glare); };
}

// ------------------------------------------------------------------ hazard logic (one per new style)
const v = new THREE.Vector3();
function hazardTick(g, H, dt, glare) {
  const I = g.interior?.I, p = g.player;
  g.hazSlow = 1;
  if (!I || !I.hazards || g.paused || g.cinematic) { if (glare.style.opacity !== '0') glare.style.opacity = '0'; if (H.style) H.style = null; return; }
  if (H.style !== I || H.style == null) { H.style = I; H.t = 0; H.cool = 0; H.fires = []; H.clouds = []; H.blind = 0; for (const h of I.hazards) { h.t = Math.random() * 5; h.cd = 0; h.done = false; } }
  H.t += dt;
  const foes = g.interior.enemies.filter((e) => !e.dead);
  const style = I.style, alive = !p.dead;
  const hurt = (dmg, at) => { if (alive) g.damagePlayer(dmg, at); };
  const lvl = g.interior.def.level || 1, base = 6 + lvl * 3;
  if (style === 'cistern') {
    // the water rises in waves: a 14 s cycle; ripples and a rushing sound warn 2 s ahead
    const c = H.t % 14, lv = c < 6 ? 0 : c < 8 ? (c - 6) / 2 : c < 11 ? 1 : c < 12.5 ? 1 - (c - 11) / 1.5 : 0;
    for (const w of I.water) w.position.y = 0.03 + lv * 0.5;
    if (c > 4 && c < 4 + dt * 1.01) { g.ui.toast(t('The water is rising'), 'quest'); g.audio.at?.(p.pos, () => g.audio.boom?.()); }
    if (c > 4 && c < 6 && Math.random() < 0.3) g.fx.ring(v.set(p.pos.x + (Math.random() - 0.5) * 8, 0.1, p.pos.z + (Math.random() - 0.5) * 8), new THREE.Color(0.5, 0.7, 0.7), 0.2, 1.5, 0.8, 0.5);
    if (lv > 0.3) {
      const dry = I.hazards.some((h) => h.kind === 'landing' && Math.abs(p.pos.x - h.x) < h.hw + 0.3 && Math.abs(p.pos.z - h.z) < h.hd + 0.3);
      if (!dry) { g.hazSlow = 1 - 0.5 * lv; p.wading = true; }
      for (const e of foes) { e.slowT = 0.2; e.slowK = 0.4 * lv; }
    }
  } else if (style === 'grainvault') {
    // a grain stack struck by the hero comes down 0.6 s later on everyone around it
    const acting = p.st.action && p.st.action !== 'dodge';
    for (const h of I.hazards) {
      if (h.kind !== 'stack' || h.done) continue;
      const d = Math.hypot(p.pos.x - h.x, p.pos.z - h.z);
      if (!(acting && d < 2.6)) continue;
      h.done = true; const at = new THREE.Vector3(h.x, 0, h.z);
      g.audio.at?.(at, () => g.audio.clang?.());
      g.telegraph(at, 3.2, 0.6, () => {
        g.fx.dust(at, 26, 2.2); g.audio.boom?.(); g.shake = 0.25;
        h.mesh.scale.set(1.5, 0.35, 1.5); h.mesh.position.y = 0;
        const ci = colliders.indexOf(h.col); if (ci >= 0) colliders.splice(ci, 1);
        for (const e of foes) if (e.pos.distanceTo(at) < 3.2) { g.damageEnemy(e, Math.round(base * (e.elite ? 2 : 4)), false, at, 'normal', { weight: 2, knock: 3, unblockable: true }); e.staggerT = 2; }
        if (p.pos.distanceTo(at) < 3.2) hurt(base * 0.8, at);
      });
    }
  } else if (style === 'salt') {
    // shafts of glare drift through the roof cracks; standing in one when it flares dazzles the hero
    for (const h of I.hazards) {
      if (h.kind !== 'glare') continue;
      const c = (H.t + h.t) % 9, a = c < 5 ? 0.04 : c < 7 ? 0.04 + (c - 5) / 2 * 0.35 : c < 7.6 ? 0.6 : 0.04;
      h.mesh.material.opacity = a * 0.5; h.spot.material.opacity = a;
      if (c >= 7 && c < 7 + dt * 1.01 && alive && Math.hypot(p.pos.x - h.x, p.pos.z - h.z) < 1.9) { H.blind = 1.6; g.ui.toast(t('Dazzled!'), 'quest'); }
    }
    H.blind = Math.max(0, H.blind - dt);
    const reduce = g.fx.reduce; glare.style.opacity = H.blind > 0 ? String(Math.min(1, H.blind) * (reduce ? 0.45 : 0.85)) : '0';
    if (H.blind > 0) g.hazSlow = 0.6;
  } else if (style === 'kiln2') {
    // vents: a glow and rumble, then a hot blast; the smoke that follows hides whoever stands in it
    for (const h of I.hazards) {
      if (h.kind !== 'vent') continue;
      h.cd -= dt; if (h.cd > 0) continue;
      h.cd = 6 + Math.random() * 3;
      const at = new THREE.Vector3(h.x, 0, h.z);
      if (at.distanceTo(p.pos) > 30) continue;
      g.telegraph(at, 1.7, 1.0, () => {
        g.fx.flash(v.copy(at).setY(0.5), 0xff6020, 14, 0.25, 6);
        for (let i = 0; i < 6; i++) g.fx.fire(v.copy(at).setY(0.2), 1.2);
        if (p.pos.distanceTo(at) < 1.7) hurt(base * 0.6, at);
        for (const e of foes) if (e.pos.distanceTo(at) < 1.7) g.damageEnemy(e, Math.round(base * 1.5), false, at, 'dot');
        H.clouds.push({ at, t: 4.5 });
      });
    }
    for (let i = H.clouds.length - 1; i >= 0; i--) {
      const c = H.clouds[i]; c.t -= dt;
      if (Math.random() < 0.6) g.fx.smoke.spawn({ pos: { x: c.at.x + (Math.random() - 0.5) * 3, y: 0.4, z: c.at.z + (Math.random() - 0.5) * 3 }, vel: { x: (Math.random() - 0.5) * 0.4, y: 0.5, z: (Math.random() - 0.5) * 0.4 }, life: 2.5, size: 1.2, size1: 3.4, color: new THREE.Color(0.16, 0.14, 0.13), alpha: 0.5, drag: 0.5 });
      if (alive && p.pos.distanceTo(c.at) < 3) p.buffs.stealth = Math.max(p.buffs.stealth || 0, 0.3);
      if (c.t <= 0) H.clouds.splice(i, 1);
    }
  } else if (style === 'palace') {
    // pressure plates: whoever steps on one sets it off; bolts cross the plate from the side wall 0.55 s later
    for (const h of I.hazards) {
      if (h.kind !== 'plate') continue;
      h.cd -= dt; if (h.cd > 0) { h.mesh.position.y = 0.01; continue; } h.mesh.position.y = 0.03;
      const on = (o) => Math.abs(o.pos.x - h.x) < 0.75 && Math.abs(o.pos.z - h.z) < 0.75;
      if (!(alive && on(p)) && !foes.some(on)) continue;
      h.cd = 3; g.audio.at?.(v.set(h.x, 0, h.z), () => g.audio.clang?.());
      const at = new THREE.Vector3(h.x, 0, h.z);
      g.telegraph(at, 1.5, 0.55, () => {
        const from = new THREE.Vector3(h.cx + h.side * 5.6, 1.1, h.z);
        g.fx.burst(from, 10, { speed: 6, life: 0.3, size: 0.12, size1: 0.02, color: new THREE.Color(3, 2.4, 1.4) });
        g.fx.sparks(v.copy(at).setY(1));
        if (p.pos.distanceTo(at) < 1.5) hurt(base * 0.9, at);
        for (const e of foes) if (e.pos.distanceTo(at) < 1.5) g.damageEnemy(e, Math.round(base * 3), false, from, 'normal', { weight: 1, unblockable: true });
      });
    }
  } else if (style === 'warren') {
    // a hut smokes for 2 s, then burns for 8 s; fire jumps to huts within 7 m after 3 s
    H.cool -= dt;
    const near = I.hazards.filter((h) => h.kind === 'hut' && !h.done && Math.hypot(h.x - p.pos.x, h.z - p.pos.z) < 18);
    if (H.cool <= 0 && near.length) { H.cool = 9 + Math.random() * 4; ignite(near[Math.floor(Math.random() * near.length)], H); }
    for (const h of I.hazards) {
      if (h.kind !== 'hut' || !h.burn) continue;
      h.burn += dt; const at = v.set(h.x, 0, h.z);
      if (h.burn < 2) { if (Math.random() < 0.5) g.fx.smoke.spawn({ pos: { x: h.x, y: 2.2, z: h.z }, vel: { x: 0.2, y: 1.2, z: 0 }, life: 2, size: 0.6, size1: 2, color: new THREE.Color(0.2, 0.18, 0.16), alpha: 0.5, drag: 0.3 }); continue; }
      if (h.burn < 10) {
        for (let i = 0; i < 2; i++) g.fx.fire(v.set(h.x + (Math.random() - 0.5) * 2.4, 0.3 + Math.random() * 1.6, h.z + (Math.random() - 0.5) * 2.4), 1.1);
        h.tick = (h.tick || 0) - dt;
        if (h.tick <= 0) { h.tick = 0.5; const a = new THREE.Vector3(h.x, 0, h.z); if (p.pos.distanceTo(a) < 2.8) hurt(base * 0.35, a); for (const e of foes) if (e.pos.distanceTo(a) < 2.8) g.damageEnemy(e, Math.round(base * 0.8), false, a, 'dot'); }
        if (h.burn > 5 && !h.spread) { h.spread = true; for (const o of I.hazards) if (o.kind === 'hut' && !o.done && Math.hypot(o.x - h.x, o.z - h.z) < 7) ignite(o, H); }
      } else if (!h.ash) { h.ash = true; h.mesh.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0x1e1a16); } }); h.mesh.scale.y = 0.45; g.decal?.(new THREE.Vector3(h.x, 0, h.z), 4, 'scorch'); }
    }
  }
}
function ignite(h, H) { if (h.done) return; h.done = true; h.burn = 0.001; }

// ------------------------------------------------------------------ panels
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
function sheet(g, cls, title, body, foot = '') {
  document.getElementById('shop')?.remove(); g.closePanels?.();
  const w = el(`<div id="shop" class="panel ${cls}"><div class="ptitle">${t(title)} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">${body}</div>${foot}</div>`);
  g.ui.root.appendChild(w); w.querySelector('.close').onclick = () => w.remove();
  return w;
}

export function renownPanel(g) {
  const p = g.player;
  const nodes = RENOWN.map((n) => {
    const r = rk(p, n.id), full = r >= n.max, cost = renownCost(r);
    const pips = Array.from({ length: n.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('');
    return `<div class="rnode ${r ? 'has' : ''} ${full ? 'full' : ''}"><div class="rname">${t(n.name)}</div><div class="rdesc">${t(n.desc)}</div><div class="rpips">${pips}</div>
      ${full ? `<b class="bdone">${t('Mastered')}</b>` : `<button class="sbtn" data-r="${n.id}" ${(p.renown || 0) < cost ? 'disabled' : ''}>${t('Learn')} · ${cost}</button>`}</div>`;
  }).join('');
  const w = sheet(g, 'renown', 'Renown', `<div class="slabel">${t('Renown is earned from bounties, events, side quests and contracts. What you learn here stays with you.')}</div><div class="rgrid">${nodes}</div>`,
    `<div class="sfoot"><span>${t('Renown')}: <b>${p.renown || 0}</b></span></div>`);
  w.querySelectorAll('button[data-r]').forEach((b) => b.onclick = () => {
    const id = b.dataset.r, r = rk(p, id), cost = renownCost(r);
    if ((p.renown || 0) < cost) return;
    p.renown -= cost; p.rb[id] = r + 1; g.recalcStats(); g.audio.gold?.(); navigator.vibrate?.(12); saveGame(g); renownPanel(g);
  });
}

export function contractPanel(g, sel = {}) {
  const p = g.player, caps = Object.entries(p.slain || {});
  sel.cap ??= caps[0]?.[0]; sel.ground ??= GROUNDS[0][0]; sel.mods ||= [];
  const n = sel.mods.length, lvl = Math.max(BASE, p.level) + 1 + n, renown = 10 + n * 10, gold = 60 * lvl * (1 + n * 0.5);
  const body = !caps.length ? `<div class="slabel">${t('No contracts yet. Defeat a named captain in the field or in a dungeon, and the board will post a contract for his return.')}</div>` : `
    <div class="slabel">${t('Pick a captain, the ground, and up to three conditions. Harder conditions pay more. Contracts never run out.')}</div>
    <div class="cgroup"><div class="ch">${t('Captain')}</div><div class="chips">${caps.map(([k]) => `<button class="chip ${k === sel.cap ? 'on' : ''}" data-cap="${k}">${t(k)}</button>`).join('')}</div></div>
    <div class="cgroup"><div class="ch">${t('Ground')}</div><div class="chips">${GROUNDS.map(([k, name]) => `<button class="chip ${k === sel.ground ? 'on' : ''}" data-g="${k}">${t(name)}</button>`).join('')}</div></div>
    <div class="cgroup"><div class="ch">${t('Conditions')} (${n}/3)</div><div class="chips">${Object.entries(MODS).map(([k, m]) => `<button class="chip ${sel.mods.includes(k) ? 'on' : ''}" data-m="${k}" title="${t(m.desc)}">${t(m.name)}<small>${t(m.desc)}</small></button>`).join('')}</div></div>
    <div class="slabel creward">${t('Foes level')} ${lvl} · ◉ ${Math.round(gold)} · ${t('Renown')} +${renown}${n ? ` · ${t('extra treasure')} +${n}` : ''}</div>
    <div class="row2"><button class="sbtn go" ${sel.cap ? '' : 'disabled'}>${t('Take the contract')}</button></div>`;
  const w = sheet(g, 'contracts', 'Captains\' Contracts', body, `<div class="sfoot"><span>${t('Renown')}: <b>${p.renown || 0}</b></span></div>`);
  w.querySelectorAll('[data-cap]').forEach((b) => b.onclick = () => contractPanel(g, { ...sel, cap: b.dataset.cap }));
  w.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => contractPanel(g, { ...sel, ground: b.dataset.g }));
  w.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { const k = b.dataset.m, m = sel.mods.includes(k) ? sel.mods.filter((x) => x !== k) : sel.mods.length < 3 ? [...sel.mods, k] : sel.mods; contractPanel(g, { ...sel, mods: m }); });
  w.querySelector('.go')?.addEventListener('click', () => { w.remove(); startContract(g, sel.cap, sel.ground, sel.mods, { lvl, renown, gold }); });
}

export function startContract(g, cap, ground, mods, R) {
  const p = g.player, info = p.slain[cap] || { type: 'spearman' }, list = mods.map((m) => MODS[m]);
  const all = {}; for (const m of list) Object.assign(all, m);
  const C = { won: false };
  const pool = { sawad: ['bandit', 'archer', 'spearman', 'deserter', 'naffat'], marsh: ['bandit', 'slinger', 'netter', 'reedman', 'spearman'], karkh: ['guard', 'archer', 'naffat', 'deserter', 'spearman'], docks: ['guard', 'crossbow', 'spearman', 'deserter', 'engineer'], hamrin: ['guard', 'crossbow', 'spearman', 'deserter', 'archer', 'naffat'] }[REGION];
  const title = (GROUNDS.find((x) => x[0] === ground) || [0, 'The Depths'])[1];
  g.zones.enter({
    kind: 'contract', style: ground, seed: (Math.random() * 1e6) | 0, rooms: 6 + mods.length, level: R.lvl + (all.levelUp || 0), contract: C,
    title: `${t('Contract')}: ${t(cap)}`, sub: `${t(title)}${mods.length ? ' · ' + list.map((m) => t(m.name)).join(' · ') : ''}`,
    pool, bossType: info.type || 'spearman', bossName: cap + ' · ' + t('Captain'), lootBonus: (all.loot || 0) + mods.length,
    mods: { apply: (e) => { for (const m of list) m.apply?.(e); if (e.elite) { e.contract = true; e.maxHp = e.hp = Math.round(e.maxHp * 1.5); } }, fragile: !!all.fragile },
    onEnter: (gg) => { gg.recalcStats(); if (all.burning) gg.qanatBurn = true; },
    onExit: (gg) => { gg.qanatBurn = false; gg.recalcStats(); },
    onChest: (gg) => {
      p.gold += Math.round(R.gold); p.renown = (p.renown || 0) + R.renown; gg.audio.gold?.();
      gg.stats.contracts = (gg.stats.contracts || 0) + 1;
      gg.ui.banner(t('Contract fulfilled'), `◉ ${Math.round(R.gold)} · +${R.renown} ${t('Renown')}`, 3000); saveGame(gg);
    },
  });
}
