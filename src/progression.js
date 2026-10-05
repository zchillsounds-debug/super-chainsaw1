import * as THREE from 'three';
import { RARITY, makeItem, statLines, AFFIXES } from './items.js';
import { CLASSES, SKILL_ICONS } from './classes.js';
import { itemIcon } from './ui.js';
import { SITES, heightAt } from './terrain.js';
import { TYPES } from './entities.js';

// ------------------------------------------------------------------ skill trees
// One point per level. Three branches per class, three nodes per branch; a node needs the one above it.
// Nodes add stats (summed into recalcStats) or set a flag that a skill reads (whirlPull, volleyWave, ...).
const node = (id, name, desc, max, fx) => ({ id, name, desc, max, fx });
export const TREES = {
  faris: [
    { name: 'Blade', nodes: [node('f1', 'Tempered Edge', '+6% damage per rank', 3, (r) => ({ dmgPct: 6 * r })), node('f2', 'Sandstorm Pull', 'Sandstorm Spin drags foes inward and reaches farther', 1, () => ({ flag: 'whirlPull' })), node('f3', 'Executioner', '+4% critical strike per rank', 3, (r) => ({ crit: 4 * r }))] },
    { name: 'Shield', nodes: [node('f4', 'Mail and Felt', '+8 armor per rank', 3, (r) => ({ armor: 8 * r })), node('f5', 'Battering Charge', 'Charge staggers everything it strikes', 1, () => ({ flag: 'chargeStagger' })), node('f6', 'Stand Fast', '+40 life per rank', 3, (r) => ({ life: 40 * r }))] },
    { name: 'Resolve', nodes: [node('f7', 'Steady Breath', '+1.5 resolve per second per rank', 3, (r) => ({ regen: 1.5 * r })), node('f8', 'Drilled', '−8% cooldowns per rank', 2, (r) => ({ cdr: 8 * r })), node('f9', 'Bloodied Hand', '+2 life per hit per rank', 3, (r) => ({ leech: 2 * r }))] },
  ],
  rami: [
    { name: 'Draw', nodes: [node('r1', 'Heavy Draw', '+6% damage per rank', 3, (r) => ({ dmgPct: 6 * r })), node('r2', 'Fourth Volley', 'Rain of Arrows falls in four waves', 1, () => ({ flag: 'volleyWave' })), node('r3', 'Eagle Eye', '+4% critical strike per rank', 3, (r) => ({ crit: 4 * r }))] },
    { name: 'Saddle', nodes: [node('r4', 'Light Foot', '+5% movement per rank', 3, (r) => ({ move: 5 * r })), node('r5', 'Parting Shot', 'Tumble looses three arrows behind you', 1, () => ({ flag: 'tumbleArrows' })), node('r6', 'Hardened', '+30 life per rank', 3, (r) => ({ life: 30 * r }))] },
    { name: 'Focus', nodes: [node('r7', 'Calm', '+1.5 focus per second per rank', 3, (r) => ({ regen: 1.5 * r })), node('r8', 'Quick Hands', '+6% attack speed per rank', 3, (r) => ({ speed: 6 * r })), node('r9', 'Steppe Rhythm', '−8% cooldowns per rank', 2, (r) => ({ cdr: 8 * r }))] },
  ],
  naffat: [
    { name: 'Naft', nodes: [node('n1', 'Purer Naft', '+12% fire damage per rank', 3, (r) => ({ fire: 12 * r })), node('n2', 'Wide Spill', 'Naft Flask pools are larger and burn longer', 1, () => ({ flag: 'flaskBig' })), node('n3', 'Volatile', '+4% critical strike per rank', 3, (r) => ({ crit: 4 * r }))] },
    { name: 'Siege', nodes: [node('n4', 'Leather Apron', '+8 armor per rank', 3, (r) => ({ armor: 8 * r })), node('n5', 'Long Burn', 'Naft Ring burns for 8 seconds', 1, () => ({ flag: 'ringLong' })), node('n6', 'Siege Hardened', '+35 life per rank', 3, (r) => ({ life: 35 * r }))] },
    { name: 'Craft', nodes: [node('n7', 'Spare Jars', '+12 naft per rank', 3, (r) => ({ mana: 12 * r })), node('n8', 'Fast Fuse', '−8% cooldowns per rank', 2, (r) => ({ cdr: 8 * r })), node('n9', 'Steady Pour', '+1.5 naft per second per rank', 3, (r) => ({ regen: 1.5 * r }))] },
  ],
  ayyar: [
    { name: 'Knives', nodes: [node('a1', 'Honed', '+6% damage per rank', 3, (r) => ({ dmgPct: 6 * r })), node('a2', 'Endless Flurry', 'Flurry strikes nine times', 1, () => ({ flag: 'flurryPlus' })), node('a3', 'Vitals', '+5% critical strike per rank', 3, (r) => ({ crit: 5 * r }))] },
    { name: 'Shadows', nodes: [node('a4', 'Quick Feet', '+5% movement per rank', 3, (r) => ({ move: 5 * r })), node('a5', 'Second Wind', 'Vanish restores 20% life', 1, () => ({ flag: 'vanishHeal' })), node('a6', 'Wiry', '+30 life per rank', 3, (r) => ({ life: 30 * r }))] },
    { name: 'Nerve', nodes: [node('a7', 'Cold Nerve', '+1.5 nerve per second per rank', 3, (r) => ({ regen: 1.5 * r })), node('a8', 'Street Speed', '+6% attack speed per rank', 3, (r) => ({ speed: 6 * r })), node('a9', 'Cutpurse', '+3 life per hit per rank', 3, (r) => ({ leech: 3 * r }))] },
  ],
};
export function treeStats(p) {
  const s = {}, flags = {};
  const tree = TREES[p.cls] || []; const ranks = (p.tree ||= {})[p.cls] || {};
  for (const br of tree) for (const n of br.nodes) { const r = ranks[n.id] || 0; if (!r) continue; const fx = n.fx(r); if (fx.flag) flags[fx.flag] = true; else for (const k in fx) s[k] = (s[k] || 0) + fx[k]; }
  return { s, flags };
}
export const pointsSpent = (p) => Object.values((p.tree ||= {})[p.cls] || {}).reduce((a, b) => a + b, 0);
export const pointsFree = (p) => Math.max(0, p.level - 1 - pointsSpent(p));

