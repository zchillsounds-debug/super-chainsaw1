// Critter roster, types and move data. All creatures are original designs.

export const TYPES = {
  fire:   { name: 'Blaze',  color: '#ff6a2b', glow: 0xff7a30, beats: ['leaf', 'gust'] },
  water:  { name: 'Splash', color: '#2fa8ff', glow: 0x48b8ff, beats: ['fire', 'stone'] },
  leaf:   { name: 'Sprout', color: '#4fd35a', glow: 0x6cff6a, beats: ['water', 'stone'] },
  spark:  { name: 'Zap',    color: '#ffd52e', glow: 0xfff060, beats: ['water', 'gust'] },
  stone:  { name: 'Pebble', color: '#c08a55', glow: 0xffc080, beats: ['fire', 'spark'] },
  gust:   { name: 'Breeze', color: '#a7b8ff', glow: 0xc8d8ff, beats: ['leaf', 'spark'] },
};

export function typeMult(atk, def) {
  if (TYPES[atk].beats.includes(def)) return 1.35;
  if (TYPES[def].beats.includes(atk)) return 0.8;
  return 1;
}

// body: proportions of the procedural sculpt. ears/tail/extra pick part builders in critters.js
export const CRITTERS = [
  {
    id: 'cindermunch', name: 'Cindermunch', type: 'fire', species: 'Ember Hamster',
    blurb: 'Stuffs its cheeks with hot coals. Headbutts like a tiny comet.',
    colors: { body: 0xf39a4a, belly: 0xfff0d6, accent: 0xff4d1f, dark: 0x7a3418, eye: '#3a1a0c', iris: '#ff7a1a' },
    body: { w: 0.62, h: 0.56, headR: 0.5, legLen: 0.16, armLen: 0.2, chubby: 1.15 },
    ears: 'round', tail: 'flame', extra: 'cheeks', voice: 1.25,
    stats: { hp: 1000, speed: 6.4, power: 1.05, weight: 0.9 },
    special: 'comet', super: 'meteor',
    moves: { special: 'Comet Bonk', super: 'Meteor Munch' },
  },
  {
    id: 'bubbalotl', name: 'Bubbalotl', type: 'water', species: 'Bubble Axolotl',
    blurb: 'Always smiling. Its bubbles pop with the force of a firehose.',
    colors: { body: 0xff9fc8, belly: 0xffe0ef, accent: 0xff5fa0, dark: 0x8a2d5a, eye: '#1d1030', iris: '#5a3cff' },
    body: { w: 0.55, h: 0.62, headR: 0.54, legLen: 0.17, armLen: 0.2, chubby: 1.0 },
    ears: 'gills', tail: 'fin', extra: null, voice: 1.0,
    stats: { hp: 1050, speed: 5.8, power: 0.95, weight: 1.0 },
    special: 'bubble', super: 'tsunami',
    moves: { special: 'Bubble Pop', super: 'Tidal Hug' },
  },
  {
    id: 'clovebun', name: 'Clovebun', type: 'leaf', species: 'Clover Bunny',
    blurb: 'Hops everywhere. Throws spinning clover leaves that always come back.',
    colors: { body: 0xf6f3e4, belly: 0xffffff, accent: 0x5bd36a, dark: 0x2d7a3a, eye: '#10301a', iris: '#2ec060' },
    body: { w: 0.5, h: 0.58, headR: 0.5, legLen: 0.2, armLen: 0.18, chubby: 0.95 },
    ears: 'long', tail: 'puff', extra: 'sprout', voice: 1.4,
    stats: { hp: 920, speed: 7.2, power: 0.95, weight: 0.8 },
    special: 'leafrang', super: 'bloom',
    moves: { special: 'Clover-rang', super: 'Mega Bloom' },
  },
  {
    id: 'voltferret', name: 'Voltferret', type: 'spark', species: 'Static Ferret',
    blurb: 'Rubs itself on carpets for fun. Zips around faster than you can say "ouch".',
    colors: { body: 0xffe066, belly: 0xfff6cf, accent: 0x3a3048, dark: 0x6a5420, eye: '#1a1420', iris: '#2ad0ff' },
    body: { w: 0.48, h: 0.66, headR: 0.46, legLen: 0.17, armLen: 0.21, chubby: 0.85 },
    ears: 'pointy', tail: 'bolt', extra: 'mask', voice: 1.6,
    stats: { hp: 900, speed: 7.6, power: 1.0, weight: 0.75 },
    special: 'zipzap', super: 'thunder',
    moves: { special: 'Zip Zap', super: 'Thunder Tumble' },
  },
  {
    id: 'rolladillo', name: 'Rolladillo', type: 'stone', species: 'Pebble Armadillo',
    blurb: 'Naps inside its own shell. Rolls downhill on purpose, uphill by accident.',
    colors: { body: 0xc9a27a, belly: 0xf3e2c6, accent: 0x8a6a4a, dark: 0x5a3e28, eye: '#24160c', iris: '#c08a55' },
    body: { w: 0.62, h: 0.52, headR: 0.44, legLen: 0.15, armLen: 0.17, chubby: 1.15 },
    ears: 'round', tail: 'stub', extra: 'shell', voice: 0.8,
    stats: { hp: 1150, speed: 5.4, power: 1.1, weight: 1.3 },
    special: 'rollout', super: 'quake',
    moves: { special: 'Roly-Poly', super: 'Boulder Quake' },
  },
  {
    id: 'hootsy', name: 'Hootsy', type: 'gust', species: 'Breeze Owlet',
    blurb: 'Too round to fly properly, so it flaps up little tornadoes instead.',
    colors: { body: 0x9aa8e8, belly: 0xf2f0ff, accent: 0x6a74c8, dark: 0x3a3a7a, eye: '#1a1040', iris: '#ffb020' },
    body: { w: 0.6, h: 0.6, headR: 0.5, legLen: 0.13, armLen: 0.22, chubby: 1.05 },
    ears: 'tufts', tail: 'feathers', extra: 'owl', voice: 1.15,
    stats: { hp: 980, speed: 6.6, power: 1.0, weight: 0.85 },
    special: 'gale', super: 'cyclone',
    moves: { special: 'Gale Puff', super: 'Mega Cyclone' },
  },
  {
    id: 'pengsicle', name: 'Pengsicle', type: 'water', species: 'Frost Penguin',
    blurb: 'Belly-slides everywhere. Its sneezes come out as snowflakes.',
    colors: { body: 0x3d4f96, belly: 0xffffff, accent: 0xffa42b, dark: 0x1b2552, eye: '#10183a', iris: '#56d6ff' },
    body: { w: 0.56, h: 0.66, headR: 0.47, legLen: 0.12, armLen: 0.24, chubby: 1.05 },
    ears: 'none', tail: 'stub', extra: 'penguin', voice: 1.3,
    stats: { hp: 1020, speed: 6.2, power: 1.0, weight: 1.05 },
    special: 'iceslide', super: 'blizzard',
    moves: { special: 'Belly Slide', super: 'Blizzard Bash' },
  },
  {
    id: 'emberfly', name: 'Emberfly', type: 'fire', species: 'Lantern Firefly',
    blurb: 'Its glowing tail doubles as a night-light. Hates being called a bug.',
    colors: { body: 0x6a58b8, belly: 0xffe9a8, accent: 0xffc93a, dark: 0x2e2250, eye: '#20103a', iris: '#ffb020' },
    body: { w: 0.5, h: 0.56, headR: 0.5, legLen: 0.14, armLen: 0.19, chubby: 0.95 },
    ears: 'antennae', tail: 'lantern', extra: 'wings', voice: 1.7,
    stats: { hp: 900, speed: 7.0, power: 1.05, weight: 0.7 },
    special: 'wisps', super: 'supernova',
    moves: { special: 'Wisp Swarm', super: 'Supernova' },
  },
];

