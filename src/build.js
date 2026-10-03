import * as THREE from 'three';
import { CLASSES, ALT_SKILLS, SKILL_ICONS, COMMON } from './classes.js';
import { aspectsOf } from './progression.js';
import { RARITY } from './items.js';
import { itemIcon } from './ui.js';
import { t } from './i18n.js';

// Round 18: the fifth skill slot and alternate skills, discipline aspects, gems at Bishr's forge, and stash tabs.

export const SLOT5_LEVEL = 15;
const SLOTS = ['rmb', 's1', 's2', 's3', 's4'];
const SLOT_LABEL = { rmb: 'Right', s1: '1', s2: '2', s3: '3', s4: '4' };

// ------------------------------------------------------------------ gems
export const GEMS = {
  ruby: { name: 'Ruby', color: '#e0405a', weapon: (g) => ({ dmgPct: 4 * g }), gear: (g) => ({ life: 25 * g }), wl: (g) => `+${4 * g}% damage`, gl: (g) => `+${25 * g} life` },
  lapis: { name: 'Lapis', color: '#4a70e0', weapon: (g) => ({ fire: 8 * g }), gear: (g) => ({ armor: 6 * g, burnRes: 10 * g }), wl: (g) => `+${8 * g}% fire damage`, gl: (g) => `+${6 * g} armour, burning hurts you ${10 * g}% less` },
  carnelian: { name: 'Carnelian', color: '#e07a30', weapon: (g) => ({ crit: 2 * g }), gear: (g) => ({ goldPct: 5 * g }), wl: (g) => `+${2 * g}% critical strike`, gl: (g) => `+${5 * g}% dinars found` },
};
const GRADE = ['', 'Chipped', 'Flawless', 'Royal'];
export const gemName = (k, g) => `${GRADE[g]} ${GEMS[k].name}`;
const gemKey = (k, g) => `${k}${g}`;
const socketCost = (it) => 150 + it.level * 25 + (it.rarity === 'legendary' ? 300 : 0);
const canSocket = (it) => it && ['rare', 'legendary', 'set'].includes(it.rarity);
const gemIcon = (k, g) => `<svg viewBox="0 0 32 32" class="gemic"><path d="M16 3 L28 12 L16 29 L4 12Z" fill="${GEMS[k].color}" stroke="#fff8" stroke-width="${g}"/><path d="M4 12 H28 M16 3 L11 12 L16 29 L21 12Z" fill="none" stroke="#0005"/></svg>`;

export function gemStats(it) {
  if (!it?.gem) return {};
  const [k, g] = [it.gem.k, it.gem.g];
  return it.slot === 'weapon' ? GEMS[k].weapon(g) : GEMS[k].gear(g);
}
export function addGem(game, k, g = 1, quiet) {
  const p = game.player; p.gems ||= {}; p.gems[gemKey(k, g)] = (p.gems[gemKey(k, g)] || 0) + 1;
  if (!quiet) game.ui.toast(`<span style="color:${GEMS[k].color}">◆</span> ${t(gemName(k, g))}`, 'quest');
}
function rollGem(game, level) {
  const k = Object.keys(GEMS)[Math.floor(Math.random() * 3)];
  const g = level >= 22 && Math.random() < 0.15 ? 3 : level >= 12 && Math.random() < 0.35 ? 2 : 1;
  addGem(game, k, g);
}

