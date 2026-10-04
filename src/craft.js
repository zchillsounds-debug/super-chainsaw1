import * as THREE from 'three';
import { craftItem, craftableAffixes, RARITY } from './items.js';
import { MAT_NAMES, HUBK } from './hub.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';
import { SETS, makeSetItem } from './progression.js';

// Round 20: Bishr's Craft tab. Choose what to forge (any slot, belts included) and the one property you need;
// he forges a rare of your level with that property rolled in its top third, the rest left to the fire.
const SLOTS = [['weapon', 'Weapon'], ['armor', 'Armor'], ['helm', 'Helm'], ['ring', 'Ring'], ['amulet', 'Amulet'], ['belt', 'Belt']];
const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };

// Round 21: recipe scrolls. Captains, hold masters and dungeon chests sometimes give up a scroll that teaches Bishr
// one set piece ('set:slot'); once learned he can forge it at any time, at Salim's level. Learned: p.recipes.
const SLOT_NAMES = { armor: 'Armor', helm: 'Helm', ring: 'Ring', amulet: 'Amulet' };
const ALL_RECIPES = Object.entries(SETS).flatMap(([k, S]) => Object.keys(S.pieces).map((sl) => `${k}:${sl}`));
export const recipeName = (r) => { const [k, sl] = r.split(':'); return SETS[k]?.pieces[sl] || r; };

