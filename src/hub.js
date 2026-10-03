import * as THREE from 'three';
import { humanoid, animateHumanoid } from './characters.js';
import { heightAt } from './terrain.js';
import { colliders, mats } from './buildings.js';
import { buildGrid } from './collision.js';
import { makeItem, rollRarity, RARITY, statLines } from './items.js';
import { itemIcon } from './ui.js';
import { CLASSES, CLASS_ORDER, SKILL_ICONS } from './classes.js';
import { firePit } from './props.js';

// The suq at the village gate: merchant, blacksmith, stash and training yard.
// Each is an interactable; the panels are plain DOM in the HUD layer and work with mouse and touch alike.
const HUB = { merchant: [7, 81], smith: [10, 92], stash: [-6, 91], trainer: [-9, 81] };
export const MAX_RANK = 5;
let DISC = 0;
const price = (it) => Math.round(({ common: 8, magic: 30, rare: 90, set: 160, legendary: 400 })[it.rarity] * (1 + it.level * 0.25) * (1 - DISC));
export const sellPrice = (it) => it.questId ? 0 : Math.max(1, Math.round(price(it) / (1 - DISC) * 0.25));
export const SALVAGE = { common: { scrap: 1 }, magic: { scrap: 2, silk: 1 }, rare: { scrap: 3, silk: 2, gem: 1 }, set: { scrap: 4, silk: 3, gem: 2 }, legendary: { scrap: 5, silk: 3, gem: 3 } };
export const MAT_NAMES = { scrap: 'Iron Scrap', silk: 'Silk Thread', gem: 'Gem Shard' };
export const upgradeCost = (it) => { const r = it.rank || 0; return { gold: 40 * (r + 1) * (1 + it.level * 0.2) | 0, scrap: 2 + r * 2, silk: r >= 2 ? r - 1 : 0, gem: r >= 4 ? 1 : 0 }; };

export function npc(game, look, [x, z], face, name, title, talk, prop) {
  const rig = humanoid({ detail: 'lo', ...look });
  rig.position.set(x, heightAt(x, z), z); rig.rotation.y = face;
  game.scene.add(rig);
  const st = { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, seed: Math.random() * 10 };
  colliders.push({ type: 'circle', x, z, r: 0.6 });
  const n = { rig, st, name, title, talk, pos: rig.position, r: 3.2 };
  game.npcs.push(n);
  game.interactables.push({ pos: rig.position, r: 3.2, label: `Talk to ${name}`, act: () => n.talk(), npc: n });
  return n;
}
function anvilProp() {
  const g = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: 0x2c2a28, metalness: 0.85, roughness: 0.45 });
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.6, 10), mats().wood); st.position.y = 0.3; g.add(st);
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.3), iron); a.position.y = 0.72; g.add(a);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 8).rotateZ(-Math.PI / 2), iron); horn.position.set(0.52, 0.74, 0); g.add(horn);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function chestProp() {
  const g = new THREE.Group(), w = mats().wood, gold = mats().gold;
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.75), w); b.position.y = 0.3; g.add(b);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.375, 0.375, 1.2, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), w); lid.position.y = 0.6; g.add(lid);
  for (const sx of [-0.45, 0.45]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.8), gold); s.position.set(sx, 0.48, 0); g.add(s); }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function pellProp() {
  const g = new THREE.Group(), w = mats().wood;
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.9, 8), w); p.position.y = 0.95; g.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.1), w); arm.position.y = 1.45; g.add(arm);
  const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0x9a8460, roughness: 1 })); sack.position.y = 1.1; g.add(sack);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
const put = (game, obj, x, z, ry = 0, r = 0.6) => { obj.position.set(x, heightAt(x, z), z); obj.rotation.y = ry; game.scene.add(obj); if (r) colliders.push({ type: 'circle', x, z, r }); return obj; };