// ------------------------------------------------------------------ legendary aspects
// Each legendary carries one aspect; the blacksmith can imprint an aspect from one legendary onto a rare.
export const ASPECTS = {
  embers: { name: 'Aspect of Embers', desc: 'Critical strikes set foes alight.' },
  rally: { name: 'Aspect of the Rally', desc: 'Each kill restores 4% of your life.' },
  gale: { name: 'Aspect of the Gale', desc: 'Evading grants +30% damage for 2 seconds; evade recovers 40% faster.' },
  drums: { name: 'Aspect of the Drums', desc: 'Every fourth hit staggers foes around the target.' },
  purse: { name: 'Aspect of the Barmakid Purse', desc: '+60% dinars from foes and chests.' },
  mirage: { name: 'Aspect of the Mirage', desc: 'A parry makes you untouchable for 2 seconds and resets Evade.' },
  qanat: { name: 'Aspect of Qanat Water', desc: 'Sherbet heals 50% more and cools all burning.' },
  siege: { name: 'Aspect of the Siege', desc: 'Your skills deal 35% more damage to staggered foes.' },
  // Round 18: three per discipline; they only drop for that discipline
  bulwark: { cls: 'faris', name: 'Aspect of the Bulwark', desc: 'Shield Bash staggers every foe within 4 metres of you.' },
  unbroken: { cls: 'faris', name: 'Aspect of the Unbroken', desc: 'Shield Wall restores 25% of your life.' },
  onset: { cls: 'faris', name: 'Aspect of the Onset', desc: 'Each kill takes 2 seconds off Charge.' },
  split: { cls: 'rami', name: 'Aspect of the Split Shaft', desc: 'Every third arrow splits into three.' },
  hawk: { cls: 'rami', name: 'Aspect of the Hawk', desc: 'Piercing Shot always strikes critically.' },
  quiver: { cls: 'rami', name: 'Aspect of the Full Quiver', desc: 'Tumble restores 15 focus.' },
  spill: { cls: 'naffat', name: 'Aspect of the Wide Spill', desc: 'Your fire pools are 40% wider.' },
  cinder: { cls: 'naffat', name: 'Aspect of Cinders', desc: 'Burning foes take 20% more damage from you.' },
  bellows: { cls: 'naffat', name: 'Aspect of the Bellows', desc: 'Naft Ring recovers 40% faster.' },
  shade: { cls: 'ayyar', name: 'Aspect of the Shade', desc: 'Your first blow from stealth deals 50% more damage and resets Evade.' },
  alley: { cls: 'ayyar', name: 'Aspect of the Alley', desc: 'Each kill resets Shadowstep.' },
  edge: { cls: 'ayyar', name: 'Aspect of the Knife\'s Edge', desc: 'You deal 30% more damage to foes below 35% life.' },
  // Round 21: only on the Siege Trials legendaries (never rolled onto a drop)
  breach: { trial: true, name: 'Aspect of the Breach', desc: 'You deal 40% more damage to captains and their like.' },
  lastgate: { trial: true, name: 'Aspect of the Last Gate', desc: 'Below 30% life you take 40% less damage.' },
  clock: { trial: true, name: 'Aspect of the Water-Clock', desc: 'Each kill takes 1 second off every skill.' },
  sapper: { trial: true, name: 'Aspect of the Sapper', desc: 'Drinking sherbet throws back and staggers foes within 4 metres.' },
};
const ASPECT_KEYS = Object.keys(ASPECTS).filter((k) => !ASPECTS[k].trial);