export function setupBuild(game) {
  const g = game, p = g.player;
  p.loadout ||= {}; p.gems ||= {}; p.stashTabs ||= 0; p.stashPages ||= [];
  // ---------------------------------------------------------------- skill slots
  const altsFor = (cls) => (ALT_SKILLS[cls] || []).filter((a) => p.level >= a.lvl);
  const all = (cls) => ({ ...Object.fromEntries(Object.values(CLASSES[cls].skills).map((s) => [s.id, s])), ...Object.fromEntries((ALT_SKILLS[cls] || []).map((s) => [s.id, s])) });
  g.loadoutOf = () => {
    const base = CLASSES[p.cls].skills, lo = p.loadout[p.cls] ||= {}, pool = all(p.cls), out = {}, used = new Set();
    const ok = (id) => id && pool[id] && (!pool[id].lvl || p.level >= pool[id].lvl) && !used.has(id);
    for (const s of SLOTS) {
      if (s === 's4' && p.level < SLOT5_LEVEL) continue;
      let id = lo[s];
      if (!ok(id)) id = s === 's4' ? altsFor(p.cls).map((a) => a.id).find((x) => !used.has(x)) : base[s]?.id;
      if (!ok(id)) id = Object.keys(pool).find(ok);
      if (id) { out[s] = pool[id]; used.add(id); }
    }
    return out;
  };
  g.slotDefs = () => ({ attack: g.kit.attack, ...g.loadoutOf(), potion: COMMON.potion, dodge: COMMON.dodge });
  g.rebuildSkills = () => g.ui.buildSkills?.(g.slotDefs());
  const lvlUp = g.levelUp.bind(g);
  g.levelUp = () => {
    lvlUp();
    if (p.level === SLOT5_LEVEL) g.ui.banner(t('A Fifth Skill'), t('A new skill slot opens. Choose your skills in Disciplines.'), 3200);
    else for (const a of ALT_SKILLS[p.cls] || []) if (a.lvl === p.level) g.ui.toast(`${t('New skill')}: <b>${t(a.name)}</b>`, 'lvl');
    if (p.level >= SLOT5_LEVEL) g.rebuildSkills();
  };
  const setClass = g.setClass.bind(g);
  g.setClass = (k) => { setClass(k); g.rebuildSkills(); };
  g.rebuildSkills();
  // ---------------------------------------------------------------- stats: gems and buffs
  const recalc = g.recalcStats.bind(g);
  g.recalcStats = () => {
    recalc(); const s = p.stats; p.goldPct = 0; p.burnRes = 0;
    for (const it of Object.values(p.equip)) for (const [k, v] of Object.entries(gemStats(it))) {
      if (k === 'life') s.maxHp += v; else if (k === 'goldPct') p.goldPct += v; else if (k === 'burnRes') p.burnRes += v;
      else if (k === 'dmgPct') { s.min = Math.round(s.min * (1 + v / 100)); s.max = Math.round(s.max * (1 + v / 100)); }
      else s[k] = (s[k] || 0) + v;
    }
    if (p.buffs?.rally > 0) s.armor += 20;
    p.hp = Math.min(p.hp, s.maxHp);
  };
  g.recalcStats();
  // ---------------------------------------------------------------- aspects and alternate-skill effects
  const A = () => aspectsOf(p);
  const dmgMod = g.dmgMod;
  g.dmgMod = (e) => {
    let k = dmgMod ? dmgMod(e) : 1; const a = A();
    if (p.buffs.rally > 0) k *= 1.25;
    if (e.markT > 0) k *= 1.35;
    if (a.has('cinder') && e.burn > 0) k *= 1.2;
    if (a.has('edge') && e.hp < e.maxHp * 0.35) k *= 1.3;
    if (a.has('shade') && p.buffs.stealth > 0) k *= 1.5;
    return k;
  };
  const onHit = g.onHit;
  g.onHit = (e, dmg, crit) => {
    onHit?.(e, dmg, crit);
    if (p.buffs.brand > 0) e.burn = Math.max(e.burn || 0, 3);
    if (A().has('shade') && p.buffs.stealth > 0) p.cds.dodge = 0;
  };
  const onKill = g.onKill;
  g.onKill = (e) => {
    onKill?.(e); const a = A(), lo = g.loadoutOf();
    const slotOf = (id) => Object.keys(lo).find((s) => lo[s].id === id);
    if (a.has('onset')) { const s = slotOf('charge'); if (s) p.cds[s] = Math.max(0, (p.cds[s] || 0) - 2); }
    if (a.has('alley')) { const s = slotOf('step'); if (s) p.cds[s] = 0; }
  };
  const use = g.useSkill.bind(g);
  g.useSkill = (slot) => {
    const S = g.slotDefs()[slot], a = A();
    if (S?.id === 'pierce' && a.has('hawk')) p.nextCrit = true;
    const cd0 = p.cds[slot] || 0; use(slot);
    if (!S || (p.cds[slot] || 0) <= cd0) return; // not used
    if (S.id === 'bash' && a.has('bulwark')) setTimeout(() => { for (const e of g.enemies) if (!e.dead && !e.hidden && !e.boss && e.pos.distanceTo(p.pos) < 4) { e.staggerT = Math.max(e.staggerT || 0, 1.2); e.st.action = null; } g.fx.ring(p.pos, new THREE.Color(2.5, 2, 1.2), 0.4, 4, 0.4); }, 300);
    if (S.id === 'wall' && a.has('unbroken')) { p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.25); g.ui.damageNumber?.(p.pos, '+' + Math.round(p.stats.maxHp * 0.25), 'heal'); }
    if (S.id === 'tumble' && a.has('quiver')) p.mp = Math.min(p.stats.maxMp, p.mp + 15);
    if (S.id === 'inferno' && a.has('bellows')) p.cds[slot] *= 0.6;
    if (S.buff === 'rally') g.recalcStats();
  };
  // every third basic arrow splits (Aspect of the Split Shaft)
  let shots = 0;
  const shot = g.playerShot.bind(g);
  g.playerShot = (dir, o) => {
    shot(dir, o);
    if (o.kind === 'arrow' && o.mult === 1 && !o.split && A().has('split') && ++shots % 3 === 0) for (const da of [-0.18, 0.18]) { const a = Math.atan2(dir.x, dir.z) + da; shot(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), { ...o, split: true, mult: 0.7 }); }
  };
  const zone = g.spawnZone.bind(g);
  g.spawnZone = (z) => zone(z.kind === 'fire' && A().has('spill') ? { ...z, r: z.r * 1.4 } : z);
  const hurt = g.damagePlayer.bind(g);
  g.damagePlayer = (dmg, src, att) => hurt(p.burnRes && !att && g.fires2?.some?.((f) => f.pos.distanceTo(p.pos) < f.r + 0.5) ? dmg * (1 - Math.min(60, p.burnRes) / 100) : dmg, src, att);
  const drop = g.dropItem.bind(g);
  g.dropItem = (item, at) => { if (item.gold && p.goldPct) item.gold = Math.round(item.gold * (1 + p.goldPct / 100)); return drop(item, at); };
  // ruby, lapis or carnelian: one from every dungeon chest, more from contracts; captains sometimes carry one
  const chest = g.zones.openChest.bind(g.zones);
  g.zones.openChest = () => {
    const I = g.interior?.I, was = I?.chest.opened; chest();
    if (I && !was && I.chest.opened) { const d = g.interior.def, n = 1 + (d.contract ? 1 + Math.floor((d.lootBonus || 0) / 2) : 0); for (let i = 0; i < n; i++) rollGem(g, d.level || p.level); }
  };
  const kill = g.onKill;
  g.onKill = (e) => { kill(e); if ((e.elite || e.boss) && Math.random() < (e.boss ? 1 : 0.15)) rollGem(g, e.level); };
  // mark timers
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => { prevTick?.(dt); for (const e of g.enemies) if (e.markT > 0) { e.markT -= dt; if (Math.random() < 0.3) g.fx.glow.spawn({ pos: { x: e.pos.x, y: e.pos.y + 2.3, z: e.pos.z }, life: 0.4, size: 0.35, size1: 0.1, color: new THREE.Color(3, 0.5, 0.3) }); } if (p.buffs.rally <= 0 && p._rally) { p._rally = false; g.recalcStats(); } if (p.buffs.rally > 0) p._rally = true; };
  // ---------------------------------------------------------------- panels and tooltips
  g.ui.gemLine = (it) => it.gem ? `<div class="tt-gem" style="color:${GEMS[it.gem.k].color}">◆ ${t(gemName(it.gem.k, it.gem.g))}: ${it.slot === 'weapon' ? GEMS[it.gem.k].wl(it.gem.g) : GEMS[it.gem.k].gl(it.gem.g)}</div>` : `<div class="tt-gem empty">◇ ${t('Empty socket')}</div>`;
  g.gemPanel = (body, refresh) => gemPanel(g, body, refresh);
  g.loadoutPanel = (body, refresh) => loadoutPanel(g, body, refresh, all, altsFor);
}

