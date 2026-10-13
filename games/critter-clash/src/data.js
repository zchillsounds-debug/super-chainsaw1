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
    colors: { body: 0x7a62d8, belly: 0xffe9a8, accent: 0xffc93a, dark: 0x2e2250, eye: '#20103a', iris: '#ffb020' },
    body: { w: 0.5, h: 0.56, headR: 0.5, legLen: 0.14, armLen: 0.19, chubby: 0.95 },
    ears: 'antennae', tail: 'lantern', extra: 'wings', voice: 1.7,
    stats: { hp: 900, speed: 7.0, power: 1.05, weight: 0.7 },
    special: 'wisps', super: 'supernova',
    moves: { special: 'Wisp Swarm', super: 'Supernova' },
  },
  {
    id: 'pricklepuff', name: 'Pricklepuff', type: 'leaf', species: 'Thicket Hedgehog',
    blurb: 'Its spines are soft leaves until it gets grumpy. It gets grumpy a lot.',
    colors: { body: 0xd9a46c, belly: 0xfff0d8, accent: 0x4fc45a, dark: 0x2f7a3a, eye: '#2a160c', iris: '#3fae4a' },
    body: { w: 0.62, h: 0.52, headR: 0.5, legLen: 0.13, armLen: 0.18, chubby: 1.12 },
    ears: 'round', tail: 'puff', extra: 'spines', voice: 1.3,
    stats: { hp: 1040, speed: 6.3, power: 1.05, weight: 0.95 },
    special: 'seedspray', super: 'bramble',
    moves: { special: 'Seed Spray', super: 'Bramble Rush' },
  },
  {
    id: 'woolt', name: 'Woolt', type: 'spark', species: 'Static Sheep',
    blurb: 'One good shake and its wool crackles for hours. Nobody wants to hug it. It wants hugs.',
    colors: { body: 0x7d76b0, belly: 0xfff6d6, accent: 0xffd23a, dark: 0x2e2a48, eye: '#1a1430', iris: '#ffc21a' },
    body: { w: 0.66, h: 0.56, headR: 0.5, legLen: 0.15, armLen: 0.19, chubby: 1.18 },
    ears: 'floppy', tail: 'puff', extra: 'wool', voice: 1.15,
    stats: { hp: 1040, speed: 5.7, power: 1.0, weight: 1.15 },
    special: 'fuzzball', super: 'megafluff',
    moves: { special: 'Fuzz Ball', super: 'Mega Fluff Slam' },
  },
  {
    id: 'pebblepup', name: 'Pebblepup', type: 'stone', species: 'Pebble Pug',
    blurb: 'Buries its favourite rocks and forgets where. Crystals grow on its back when it naps in the sun.',
    colors: { body: 0xb3a08c, belly: 0xf2e8d8, accent: 0x8fd8ff, dark: 0x4a3c34, eye: '#20160f', iris: '#8a5a32' },
    body: { w: 0.6, h: 0.5, headR: 0.5, legLen: 0.16, armLen: 0.17, chubby: 1.12 },
    ears: 'pug', tail: 'stub', extra: 'crystals', voice: 0.95,
    stats: { hp: 1060, speed: 5.5, power: 1.03, weight: 1.25 },
    special: 'rocktoss', super: 'avalanche',
    moves: { special: 'Rock Toss', super: 'Avalanche' },
  },
  {
    id: 'whirlwhisk', name: 'Whirlwhisk', type: 'gust', species: 'Glider Squirrel',
    blurb: 'Stores acorns in its cheeks and wind in its tail. Has never once landed where it meant to.',
    colors: { body: 0xb8a4e0, belly: 0xfff8ee, accent: 0xe9defc, dark: 0x4a3a78, eye: '#1a1238', iris: '#38b4ff' },
    body: { w: 0.54, h: 0.54, headR: 0.48, legLen: 0.15, armLen: 0.2, chubby: 1.0 },
    ears: 'tufts', tail: 'bushy', extra: 'glider', voice: 1.3,
    stats: { hp: 1010, speed: 7.4, power: 1.08, weight: 0.8 },
    special: 'swoop', super: 'jetstream',
    moves: { special: 'Sky Swoop', super: 'Jet Stream' },
  },
  {
    id: 'lilypop', name: 'Lilypop', type: 'leaf', species: 'Lily Frog',
    blurb: 'Naps on lily pads and catches flies without opening its eyes. Its tongue is faster than its manners.',
    colors: { body: 0x86d95a, belly: 0xfff3c4, accent: 0xff8ac0, dark: 0x2f6a3a, eye: '#14240e', iris: '#ffb020' },
    body: { w: 0.66, h: 0.5, headR: 0.5, legLen: 0.14, armLen: 0.18, chubby: 1.15 },
    ears: 'none', tail: 'none', extra: 'frog', voice: 1.05,
    stats: { hp: 1060, speed: 6.4, power: 1.02, weight: 1.0 },
    special: 'tongue', super: 'lilysplash',
    moves: { special: 'Tongue Lash', super: 'Lily Splash' },
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
  pricklepuff: { body: 0xf2e6ff, belly: 0xffffff, accent: 0xff7eb6, dark: 0xc23a7a, iris: '#ff4f9a' },
  woolt:       { body: 0x3a3a52, belly: 0xbfe8ff, accent: 0x6af0ff, dark: 0x101020, iris: '#3ae0ff' },
  pebblepup:   { body: 0x6a6a88, belly: 0xe8e4ff, accent: 0xff8ad8, dark: 0x262438, iris: '#ff6ad0' },
  whirlwhisk:  { body: 0xffb38a, belly: 0xfff4e4, accent: 0xffe2c8, dark: 0x8a3a2a, iris: '#3ac07a' },
  lilypop:     { body: 0xffd84a, belly: 0xfffbe8, accent: 0x6ad0ff, dark: 0x8a5a10, iris: '#3a7bff' },
  emberfly:    { body: 0x2f8a6a, belly: 0xdcffe6, accent: 0x7dffb0, dark: 0x113a2c, iris: '#3affa0' },
};