// ------------------------------------------------------------------ item sets
export const SETS = {
  barid: { name: 'Garb of the Barid', pieces: { armor: 'Courier\'s Qaba', helm: 'Courier\'s Qalansuwa', ring: 'Courier\'s Seal', amulet: 'Courier\'s Token' },
    bonus: { 2: { move: 10, regen: 2 }, 4: { cdr: 15, dmgPct: 15 } }, b2: '+10% movement, +2 regeneration', b4: '−15% cooldowns, +15% damage' },
  khurasan: { name: 'Harness of Khurasan', pieces: { armor: 'Khurasani Jawshan', helm: 'Khurasani Bayda', ring: 'Khurasani Ring', amulet: 'Khurasani Pendant' },
    bonus: { 2: { armor: 20, life: 50 }, 4: { crit: 10, dmgPct: 25 } }, b2: '+20 armor, +50 life', b4: '+10% critical strike, +25% damage' },
  // Round 18
  abna: { name: 'Panoply of the Abna\'', pieces: { armor: 'Abna\' Lamellar', helm: 'Abna\' Bayda', ring: 'Abna\' Signet', amulet: 'Abna\' Badge' },
    bonus: { 2: { life: 80, leech: 2 }, 4: { armor: 30, cdr: 10 } }, b2: '+80 life, +2 life per hit', b4: '+30 armor, −10% cooldowns' },
  nakhuda: { name: 'Outfit of the Basra Nakhuda', pieces: { armor: 'Nakhuda\'s Coat', helm: 'Nakhuda\'s Turban', ring: 'Nakhuda\'s Seal', amulet: 'Nakhuda\'s Compass-stone' },
    bonus: { 2: { move: 8, crit: 5 }, 4: { speed: 15, dmgPct: 20 } }, b2: '+8% movement, +5% critical strike', b4: '+15% attack speed, +20% damage' },
  warraq: { name: 'Tools of the Warraq', pieces: { armor: 'Warraq\'s Apron', helm: 'Warraq\'s Cap', ring: 'Warraq\'s Pen-ring', amulet: 'Warraq\'s Inkwell' },
    bonus: { 2: { mana: 25, regen: 3 }, 4: { cdr: 20, fire: 20 } }, b2: '+25 resource, +3 regeneration', b4: '−20% cooldowns, +20% fire damage' },
};
const SET_KEYS = Object.keys(SETS);
export function setStats(p) {
  const n = {}; for (const it of Object.values(p.equip)) if (it?.set) n[it.set] = (n[it.set] || 0) + 1;
  const s = {}; for (const [k, c] of Object.entries(n)) for (const th of [2, 4]) if (c >= th) for (const [a, v] of Object.entries(SETS[k].bonus[th])) s[a] = (s[a] || 0) + v;
  return { s, counts: n };
}
export function makeSetItem(level, setKey, slot) {
  const S = SETS[setKey]; slot ||= Object.keys(S.pieces)[Math.floor(Math.random() * 4)];
  const it = makeItem(level, 'rare', slot); it.rarity = 'set'; it.set = setKey; it.name = S.pieces[slot]; it.flavor = `${S.name}`;
  return it;
}
export const aspectsOf = (p) => new Set(Object.values(p.equip).filter((it) => it?.aspect).map((it) => it.aspect));