export function setupHub(game) {
  const p = game.player;
  p.mats = p.mats || { scrap: 0, silk: 0, gem: 0 };
  p.stash = p.stash || new Array(30).fill(null);
  game.vendorStock = rollStock(game);
  const H = HUB;
  npc(game, { robe: '#e6d6b0', robe2: '#8a2a2a', turban: 0xe8e0d0, beard: 0x5a4a3a, beardLen: 0.8, weapon: null, skin: 0x9a6a48, sash: 0x8a2a2a, belly: 0.5, build: 1.0 }, H.merchant, -0.9, 'Yusuf', 'Merchant of the suq', () => openPanel(game, 'merchant'));
  npc(game, { robe: '#4a3a2a', robe2: '#2a2018', turban: null, cap: 0x3a2a1a, capBand: 0x1a1410, beard: 0x1a120c, weapon: null, skin: 0x8a5a3a, sash: 0x3a2a1a, build: 1.2, belly: 0.2 }, H.smith, -2.4, 'Bishr', 'Blacksmith', () => openPanel(game, 'smith'));
  npc(game, { robe: '#3a3a2a', robe2: '#a08040', qaba: true, turban: null, cap: 0x2a2620, capBand: 0x141210, beard: 0x8a8070, weapon: 'sword', offhand: 'shield', mail: true, skin: 0x9a6a44, build: 1.1 }, H.trainer, 0.9, '\'Amr', 'Master of the training yard', () => openPanel(game, 'trainer'));
  // props
  const anvil = put(game, anvilProp(), H.smith[0] - 1.2, H.smith[1] - 0.6, 0.4, 0.5);
  const forge = put(game, firePit(), H.smith[0] + 1.6, H.smith[1] - 1.0, 0, 1.0);
  game.world.fires.push({ pos: forge.position.clone().add(new THREE.Vector3(0, 0.3, 0)), intensity: 0.7 });
  game.lightPool?.add({ pos: forge.position.clone().add(new THREE.Vector3(0, 1.2, 0)), color: 0xff7a30, power: 18, dist: 11 });
  const chest = put(game, chestProp(), H.stash[0], H.stash[1], 0.3, 0.8);
  game.interactables.push({ pos: chest.position, r: 2.4, label: 'Open your stash', act: () => openPanel(game, 'stash') });
  for (const [dx, dz] of [[-2, -1.5], [-3.5, 0.8]]) put(game, pellProp(), H.trainer[0] + dx, H.trainer[1] + dz, Math.random() * 6, 0.35);
  buildGrid();
  game.onAnvil = anvil;
}
export function animateHub(game, dt) {
  for (const n of game.npcs) { if (n.rig === game.npc) continue; const d = n.pos.distanceTo(game.player.pos); n.rig.visible = d < 60; if (d < 40) animateHumanoid(n.rig, n.st, game.t, dt); }
}
function rollStock(game) {
  const lvl = game.player.level, out = [];
  for (let i = 0; i < 8; i++) out.push(makeItem(lvl, i < 2 ? 'rare' : rollRarity(lvl, 0.2) === 'legendary' ? 'rare' : rollRarity(lvl, 0.25)));
  return out;
}
export function restock(game) { game.vendorStock = rollStock(game); }

// ------------------------------------------------------------------ panels
let panel = null;
function closePanel() { if (panel) { panel.remove(); panel = null; document.body.classList.remove('inshop'); } }
export function panelOpen() { return !!panel && panel.isConnected; }
function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
function matsLine(p) { return Object.entries(MAT_NAMES).map(([k, n]) => `<span class="mat m-${k}">${n}: <b>${p.mats[k] || 0}</b></span>`).join(''); }
function cell(it, extra = '') { return `<div class="cell ${it ? 'r-' + it.rarity : ''}" ${extra}>${it ? `<span class="ic">${itemIcon(it)}</span>${it.rank ? `<i class="rk">+${it.rank}</i>` : ''}` : ''}</div>`; }

