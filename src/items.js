// Loot generation: bases, rarities, affixes, uniques.
export const RARITY = {
  common: { name: 'Common', color: '#d8d0c0', beam: 0xffffff, affixes: 0 },
  magic: { name: 'Magic', color: '#6f8cff', beam: 0x4a6cff, affixes: 2 },
  rare: { name: 'Rare', color: '#ffd84a', beam: 0xffd040, affixes: 4 },
  legendary: { name: 'Legendary', color: '#ff8a2a', beam: 0xff7a10, affixes: 5 },
  set: { name: 'Set', color: '#5ee08a', beam: 0x30e070, affixes: 4 },
};

export const BASES = {
  weapon: [
    { name: 'Sayf', min: 4, max: 9, icon: '⚔' }, { name: 'Yamani Sayf', min: 6, max: 12, icon: '⚔' },
    { name: 'Qala\'i Sayf', min: 8, max: 15, icon: '⚔' }, { name: 'Hindi Sayf', min: 11, max: 19, icon: '⚔' },
  ],
  armor: [{ name: 'Quilted Qaba', armor: 6, icon: '🥋' }, { name: 'Mail Hauberk', armor: 12, icon: '🛡' }, { name: 'Lamellar Jawshan', armor: 18, icon: '🛡' }],
  helm: [{ name: 'Felt Qalansuwa', armor: 3, icon: '🎩' }, { name: 'Iron Bayda', armor: 6, icon: '⛑' }, { name: 'Mailed Bayda', armor: 9, icon: '⛑' }],
  ring: [{ name: 'Carnelian Ring', icon: '💍' }, { name: 'Silver Signet', icon: '💍' }],
  amulet: [{ name: 'Lapis Amulet', icon: '📿' }, { name: 'Brass Talisman', icon: '📿' }],
  // Round 20: belts (mintaqa), with the sherbet flask hung from them
  belt: [{ name: 'Cloth Sash', armor: 1, icon: '🎗' }, { name: 'Leather Mintaqa', armor: 2, icon: '🎗' }, { name: 'Studded Mintaqa', armor: 4, icon: '🎗' }],
};

export const AFFIXES = [
  { key: 'dmgPct', fmt: (v) => `+${v}% Damage`, roll: (l) => 5 + Math.floor(Math.random() * (6 + l * 2)) },
  { key: 'life', fmt: (v) => `+${v} Maximum Life`, roll: (l) => 8 + Math.floor(Math.random() * (10 + l * 4)) },
  { key: 'mana', fmt: (v) => `+${v} Maximum Resource`, roll: (l) => 5 + Math.floor(Math.random() * (6 + l * 2)) },
  { key: 'crit', fmt: (v) => `+${v}% Critical Strike Chance`, roll: () => 2 + Math.floor(Math.random() * 6) },
  { key: 'speed', fmt: (v) => `+${v}% Attack Speed`, roll: () => 4 + Math.floor(Math.random() * 10) },
  { key: 'leech', fmt: (v) => `+${v} Life per Hit`, roll: (l) => 1 + Math.floor(Math.random() * (2 + l / 2)) },
  { key: 'move', fmt: (v) => `+${v}% Movement Speed`, roll: () => 3 + Math.floor(Math.random() * 8) },
  { key: 'fire', fmt: (v) => `+${v}% Naft (Fire) Damage`, roll: (l) => 10 + Math.floor(Math.random() * (10 + l * 3)) },
  { key: 'armor', fmt: (v) => `+${v} Armor`, roll: (l) => 3 + Math.floor(Math.random() * (5 + l * 2)) },
  { key: 'regen', fmt: (v) => `+${v} Resource Regeneration/s`, roll: () => 1 + Math.floor(Math.random() * 3) },
  { key: 'cdr', fmt: (v) => `−${v}% Cooldowns`, roll: () => 3 + Math.floor(Math.random() * 6), rare: true },
  // Round 20: belt-only properties, all about the sherbet flask
  { key: 'potHeal', fmt: (v) => `+${v}% Sherbet Healing`, roll: () => 15 + Math.floor(Math.random() * 26), slot: 'belt' },
  { key: 'potCapB', fmt: (v) => `+${v} Sherbet Carried`, roll: () => 1, slot: 'belt' },
  { key: 'drinkRes', fmt: (v) => `Sherbet restores ${v} Resource`, roll: (l) => 10 + Math.floor(Math.random() * (10 + l * 2)), slot: 'belt' },
];

