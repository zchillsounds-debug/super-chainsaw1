// Loot generation: bases, rarities, affixes, uniques.
export const RARITY = {
  common: { name: 'Common', color: '#d8d0c0', beam: 0xffffff, affixes: 0 },
  magic: { name: 'Magic', color: '#6f8cff', beam: 0x4a6cff, affixes: 2 },
  rare: { name: 'Rare', color: '#ffd84a', beam: 0xffd040, affixes: 4 },
  legendary: { name: 'Legendary', color: '#ff8a2a', beam: 0xff7a10, affixes: 5 },
};

const BASES = {
  weapon: [
    { name: 'Sayf', min: 4, max: 9, icon: '⚔' }, { name: 'Yamani Sayf', min: 6, max: 12, icon: '⚔' },
    { name: 'Qala\'i Sayf', min: 8, max: 15, icon: '⚔' }, { name: 'Hindi Sayf', min: 11, max: 19, icon: '⚔' },
  ],
  armor: [{ name: 'Quilted Qaba', armor: 6, icon: '🥋' }, { name: 'Mail Hauberk', armor: 12, icon: '🛡' }, { name: 'Lamellar Jawshan', armor: 18, icon: '🛡' }],
  helm: [{ name: 'Felt Qalansuwa', armor: 3, icon: '🎩' }, { name: 'Iron Bayda', armor: 6, icon: '⛑' }, { name: 'Mailed Bayda', armor: 9, icon: '⛑' }],
  ring: [{ name: 'Carnelian Ring', icon: '💍' }, { name: 'Silver Signet', icon: '💍' }],
  amulet: [{ name: 'Lapis Amulet', icon: '📿' }, { name: 'Brass Talisman', icon: '📿' }],
};

const AFFIXES = [
  { key: 'dmgPct', fmt: (v) => `+${v}% Damage`, roll: (l) => 5 + Math.floor(Math.random() * (6 + l * 2)) },
  { key: 'life', fmt: (v) => `+${v} Maximum Life`, roll: (l) => 8 + Math.floor(Math.random() * (10 + l * 4)) },
  { key: 'mana', fmt: (v) => `+${v} Maximum Mana`, roll: (l) => 5 + Math.floor(Math.random() * (6 + l * 2)) },
  { key: 'crit', fmt: (v) => `+${v}% Critical Strike Chance`, roll: () => 2 + Math.floor(Math.random() * 6) },
  { key: 'speed', fmt: (v) => `+${v}% Attack Speed`, roll: () => 4 + Math.floor(Math.random() * 10) },
  { key: 'leech', fmt: (v) => `+${v} Life per Hit`, roll: (l) => 1 + Math.floor(Math.random() * (2 + l / 2)) },
  { key: 'move', fmt: (v) => `+${v}% Movement Speed`, roll: () => 3 + Math.floor(Math.random() * 8) },
  { key: 'fire', fmt: (v) => `+${v}% Naft (Fire) Damage`, roll: (l) => 10 + Math.floor(Math.random() * (10 + l * 3)) },
  { key: 'armor', fmt: (v) => `+${v} Armor`, roll: (l) => 3 + Math.floor(Math.random() * (5 + l * 2)) },
  { key: 'regen', fmt: (v) => `+${v} Mana Regeneration/s`, roll: () => 1 + Math.floor(Math.random() * 3) },
];

const PREFIX = ['Gilded', 'Simoom', 'Barmakid', 'Starlit', 'Copper', 'Ebon', 'Saffron', 'Tigris', 'Moonlit', 'Sandstorm', 'Vizier\'s', 'Falconer\'s'];
const SUFFIX = ['of the Caliph', 'of the Oasis', 'of Embers', 'of the House of Wisdom', 'of the Nomad', 'of Thirst', 'of Wind', 'of the Astrolabe', 'of Basra', 'of Kufa'];

const UNIQUES = [
  { slot: 'weapon', name: 'Tongue of the Simoom', base: 'Hindi Sayf', min: 16, max: 28, stats: { dmgPct: 40, speed: 15, leech: 6, fire: 30 }, flavor: '"Forged in the bellows of a desert storm."' },
  { slot: 'ring', name: 'Signet of the Barmakids', base: 'Carnelian Signet', stats: { life: 60, mana: 40, crit: 10, regen: 4 }, flavor: '"It sealed a vizier\'s letters, before his house fell."' },
  { slot: 'amulet', name: 'Astrolabe of the Banu Musa', base: 'Brass Astrolabe', stats: { dmgPct: 25, mana: 50, regen: 5, move: 10 }, flavor: '"The heavens turn; so too shall your enemies."' },
  { slot: 'armor', name: 'Jawshan of Harun', base: 'Lamellar Jawshan', armor: 34, stats: { life: 80, armor: 20, leech: 3 }, flavor: '"Worn at the gates of the Round City."' },
];

let uid = 1;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function rollRarity(level, bonus = 0) {
  const r = Math.random() - bonus;
  if (r < 0.02 + level * 0.002) return 'legendary';
  if (r < 0.12 + level * 0.005) return 'rare';
  if (r < 0.42) return 'magic';
  return 'common';
}

export function makeItem(level, rarity, slot) {
  slot = slot || pick(['weapon', 'weapon', 'armor', 'helm', 'ring', 'amulet']);
  if (rarity === 'legendary') {
    const pool = UNIQUES.filter((u) => u.slot === slot);
    const u = pool.length ? pick(pool) : pick(UNIQUES);
    const it = { id: uid++, slot: u.slot, rarity, name: u.name, base: u.base, level, stats: { ...u.stats }, flavor: u.flavor, icon: (BASES[u.slot][0] || {}).icon };
    if (u.min) { it.min = u.min + level; it.max = u.max + level * 2; }
    if (u.armor) it.armor = u.armor + level * 2;
    return it;
  }
  const bases = BASES[slot];
  const tier = Math.min(bases.length - 1, Math.floor(Math.random() * (1 + level / 3)));
  const b = bases[tier];
  const it = { id: uid++, slot, rarity, base: b.name, name: b.name, level, stats: {}, icon: b.icon };
  if (b.min) { it.min = b.min + Math.floor(level * 0.8); it.max = b.max + level * 1.5 | 0; }
  if (b.armor) it.armor = b.armor + level;
  const n = RARITY[rarity].affixes;
  const pool = AFFIXES.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < n; i++) it.stats[pool[i].key] = pool[i].roll(level);
  if (rarity === 'magic') it.name = `${pick(PREFIX)} ${b.name}`;
  if (rarity === 'rare') it.name = `${pick(PREFIX)} ${b.name} ${pick(SUFFIX)}`;
  return it;
}

export function statLines(it) {
  return Object.entries(it.stats).map(([k, v]) => AFFIXES.find((a) => a.key === k).fmt(v));
}