// ------------------------------------------------------------------ wiring into the game
export function setupProgression(game) {
  const p = game.player;
  p.tree ||= {}; p.worldTier ||= 1; p.unlockedTier ||= 1;
  // legendary drops gain an aspect; a small share of rares become set pieces
  const baseDrop = game.dropItem.bind(game);
  game.dropItem = (item, at) => {
    if (item.rarity === 'legendary' && !item.aspect) { const ks = ASPECT_KEYS.filter((k) => !ASPECTS[k].cls || ASPECTS[k].cls === p.cls); item.aspect = ks[Math.floor(Math.random() * ks.length)]; }
    if (item.rarity === 'rare' && !item.set && ['armor', 'helm', 'ring', 'amulet'].includes(item.slot) && Math.random() < 0.18) Object.assign(item, makeSetItem(item.level, SET_KEYS[Math.floor(Math.random() * SET_KEYS.length)], item.slot));
    if (item.gold && aspectsOf(p).has('purse')) item.gold = Math.round(item.gold * 1.6);
    if (item.gold) item.gold = Math.round(item.gold * (1 + (p.worldTier - 1) * 0.35));
    return baseDrop(item, at);
  };
  // stats: tree + sets on top of gear
  const baseRecalc = game.recalcStats.bind(game);
  game.recalcStats = () => {
    baseRecalc();
    const s = p.stats, t = treeStats(p), st = setStats(p);
    p.flags = t.flags;
    for (const src of [t.s, st.s]) for (const [k, v] of Object.entries(src)) { if (k === 'life') s.maxHp += v; else if (k === 'mana') s.maxMp += v; else s[k] = (s[k] || 0) + v; }
    if (t.s.dmgPct || st.s.dmgPct) { const k = 1 + ((t.s.dmgPct || 0) + (st.s.dmgPct || 0)) / 100; s.min = Math.round(s.min * k); s.max = Math.round(s.max * k); }
    if (game.interior?.def?.mods?.fragile) s.maxHp = Math.round(s.maxHp * 0.75);
    p.hp = Math.min(p.hp, s.maxHp); p.mp = Math.min(p.mp, s.maxMp);
  };
  game.recalcStats();
  // aspect hooks
  let hitN = 0;
  game.onHit = (e, dmg, crit) => {
    const A = aspectsOf(p);
    if (A.has('embers') && crit) e.burn = Math.max(e.burn || 0, 3);
    if (A.has('drums') && ++hitN % 4 === 0) { for (const o of game.enemies) if (!o.dead && !o.boss && o.pos.distanceTo(e.pos) < 3.5) { o.staggerT = 1.0; o.st.action = null; } game.fx.ring(e.pos, new THREE.Color(2.5, 2, 1.2), 0.4, 3.5, 0.4); game.audio.boom(); }
  };
  game.onKill = () => { if (aspectsOf(p).has('rally')) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.04); };
  game.dmgMod = (e) => {
    let k = 1; const A = aspectsOf(p);
    if (A.has('siege') && e.staggerT > 0 && p.st.action !== 'attack') k *= 1.35;
    if (p.buffs.gale > 0) k *= 1.3;
    if (game.interior?.def) k *= 1; // tier scaling is on the foes' side
    return k;
  };
  game.onEvade = () => { if (aspectsOf(p).has('gale')) { p.buffs.gale = 2; p.cds.dodge *= 0.6; } };
  game.onParry = () => { if (aspectsOf(p).has('mirage')) { p.invuln = 2; p.cds.dodge = 0; } };
  game.onPotion = () => { if (aspectsOf(p).has('qanat')) { p.buffs.heal = 1.8; } };
  game.skillTreePanel = (body, refresh) => skillTreeUI(game, body, refresh);
  game.enchantPanel = (body, refresh) => enchantUI(game, body, refresh);
  addQanat(game);
}