// ------------------------------------------------------------------ skill loadout (inside Disciplines)
function loadoutPanel(g, body, refresh, all, altsFor) {
  const p = g.player, lo = g.loadoutOf(), pool = all(p.cls), avail = Object.values(pool).filter((s) => !s.lvl || p.level >= s.lvl);
  const locked = (ALT_SKILLS[p.cls] || []).filter((s) => p.level < s.lvl);
  const sel = g._loSel && lo[g._loSel] ? g._loSel : null;
  const w = document.createElement('div'); w.className = 'loadout';
  w.innerHTML = `<div class="slabel">${t('Skills')} · ${sel ? t('Now pick a skill for this slot') : t('Tap a slot, then a skill to put in it')}${p.level < SLOT5_LEVEL ? ` · ${t('A fifth slot opens at level')} ${SLOT5_LEVEL}` : ''}</div>
    <div class="loslots">${SLOTS.map((s) => lo[s] ? `<button class="loslot ${s === sel ? 'on' : ''}" data-s="${s}">${SKILL_ICONS[lo[s].icon] || ''}<span><i>${SLOT_LABEL[s]}</i>${t(lo[s].name)}</span></button>` : s === 's4' ? `<div class="loslot lock">🔒<span><i>4</i>${t('Level')} ${SLOT5_LEVEL}</span></div>` : '').join('')}</div>
    ${sel ? `<div class="lopool">${avail.map((s) => `<button class="lopick ${Object.values(lo).includes(s) ? 'used' : ''}" data-id="${s.id}">${SKILL_ICONS[s.icon] || ''}<span><b>${t(s.name)}</b>${s.desc ? `<small>${t(s.desc)}</small>` : ''}</span></button>`).join('')}</div>` : ''}
    ${locked.length ? `<div class="slabel">${locked.map((s) => `${t(s.name)} · ${t('level')} ${s.lvl}`).join(' · ')}</div>` : ''}`;
  w.querySelectorAll('.loslot[data-s]').forEach((b) => b.onclick = () => { g._loSel = b.dataset.s === sel ? null : b.dataset.s; refresh(); });
  w.querySelectorAll('.lopick').forEach((b) => b.onclick = () => {
    const id = b.dataset.id, cur = Object.fromEntries(Object.entries(lo).map(([s, d]) => [s, d.id]));
    // swapping: the slot that held this skill takes the old one
    const from = Object.keys(cur).find((s) => cur[s] === id); if (from) cur[from] = cur[sel];
    cur[sel] = id; p.loadout[p.cls] = cur;
    g._loSel = null; g.rebuildSkills(); g.audio.clang?.(); navigator.vibrate?.(10); refresh();
  });
  body.appendChild(w);
}