// Alternate "shiny" palettes, earned by clearing the cup a critter appears in.
export const SHINY = {
  cindermunch: { body: 0x7ab8ff, belly: 0xeaf4ff, accent: 0x2f6bff, dark: 0x1e3570, iris: '#3aa0ff', flame: 0x3a7bff, flameIn: 0xb8f0ff },
  bubbalotl:   { body: 0xffd166, belly: 0xfff4d0, accent: 0xff9f1c, dark: 0x8a5a10, iris: '#ff6a00' },
  clovebun:    { body: 0xffd6e8, belly: 0xffffff, accent: 0xff7eb6, dark: 0x9a3466, iris: '#ff4f9a' },
  voltferret:  { body: 0x4a4366, belly: 0x7b7299, accent: 0xffe14d, dark: 0x1a1626, iris: '#ffe14d' },
  rolladillo:  { body: 0x8cc7bf, belly: 0xe0f4ef, accent: 0x3c6e6a, dark: 0x1f3d3a, iris: '#2fd3c0' },
  hootsy:      { body: 0xf4f6ff, belly: 0xffffff, accent: 0xc9b6ff, dark: 0x5a4a8a, iris: '#7a4dff' },
  pengsicle:   { body: 0x2a2a34, belly: 0xfff4e0, accent: 0xff5a6a, dark: 0x101016, iris: '#ff7aa8' },
  emberfly:    { body: 0x2f8a6a, belly: 0xdcffe6, accent: 0x7dffb0, dark: 0x113a2c, iris: '#3affa0' },
};