// ------------------------------------------------------------------ panels
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
export function skillTreeUI(game, body, refresh) {
  const p = game.player, tree = TREES[p.cls]; p.tree[p.cls] ||= {}; const R = p.tree[p.cls];
  const free = pointsFree(p);
  const w = el(`<div class="tree"><div class="slabel">${CLASSES[p.cls].name} disciplines · <b>${free}</b> point${free === 1 ? '' : 's'} to spend (one per level)</div><div class="tcols">${tree.map((br, bi) => `<div class="tcol"><div class="tbr">${br.name}</div>${br.nodes.map((n, ni) => { const r = R[n.id] || 0, locked = ni > 0 && !(R[br.nodes[ni - 1].id] > 0); return `<button class="tnode ${r ? 'has' : ''} ${locked ? 'locked' : ''}" data-b="${bi}" data-n="${ni}"><b>${n.name}</b><small>${n.desc}</small><i>${r}/${n.max}</i></button>`; }).join('')}</div>`).join('')}</div><button class="sbtn reset">Unlearn all (${resetCost(p)} dinars)</button></div>`);
  w.querySelectorAll('.tnode').forEach((b) => b.onclick = () => {
    const br = tree[+b.dataset.b], n = br.nodes[+b.dataset.n], ni = +b.dataset.n;
    if (pointsFree(p) <= 0 || (R[n.id] || 0) >= n.max || (ni > 0 && !(R[br.nodes[ni - 1].id] > 0))) { game.audio.denied?.(); return; }
    R[n.id] = (R[n.id] || 0) + 1; game.recalcStats(); game.audio.levelUp(); refresh();
  });
  w.querySelector('.reset').onclick = () => { const c = resetCost(p); if (p.gold < c) { game.audio.denied?.(); return; } p.gold -= c; p.tree[p.cls] = {}; game.recalcStats(); refresh(); };
  body.appendChild(w);
}
const resetCost = (p) => 20 * p.level;