const PREFIX = ['Gilded', 'Simoom', 'Barmakid', 'Starlit', 'Copper', 'Ebon', 'Saffron', 'Tigris', 'Moonlit', 'Sandstorm', 'Vizier\'s', 'Falconer\'s'];
const SUFFIX = ['of the Caliph', 'of the Oasis', 'of Embers', 'of the House of Wisdom', 'of the Nomad', 'of Thirst', 'of Wind', 'of the Astrolabe', 'of Basra', 'of Kufa'];

const UNIQUES = [
  { slot: 'weapon', name: 'Tongue of the Simoom', base: 'Hindi Sayf', min: 16, max: 28, stats: { dmgPct: 40, speed: 15, leech: 6, fire: 30 }, flavor: '"Forged in the bellows of a desert storm."' },
  { slot: 'ring', name: 'Signet of the Barmakids', base: 'Carnelian Signet', stats: { life: 60, mana: 40, crit: 10, regen: 4 }, flavor: '"It sealed a vizier\'s letters, before his house fell."' },
  { slot: 'amulet', name: 'Astrolabe of the Banu Musa', base: 'Brass Astrolabe', stats: { dmgPct: 25, mana: 50, regen: 5, move: 10 }, flavor: '"The heavens turn; so too shall your enemies."' },
  { slot: 'belt', name: 'Girdle of the Water-Carrier', base: 'Studded Mintaqa', armor: 6, stats: { potHeal: 45, potCapB: 1, life: 50, regen: 2 }, flavor: '"He carried water through the siege, and asked no coin for it."' },
  { slot: 'armor', name: 'Jawshan of Harun', base: 'Lamellar Jawshan', armor: 34, stats: { life: 80, armor: 20, leech: 3 }, flavor: '"Worn at the gates of the Round City."' },
  // Round 21: won only in the Siege Trials, each with its own aspect
  { trial: 'breach', slot: 'weapon', name: 'Edge of the Breach', base: 'Hindi Sayf', min: 18, max: 30, stats: { dmgPct: 35, crit: 8, speed: 10 }, flavor: '"It went first through the gap in the wall, and came back."' },
  { trial: 'lastgate', slot: 'armor', name: 'Coat of the Last Gate', base: 'Lamellar Jawshan', armor: 38, stats: { life: 110, armor: 25, regen: 3 }, flavor: '"The Khurasan gate held a day longer than the rest."' },
  { trial: 'clock', slot: 'ring', name: 'Ring of the Water-Clock', base: 'Silver Signet', stats: { cdr: 12, crit: 6, mana: 30 }, flavor: '"Measured out in drops, like the clock the caliph sent to the Franks."' },
  { trial: 'sapper', slot: 'belt', name: 'Sapper\'s Cord', base: 'Studded Mintaqa', armor: 8, stats: { potHeal: 30, life: 60, armor: 10 }, flavor: '"Knotted by the men who dug under the walls."' },
];
export const TRIAL_UNIQUES = UNIQUES.filter((u) => u.trial);

let uid = 1;
// loot follows the hero's discipline: bows for the Rami, siphons for the Naffat, knives for the 'Ayyar
let weaponPool = null, weaponCls = 'faris';
export function setWeaponPool(cls, list) { weaponCls = cls; weaponPool = list.map((w) => ({ ...w, icon: '⚔' })); }
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function rollRarity(level, bonus = 0) {
  const r = Math.random() - bonus;
  if (r < 0.02 + level * 0.002) return 'legendary';
  if (r < 0.12 + level * 0.005) return 'rare';
  if (r < 0.42) return 'magic';
  return 'common';
}