export function openPanel(game, kind, tab) {
  closePanel(); game.audio.init();
  const p = game.player, ui = game.ui; DISC = p.discount || 0;
  document.body.classList.add('inshop');
  const titles = { merchant: 'Yusuf · Merchant', smith: 'Bishr · Blacksmith', stash: 'Your Stash', trainer: '\'Amr · Training Yard', skills: 'Disciplines' };
  panel = el(`<div id="shop" class="panel"><div class="ptitle">${titles[kind]} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody"></div><div class="sfoot"><span class="gold">◉ ${p.gold} Dinars</span>${kind === 'smith' ? matsLine(p) : ''}</div></div>`);
  game.ui.root.appendChild(panel);
  panel.querySelector('.close').onclick = closePanel;
  const body = panel.querySelector('.sbody');
  const refresh = () => openPanel(game, kind, tab);
  const touch = document.body.classList.contains('touch');
  const tip = (node, it, cmp) => { if (touch) { node.onclick = () => ui.itemCard(it, { cmp }); return; } node.onmouseenter = () => ui.showTooltip(it, node.getBoundingClientRect(), cmp); node.onmouseleave = () => ui.hideTooltip(); };
  // on touch a tap opens the item card with the action on it; with a mouse the hover tooltip shows and a click acts at once
  const bind = (node, it, cmp, verb, fn) => {
    if (touch) { node.onclick = () => ui.itemCard(it, { cmp, actions: [{ label: verb, fn, main: true }] }); return; }
    tip(node, it, cmp); node.onclick = () => { ui.hideTooltip(); fn(); };
  };
  const bagGrid = (onClick, label, verb) => {
    const g = el(`<div><div class="slabel">${label}</div><div class="sgrid">${p.bag.map((it, i) => cell(it, `data-i="${i}"`)).join('')}</div></div>`);
    g.querySelectorAll('.cell').forEach((c) => { const it = p.bag[+c.dataset.i]; if (!it) return; bind(c, it, p.equip[it.slot], typeof verb === 'function' ? verb(it) : verb, () => onClick(+c.dataset.i, it)); });
    return g;
  };
  if (kind === 'merchant' || kind === 'stash') body.classList.add('two');
  if (kind === 'merchant') {
    const s = el(`<div><div class="slabel">For sale: tap to buy</div><div class="sgrid stock">${game.vendorStock.map((it, i) => it ? cell(it, `data-i="${i}"`).replace('</div>', `<em>${price(it)}</em></div>`) : cell(null)).join('')}</div></div>`);
    s.querySelectorAll('.cell[data-i]').forEach((c) => {
      const it = game.vendorStock[+c.dataset.i];
      bind(c, it, p.equip[it.slot], `Buy · ${price(it)}`, () => { const k = p.bag.indexOf(null); if (p.gold < price(it)) { ui.toast('Not enough dinars'); game.audio.denied?.(); return; } if (k < 0) { ui.toast('Your pack is full'); return; }
        p.gold -= price(it); p.bag[k] = it; game.vendorStock[+c.dataset.i] = null; game.audio.gold(); refresh(); });
    });
    body.appendChild(s);
    body.appendChild(bagGrid((i, it) => { if (it.questId) { ui.toast('That is not yours to sell'); return; } p.gold += sellPrice(it); p.bag[i] = null; game.audio.gold(); refresh(); }, 'Your pack: tap to sell', (it) => `Sell · ${sellPrice(it)}`));
    const pot = el(`<button class="sbtn">Buy Pomegranate Sherbet (25)</button>`);
    pot.onclick = () => { if (p.gold < 25 || p.potions >= 5) { game.audio.denied?.(); return; } p.gold -= 25; p.potions++; game.audio.potion(); refresh(); };
    body.appendChild(pot);
  } else if (kind === 'smith') {
    tab = tab || 'upgrade';
    const tabs = el(`<div class="stabs"><button data-t="upgrade">Upgrade</button><button data-t="salvage">Salvage</button><button data-t="enchant">Enchant</button></div>`);
    tabs.querySelectorAll('button').forEach((b) => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => openPanel(game, 'smith', b.dataset.t); });
    body.appendChild(tabs);
    if (tab === 'upgrade') {
      const eq = Object.entries(p.equip).filter(([, it]) => it);
      const list = el(`<div class="slist">${eq.map(([s, it]) => { const c = upgradeCost(it), maxed = (it.rank || 0) >= MAX_RANK; return `<div class="srow" data-s="${s}">${cell(it)}<div class="sinfo"><b style="color:${RARITY[it.rarity].color}">${it.name}${it.rank ? ' +' + it.rank : ''}</b><small>${maxed ? 'Masterwork: fully tempered' : `Temper +${(it.rank || 0) + 1}: ${c.gold} dinars · ${c.scrap} scrap${c.silk ? ' · ' + c.silk + ' silk' : ''}${c.gem ? ' · ' + c.gem + ' gem' : ''}`}</small></div>${maxed ? '' : '<button class="sbtn">Temper</button>'}</div>`; }).join('')}</div>`);
      list.querySelectorAll('.srow').forEach((r) => {
        const it = p.equip[r.dataset.s]; tip(r.querySelector('.cell'), it);
        const b = r.querySelector('button'); if (!b) return;
        b.onclick = () => {
          const c = { ...upgradeCost(it) }; if (p.freeTemper > 0) { c.gold = 0; c.scrap = 0; c.silk = 0; c.gem = 0; }
          if (p.gold < c.gold || p.mats.scrap < c.scrap || p.mats.silk < c.silk || p.mats.gem < c.gem) { ui.toast('You lack the materials'); game.audio.denied?.(); return; }
          p.gold -= c.gold; p.mats.scrap -= c.scrap; p.mats.silk -= c.silk; p.mats.gem -= c.gem;
          if (p.freeTemper > 0) p.freeTemper--;
          temper(it); game.recalcStats(); game.audio.clang(); setTimeout(() => game.audio.clang(), 180); ui.toast(`${it.name} tempered to +${it.rank}`); refresh();
        };
      });
      body.appendChild(list);
    } else if (tab === 'salvage') {
      body.appendChild(bagGrid((i, it) => { const g = SALVAGE[it.rarity] || SALVAGE.common; for (const k in g) p.mats[k] = (p.mats[k] || 0) + g[k]; p.bag[i] = null; game.audio.clang(); ui.toast('Salvaged: ' + Object.entries(g).map(([k, v]) => `${v} ${MAT_NAMES[k]}`).join(', ')); refresh(); }, 'Tap an item in your pack to break it down', 'Salvage'));
      const all = el(`<button class="sbtn">Salvage all common and magic items</button>`);
      all.onclick = () => { let n = 0; p.bag.forEach((it, i) => { if (it && (it.rarity === 'common' || it.rarity === 'magic')) { const g = SALVAGE[it.rarity] || SALVAGE.common; for (const k in g) p.mats[k] = (p.mats[k] || 0) + g[k]; p.bag[i] = null; n++; } }); if (n) game.audio.clang(); refresh(); };
      body.appendChild(all);
    } else {
      game.enchantPanel ? game.enchantPanel(body, refresh) : body.appendChild(el('<div class="slabel">Enchanting arrives with the House of Wisdom\'s formulae.</div>'));
    }
  } else if (kind === 'stash') {
    const s = el(`<div><div class="slabel">Stash: tap to take</div><div class="sgrid">${p.stash.map((it, i) => cell(it, `data-i="${i}"`)).join('')}</div></div>`);
    s.querySelectorAll('.cell').forEach((c) => { const it = p.stash[+c.dataset.i]; if (!it) return; bind(c, it, p.equip[it.slot], 'Take', () => { const k = p.bag.indexOf(null); if (k < 0) { ui.toast('Your pack is full'); return; } p.bag[k] = it; p.stash[+c.dataset.i] = null; refresh(); }); });
    body.appendChild(s);
    body.appendChild(bagGrid((i, it) => { const k = p.stash.indexOf(null); if (k < 0) { ui.toast('Your stash is full'); return; } p.stash[k] = it; p.bag[i] = null; refresh(); }, 'Your pack: tap to store', 'Store'));
  } else if (kind === 'skills') {
    game.skillTreePanel?.(body, refresh);
  } else if (kind === 'trainer') {
    const s = el(`<div><div class="slabel">"Every road out of Baghdad wants a different hand." Change your discipline (your level and gear stay; class weapons wait in your pack).</div><div class="cp-row small">${CLASS_ORDER.map((k) => `<button class="cp-card ${k === p.cls ? 'cur' : ''}" data-k="${k}"><div class="cp-ic">${SKILL_ICONS[CLASSES[k].attack.icon]}</div><div class="cp-name">${CLASSES[k].name}</div></button>`).join('')}</div></div>`);
    s.querySelectorAll('.cp-card').forEach((b) => b.onclick = () => {
      const k = b.dataset.k; if (k === p.cls) return;
      const old = p.equip.weapon; if (old && old.id !== 0) { const i = p.bag.indexOf(null); if (i >= 0) p.bag[i] = old; }
      p.equip.weapon = null;
      // a weapon of the new discipline already in the pack is equipped
      const wi = p.bag.findIndex((it) => it && it.slot === 'weapon' && it.cls === k);
      game.setClass(k); if (wi >= 0) { p.equip.weapon = p.bag[wi]; p.bag[wi] = null; game.recalcStats(); }
      game.ui.toast(`You take up the way of the ${CLASSES[k].name}`); game.audio.levelUp(); refresh();
    });
    body.appendChild(s);
    game.skillTreePanel?.(body, refresh);
  }
}
export function temper(it) {
  it.rank = (it.rank || 0) + 1;
  if (it.min) { it.min = Math.round(it.min * 1.12 + 1); it.max = Math.round(it.max * 1.12 + 1); }
  if (it.armor) it.armor = Math.round(it.armor * 1.12 + 1);
  const keys = Object.keys(it.stats); if (keys.length) { const k = keys[(it.rank - 1) % keys.length]; it.stats[k] = Math.round(it.stats[k] * 1.1 + 1); }
}
export { closePanel, statLines };