function enchantUI(game, body, refresh) {
  const p = game.player, ui = game.ui;
  const eq = Object.entries(p.equip).filter(([, it]) => it && Object.keys(it.stats).length);
  const w = el(`<div class="slist"><div class="slabel">Reroll one property for 1 gem shard and ${40} dinars, or imprint an aspect: break a legendary in your pack to set its aspect into an equipped rare or set item.</div></div>`);
  for (const [slot, it] of eq) {
    const lines = statLines(it), keys = Object.keys(it.stats);
    const row = el(`<div class="srow ench"><div class="cell r-${it.rarity}"><span class="ic">${itemIcon(it)}</span></div><div class="sinfo"><b style="color:${(RARITY[it.rarity] || RARITY.rare).color}">${it.name}</b>${keys.map((k, i) => `<button class="aff" data-k="${k}">↻ ${lines[i]}</button>`).join('')}${it.aspect ? `<small class="asp">${ASPECTS[it.aspect].name}</small>` : ''}</div></div>`);
    row.querySelectorAll('.aff').forEach((b) => b.onclick = () => {
      if (p.mats.gem < 1 || p.gold < 40) { ui.toast('You need a gem shard and 40 dinars'); game.audio.denied?.(); return; }
      p.mats.gem--; p.gold -= 40;
      const used = new Set(Object.keys(it.stats)); const pool = AFFIXES.filter((a) => (!used.has(a.key) || a.key === b.dataset.k) && (!a.slot || a.slot === it.slot));
      const a = pool[Math.floor(Math.random() * pool.length)]; delete it.stats[b.dataset.k]; it.stats[a.key] = a.roll(it.level);
      game.recalcStats(); game.audio.legendary(); refresh();
    });
    w.appendChild(row);
  }
  const legs = p.bag.map((it, i) => [it, i]).filter(([it]) => it?.rarity === 'legendary' && it.aspect);
  const targets = Object.entries(p.equip).filter(([, it]) => it && (it.rarity === 'rare' || it.rarity === 'set') && !it.aspect);
  if (legs.length && targets.length) {
    const imp = el(`<div class="imprint"><div class="slabel">Imprint an aspect</div><select class="src">${legs.map(([it, i]) => `<option value="${i}">${ASPECTS[it.aspect].name} (from ${it.name})</option>`).join('')}</select><select class="dst">${targets.map(([s, it]) => `<option value="${s}">${it.name}</option>`).join('')}</select><button class="sbtn">Imprint (2 gems, 120 dinars)</button></div>`);
    imp.querySelector('button').onclick = () => {
      if (p.mats.gem < 2 || p.gold < 120) { ui.toast('You need 2 gem shards and 120 dinars'); game.audio.denied?.(); return; }
      const si = +imp.querySelector('.src').value, ds = imp.querySelector('.dst').value; p.mats.gem -= 2; p.gold -= 120;
      p.equip[ds].aspect = p.bag[si].aspect; p.equip[ds].name += ' (imprinted)'; p.bag[si] = null; game.recalcStats(); game.audio.legendary(); ui.toast('The aspect takes hold'); refresh();
    };
    w.appendChild(imp);
  }
  body.appendChild(w);
}

// ------------------------------------------------------------------ the ruined qanats: tiered dungeon runs
export const MODS = {
  hardened: { name: 'Hardened', desc: 'Foes have 40% more life', apply: (e) => { e.maxHp = e.hp = Math.round(e.maxHp * 1.4); } },
  swift: { name: 'Swift', desc: 'Foes move 20% faster', apply: (e) => { e.speed *= 1.2; } },
  ironclad: { name: 'Ironclad', desc: 'Foes carry shields', apply: (e) => { e.shield = true; } },
  burning: { name: 'Naft Seeps', desc: 'Burning naft seeps from the floor', burning: true },
  fragile: { name: 'Bad Air', desc: 'Your maximum life is 25% lower', fragile: true },
  gilded: { name: 'Gilded', desc: 'Chests hold more treasure', loot: 1 },
  veterans: { name: 'Veterans', desc: 'Foes are two levels higher', levelUp: 2 },
};
const TIER_NAMES = ['', 'Normal', 'Veteran', 'Elite', 'Torment I', 'Torment II', 'Torment III'];
export const tierName = (t) => TIER_NAMES[t] || `Torment ${t - 3}`;