// a def wearing a skin ('base' or 'shiny'); keeps the id so progress is shared
export function skinned(def, skin) {
  if (!skin || skin === 'base' || !SHINY[def.id]) return def;
  return { ...def, skin, colors: { ...def.colors, ...SHINY[def.id] } };
}

// level-up gear shown on the model: scarf at Lv 5, star pin at Lv 10, crown at Lv 15
export const gearFor = (lv = 1) => (lv >= 15 ? 3 : lv >= 10 ? 2 : lv >= 5 ? 1 : 0);
export const GEAR = [
  { lv: 5, name: 'Scarf', icon: '🧣' },
  { lv: 10, name: 'Star Pin', icon: '⭐' },
  { lv: 15, name: 'Crown', icon: '👑' },
];
export const withGear = (def, lv) => { const g = gearFor(lv); return g ? { ...def, gear: g } : def; };

export const STARTERS = ['cindermunch', 'bubbalotl', 'clovebun'];

// Light-hearted rival trainers. Each cup is a ladder of matches.
export const CUPS = [
  {
    id: 'sprout', arena: 'meadow', name: 'Sprout Cup', color: '#4fd35a', desc: 'A friendly warm-up for brand-new trainers.', diff: [0.15, 0.3],
    intro: ["Welcome to the Sprout Cup, {name}! Three friendly rivals, one shiny trophy.", "Watch your rival's moves, guard the big hits, and have fun out there!"],
    outro: ["Look at you, a Sprout Cup champion! The whole meadow is cheering.", "The Thunder Cup on Seashell Bay is open now. Pack some sunscreen!"],
    matches: [
      { name: 'Pip', style: 'balanced', title: 'Rookie', critter: 'bubbalotl', level: 1, taunt: "My Bubbalotl's never lost! ...today.", beat: "Wow... you're really good! I'm gonna train SO hard.", gloat: "Ha! I won? I WON! Mom's never gonna believe this." },
      { name: 'Marigold', style: 'turtle', title: 'Gardener', critter: 'clovebun', level: 2, taunt: 'Prepare to be weeded out!', beat: "Well, I've been pruned. Fair and square.", gloat: "Back to the compost heap with you, sweetie." },
      { name: 'Sparky Dee', style: 'trickster', title: 'Electrician', critter: 'voltferret', level: 3, taunt: "Shocking, isn't it?", beat: "I've been grounded. Literally.", gloat: "Sorry, the power's out on your side." },
    ],
  },
  {
    id: 'thunder', arena: 'beach', name: 'Thunder Cup', color: '#ffd52e', desc: 'The rivals get serious. Mostly.', diff: [0.4, 0.6], requires: 'sprout',
    intro: ["Seashell Bay! Mind the coconuts, {name}. The palms drop them when the crowd gets loud.", "These trainers have real experience. Gran Pebbles once won this cup three years running!"],
    outro: ["Thunder Cup champion! Even Captain Splash wants your autograph.", "Only one cup left: the Champion Cup in Magma Crater. Aurora is waiting..."],
    matches: [
      { name: 'Paddy', style: 'rushdown', title: 'Pond Ranger', critter: 'lilypop', level: 4, taunt: "Lilypop's tongue is faster than your eyes. Blink and you're lunch!", beat: "Ribbit... I mean, rats. That was a great match!", gloat: "Hop along now, {name}. The pond's closed." },
      { name: 'Gran Pebbles', style: 'turtle', title: 'Retired Champ', critter: 'pebblepup', level: 5, taunt: 'Back in my day we threw rocks uphill. Both ways.', beat: "Oh, you remind me of me. Fifty years ago. Off you go!", gloat: "Never underestimate a grandma with a rock." },
      { name: 'Wren', style: 'zoner', title: 'Kite Flyer', critter: 'whirlwhisk', level: 6, taunt: "Whirlwhisk, let's blow them away!", beat: "Huh. The wind changed. Nice flying!", gloat: "Caught the breeze. You just caught the floor." },
      { name: 'Captain Splash', style: 'balanced', title: 'Lifeguard', critter: 'pengsicle', level: 7, taunt: 'No running by the pool. Only sliding.', beat: "Okay, OKAY, I'm blowing the whistle. You win!", gloat: "Rule one of the pool: don't splash the Captain." },
    ],
  },
  {
    id: 'champion', arena: 'volcano', name: 'Champion Cup', color: '#ff5a8a', desc: 'Only the bonkiest survive.', diff: [0.65, 0.9], requires: 'thunder',
    intro: ["Magma Crater. The heat is real, and so are the lava geysers. Stay light on your feet!", "At the top of this ladder is Aurora, the reigning champion. Nobody has beaten her in years."],
    outro: ["You did it, {name}! You beat Aurora! You're the new Champion!", "Word travels fast. I hear there's a secret league on the rooftops, and Aurora wants a rematch on the ice..."],
    matches: [
      { name: 'Lux', style: 'zoner', title: 'Night Ranger', critter: 'emberfly', level: 8, taunt: 'Lights out. Well... lights ON, actually.', beat: "You outshone me. That's... actually kind of beautiful.", gloat: "Lights out, rookie." },
      { name: 'Thistle', style: 'zoner', title: 'Hedge Maze Keeper', critter: 'pricklepuff', level: 9, taunt: 'Careful. Everything in my maze is pointy.', beat: "You found the way out. Nobody finds the way out.", gloat: "Lost in the maze again? Take a left. Then another left." },
      { name: 'Stormy', style: 'rushdown', title: 'Weather Girl', critter: 'woolt', level: 10, taunt: "Today's forecast: a 100% chance of getting zapped!", beat: "Looks like the storm has passed. Clear skies for you!", gloat: "And that's the weather! Back to you in the studio." },
      { name: 'Big Boulder', style: 'turtle', title: 'Gym Owner', critter: 'rolladillo', level: 11, taunt: 'Leg day? Every day is roll day.', beat: "You skipped leg day and STILL beat me? Respect.", gloat: "That's what roll day gets you!" },
      { name: 'Aurora', style: 'trickster', title: 'Reigning Champion', critter: 'hootsy', skin: 'shiny', level: 12, taunt: "You came this far. Cute. Let's see how far you fly.", boss: true, beat: "So this is what losing feels like. ...I like you.", gloat: "Cute. Come back when you've grown wings." },
    ],
  },
  {
    id: 'midnight', arena: 'neon', name: 'Midnight Cup', color: '#c05aff', desc: 'A secret rooftop league. Bring sunglasses.', diff: [0.7, 0.9], requires: 'champion',
    intro: ["Psst, {name}. This is the Midnight Cup. Very exclusive, very shiny, very loud.", "The floor tiles here zap anyone who stands still. Keep moving!"],
    outro: ["Madame Vee bowed to you! That has never happened before.", "You're a legend of the night now. Sunglasses optional."],
    matches: [
      { name: 'DJ Tumble', style: 'rushdown', title: 'Beat Dropper', critter: 'woolt', level: 13, taunt: 'Drop the bass? I drop RIVALS.', beat: "You dropped ME. That's a first. Sick set, honestly.", gloat: "Mic drop. Rival drop. Same thing." },
      { name: 'Marigold', style: 'zoner', title: 'Night Gardener', critter: 'pricklepuff', skin: 'shiny', level: 14, taunt: 'My garden grows best by moonlight.', beat: "Even moonflowers wilt sometimes. Lovely match, dear.", gloat: "Goodnight, sweetie. Sleep in the flowerbed." },
      { name: 'Neko', style: 'trickster', title: 'Rooftop Runner', critter: 'voltferret', level: 15, mods: ['turbo'], taunt: "Catch me if you- oh, you can't.", beat: "You... caught me?! Nobody catches me!", gloat: "Too slow! See you on the next roof." },
      { name: 'Madame Vee', style: 'balanced', title: 'Club Owner', critter: 'emberfly', skin: 'shiny', level: 16, boss: true, bossTitle: 'BOSS', taunt: 'Welcome to my rooftop, darling. Nobody leaves unbonked.', beat: "Darling, you can stay. You've earned a VIP pass.", gloat: "The door's that way, darling. Mind the step." },
    ],
  },
  {
    id: 'legend', arena: 'frost', name: 'Legend Cup', color: '#7ad8ff', desc: 'Old rivals return at full power, with a twist.', diff: [0.85, 1], requires: 'champion',
    intro: ["The Legend Cup. Every rival you beat has trained for this moment, with a twist or two.", "Ice is slippery and icicles are sharp. Show them how far you've come, {name}!"],
    outro: ["{name}... you're a true Living Legend. I'm so proud I could cry. I am crying.", "Your critters will be telling this story at Critter Camp for years!"],
    matches: [
      { name: 'Pip', style: 'rushdown', title: 'All Grown Up', critter: 'bubbalotl', level: 14, mods: ['turbo'], taunt: 'I trained every single day since you beat me. Every. Day.', beat: "Still not enough... but next time. Next time for sure!", gloat: "I told you I trained every day!" },
      { name: 'Yuki', style: 'trickster', title: 'Snow Ranger', critter: 'pengsicle', skin: 'shiny', level: 15, mods: ['lowgrav'], taunt: 'Brr-ace yourself.', beat: "Brr... you're colder than the mountain.", gloat: "Snow way you were winning that one." },
      { name: 'Paddy', style: 'zoner', title: 'Pond Champion', critter: 'lilypop', skin: 'shiny', level: 16, mods: ['supercharged'], taunt: "Lilypop and I trained at the big lake. The REALLY big lake.", beat: "Ribbit. Okay. You're still the champ of the pond.", gloat: "Told you. Really big lake." },
      { name: 'Big Boulder', style: 'turtle', title: 'Comeback Kid', critter: 'rolladillo', skin: 'shiny', level: 17, mods: ['bighead'], taunt: "I've been doing roll day AND leg day.", beat: "Rolled right over me. Again! See you next season.", gloat: "The Comeback Kid has come back!" },
      { name: 'Aurora', style: 'trickster', title: 'Living Legend', critter: 'hootsy', skin: 'shiny', level: 19, mods: ['itemrain'], boss: true, taunt: 'The real final round starts now.', beat: "You really are the champion. The ice is yours.", gloat: "Legends don't fall that easily. Try again." },
    ],
  },
  {
    id: 'sky', arena: 'sky', name: 'Sky Cup', color: '#ff9ac8', desc: 'A garden stadium floating above the clouds.', diff: [0.7, 0.95], requires: 'champion',
    intro: ["Look down, {name}. No, actually, don't. Cloudtop Gardens floats a mile above the ground!", "Watch for blue rings on the floor: updrafts will toss you sky-high. And there's a special guest at the end..."],
    outro: ["Ha! You beat me fair and square, {name}. Turns out the professor still has a lot to learn.", "From your very first critter to the top of the sky. I couldn't be prouder. Now, who wants a picnic?"],
    matches: [
      { name: 'Sora', style: 'zoner', title: 'Cloud Gardener', critter: 'clovebun', skin: 'shiny', level: 14, taunt: 'Every cloud has a silver lining. Yours is a loss.', beat: "Oh! You've got a green thumb for battling.", gloat: "Weeded. Out. Of. The. Sky." },
      { name: 'Captain Puff', style: 'trickster', title: 'Balloon Pilot', critter: 'whirlwhisk', level: 15, mods: ['lowgrav'], taunt: 'Hold onto your hat. Up here, everything floats!', beat: "Blimey. You've let all the air out of me.", gloat: "Up, up and away... with the win!" },
      { name: 'Gran Pebbles', style: 'turtle', title: 'Mountain Climber', critter: 'pebblepup', skin: 'shiny', level: 16, taunt: 'Climbed all the way up here with Pebblepup on my back. Your turn to be carried.', beat: "Well, I'll be. Time to take the stairs down.", gloat: "Grandma's still got it!" },
      { name: 'Professor Pecan', style: 'balanced', title: 'Your Mentor', critter: 'pricklepuff', skin: 'shiny', level: 18, boss: true, bossTitle: 'FINAL TEST', taunt: "Surprise! Did you think I only hand out critters? Let's see what you've learned, {name}!", beat: "Ha! The student has become the master!", gloat: "Lesson one: never underestimate your professor!" },
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
  { id: 'midnight', icon: '🌙', name: 'Night Owl', desc: 'Clear the Midnight Cup.', test: (s) => !!s.cups.midnight },
  { id: 'legend', icon: '🌟', name: 'Living Legend', desc: 'Clear the Legend Cup.', test: (s) => !!s.cups.legend },
  { id: 'sky', icon: '☁️', name: 'Head in the Clouds', desc: 'Clear the Sky Cup.', test: (s) => !!s.cups.sky },
  { id: 'team', icon: '🐾', name: 'Full Team', desc: 'Recruit every critter.', test: (s) => s.unlocked.length >= CRITTERS.length },
  { id: 'lv10', icon: '📈', name: 'Best Buds', desc: 'Raise a critter to Lv 10.', test: (s) => Object.values(s.critters).some((c) => c.level >= 10) },
  { id: 'streak5', icon: '🔥', name: 'Survivor', desc: 'Win 5 in a row in Survival.', test: (s) => (s.stats.bestStreak || 0) >= 5 },
  { id: 'daily', icon: '📅', name: 'Daily Doer', desc: 'Clear a Daily Challenge.', test: (s) => Object.keys(s.daily || {}).length >= 1 },
  { id: 'friend', icon: '💗', name: 'Best Friends', desc: 'Fill a critter\'s friendship hearts in Camp.', test: (s) => Object.values(s.critters).some((c) => (c.pets || 0) >= 20) },
  { id: 'snack', icon: '🍓', name: 'Snack Time', desc: 'Feed 10 berries in Camp.', test: (s) => (s.stats.fed || 0) >= 10 },
  { id: 'hazard', icon: '🌋', name: 'Hot Feet', desc: 'Win a battle without being hit by an arena hazard.', test: (s) => (s.stats.hazardClean || 0) >= 1 },
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
    arena: ['meadow', 'beach', 'volcano', 'frost', 'neon', 'sky'][Math.floor(rnd() * 6)],
    mod: mods[Math.floor(rnd() * mods.length)],
    shiny: rnd() < 0.3,
  };
}

// Move-list blurbs (training mode and the Critterdex)
export const MOVE_DESC = {
  comet: 'Rockets forward headfirst. Plows through anyone in the way.',
  bubble: 'Blows a big bubble that drifts forward and pops on contact.',
  leafrang: 'Throws a clover that curves out and back. It can hit twice!',
  zipzap: 'Zips through the rival in a flash. Leaves them twitchy and slow.',
  rollout: 'Curls into a ball and rolls in. Big knockback.',
  gale: 'A gust that drags the rival in with several small hits.',
  iceslide: 'Flops onto its belly and toboggans at the rival. Freezes on contact.',
  wisps: 'Releases little flames that home in on the rival.',
  meteor: 'Leaps into the sky and crashes down as a flaming meteor.',
  tsunami: 'Summons a towering wave that sweeps the arena.',
  bloom: 'A flower bud tracks the rival, then bursts into bloom beneath them.',
  thunder: 'Calls down a storm of lightning bolts.',
  quake: 'Slams the ground. Shockwaves ripple out in rings.',
  cyclone: 'Spins up a tornado that lifts the rival off their feet.',
  blizzard: 'A snow cloud chases the rival, pelting it with ice, then drops one huge icicle.',
  supernova: 'Glows brighter and brighter until... BOOM.',
  seedspray: 'Puffs out a fan of five spiky seeds. Deadly up close.',
  bramble: 'Thorny vines burst out of the ground in a line, chasing the rival down.',
  fuzzball: 'Rolls a crackling ball of static wool along the ground. Leaves the rival twitchy.',
  megafluff: 'Puffs up to giant size and body-slams the rival three times.',
  rocktoss: 'Lobs a boulder in an arc. It thuds down where the rival is standing.',
  swoop: 'Leaps up and glides down onto the rival, tail first.',
  jetstream: 'Puffs its cheeks and blows a long gust that shoves the rival back, hit after hit.',
  tongue: 'Lashes out its long tongue and reels the rival in, ready for a combo.',
  lilysplash: 'Leaps sky-high and belly-flops down. A ring of lily pads and water bursts out.',
  avalanche: 'Howls at the sky and a rockslide rains down on the rival, ending with one giant boulder.',
};