export function setupCraft(g) {
  const p0 = g.player;
  const sel = { slot: 'weapon', key: null, recipe: null };
  const known = () => (p0.recipes ||= []);
  // a scroll drops where something worth it fell
  const dropRecipe = (at, level) => {
    const left = ALL_RECIPES.filter((r) => !known().includes(r) && !g.drops.some((d) => d.item.recipe === r));
    if (!left.length) return false;
    const r = left[Math.floor(Math.random() * left.length)];
    g.dropItem({ recipe: r, rarity: 'set', name: `${t('Recipe')}: ${t(recipeName(r))}`, stats: {}, level }, at); return true;
  };
  g.dropRecipe = dropRecipe;
  g.onRecipe = (it) => {
    if (known().includes(it.recipe)) return;
    known().push(it.recipe); saveGame(g);
    g.ui.toast(`${t('Bishr can now forge')}: ${t(recipeName(it.recipe))}`, 'leg');
  };
  const prevKill = g.onKill;
  g.onKill = (e) => { prevKill?.(e); const k = e.boss || e.holdBoss ? 0.35 : e.elite ? 0.08 : 0; if (k && Math.random() < k) dropRecipe(e.pos.clone(), e.level); };
  if (g.zones) { const oc = g.zones.openChest.bind(g.zones); g.zones.openChest = () => { const I = g.interior?.I, was = I?.chest?.opened; oc(); if (I && !was && I.chest.opened && Math.random() < 0.15) dropRecipe(I.chest.pos.clone().add(new THREE.Vector3(0, 0.6, 1)), g.interior.def.level); }; }
  const setCost = () => { const l = p0.level; return { gold: Math.round((120 * l + 300) * HUBK.forge), scrap: 12 + Math.floor(l / 3), silk: 6 + Math.floor(l / 5), gem: 3 }; };
  const cost = () => { const l = g.player.level; return { gold: Math.round((70 * l + 120) * HUBK.forge), scrap: 8 + Math.floor(l / 3), silk: 3 + Math.floor(l / 6), gem: 1 }; };
  g.craftPanel = (body, refresh) => {
    const p = g.player, c = cost(), list = craftableAffixes(sel.slot);
    if (!list.some((a) => a.key === sel.key)) sel.key = list[0].key;
    const has = (k, n) => (p.mats?.[k] || 0) >= n, afford = p.gold >= c.gold && has('scrap', c.scrap) && has('silk', c.silk) && has('gem', c.gem);
    const label = (a) => a.fmt('X').replace(/[+−]?X%?\s*/, '').replace(/^Sherbet restores X /, 'Sherbet restores ');
    const w = el(`<div>
      <div class="slabel">${t('Bishr forges a rare to order: pick what, and the one property you cannot do without. He rolls it in the top third; the rest is up to the fire.')}</div>
      <div class="cgroup"><div class="ch">${t('Forge')}</div><div class="chips">${SLOTS.map(([k, n]) => `<button class="chip ${k === sel.slot ? 'on' : ''}" data-slot="${k}">${t(n)}</button>`).join('')}</div></div>
      <div class="cgroup"><div class="ch">${t('Property')}</div><div class="chips">${list.map((a) => `<button class="chip ${a.key === sel.key ? 'on' : ''}" data-key="${a.key}">${t(label(a))}</button>`).join('')}</div></div>
      <div class="slabel creward" style="color:${RARITY.rare.color}">${t('Level')} ${p.level} · ◉ ${c.gold} · ${c.scrap} ${t(MAT_NAMES.scrap)} · ${c.silk} ${t(MAT_NAMES.silk)} · ${c.gem} ${t(MAT_NAMES.gem)}</div>
      <div class="row2"><button class="sbtn go" ${afford ? '' : 'disabled'}>${t('Forge it')}</button></div></div>`);
    w.querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { sel.slot = b.dataset.slot; refresh(); });
    w.querySelectorAll('[data-key]').forEach((b) => b.onclick = () => { sel.key = b.dataset.key; refresh(); });
    w.querySelector('.go').onclick = () => {
      const k = p.bag.indexOf(null); if (k < 0) { g.ui.toast(t('Your pack is full')); return; }
      if (!afford) { g.audio.denied?.(); return; }
      p.gold -= c.gold; p.mats.scrap -= c.scrap; p.mats.silk -= c.silk; p.mats.gem -= c.gem;
      const it = craftItem(p.level, sel.slot, sel.key); p.bag[k] = it;
      g.audio.clang?.(); g.audio.legendary?.(); g.ui.toast(`${t('Forged')}: ${it.name}`);
      saveGame(g); refresh(); g.ui.itemCard?.(it, { cmp: p.equip[it.slot] });
    };
    body.appendChild(w);
    // the set pieces Bishr has learned from recipe scrolls
    const R = known(), sc = setCost(), sa = p.gold >= sc.gold && has('scrap', sc.scrap) && has('silk', sc.silk) && has('gem', sc.gem);
    if (!R.includes(sel.recipe)) sel.recipe = R[0] || null;
    const groups = Object.entries(SETS).map(([k, S]) => [k, S, R.filter((r) => r.startsWith(k + ':'))]).filter(([, , rs]) => rs.length);
    const w2 = el(`<div class="setcraft">
      <div class="cgroup"><div class="ch">${t('Set pieces')} · ${R.length}/${ALL_RECIPES.length} ${t('recipes')}</div>
      ${groups.length ? groups.map(([k, S, rs]) => `<div class="slabel" style="color:${RARITY.set?.color || '#5ad04a'}">${t(S.name)}</div><div class="chips">${rs.map((r) => `<button class="chip ${r === sel.recipe ? 'on' : ''}" data-rec="${r}">${t(SLOT_NAMES[r.split(':')[1]])}</button>`).join('')}</div>`).join('')
        : `<div class="slabel">${t('Captains, hold masters and dungeon chests sometimes carry recipe scrolls. Bring them here and Bishr will forge the set pieces they describe.')}</div>`}</div>
      ${sel.recipe ? `<div class="slabel creward">${t(recipeName(sel.recipe))} · ${t('Level')} ${p.level} · ◉ ${sc.gold} · ${sc.scrap} ${t(MAT_NAMES.scrap)} · ${sc.silk} ${t(MAT_NAMES.silk)} · ${sc.gem} ${t(MAT_NAMES.gem)}</div>
      <div class="row2"><button class="sbtn goset" ${sa ? '' : 'disabled'}>${t('Forge the piece')}</button></div>` : ''}</div>`);
    w2.querySelectorAll('[data-rec]').forEach((b) => b.onclick = () => { sel.recipe = b.dataset.rec; refresh(); });
    const gs = w2.querySelector('.goset');
    if (gs) gs.onclick = () => {
      const k = p.bag.indexOf(null); if (k < 0) { g.ui.toast(t('Your pack is full')); return; }
      if (!sa) { g.audio.denied?.(); return; }
      p.gold -= sc.gold; p.mats.scrap -= sc.scrap; p.mats.silk -= sc.silk; p.mats.gem -= sc.gem;
      const [sk, sl] = sel.recipe.split(':'), it = makeSetItem(p.level, sk, sl); it.crafted = true; p.bag[k] = it;
      g.audio.clang?.(); g.audio.legendary?.(); g.ui.toast(`${t('Forged')}: ${t(it.name)}`);
      saveGame(g); refresh(); g.ui.itemCard?.(it, { cmp: p.equip[it.slot] });
    };
    // Round 22: once Bishr knows a recipe the set pieces come first, above the fold
    if (R.length) body.insertBefore(w2, w); else body.appendChild(w2);
  };
}