// a def wearing a skin ('base' or 'shiny'); keeps the id so progress is shared
export function skinned(def, skin) {
  if (!skin || skin === 'base' || !SHINY[def.id]) return def;
  return { ...def, skin, colors: { ...def.colors, ...SHINY[def.id] } };
}

export const STARTERS = ['cindermunch', 'bubbalotl', 'clovebun'];

// Light-hearted rival trainers. Each cup is a ladder of matches.
export const CUPS = [
  {
    id: 'sprout', arena: 'meadow', name: 'Sprout Cup', color: '#4fd35a', desc: 'A friendly warm-up for brand-new trainers.', diff: [0.15, 0.3],
    matches: [
      { name: 'Pip', style: 'balanced', title: 'Rookie', critter: 'bubbalotl', level: 1, taunt: "My Bubbalotl's never lost! ...today." },
      { name: 'Marigold', style: 'turtle', title: 'Gardener', critter: 'clovebun', level: 2, taunt: 'Prepare to be weeded out!' },
      { name: 'Sparky Dee', style: 'trickster', title: 'Electrician', critter: 'voltferret', level: 3, taunt: "Shocking, isn't it?" },
    ],
  },
  {
    id: 'thunder', arena: 'beach', name: 'Thunder Cup', color: '#ffd52e', desc: 'The rivals get serious. Mostly.', diff: [0.4, 0.6], requires: 'sprout',
    matches: [
      { name: 'Chef Bao', style: 'rushdown', title: 'Grill Master', critter: 'cindermunch', level: 4, taunt: "You're toast. Lightly buttered." },
      { name: 'Gran Pebbles', style: 'turtle', title: 'Retired Champ', critter: 'rolladillo', level: 5, taunt: 'Back in my day we rolled uphill. Both ways.' },
      { name: 'Wren', style: 'zoner', title: 'Kite Flyer', critter: 'hootsy', level: 6, taunt: "Hootsy, let's blow them away!" },
      { name: 'Captain Splash', style: 'balanced', title: 'Lifeguard', critter: 'pengsicle', level: 7, taunt: 'No running by the pool. Only sliding.' },
    ],
  },
  {
    id: 'champion', arena: 'volcano', name: 'Champion Cup', color: '#ff5a8a', desc: 'Only the bonkiest survive.', diff: [0.65, 0.9], requires: 'thunder',
    matches: [
      { name: 'Lux', style: 'zoner', title: 'Night Ranger', critter: 'emberfly', level: 8, taunt: 'Lights out. Well... lights ON, actually.' },
      { name: 'Volt Twins', style: 'rushdown', title: 'Double Trouble', critter: 'voltferret', level: 9, taunt: 'We finish each other\'s... ZAPS!' },
      { name: 'Big Boulder', style: 'turtle', title: 'Gym Owner', critter: 'rolladillo', level: 10, taunt: 'Leg day? Every day is roll day.' },
      { name: 'Aurora', style: 'trickster', title: 'Reigning Champion', critter: 'hootsy', skin: 'shiny', level: 12, taunt: "You came this far. Cute. Let's see how far you fly.", boss: true },
    ],
  },
];