function addQanat(game) {
  // the village well is a qanat shaft: the way down to the old water galleries
  const V = SITES.village, p = new THREE.Vector3(V.x - 1, 0, V.z + 6.5); // the suq's well (suq at V+(2,-6), well at local (-3, 12.5))
  game.interactables.push({ pos: p, r: 3.4, label: 'Descend the qanat shaft', act: () => qanatPanel(game) });
  game.pois?.push({ x: p.x, z: p.z, icon: '◎', color: '#7ac0d0' });
  game.qanatPos = p;
}
function rollMods(n) { const k = Object.keys(MODS).sort(() => Math.random() - 0.5); return k.slice(0, n); }
export function qanatPanel(game) {
  const p = game.player; document.body.classList.add('inshop');
  const offer = game.qanatOffer ||= { seed: (Math.random() * 1e6) | 0, mods: rollMods(2) };
  const tier = Math.min(p.worldTier, p.unlockedTier);
  const w = el(`<div id="shop" class="panel"><div class="ptitle">The Ruined Qanats <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody">
    <div class="slabel">Old water galleries run for miles under the Sawad, and the envoy's men use them. Each descent is a new maze. Clear the deepest gallery to open the next difficulty tier.</div>
    <div class="tiers">${[1, 2, 3, 4, 5, 6].map((t) => `<button class="sbtn tier ${t === tier ? 'on' : ''}" data-t="${t}" ${t > p.unlockedTier ? 'disabled' : ''}>${tierName(t)}</button>`).join('')}</div>
    <div class="slabel">This descent: ${offer.mods.map((m) => `<b>${MODS[m].name}</b> (${MODS[m].desc})`).join(' · ')}</div>
    <div class="slabel">Foes level ${qLevel(game, tier)} · loot and dinars +${(tier - 1) * 35}%</div>
    <div class="row2"><button class="sbtn go">Descend</button><button class="sbtn reroll">New maze (20 dinars)</button><button class="sbtn rush" ${p.unlockedTier < 2 ? 'disabled' : ''}>Gauntlet of Captains (boss rush)</button></div>
  </div></div>`);
  game.ui.root.appendChild(w);
  const close = () => { w.remove(); document.body.classList.remove('inshop'); };
  w.querySelector('.close').onclick = close;
  w.querySelectorAll('.tier').forEach((b) => b.onclick = () => { p.worldTier = +b.dataset.t; close(); qanatPanel(game); });
  w.querySelector('.reroll').onclick = () => { if (p.gold < 20) return; p.gold -= 20; game.qanatOffer = null; close(); qanatPanel(game); };
  w.querySelector('.go').onclick = () => { close(); startQanat(game, tier, offer); game.qanatOffer = null; };
  w.querySelector('.rush').onclick = () => { if (p.unlockedTier < 2) return; close(); startRush(game, tier); };
}
const qLevel = (game, tier) => Math.max(game.player.level, 2) + (tier - 1) * 3;
function startQanat(game, tier, offer) {
  const mods = {}; for (const m of offer.mods) Object.assign(mods, MODS[m]);
  const modList = offer.mods.map((m) => MODS[m]);
  const def = {
    kind: 'qanat', seed: offer.seed, rooms: 7 + Math.min(4, tier), level: qLevel(game, tier) + (mods.levelUp || 0), title: `The Ruined Qanats · ${tierName(tier)}`, sub: offer.mods.map((m) => MODS[m].name).join(' · '),
    bossType: 'champion', bossName: ['Exazenos', 'Argyros', 'Pegonites', 'Doukas'][tier % 4] + ' · Captain', lootBonus: (mods.loot || 0) + Math.floor((tier - 1) / 2),
    mods: { apply: (e) => { for (const m of modList) m.apply?.(e); const k = 1 + (tier - 1) * 0.45; e.maxHp = e.hp = Math.round(e.maxHp * k); e.dmg *= 1 + (tier - 1) * 0.3; }, fragile: !!mods.fragile },
    onEnter: (g) => { g.recalcStats(); if (mods.burning) g.qanatBurn = true; },
    onExit: (g) => { g.qanatBurn = false; g.recalcStats(); },
    onChest: (g) => { if (g.player.unlockedTier <= tier && tier < 6) { g.player.unlockedTier = tier + 1; g.ui.banner('A Deeper Tier Opens', `${tierName(tier + 1)} difficulty is now open in the qanats`, 3500); } g.stats.qanats = (g.stats.qanats || 0) + 1; },
  };
  game.zones.enter(def);
}
// boss rush: one long gallery, captains in sequence, each wave opening once the last falls
function startRush(game, tier) {
  const lvl = qLevel(game, tier) + 2;
  const def = { kind: 'qanat', seed: 4242 + tier, rooms: 3, level: lvl, title: 'The Gauntlet of Captains', sub: 'Five captains, one after another', bossType: 'champion', bossName: 'Bardanes\' Champion', lootBonus: 2 + tier,
    mods: { apply: (e) => { const k = 1 + (tier - 1) * 0.45; e.maxHp = e.hp = Math.round(e.maxHp * k); } },
    onEnter: (g) => {
      // clear the ordinary galleries: the rush is captains only
      for (const e of g.interior.enemies) if (!e.elite) { g.scene.remove(e.rig); e.removed = true; e.dead = true; }
      g.enemies = g.enemies.filter((e) => !e.removed); g.interior.enemies = g.interior.enemies.filter((e) => !e.removed);
      const I = g.interior.I, c = I.center(I.rooms[1]);
      const waves = [['spearman', 'Kekaumenos · Menavlatos'], ['deserter', 'Kaballarios · Trapezites'], ['naffat', 'Maniakes · Siphon-bearer'], ['archer', 'Alyates · Toxotes'], ['champion', 'Exazenos · Champion']];
      let i = 0, t0 = performance.now();
      const next = () => {
        if (!g.interior) return;
        if (i >= waves.length) { g.ui.banner('The Gauntlet Is Run', `Cleared in ${((performance.now() - t0) / 1000).toFixed(0)} s`, 4000); g.stats.rushes = (g.stats.rushes || 0) + 1; return; }
        const [type, name] = waves[i++]; g.ui.banner(name, `Captain ${i} of ${waves.length}`, 1800);
        const e = g.spawnPack(type, c.x, c.z, 1, lvl + i, { elite: true, interior: true, name })[0]; e.interior = true; e.alerted = true; def.mods.apply(e); g.interior.enemies.push(e);
        e.onDeath = () => setTimeout(next, 1500);
      };
      setTimeout(next, 1200);
    },
  };
  game.zones.enter(def);
}
// the captains' type: Bardanes' look, but a mortal elite (no boss phases)
TYPES.champion = { ...TYPES.commander, name: 'Captain', hp: 90, dmg: 9, speed: 3.6, range: 2.6, atk: 1.6, xp: 40, radius: 0.7, boss: false, action: 'attack',
  build: () => { const r = TYPES.commander.build(); r.children[0].scale.multiplyScalar(0.72); return r; } };
export function qanatBurnTick(game, dt) {
  if (!game.qanatBurn || !game.interior) return;
  game._burnT = (game._burnT || 3) - dt;
  if (game._burnT > 0) return;
  game._burnT = 4 + Math.random() * 3;
  const p = game.player.pos, q = new THREE.Vector3(p.x + (Math.random() - 0.5) * 10, 0, p.z + (Math.random() - 0.5) * 10);
  game.telegraph(q, 2, 1.2, () => { game.spawnZone({ kind: 'fire', pos: q, r: 1.8, life: 4, tickDmg: 0, hurtsPlayer: true }); if (game.player.pos.distanceTo(q) < 2) game.damagePlayer(game.player.stats.maxHp * 0.12, q); });
}
export { tierName as TIER };