export function makeItem(level, rarity, slot) {
  slot = slot || pick(['weapon', 'weapon', 'armor', 'helm', 'ring', 'amulet', 'belt']);
  if (rarity === 'legendary') {
    const any = UNIQUES.filter((u) => !u.trial), pool = any.filter((u) => u.slot === slot);
    const u = pool.length ? pick(pool) : pick(any);
    return uniqueItem(u, level);
  }
  return rolledItem(level, rarity, slot);
}
function uniqueItem(u, level) {
  {
    const it = { id: uid++, slot: u.slot, rarity: 'legendary', name: u.name, base: u.base, level, stats: { ...u.stats }, flavor: u.flavor, icon: (BASES[u.slot][0] || {}).icon };
    if (u.min) { it.min = u.min + level; it.max = u.max + level * 2; it.cls = weaponCls; if (weaponCls !== 'faris') { it.base = weaponPool[3].name; } }
    if (u.armor) it.armor = u.armor + level * 2;
    if (u.trial) { it.aspect = u.trial; it.trial = true; }
    return it;
  }
}
// Round 21: a Siege Trials legendary (random one if no key)
export function makeTrialUnique(level, key) { return uniqueItem(TRIAL_UNIQUES.find((u) => u.trial === key) || pick(TRIAL_UNIQUES), level); }
function rolledItem(level, rarity, slot) {
  const bases = slot === 'weapon' && weaponPool ? weaponPool : BASES[slot];
  const tier = Math.min(bases.length - 1, Math.floor(Math.random() * (1 + level / 3)));
  const b = bases[tier];
  const it = { id: uid++, slot, rarity, base: b.name, name: b.name, level, stats: {}, icon: b.icon };
  if (slot === 'weapon') it.cls = weaponCls;
  if (b.min) { it.min = b.min + Math.floor(level * 0.8); it.max = b.max + level * 1.5 | 0; }
  if (b.armor) it.armor = b.armor + level;
  const n = RARITY[rarity].affixes;
  const pool = AFFIXES.filter((a) => (!a.rare || rarity !== 'magic') && (!a.slot || a.slot === slot)).sort(() => Math.random() - 0.5);
  // a belt always carries one of its own properties first
  if (slot === 'belt' && n) { const own = pool.findIndex((a) => a.slot === 'belt'); if (own > 0) pool.unshift(pool.splice(own, 1)[0]); }
  for (let i = 0; i < n; i++) it.stats[pool[i].key] = pool[i].roll(level);
  if (rarity === 'magic') it.name = `${pick(PREFIX)} ${b.name}`;
  if (rarity === 'rare') it.name = `${pick(PREFIX)} ${b.name} ${pick(SUFFIX)}`;
  return it;
}

export function statLines(it) {
  return Object.entries(it.stats).map(([k, v]) => (AFFIXES.find((a) => a.key === k) || { fmt: (x) => `+${x} ${k}` }).fmt(v));
}

// Round 20: Bishr forges an item to order: a rare of the chosen slot whose chosen property is rolled in its top third
export function craftItem(level, slot, key) {
  const it = makeItem(level, 'rare', slot);
  const a = AFFIXES.find((x) => x.key === key);
  if (a) {
    if (!(key in it.stats)) { const drop = Object.keys(it.stats).find((k) => k !== key); if (drop) delete it.stats[drop]; }
    let best = 0; for (let i = 0; i < 6; i++) best = Math.max(best, a.roll(level));
    it.stats[key] = best;
  }
  it.crafted = true;
  return it;
}
export const craftableAffixes = (slot) => AFFIXES.filter((a) => !a.slot || a.slot === slot);
