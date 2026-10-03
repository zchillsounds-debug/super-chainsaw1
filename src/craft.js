import { craftItem, craftableAffixes, RARITY } from './items.js';
import { MAT_NAMES } from './hub.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

// Round 20: Bishr's Craft tab. Choose what to forge (any slot, belts included) and the one property you need;
// he forges a rare of your level with that property rolled in its top third, the rest left to the fire.
const SLOTS = [['weapon', 'Weapon'], ['armor', 'Armor'], ['helm', 'Helm'], ['ring', 'Ring'], ['amulet', 'Amulet'], ['belt', 'Belt']];
const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };

export function setupCraft(g) {
  const sel = { slot: 'weapon', key: null };
  const cost = () => { const l = g.player.level; return { gold: Math.round(70 * l + 120), scrap: 8 + Math.floor(l / 3), silk: 3 + Math.floor(l / 6), gem: 1 }; };
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
  };
}