// ------------------------------------------------------------------ gems at the forge
function gemPanel(g, body, refresh) {
  const p = g.player, ui = g.ui;
  const owned = Object.entries(p.gems || {}).filter(([, n]) => n > 0);
  const items = [...Object.entries(p.equip).filter(([, it]) => canSocket(it)).map(([s, it]) => ({ it, where: 'e', key: s })), ...p.bag.map((it, i) => ({ it, where: 'b', key: i })).filter((x) => canSocket(x.it))];
  const w = document.createElement('div'); w.className = 'slist gems';
  const gemRow = owned.length ? owned.map(([k, n]) => { const gk = k.slice(0, -1), gr = +k.slice(-1); return `<span class="gemchip">${gemIcon(gk, gr)}${t(gemName(gk, gr))} ×${n}${n >= 3 && gr < 3 ? ` <button class="sbtn comb" data-k="${k}">${t('Combine 3')} · ${80 * gr}</button>` : ''}</span>`; }).join('') : `<i>${t('No gems yet. They come from dungeon chests, contracts and captains.')}</i>`;
  w.innerHTML = `<div class="slabel">${t('Bishr can cut a socket into a rare, set or legendary item, and set a gem in it. In a weapon: ruby adds damage, lapis fire damage, carnelian critical strike. In armour or jewellery: ruby adds life, lapis armour and guards against burning, carnelian finds more dinars.')}</div>
    <div class="gemrow">${gemRow}</div>
    ${items.map(({ it, where, key }) => `<div class="srow" data-w="${where}" data-k="${key}"><div class="cell r-${it.rarity}"><span class="ic">${itemIcon(it)}</span></div><div class="sinfo"><b style="color:${(RARITY[it.rarity] || RARITY.rare).color}">${it.name}${where === 'e' ? ` <small>(${t('worn')})</small>` : ''}</b><small>${!it.socket ? t('No socket') : it.gem ? `◆ ${t(gemName(it.gem.k, it.gem.g))}` : `◇ ${t('Empty socket')}`}</small>
      <div class="gemacts">${!it.socket ? `<button class="sbtn sock">${t('Cut a socket')} · ${socketCost(it)}</button>` : it.gem ? `<button class="sbtn unset">${t('Remove gem')} · 60</button>` : owned.map(([k]) => `<button class="sbtn set" data-g="${k}">${gemIcon(k.slice(0, -1), +k.slice(-1))}${t(gemName(k.slice(0, -1), +k.slice(-1)))}</button>`).join('')}</div></div></div>`).join('') || `<div class="slabel">${t('No rare, set or legendary items to work on.')}</div>`}`;
  const itemOf = (r) => r.dataset.w === 'e' ? p.equip[r.dataset.k] : p.bag[+r.dataset.k];
  const pay = (n) => { if (p.gold < n) { ui.toast(t('Not enough dinars')); g.audio.denied?.(); return false; } p.gold -= n; return true; };
  w.querySelectorAll('.srow').forEach((r) => {
    const it = itemOf(r);
    r.querySelector('.sock')?.addEventListener('click', () => { if (!pay(socketCost(it))) return; it.socket = true; g.audio.clang(); setTimeout(() => g.audio.clang(), 160); ui.toast(t('A socket is cut')); refresh(); });
    r.querySelector('.unset')?.addEventListener('click', () => { if (!pay(60)) return; addGem(g, it.gem.k, it.gem.g, true); it.gem = null; g.recalcStats(); g.audio.clang(); refresh(); });
    r.querySelectorAll('.set').forEach((b) => b.onclick = () => { const k = b.dataset.g; if (!(p.gems[k] > 0)) return; p.gems[k]--; it.gem = { k: k.slice(0, -1), g: +k.slice(-1) }; g.recalcStats(); g.audio.legendary?.(); navigator.vibrate?.(14); refresh(); });
  });
  w.querySelectorAll('.comb').forEach((b) => b.onclick = () => { const k = b.dataset.k, gr = +k.slice(-1); if (p.gems[k] < 3 || !pay(80 * gr)) return; p.gems[k] -= 3; addGem(g, k.slice(0, -1), gr + 1); g.audio.clang(); refresh(); });
  body.appendChild(w);
}

// ------------------------------------------------------------------ stash tabs
export const TAB_COST = [0, 500, 1500, 4000];
export function stashPage(p, tab) {
  if (!tab) return p.stash;
  p.stashPages ||= []; while (p.stashPages.length < tab) p.stashPages.push(new Array(30).fill(null));
  return p.stashPages[tab - 1];
}