// Combo chain for every critter (scaled by stats.power). t = seconds.
export const COMBO = [
  { dmg: 50, startup: 0.08, active: 0.08, recover: 0.16, range: 1.25, arc: 1.4, kb: 2.2, lift: 0, stun: 0.28, lunge: 3.5 },
  { dmg: 60, startup: 0.08, active: 0.08, recover: 0.18, range: 1.3, arc: 1.5, kb: 2.6, lift: 0, stun: 0.3, lunge: 3.8 },
  { dmg: 95, startup: 0.14, active: 0.1, recover: 0.34, range: 1.45, arc: 1.7, kb: 9.5, lift: 6.5, stun: 0.6, lunge: 5.5, launch: true },
];

// Achievements shown in the Critterdex. test() reads the save.
export const BADGES = [
  { id: 'first', icon: '🥇', name: 'First Bonk', desc: 'Win your first battle.', test: (s) => s.stats.wins >= 1 },
  { id: 'ten', icon: '🔟', name: 'Seasoned', desc: 'Win 10 battles.', test: (s) => s.stats.wins >= 10 },
  { id: 'combo', icon: '💥', name: 'Combo Star', desc: 'Land a 10-hit combo.', test: (s) => (s.stats.bestCombo || 0) >= 10 },
  { id: 'perfect', icon: '✨', name: 'Untouchable', desc: 'Win a round without taking damage.', test: (s) => (s.stats.perfects || 0) >= 1 },
  { id: 'super', icon: '🌟', name: 'Show-off', desc: 'Unleash 10 supers.', test: (s) => (s.stats.supers || 0) >= 10 },
  { id: 'sprout', icon: '🌱', name: 'Sprout Champ', desc: 'Clear the Sprout Cup.', test: (s) => !!s.cups.sprout },
  { id: 'thunder', icon: '⚡', name: 'Thunder Champ', desc: 'Clear the Thunder Cup.', test: (s) => !!s.cups.thunder },
  { id: 'champion', icon: '👑', name: 'Grand Champion', desc: 'Clear the Champion Cup.', test: (s) => !!s.cups.champion },
  { id: 'team', icon: '🐾', name: 'Full Team', desc: 'Recruit every critter.', test: (s) => s.unlocked.length >= CRITTERS.length },
  { id: 'lv10', icon: '📈', name: 'Best Buds', desc: 'Raise a critter to Lv 10.', test: (s) => Object.values(s.critters).some((c) => c.level >= 10) },
  { id: 'streak5', icon: '🔥', name: 'Survivor', desc: 'Win 5 in a row in Survival.', test: (s) => (s.stats.bestStreak || 0) >= 5 },
  { id: 'daily', icon: '📅', name: 'Daily Doer', desc: 'Clear a Daily Challenge.', test: (s) => Object.keys(s.daily || {}).length >= 1 },
  { id: 'shiny', icon: '💎', name: 'Shiny Hunter', desc: 'Unlock every shiny palette.', test: (s) => (s.shinies || []).length >= CRITTERS.length },
];

// Match modifiers used by the Daily Challenge and deep Survival runs.
export const MODS = {
  bighead:      { name: 'Big Heads', icon: '🎈', desc: 'Everyone\'s head is comically huge.' },
  turbo:        { name: 'Turbo', icon: '⏩', desc: 'The whole fight runs 25% faster.' },
  lowgrav:      { name: 'Moon Jump', icon: '🌙', desc: 'Low gravity: launches fly sky-high.' },
  itemrain:     { name: 'Item Rain', icon: '🍓', desc: 'Power-ups drop constantly.' },
  supercharged: { name: 'Supercharged', icon: '⚡', desc: 'Super meters fill twice as fast.' },
};

// deterministic daily pick from the UTC date
export function dailyChallenge(date = new Date()) {
  const key = date.toISOString().slice(0, 10);
  let h = 2166136261;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const mods = Object.keys(MODS);
  return {
    key,
    foe: CRITTERS[Math.floor(rnd() * CRITTERS.length)].id,
    arena: ['meadow', 'beach', 'volcano'][Math.floor(rnd() * 3)],
    mod: mods[Math.floor(rnd() * mods.length)],
    shiny: rnd() < 0.3,
  };
}
