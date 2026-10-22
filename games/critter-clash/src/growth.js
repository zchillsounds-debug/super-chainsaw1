// Growth: critters change form as they level up (stage 2 at Lv 7, stage 3 at Lv 14).
// Each critter always grows along its own fixed path. Hand-built forms get new proportions, colours
// and parts (built here onto a Critter); every other critter gets a bigger, tougher generic form.
import * as THREE from 'three';
import { toon, inked, canvasTex } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const GROW_LV = [7, 14];
export const stageFor = (lv = 1) => (lv >= GROW_LV[1] ? 3 : lv >= GROW_LV[0] ? 2 : 1);
// special/super damage and cooldown per stage
export const MOVE_POW = [1, 1.12, 1.25];
export const CD_MULT = [1, 0.92, 0.84];
const HP_MULT = [1, 1.06, 1.12];

// proportions for forms that scale their base body: taller, longer-limbed, relatively smaller head
const GROW2 = { w: 1.12, h: 1.26, headR: 0.97, legLen: 1.35, armLen: 1.3, chubby: 1.0, limb: 1.2 };
const GROW3 = { w: 1.25, h: 1.55, headR: 0.93, legLen: 1.6, armLen: 1.55, chubby: 1.03, limb: 1.45 };

// path: what the critter grows into (shown in the Critterdex)
export const FORMS = {
  cindermunch: {
    path: 'Brute',
    forms: [
      {
        name: 'Blazemunch', species: 'Furnace Hamster', size: 1.1, tailScale: 1.35, voice: 1.05,
        blurb: 'Its cheek pouches turned into furnaces. A crest of flame flares up whenever it gets fired up.',
        colors: { body: 0xec7c32, belly: 0xffe6c4, accent: 0xff3c14, dark: 0x5e2410, horn: 0xffe2b0 },
        body: { w: 0.7, h: 0.7, headR: 0.48, legLen: 0.2, armLen: 0.26, chubby: 1.18, limb: 1.3 },
        parts: { flamecrest: 0.8, horns: 0.55, brows: 0.6 },
        moves: { special: 'Blaze Bonk', super: 'Meteor Feast' },
      },
      {
        name: 'Magmuncher', species: 'Volcano Hamster', size: 1.28, tailScale: 1.7, voice: 0.8,
        blurb: 'A walking volcano wearing a coat of cooled lava. One stomp and the whole stadium bounces.',
        colors: { body: 0x6a3f36, belly: 0xffcf8a, accent: 0xff5a1e, dark: 0x2a1410, horn: 0xfff0d0, rock: 0x3a2a2a, lava: 0xff7a1e },
        body: { w: 0.9, h: 0.86, headR: 0.46, legLen: 0.22, armLen: 0.34, chubby: 1.22, limb: 1.8 },
        parts: { flamecrest: 1.15, horns: 0.95, lavaplates: 1, brows: 1, tusks: 0.8 },
        moves: { special: 'Magma Ram', super: 'Volcano Munch' },
      },
    ],
  },
  bubbalotl: {
    path: 'Mystic',
    forms: [
      {
        name: 'Tidalotl', species: 'Tide Axolotl', size: 1.1, tailScale: 1.4, voice: 0.95, earScale: 1.2,
        blurb: 'Grows a sail of fin along its back and surfs on its own bubbles.',
        colors: { body: 0xf47ab4, belly: 0xffe4f0, accent: 0x3ac0ff, dark: 0x7a1f52, fin: 0x3ac0ff },
        body: { w: 0.58, h: 0.76, headR: 0.5, legLen: 0.2, armLen: 0.24, chubby: 1.0, limb: 1.2 },
        parts: { backfin: 0.8, whiskers: 0.7 },
        moves: { special: 'Bubble Barrage', super: 'Tidal Crush' },
      },
      {
        name: 'Leviatotl', species: 'Deep Sea Axolotl', size: 1.26, tailScale: 1.6, voice: 0.75, earScale: 1.45,
        blurb: 'A gentle giant of the deep. The pearl on its brow glows when it calls the tide.',
        colors: { body: 0xb070e0, belly: 0xf4e6ff, accent: 0x52e2ff, dark: 0x3e1a6a, fin: 0x52e2ff, pearl: 0xe8fbff, horn: 0x8af0ff },
        body: { w: 0.66, h: 1.0, headR: 0.44, legLen: 0.24, armLen: 0.3, chubby: 0.98, limb: 1.4 },
        parts: { backfin: 1.25, whiskers: 1.15, pearl: 1, horns: 0.75 },
        moves: { special: 'Abyss Bubble', super: 'Leviathan Wave' },
      },
    ],
  },
  clovebun: {
    path: 'Swift',
    forms: [
      {
        name: 'Bramblehare', species: 'Bramble Hare', size: 1.1, voice: 1.25,
        blurb: 'Long legs, a leafy mane and a temper like a thorn bush. It can outrun its own clover-rangs.',
        colors: { body: 0xf0ecd8, belly: 0xffffff, accent: 0x46c95a, dark: 0x2a6a34, antler: 0x8a6a48 },
        body: { w: 0.5, h: 0.72, headR: 0.46, legLen: 0.3, armLen: 0.23, chubby: 0.9, limb: 1.1 },
        parts: { leafmane: 0.9, antlers: 0.5, brows: 0.35 }, // budding antlers hint at the next form
        moves: { special: 'Thorn-rang', super: 'Bramble Bloom' },
      },
      {
        name: 'Jackalorn', species: 'Grove Jackalope', size: 1.24, voice: 1.0, portraitZoom: 1.18,
        blurb: 'Blossoming antlers and legs like springs. Legends say spring arrives wherever it lands.',
        colors: { body: 0xe8e0c6, belly: 0xffffff, accent: 0x3ec456, dark: 0x2a6030, antler: 0x8a6440, blossom: 0xff9ac8 },
        body: { w: 0.54, h: 0.84, headR: 0.44, legLen: 0.38, armLen: 0.27, chubby: 0.9, limb: 1.25 },
        parts: { leafmane: 1.1, antlers: 1.3 },
        moves: { special: 'Antler-rang', super: 'Grove Bloom' },
      },
    ],
  },
  voltferret: {
    path: 'Storm',
    forms: [
      {
        name: 'Voltweasel', species: 'Static Weasel', size: 1.1, tailScale: 1.15, voice: 1.4,
        blurb: 'Its fur stands on end in a crackling mane. It can run up walls when it is charged enough.',
        colors: { body: 0xffd43a, belly: 0xfff4c8, accent: 0x2e2a48, dark: 0x6a5018, bolt: 0x7af0ff },
        body: { w: 0.5, h: 0.8, headR: 0.44, legLen: 0.24, armLen: 0.26, chubby: 0.85, limb: 1.1 },
        parts: { boltmane: 0.7, brows: 0.45 },
        moves: { special: 'Zip Zap Dash', super: 'Thunder Tackle' },
      },
      {
        name: 'Stormstoat', species: 'Thunderhead Stoat', size: 1.25, tailScale: 1.3, voice: 1.1,
        blurb: 'Wears a little thundercloud like a crown. When it sprints, you hear the boom a second later.',
        colors: { body: 0xf4c02a, belly: 0xfff0bc, accent: 0x262440, dark: 0x5a4210, bolt: 0x7af0ff, horn: 0x9af4ff, cloud: 0x6a6a86 },
        body: { w: 0.54, h: 0.94, headR: 0.42, legLen: 0.3, armLen: 0.3, chubby: 0.86, limb: 1.25 },
        parts: { boltmane: 1.05, horns: 0.7, brows: 0.8, cloudcrest: 1 },
        moves: { special: 'Storm Dash', super: 'Thunderhead Tumble' },
      },
    ],
  },
  hootsy: {
    path: 'Sky',
    forms: [
      {
        name: 'Hootwind', species: 'Gale Owl', size: 1.1, voice: 1.0, earScale: 1.3,
        blurb: 'Finally slim enough to fly, though it still prefers riding its own little tornadoes.',
        colors: { body: 0x8e9ce6, belly: 0xf2f0ff, accent: 0x5a64c0, dark: 0x30306e, plume: 0xffd36a },
        body: { w: 0.6, h: 0.74, headR: 0.48, legLen: 0.17, armLen: 0.3, chubby: 1.0, limb: 1.15 },
        parts: { plumes: 0.75, leafmane: 0.8 },
        moves: { special: 'Gale Burst', super: 'Twin Cyclone' },
      },
      {
        name: 'Cyclowl', species: 'Tempest Owl', size: 1.28, voice: 0.8, earScale: 1.5, portraitZoom: 1.1,
        blurb: 'Wind circles it like a crown. When it spreads its wings, the whole stadium leans toward it.',
        colors: { body: 0x6c78d8, belly: 0xeef0ff, accent: 0xffcf5a, dark: 0x262668, plume: 0xffe08a },
        body: { w: 0.64, h: 0.9, headR: 0.46, legLen: 0.2, armLen: 0.4, chubby: 1.0, limb: 1.3 },
        parts: { plumes: 1.2, leafmane: 1.1, brows: 0.6, windring: 1 },
        moves: { special: 'Tempest Puff', super: 'Eye of the Storm' },
      },
    ],
  },
  pricklepuff: {
    path: 'Fortress',
    forms: [
      {
        name: 'Thistlehog', statMul: { power: 1.04 }, species: 'Thistle Hedgehog', size: 1.12, voice: 1.1,
        blurb: 'Its leaf spines have turned to real thistles. Hugs are now strictly by appointment.',
        colors: { body: 0xc8925a, belly: 0xfff0d8, accent: 0x3fb850, dark: 0x2a6a32, blossom: 0xc89aff },
        body: { w: 0.7, h: 0.64, headR: 0.5, legLen: 0.17, armLen: 0.24, chubby: 1.16, limb: 1.3 },
        parts: { flowers: 0.6, brows: 0.5 },
        moves: { special: 'Thistle Spray', super: 'Bramble Charge' },
      },
      {
        name: 'Thornhulk', statMul: { hp: 1.07, power: 1.08 }, species: 'Briar Hedgehog', size: 1.3, voice: 0.8,
        blurb: 'A walking hedge fortress in full bloom. Bees follow it everywhere; nobody else gets close.',
        colors: { body: 0xa8743e, belly: 0xffe6c4, accent: 0x2fae48, dark: 0x1f5a28, blossom: 0xff8ac0, horn: 0xfff2d8 },
        body: { w: 0.9, h: 0.84, headR: 0.48, legLen: 0.2, armLen: 0.32, chubby: 1.22, limb: 1.75 },
        parts: { flowers: 1.1, brows: 0.9, tusks: 0.7, leafmane: 1.0 },
        moves: { special: 'Briar Storm', super: 'Fortress Charge' },
      },
    ],
  },
  emberfly: {
    path: 'Mystic',
    forms: [
      {
        name: 'Emberwing', species: 'Glow Firefly', size: 1.1, voice: 1.5,
        blurb: 'Two little sparks now follow it everywhere. Nobody knows if they are friends or children.',
        colors: { body: 0x6c56d0, belly: 0xffe49a, accent: 0xffbf2a, dark: 0x281e4a, orb: 0xffd36a },
        body: { w: 0.52, h: 0.7, headR: 0.48, legLen: 0.18, armLen: 0.24, chubby: 0.95, limb: 1.1 },
        parts: { orbs: 0.6, brows: 0.35 },
        moves: { special: 'Wisp Volley', super: 'Hypernova' },
      },
      {
        name: 'Pyrolume', species: 'Lantern Moth', size: 1.24, voice: 1.2, portraitZoom: 1.08,
        blurb: 'A swirl of living lanterns orbits it. On summer nights whole towns turn their lights off to watch.',
        colors: { body: 0x5a40b8, belly: 0xffdc88, accent: 0xff9a2a, dark: 0x1e1640, orb: 0xffc04a, flame: 0xff7a2a, flameIn: 0xffe680 },
        body: { w: 0.56, h: 0.86, headR: 0.46, legLen: 0.22, armLen: 0.3, chubby: 0.95, limb: 1.25 },
        parts: { orbs: 1, flamecrest: 0.6, brows: 0.6 },
        moves: { special: 'Lantern Swarm', super: 'Solar Flare' },
      },
    ],
  },
  lilypop: {
    path: 'Brute',
    forms: [
      {
        name: 'Lilyleap', species: 'Pond Frog', size: 1.12, voice: 0.95,
        blurb: 'A lily pad grew around its neck like a cape. It can jump clean over a rival now.',
        colors: { body: 0x74cf4c, belly: 0xfff0b8, accent: 0xff7ab8, dark: 0x285e30, petal: 0xffb0d8 },
        body: { w: 0.74, h: 0.62, headR: 0.5, legLen: 0.2, armLen: 0.24, chubby: 1.16, limb: 1.35 },
        parts: { leafmane: 1.0, lotus: 0.95 },
        moves: { special: 'Tongue Whip', super: 'Lily Crash' },
      },
      {
        name: 'Lotoad', species: 'Lotus Toad', size: 1.3, voice: 0.7,
        blurb: 'The king of the pond, crowned with a lotus. When it belly-flops, the lake goes somewhere else.',
        colors: { body: 0x5cb446, belly: 0xffe8a8, accent: 0xff6aaa, dark: 0x1e4a24, petal: 0xffa0d0 },
        body: { w: 0.96, h: 0.8, headR: 0.5, legLen: 0.22, armLen: 0.32, chubby: 1.24, limb: 1.8 },
        parts: { leafmane: 1.35, lotus: 1.5 },
        moves: { special: 'Royal Tongue', super: 'Lotus Quake' },
      },
    ],
  },
  rolladillo: {
    path: 'Fortress',
    forms: [
      {
        name: 'Bouldillo', species: 'Boulder Armadillo', size: 1.12, voice: 0.7,
        blurb: 'Its shell thickened into solid stone. It rolls downhill on purpose, just for fun.',
        colors: { body: 0xbc946c, belly: 0xf0dcbc, accent: 0x7a5c40, dark: 0x4a3220, rock: 0x6a5a4a },
        body: { w: 0.7, h: 0.64, headR: 0.44, legLen: 0.18, armLen: 0.22, chubby: 1.18, limb: 1.4 },
        parts: { stonearmor: 0.65, brows: 0.5 },
        moves: { special: 'Boulder Roll', super: 'Landslide Quake' },
      },
      {
        name: 'Citadillo', species: 'Citadel Armadillo', size: 1.3, voice: 0.55,
        blurb: 'Built like a castle wall, with a horn like a battering ram. Rolling is now considered a natural disaster.',
        colors: { body: 0xa6805a, belly: 0xead2ae, accent: 0x5e4630, dark: 0x3a2618, rock: 0x5a4c3e, horn: 0xfff2d8 },
        body: { w: 0.92, h: 0.84, headR: 0.44, legLen: 0.2, armLen: 0.3, chubby: 1.24, limb: 1.85 },
        parts: { stonearmor: 1.15, horns: 0.9, brows: 0.9, tusks: 0.6, battlements: 1 },
        moves: { special: 'Siege Roll', super: 'Citadel Quake' },
      },
    ],
  },
  pengsicle: {
    path: 'Swift',
    forms: [
      {
        name: 'Pengsleet', species: 'Sleet Penguin', size: 1.1, voice: 1.15,
        blurb: 'Icicles grow along its back. It slides faster than most critters can run.',
        colors: { body: 0x34468c, belly: 0xffffff, accent: 0xffa42b, dark: 0x18224c, crystal: 0xaaf0ff },
        body: { w: 0.58, h: 0.8, headR: 0.46, legLen: 0.15, armLen: 0.3, chubby: 1.02, limb: 1.15 },
        parts: { crystalridge: 0.6, brows: 0.4 },
        moves: { special: 'Sleet Slide', super: 'Blizzard Crash' },
      },
      {
        name: 'Emperice', species: 'Emperor Ice Penguin', size: 1.26, voice: 0.85, portraitZoom: 1.06,
        blurb: 'Wears a golden crest and a mantle of glacier ice. Snowstorms politely wait for it to finish talking.',
        colors: { body: 0x2a3878, belly: 0xffffff, accent: 0xffb02a, dark: 0x141c42, crystal: 0xb8f4ff, plume: 0xffc84a },
        body: { w: 0.62, h: 0.96, headR: 0.44, legLen: 0.18, armLen: 0.3, chubby: 1.02, limb: 1.3 },
        parts: { icecape: 1, plumes: 0.8, brows: 0.7 },
        moves: { special: 'Glacier Slide', super: 'Emperor Blizzard' },
      },
    ],
  },
  kindlekit: {
    path: 'Swift',
    forms: [
      {
        name: 'Kindlefox', species: 'Ember Fox', size: 1.1, tailScale: 1.25, voice: 1.25,
        blurb: 'Its flame has spread from tail to crest. Leaves a trail of warm footprints in the snow.',
        colors: { body: 0xe04a34, belly: 0xfff0dc, accent: 0xffbf2a, dark: 0x6a1a12, flame: 0xff6a1e, flameIn: 0xfff07a },
        body: { w: 0.58, h: 0.72, headR: 0.47, legLen: 0.22, armLen: 0.25, chubby: 0.98, limb: 1.1 },
        parts: { flamecrest: 0.7, brows: 0.4 },
        moves: { special: 'Blaze Trail', super: 'Grand Fireworks' },
      },
      {
        name: 'Solfox', statMul: { power: 0.96 }, species: 'Sun Fox', size: 1.25, tailScale: 1.55, voice: 1.0,
        blurb: 'Sparks orbit it like tiny suns. They say it chased the sunset once and caught it.',
        colors: { body: 0xd8402e, belly: 0xfff0dc, accent: 0xffc23a, dark: 0x5a160e, flame: 0xff7a1e, flameIn: 0xfff6a0, orb: 0xffd84a },
        body: { w: 0.6, h: 0.88, headR: 0.45, legLen: 0.3, armLen: 0.3, chubby: 0.98, limb: 1.25 },
        parts: { flamecrest: 0.8, sunmane: 1, orbs: 0.7, brows: 0.7 },
        moves: { special: 'Solar Trail', super: 'Sunburst Finale' },
      },
    ],
  },
  woolt: {
    path: 'Storm',
    forms: [
      {
        name: 'Wooltage', species: 'Static Ram', size: 1.12, voice: 1.0,
        blurb: 'Its horns came in crackling. Rubbing them on a balloon is strongly discouraged.',
        colors: { body: 0x726aa8, belly: 0xfff4d0, accent: 0xffd23a, dark: 0x28243e, horn: 0xffe58a, bolt: 0xffe066 },
        body: { w: 0.72, h: 0.68, headR: 0.49, legLen: 0.19, armLen: 0.23, chubby: 1.2, limb: 1.35 },
        parts: { horns: 0.8, brows: 0.45 },
        moves: { special: 'Fuzz Bomb', super: 'Giga Fluff Slam' },
      },
      {
        name: 'Thunderam', species: 'Thunder Ram', size: 1.3, voice: 0.75,
        blurb: 'A thundercloud with legs and very big horns. Its headbutts arrive before the thunder does.',
        colors: { body: 0x5e5698, belly: 0xfff0c4, accent: 0xffd23a, dark: 0x201c36, horn: 0xffe070, bolt: 0xffe066 },
        body: { w: 0.94, h: 0.86, headR: 0.48, legLen: 0.22, armLen: 0.3, chubby: 1.24, limb: 1.8 },
        parts: { horns: 1.3, brows: 0.9, boltmane: 0.9, cloudcrest: 1, cloudLift: 0.45 },
        moves: { special: 'Thunder Fuzz', super: 'Storm Ram Slam' },
      },
    ],
  },
  whirlwhisk: {
    path: 'Sky',
    forms: [
      { name: 'Whirlglide', species: 'Gale Glider', size: 1.1, voice: 1.2, bodyMul: GROW2,
        blurb: 'Glides on its own updrafts now. It hasn\'t touched the ground in three days.',
        colors: { body: 0xaab4cc, dark: 0x323e5a, plume: 0xffffff }, parts: { windring: 0.85, brows: 0.4, tornado: 0.75 }, moves: { special: 'Sky Dive', super: 'Jet Gale' } },
      { name: 'Tempestail', species: 'Tempest Glider', size: 1.24, voice: 0.95, bodyMul: GROW3,
        blurb: 'A whirlwind with a fluffy tail. Leaves fall upward wherever it goes.',
        colors: { body: 0x8e9cc8, dark: 0x262e50, accent: 0xffffff, plume: 0xfff4c8 }, parts: { plumes: 0.8, brows: 0.7, tornado: 1.1, windring: 1 }, moves: { special: 'Tempest Dive', super: 'Hurricane Stream' } },
    ],
  },
  diggles: {
    path: 'Fortress',
    forms: [
      { name: 'Drillmole', species: 'Drill Mole', size: 1.12, voice: 0.9, bodyMul: { ...GROW2, w: 1.2, chubby: 1.05 },
        blurb: 'Upgraded its hard hat and its claws. Tunnels through rock like it\'s pudding.',
        colors: { body: 0x8e6e5e, rock: 0x6a6070 }, parts: { stonearmor: 0.6, brows: 0.5, drill: 0.7, claws: 0.8 }, moves: { special: 'Drill Ambush', super: 'Mole Stampede' } },
      { name: 'Quarrymole', species: 'Gem Quarry Mole', size: 1.3, voice: 0.7, bodyMul: { ...GROW3, w: 1.38, chubby: 1.08, limb: 1.75 },
        blurb: 'Gems from the deepest mines grow along its back. It knows the underground like its own pocket.',
        colors: { body: 0x7a5e50, dark: 0x3a2820, rock: 0x5a5262, crystal: 0x9ae4ff }, parts: { stonearmor: 1.1, crystalridge: 0.9, brows: 0.8, tusks: 0.5, drill: 1, claws: 1.15 }, moves: { special: 'Quarry Ambush', super: 'Gem Rush' } },
    ],
  },
  ripples: {
    path: 'Swift',
    forms: [
      { name: 'Splashotter', species: 'Rapids Otter', size: 1.1, voice: 1.05, bodyMul: GROW2,
        blurb: 'A fin grew along its back for riding rapids. Its puddles now come with waves.',
        colors: { body: 0x8e5e40, fin: 0x6ad0ff }, parts: { backfin: 0.6, brows: 0.35, wave: 0.7 }, moves: { special: 'Rapids Puddle', super: 'Maelstrom' } },
      { name: 'Torrentide', species: 'Torrent Otter', size: 1.25, voice: 0.85, bodyMul: GROW3,
        blurb: 'Rides a river wherever it goes, even when there isn\'t one.',
        colors: { body: 0x6e4630, dark: 0x3e2618, fin: 0x52c8ff, orb: 0x8ae4ff }, parts: { whiskers: 0.9, brows: 0.6, wave: 1, orbs: 0.6 }, moves: { special: 'Torrent Puddle', super: 'Grand Whirlpool' } },
    ],
  },
  jiggawatt: {
    path: 'Mystic',
    forms: [
      { name: 'Jigglevolt', species: 'Volt Jelly', size: 1.1, voice: 1.3, bodyMul: GROW2,
        blurb: 'Glows bright enough to read by. Crackles when it laughs, which is constantly.',
        colors: { body: 0x4ccce6, orb: 0xffe14d, bolt: 0xffe14d }, parts: { orbs: 0.55, antennae: 0.7 }, moves: { special: 'Static Surge', super: 'Thunderhead' } },
      { name: 'Megawatt', species: 'Storm Jelly', size: 1.26, voice: 1.0, bodyMul: GROW3,
        blurb: 'A floating light show with a ring of tiny lightning bugs. Rock concerts book it as the lighting.',
        colors: { body: 0x2eb4e0, dark: 0x0e4060, orb: 0xffe14d, bolt: 0xffe14d }, parts: { orbs: 1, boltmane: 0.7, antennae: 1 }, moves: { special: 'Mega Static', super: 'Supercell' } },
    ],
  },
  squeakwing: {
    path: 'Sky',
    forms: [
      { name: 'Shriekwing', species: 'Orchard Bat', size: 1.1, voice: 1.1, earScale: 1.18, bodyMul: GROW2,
        blurb: 'Bigger wings, bigger ears, much bigger squeak. The apples fall off the trees by themselves now.',
        colors: { body: 0x2a6e80, wing: 0x1a4e5e, horn: 0xfff2d8 }, parts: { horns: 0.45, brows: 0.45, soundwaves: 0.7 }, moves: { special: 'Sonic Shriek', super: 'Echo Blast' } },
      { name: 'Echowing', species: 'Thunder Bat', size: 1.24, voice: 0.85, earScale: 1.38, bodyMul: GROW3,
        blurb: 'The air rings around it like a bell. When it shouts, the jumbotron flickers.',
        colors: { body: 0x2c4a8a, dark: 0x101e3a, wing: 0x1a2e5a, horn: 0xffe08a }, parts: { horns: 0.75, brows: 0.75, soundwaves: 1 }, moves: { special: 'Sonic Boom', super: 'Echo Quake' } },
    ],
  },
  snoozlo: {
    path: 'Brute',
    forms: [
      { name: 'Snoozalot', species: 'Drowsy Koala', size: 1.12, voice: 0.9, bodyMul: { ...GROW2, w: 1.2, chubby: 1.06 },
        blurb: 'Now big enough to nap anywhere it likes. Most of the time that\'s on its opponent.',
        colors: { body: 0x909cb2, cap: 0x6a8ad8 }, parts: { leafmane: 0.8, nightcap: 0.85 }, moves: { special: 'Deep Nap', super: 'Lullaby Slam' } },
      { name: 'Slumberking', species: 'Dream Koala', size: 1.3, voice: 0.7, bodyMul: { ...GROW3, w: 1.38, chubby: 1.1, limb: 1.75 },
        blurb: 'Dreams drift around it like little moons. Waking it up is a very, very bad idea.',
        colors: { body: 0x828aa6, belly: 0xf6f2ea, orb: 0xffc8e8, petal: 0xd8c8ff, cap: 0x7a4ec8, cap2: 0xffe8f6 }, parts: { leafmane: 1.15, orbs: 0.7, nightcap: 1, capcrown: 1 }, moves: { special: 'Royal Slumber', super: 'Dreamquake' } },
    ],
  },
  pebblepup: {
    path: 'Colossus',
    forms: [
      {
        name: 'Cragmutt', species: 'Crag Hound', size: 1.12, voice: 0.85,
        blurb: 'Its crystals grew into a ridge down its back. Digs holes big enough to nap in.',
        colors: { body: 0xa08c78, belly: 0xeadcc6, accent: 0x7ad0ff, dark: 0x3e322a, rock: 0x6e6258 },
        body: { w: 0.72, h: 0.64, headR: 0.5, legLen: 0.2, armLen: 0.24, chubby: 1.18, limb: 1.4 },
        parts: { crystalridge: 0.8, stonearmor: 0.7, brows: 0.6 },
        moves: { special: 'Boulder Toss', super: 'Rockslide' },
      },
      {
        name: 'Montiff', species: 'Mountain Mastiff', size: 1.32, voice: 0.65,
        blurb: 'Gentle as a sleeping mountain, heavy as one too. Its crystal spires hum before an avalanche.',
        colors: { body: 0x857466, belly: 0xe0d0b8, accent: 0x9ae4ff, dark: 0x2e2620, rock: 0x5a5048 },
        body: { w: 0.94, h: 0.86, headR: 0.5, legLen: 0.24, armLen: 0.32, chubby: 1.24, limb: 1.9 },
        parts: { crystalridge: 1.35, stonearmor: 1.25, brows: 1, tusks: 1 },
        moves: { special: 'Meteor Boulder', super: 'Mountain Fall' },
      },
    ],
  },
  // ---- Chapter 2 critters (Sunscatter Isles) ----
  smokeshell: {
    path: 'Fortress',
    forms: [
      { name: 'Smokestack', species: 'Volcano Crab', size: 1.12, voice: 0.95, bodyMul: { ...GROW2, w: 1.16, chubby: 1.05 },
        blurb: 'Its volcano shell grew a second vent. Hot lava plates now cover its shoulders like armour.',
        colors: { body: 0xd84e3a, rock: 0x4e3e46, lava: 0xff8a2a, horn: 0xffe2b0 }, parts: { lavaplates: 0.6, brows: 0.5, horns: 0.4 }, moves: { special: 'Lava Volley', super: 'Volcano Week' } },
      { name: 'Calderon', species: 'Caldera Crab', size: 1.3, voice: 0.72, bodyMul: { ...GROW3, w: 1.32, chubby: 1.08, limb: 1.8 },
        blurb: 'Carries a whole crater on its back. The island it naps on is warmer than the others, and nobody knows why.',
        colors: { body: 0xb83e30, dark: 0x4a1a14, rock: 0x3a2c34, lava: 0xff6a1e, horn: 0xfff0d0 }, parts: { lavaplates: 1, brows: 0.9, horns: 0.7, flamecrest: 0.6 }, moves: { special: 'Caldera Burst', super: 'Volcano Year' } },
    ],
  },
  // ---- M4 legendaries ----
  solmoth: {
    path: 'Mystic',
    forms: [
      { name: 'Solarwing', species: 'Dawn Moth', size: 1.12, voice: 1.1, bodyMul: { ...GROW2, w: 1.1 },
        blurb: 'Its wings now glow even at night, like two small sunrises. Cold islands warm up when it lands.',
        colors: { body: 0xffa42a, flame: 0xffe066 }, parts: { sunmane: 0.6, orbs: 0.35 }, moves: { special: 'Solar Swoop', super: 'High Noon' } },
      { name: 'Heliomoth', species: 'Noon Moth', size: 1.3, voice: 0.9, bodyMul: { ...GROW3, w: 1.2, limb: 1.6 },
        blurb: 'When it spreads its wings, shadows run away. The old lighthouse keepers called it the Second Sun.',
        colors: { body: 0xff9a1e, dark: 0x6a2a08, flame: 0xfff08a }, parts: { sunmane: 0.75, orbs: 0.7, brows: 0.4 }, moves: { special: 'Heliodive', super: 'Eternal Noon' } },
    ],
  },
  moonwhal: {
    path: 'Mystic',
    forms: [
      { name: 'Lunawhal', species: 'Moonlight Narwhal', size: 1.12, voice: 0.72, bodyMul: { ...GROW2, w: 1.16, chubby: 1.05 },
        blurb: 'Its horn shines brighter as the moon grows full. On those nights, every fish in the lagoon follows it home.',
        colors: { body: 0x7a98d8 }, parts: { narhorn: 0.95, pearl: 0.9, wave: 0.45, starfreckles: 1 }, moves: { special: 'Moonbeam Glide', super: 'Spring Tide' } },
      { name: 'Tidemoon', species: 'Moon Narwhal', size: 1.3, voice: 0.6, bodyMul: { ...GROW3, w: 1.3, chubby: 1.08, limb: 1.5 },
        blurb: 'Said to pull the tides in and out by itself. It is very proud of this. Nobody has the heart to check.',
        colors: { body: 0x6a88d0, dark: 0x1e2a5a }, parts: { narhorn: 1.15, pearl: 1.1, wave: 0.85, orbs: 0.45, starfreckles: 1 }, moves: { special: 'Full Moon Glide', super: 'King Tide' } },
    ],
  },
  blowfin: {
    path: 'Mystic',
    forms: [
      { name: 'Spinyfin', species: 'Spike Puffer', size: 1.1, voice: 1.15, bodyMul: { ...GROW2, w: 1.18, chubby: 1.05 },
        blurb: 'Its spines grew long and glassy. It puffs up just to show off, which is very often.',
        colors: { body: 0x4cb8e0, fin: 0xffa64a }, parts: { backfin: 0.6, brows: 0.4, whiskers: 0.5 }, moves: { special: 'Spike Puff', super: 'Riptide Rampage' } },
      { name: 'Bloatide', species: 'Tide Puffer', size: 1.28, voice: 0.9, bodyMul: { ...GROW3, w: 1.34, chubby: 1.1 },
        blurb: 'Rides its own wave around the reef. When it puffs up, the tide goes out a little.',
        colors: { body: 0x2ea4d8, dark: 0x0e3e5e, fin: 0xffb45a, wave: 0x2a9ee8 }, parts: { backfin: 1, wave: 0.8, brows: 0.7, whiskers: 0.8 }, moves: { special: 'Tidal Puff', super: 'Riptide Typhoon' } },
    ],
  },
  mossloth: {
    path: 'Brute',
    forms: [
      { name: 'Fernsloth', species: 'Fern Sloth', size: 1.12, voice: 0.78, bodyMul: { ...GROW2, armLen: 1.4 },
        blurb: 'Ferns grew into a shaggy mane while it was busy doing nothing. Birds nest in it and it does not mind.',
        colors: { body: 0xa88c6c, petal: 0xff6a8a }, parts: { leafmane: 0.75, flowers: 0.6, brows: 0.4 }, moves: { special: 'Lazy Lasso', super: 'Wild Overgrowth' } },
      { name: 'Jungloth', species: 'Jungle Sloth', size: 1.3, voice: 0.66, bodyMul: { ...GROW3, armLen: 1.7, limb: 1.7 },
        blurb: 'A walking jungle with blossoming branches for antlers. It moves one step a day, but what a step.',
        colors: { body: 0x96785a, dark: 0x3e2a1c, antler: 0x6a4a2e, blossom: 0xff8ac0, petal: 0xff6a8a }, parts: { leafmane: 1.1, flowers: 1, antlers: 0.7, brows: 0.8 }, moves: { special: 'Jungle Lariat', super: 'Rainforest Rise' } },
    ],
  },
  toucharge: {
    path: 'Storm',
    forms: [
      { name: 'Toucannon', species: 'Cannon Toucan', size: 1.1, voice: 1.3, bodyMul: GROW2,
        blurb: 'Its beak hums like a power line. A crackling crest stands up when it is about to fire.',
        colors: { body: 0x2e3254, bolt: 0xffe14d, plume: 0xffd52e }, parts: { boltmane: 0.55, plumes: 0.5, brows: 0.4 }, moves: { special: 'Beak Cannon', super: 'Thunder Shriek' } },
      { name: 'Thundercan', species: 'Storm Toucan', size: 1.26, voice: 1.05, bodyMul: GROW3,
        blurb: 'Tropical storms follow it from island to island. Its sneeze can light a whole harbour.',
        colors: { body: 0x262a48, dark: 0x0e0e18, bolt: 0xffe14d, plume: 0xff8a2a }, parts: { boltmane: 1, plumes: 1, brows: 0.75, antennae: 0.5 }, moves: { special: 'Storm Beam', super: 'Hurricane Squawk' } },
    ],
  },
  pumicub: {
    path: 'Colossus',
    forms: [
      { name: 'Pumiursa', species: 'Pumice Bear', size: 1.14, voice: 0.85, bodyMul: { ...GROW2, w: 1.16, chubby: 1.05 },
        blurb: 'Big enough to give a proper stone hug. Still floats, which surprises everyone at the beach.',
        colors: { body: 0x8a848a, rock: 0x6a6268 }, parts: { stonearmor: 0.7, brows: 0.6 }, moves: { special: 'Pumice Slam', super: 'Ashfall Crash' } },
      { name: 'Basaltursa', species: 'Basalt Bear', size: 1.32, voice: 0.66, bodyMul: { ...GROW3, w: 1.34, chubby: 1.1, limb: 1.9 },
        blurb: 'Cooled lava columns stand up along its back. Its footsteps sound like distant thunder on the islands.',
        colors: { body: 0x6a646c, dark: 0x262228, rock: 0x3a343c, crystal: 0xff8a4a, lava: 0xff7a2a }, parts: { stonearmor: 1.2, crystalridge: 0.9, lavaplates: 0.6, brows: 1 }, moves: { special: 'Basalt Pound', super: 'Ashfall Cataclysm' } },
    ],
  },
  skimray: {
    path: 'Sky',
    forms: [
      { name: 'Galeray', species: 'Gale Manta', size: 1.12, voice: 1.1, bodyMul: { ...GROW2, w: 1.2, h: 1.15 },
        blurb: 'Catches the wind with wings as wide as a sail. Little gusts swirl round it wherever it glides.',
        colors: { body: 0x6a86d8, plume: 0xe6f2ff }, parts: { windring: 0.6, plumes: 0.45 }, moves: { special: 'Gale Loop', super: 'Squall Storm' } },
      { name: 'Monsoonray', species: 'Monsoon Manta', size: 1.28, voice: 0.88, bodyMul: { ...GROW3, w: 1.36, h: 1.3 },
        blurb: 'Brings the rainy season wherever it flies. A little cloud rides on its back like a passenger.',
        colors: { body: 0x5470c4, dark: 0x1a2660, cloud: 0xe8eeff, orb: 0xdff4ff, plume: 0xffffff }, parts: { windring: 1, cloudcrest: 0.8, orbs: 0.55, plumes: 0.7 }, moves: { special: 'Monsoon Loop', super: 'Typhoon Spin' } },
    ],
  },
};

// generic grown forms get a feature themed on their type
const TYPE_PARTS = {
  fire: (k) => ({ flamecrest: k * 0.8 }),
  water: (k) => ({ backfin: k }),
  leaf: (k) => ({ leafmane: k * 1.1 }),
  spark: (k) => ({ horns: k * 0.7 }),
  stone: (k) => ({ crystalridge: k }),
  gust: (k) => ({ backfin: k * 0.9 }),
};

// the form a critter def takes at this level (keeps the id, so progress stays shared)
export function grown(def, lv, shiny) {
  const stage = stageFor(lv);
  if (stage === 1 || def.stage) return def;
  const F = FORMS[def.id]?.forms[stage - 2];
  const hp = Math.round(def.stats.hp * HP_MULT[stage - 1]);
  if (!F) {
    // generic growth (until a critter gets hand-built forms): bigger, sturdier, plus a type-themed feature
    const p = stage === 2 ? 'Power' : 'Ultra', k = stage === 2 ? 0.55 : 0.85;
    const parts = { ...TYPE_PARTS[def.type](k), ...(stage === 3 ? { brows: 0.5 } : {}) };
    return {
      ...def, stage, size: stage === 2 ? 1.08 : 1.16, parts,
      colors: { ...def.colors, fin: def.colors.accent, horn: def.colors.accent },
      body: { ...def.body, limb: stage === 2 ? 1.15 : 1.3 },
      stats: { ...def.stats, hp },
      moves: { special: `${p} ${def.moves.special}`, super: `${p} ${def.moves.super}` },
    };
  }
  const body = F.body || Object.fromEntries(Object.entries(def.body).map(([k, x]) => [k, x * (F.bodyMul[k] ?? 1)]).concat([['limb', F.bodyMul.limb]]));
  return {
    ...def, ...F, stage, baseName: def.name, body,
    colors: { ...def.colors, ...F.colors, ...(shiny || {}) },
    // statMul: per-form balance tweaks on top of the stage boosts
    stats: Object.fromEntries(Object.entries({ ...def.stats, hp }).map(([k, x]) => [k, F.statMul?.[k] ? (k === 'hp' ? Math.round(x * F.statMul[k]) : +(x * F.statMul[k]).toFixed(3)) : x])),
  };
}

// ---------- parts for the hand-built forms ----------
let gseg = 28; // the Critter build sets this lower for far-away world critters
export const growthSeg = (n) => { gseg = n; };
const sphere = (r = 1) => new THREE.SphereGeometry(r, gseg, Math.round(gseg * 0.72));
const UP = new THREE.Vector3(0, 1, 0);

// a tapered segment from a to b (merged into antlers and horns)
function seg(a, b, r0, r1) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 8, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
const tip = (a, b, r) => { const g = sphere(r); g.translate(b.x, b.y, b.z); return [seg(a, b, r, r * 0.35)]; };
const v = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildGrowth(cr, def, U, OL, { flameGeo, leafGeo, boltGeo }) {
  const P = def.parts;
  if (!P) return;
  const B = def.body, C = def.colors, headR = B.headR;
  const mat = (k, col, o = {}) => (cr.mats['g_' + k] ||= toon(col, { uniforms: U, ...o }));
  // static parts collect here and are merged by material at the end (keeps draw calls down)
  const SK = new THREE.Group(), TO = new THREE.Group();
  cr.skull.add(SK); cr.torso.add(TO);

  // a crest of flames from the brow back over the head
  if (P.flamecrest) {
    const s = P.flamecrest;
    for (let k = 0; k < 5; k++) {
      const a = -0.15 + k * 0.32, g = new THREE.Group();
      g.position.set(0, Math.cos(a) * headR * 0.86, -Math.sin(a) * headR * 0.86);
      g.rotation.x = -a * 0.9 - 0.15;
      const big = (1 - Math.abs(k - 1.5) * 0.18) * s;
      const outer = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flame ?? 0xff5a1e }));
      const inner = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flameIn ?? 0xffe066 }));
      outer.userData.base = 0.5 * big; inner.userData.base = 0.31 * big; inner.position.set(0, 0.02, 0.03);
      g.add(outer, inner);
      cr.flames.push(outer, inner);
      cr.skull.add(g); // animated flames stay separate
    }
  }

  // two horns curving up and out from the brow
  if (P.horns) {
    const s = P.horns, hm = mat('horn', C.horn ?? 0xfff0d0);
    for (const x of [-1, 1]) {
      const a = v(0, 0, 0), b = v(x * 0.14, 0.22, 0.04).multiplyScalar(s * headR * 2.2), c = v(x * 0.2, 0.42, -0.06).multiplyScalar(s * headR * 2.2);
      const g = mergeGeometries([seg(a, b, headR * 0.12 * s, headR * 0.08 * s), seg(b, c, headR * 0.08 * s, headR * 0.012)]);
      const h = inked(g, hm, OL * 0.6);
      h.position.set(x * headR * 0.42, headR * 0.6, headR * 0.3);
      SK.add(h);
    }
  }

  // cooled-lava armour: rock chunks over a glowing core, on the shoulders and the back
  if (P.lavaplates) {
    const rock = mat('rock', C.rock ?? 0x3a2a2a, { rim: 0.6 });
    const lava = new THREE.MeshBasicMaterial({ color: C.lava ?? 0xff7a1e });
    const chunk = (r, x, y, z, seed) => {
      const parts = [];
      for (let i = 0; i < 4; i++) {
        const g = new THREE.DodecahedronGeometry(r * (0.55 + ((seed * 7 + i * 3) % 5) * 0.06), 0);
        const a = i * 1.7 + seed;
        g.translate(Math.cos(a) * r * 0.45, Math.sin(a * 1.3) * r * 0.25 + r * 0.1, Math.sin(a) * r * 0.45);
        parts.push(g);
      }
      const m = inked(mergeGeometries(parts), rock, OL * 0.7);
      const core = new THREE.Mesh(sphere(r * 0.62), lava);
      core.position.y = r * 0.1;
      const grp = new THREE.Group(); grp.add(core, m); grp.position.set(x, y, z);
      return grp;
    };
    for (const s of [-1, 1]) {
      const sh = chunk(B.w * 0.3, s * B.w * B.chubby * 0.46, B.h * 0.8, -B.w * 0.02, s + 2);
      TO.add(sh);
    }
    TO.add(chunk(B.w * 0.36, 0, B.h * 0.6, -B.w * 0.42, 5));
    TO.add(chunk(B.w * 0.26, 0, B.h * 0.28, -B.w * 0.44, 9));
    // glowing seams across the belly armour
    for (const s of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.TorusGeometry(B.w * 0.5, 0.012, 6, 24, 0.9), lava);
      seam.position.set(0, B.h * (s > 0 ? 0.5 : 0.36), 0);
      seam.rotation.set(Math.PI / 2 + 0.1, 0, Math.PI / 2 - 0.45);
      seam.scale.set(B.chubby * 1.02, 1.02, 1);
      TO.add(seam);
    }
  }

  // heavy brows angled down toward the nose: a fierce look over the same bright eyes
  if (P.brows) {
    const s = P.brows, bm = cr.mats.dark;
    for (const x of [-1, 1]) {
      const yaw = x * 0.36, pit = 0.3, r = headR * 1.0;
      const b = inked(new THREE.CapsuleGeometry(headR * 0.05 * (0.7 + s * 0.3), headR * 0.26 * (0.8 + s * 0.2), 4, 8), bm, OL * 0.4);
      b.position.set(Math.sin(yaw) * Math.cos(pit) * r, Math.sin(pit) * r, Math.cos(yaw) * Math.cos(pit) * r);
      b.rotation.set(0, yaw, Math.PI / 2 + x * (0.25 + s * 0.15), 'YXZ');
      SK.add(b);
    }
  }

  // little tusks poking up from the corners of the mouth
  if (P.tusks) {
    const s = P.tusks, tm = mat('tusk', 0xfffaf0);
    for (const x of [-1, 1]) {
      const yaw = x * 0.26, pit = -0.42, r = headR * 0.98;
      const t = inked(new THREE.ConeGeometry(headR * 0.06 * s, headR * 0.2 * s, 8), tm, OL * 0.4);
      t.position.set(Math.sin(yaw) * Math.cos(pit) * r, Math.sin(pit) * r + headR * 0.05 * s, Math.cos(yaw) * Math.cos(pit) * r);
      t.rotation.set(0.3, 0, -x * 0.15);
      SK.add(t);
    }
  }

  // a scalloped sail fin from the crown down the back to the tail
  if (P.backfin) {
    const s = P.backfin, fm = toon(C.fin ?? C.accent, { uniforms: U, side: THREE.DoubleSide });
    cr.mats.g_fin = fm;
    // critters stand upright, so the 'back' runs from the crown down to the hips
    const top = B.h * 0.82 + headR * 1.45, L = top - B.h * 0.18, H = 0.34 * s;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    for (let k = 0; k <= 4; k++) { const x = (k / 4) * L, y = H * (1 - k * 0.13); sh.quadraticCurveTo(x - L * 0.06, y * 1.15, x + L * 0.05, y * 0.5); }
    sh.lineTo(L, 0); sh.lineTo(0, 0);
    const geo = new THREE.ShapeGeometry(sh, 8);
    geo.rotateZ(-Math.PI / 2); geo.rotateY(Math.PI / 2); // shape x runs down (-y), shape y sticks out the back (-z)
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, fm);
    const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a1020, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));
    o.scale.set(1, 1.02, 1.06);
    g.add(o, m);
    g.position.set(0, top, -B.w * 0.3);
    g.rotation.x = 0.12; // lean the lower end out over the bulge of the body
    TO.add(g);
    cr.fin = g;
  }

  // long drooping whiskers from the snout
  if (P.whiskers) {
    const s = P.whiskers, wm = mat('whisk', C.fin ?? C.accent);
    for (const x of [-1, 1]) {
      const c = new THREE.CatmullRomCurve3([v(0, 0, 0), v(x * 0.3, 0.02, 0.1), v(x * 0.62, -0.06, 0.06), v(x * 0.85, -0.26, -0.04), v(x * 0.9, -0.48, -0.12)].map((p) => p.multiplyScalar(headR * s)));
      const w = inked(new THREE.TubeGeometry(c, 16, headR * 0.03, 6), wm, OL * 0.4);
      w.position.set(x * headR * 0.42, -headR * 0.18, headR * 0.82);
      SK.add(w);
      cr.whiskers = (cr.whiskers || []).concat(w);
    }
  }

  // a glowing pearl on the brow in a gold setting
  if (P.pearl) {
    const p = new THREE.Mesh(sphere(headR * 0.12), new THREE.MeshBasicMaterial({ color: C.pearl ?? 0xffffff }));
    p.position.set(0, headR * 0.62, headR * 0.76);
    const ring = inked(new THREE.TorusGeometry(headR * 0.13, headR * 0.03, 6, 20), mat('gold', 0xffc93a, { rim: 0.9 }), OL * 0.4);
    ring.position.copy(p.position); ring.rotation.x = -0.75;
    const glow = new THREE.Mesh(sphere(headR * 0.2), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.copy(p.position);
    cr.skull.add(p, ring, glow);
    cr.lantern ||= glow;
  }

  // a mane of leaves around the neck
  if (P.leafmane) {
    const s = P.leafmane, n = 11;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      if (Math.cos(a) > 0.82) continue; // keep the chin clear
      const lf = inked(leafGeo().scale(0.32 * s, 0.32 * s, 0.4 * s), k % 2 ? cr.mats.accent : cr.mats.dark, OL * 0.5);
      lf.position.set(Math.sin(a) * B.w * 0.4, B.h * 0.84, Math.cos(a) * B.w * 0.34);
      lf.rotation.set(-0.35, a, 0, 'YXZ'); // flared up and out like a ruff
      TO.add(lf);
    }
  }

  // branching antlers with leaves and blossoms at the tips
  if (P.antlers) {
    const s = P.antlers * headR * 2.1, am = mat('antler', C.antler ?? 0x8a6440), bl = mat('blossom', C.blossom ?? 0xff9ac8);
    for (const x of [-1, 1]) {
      const p0 = v(0, 0, 0), p1 = v(x * 0.12, 0.26, -0.04), p2 = v(x * 0.3, 0.46, -0.1), p3 = v(x * 0.36, 0.7, -0.06);
      const t1 = v(x * 0.02, 0.5, 0.08), t2 = v(x * 0.52, 0.58, -0.16), t3 = v(x * 0.2, 0.76, 0.02);
      const P3 = [p0, p1, p2, p3, t1, t2, t3].map((q) => q.multiplyScalar(s));
      const r = 0.05 * s;
      const geo = mergeGeometries([seg(P3[0], P3[1], r, r * 0.85), seg(P3[1], P3[2], r * 0.85, r * 0.65), seg(P3[2], P3[3], r * 0.65, r * 0.2),
        seg(P3[1], P3[4], r * 0.6, r * 0.18), seg(P3[2], P3[5], r * 0.55, r * 0.15), seg(P3[2], P3[6], r * 0.5, r * 0.15)]);
      const g = new THREE.Group();
      g.add(inked(geo, am, OL * 0.5));
      for (const [q, kind] of [[P3[3], 'bloom'], [P3[4], 'leaf'], [P3[5], 'leaf'], [P3[6], 'bloom']]) {
        if (kind === 'leaf') {
          const lf = inked(leafGeo().scale(0.24 * s, 0.24 * s, 0.3 * s), cr.mats.accent, OL * 0.4);
          lf.position.copy(q); lf.rotation.set(-0.6, x * 0.8, 0);
          g.add(lf);
        } else {
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2, pe = new THREE.Mesh(sphere(0.04 * s), bl);
            pe.position.set(q.x + Math.cos(a) * 0.045 * s, q.y + 0.01 * s, q.z + Math.sin(a) * 0.045 * s);
            g.add(pe);
          }
          const c = new THREE.Mesh(sphere(0.03 * s), mat('pollen', 0xffe066));
          c.position.copy(q).y += 0.03 * s;
          g.add(c);
        }
      }
      g.position.set(x * headR * 0.22, headR * 0.82, -headR * 0.18);
      SK.add(g);
    }
  }

  // a crackling mane of glowing bolts fanned over the back of the head and neck
  if (P.boltmane) {
    const s = P.boltmane, bm = new THREE.MeshBasicMaterial({ color: C.bolt ?? 0x7af0ff });
    for (let k = 0; k < 7; k++) {
      const a = (k - 3) * 0.5, b = new THREE.Mesh(boltGeo(), bm);
      const g = new THREE.Group();
      // the outer bolts flare out past the cheeks, so the mane reads from the front (portraits) as well as the side
      g.position.set(Math.sin(a) * headR * 0.92, headR * (0.35 - Math.abs(k - 3) * 0.1), -headR * (0.72 - Math.abs(k - 3) * 0.1));
      g.rotation.set(-0.55 - Math.abs(k - 3) * 0.12, 0, -a * 0.9);
      b.rotation.y = Math.PI / 2; // zigzag face side-on, so it reads from the sides and back
      b.scale.setScalar(s * (1.0 - Math.abs(k - 3) * 0.1));
      g.add(b);
      SK.add(g);
    }
  }

  // a little thundercloud perched on the head, with a bolt hanging out of it
  if (P.cloudcrest) {
    const s = P.cloudcrest, cm = mat('cloud', C.cloud ?? 0x6a6a86), parts = [];
    for (const [x, y, z, r] of [[0, 0, 0, 0.2], [0.17, -0.03, 0.02, 0.15], [-0.17, -0.03, 0.02, 0.15], [0.07, 0.08, -0.05, 0.14], [-0.08, 0.06, 0.07, 0.13]]) { const g = sphere(r * headR * 1.6 * s); g.translate(x * headR * 1.6 * s, y * headR * 1.6 * s, z * headR * 1.6 * s); parts.push(g); }
    const cl = inked(mergeGeometries(parts), cm, OL * 0.6);
    const lift = headR * (P.cloudLift || 0);
    cl.position.set(-headR * 0.1, headR * 1.08 + lift, -headR * 0.1);
    SK.add(cl);
    const bolt = new THREE.Mesh(boltGeo(), new THREE.MeshBasicMaterial({ color: C.bolt ?? 0x7af0ff }));
    bolt.scale.setScalar(0.5 * s); bolt.position.set(headR * 0.28, headR * 0.92 + lift, headR * 0.05); bolt.rotation.z = 2.6;
    SK.add(bolt);
  }

  // flowers blooming among the spines on the back
  if (P.flowers) {
    const s = P.flowers, pm = mat('blossom', C.blossom ?? 0xff9ac8), cm = mat('pollen', 0xffe066);
    const n = Math.round(4 + s * 4);
    for (let i = 0; i < n; i++) {
      const y = 0.75 - (i / n) * 1.2, a = i * 2.39996, r = Math.sqrt(Math.max(0, 1 - y * y));
      const d = v(Math.cos(a) * r * 0.85, y, -Math.abs(Math.sin(a) * r) - 0.2).normalize();
      const fl = new THREE.Group();
      for (let k = 0; k < 5; k++) { const t = (k / 5) * Math.PI * 2, pe = new THREE.Mesh(sphere(0.05 * s), pm); pe.scale.set(1, 0.5, 1); pe.position.set(Math.cos(t) * 0.055 * s, 0, Math.sin(t) * 0.055 * s); fl.add(pe); }
      const c = new THREE.Mesh(sphere(0.035 * s), cm); c.position.y = 0.015 * s; fl.add(c);
      fl.quaternion.setFromUnitVectors(UP, d);
      fl.position.set(d.x * B.w * B.chubby * 0.55, B.h * 0.48 + d.y * B.h * 0.55, d.z * B.w * 0.55);
      TO.add(fl);
    }
  }

  // glowing lantern orbs circling the body (spun in Critter.update)
  if (P.orbs) {
    const s = P.orbs, n = Math.round(2 + s * 4), g = new THREE.Group();
    const om = new THREE.MeshBasicMaterial({ color: C.orb ?? C.accent });
    const gm = new THREE.MeshBasicMaterial({ color: C.orb ?? C.accent, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, R = B.w * 1.05, y = Math.sin(a * 2) * B.h * 0.15;
      const o = new THREE.Mesh(sphere(0.06 * (0.8 + s * 0.3)), om), h = new THREE.Mesh(sphere(0.1 * (0.8 + s * 0.3)), gm);
      o.position.set(Math.cos(a) * R, y, Math.sin(a) * R); h.position.copy(o.position);
      g.add(o, h);
    }
    g.position.y = B.h * 0.6;
    g.userData.spin = 1.4; g.userData.axis = 'y';
    cr.torso.add(g);
    (cr.spinners ||= []).push(g);
    flatten(g);
  }

  // a lotus flower crown: two rings of pointed petals
  if (P.lotus) {
    const s = P.lotus, pm = mat('petal', C.petal ?? 0xffa0d0), am = cr.mats.accent, g = new THREE.Group();
    for (const [n, tilt, len, m] of [[8, 0.75, 0.42, pm], [6, 0.35, 0.34, am]]) {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + (n === 6 ? 0.3 : 0);
        const pg = new THREE.SphereGeometry(0.5, 12, 8); pg.scale(0.3, 0.1, 1); pg.translate(0, 0, 0.5); // a petal pointing along +z from its base
        const petal = inked(pg.scale(len * s * headR, len * s * headR, len * s * headR), m, OL * 0.4);
        const h = new THREE.Group(); h.rotation.set(0, a, 0);
        petal.rotation.x = -tilt - 0.4; h.add(petal); g.add(h);
      }
    }
    const c = new THREE.Mesh(sphere(headR * 0.1 * s), mat('pollen', 0xffe066)); c.position.y = headR * 0.06 * s; g.add(c);
    g.position.set(0, headR * 0.92, -headR * 0.05);
    SK.add(g);
  }

  // long feather plumes sweeping back from the brow
  if (P.plumes) {
    const s = P.plumes, pm = mat('plume', C.plume ?? C.accent);
    for (const [x, rz, len] of [[0, 0, 1], [-0.16, 0.35, 0.8], [0.16, -0.35, 0.8]]) {
      const f = inked(leafGeo().scale(0.2 * s, 0.25 * s, 0.9 * s * len), pm, OL * 0.5);
      const g = new THREE.Group();
      g.position.set(x * headR, headR * 0.8, headR * 0.15);
      g.rotation.set(-2.3, 0, rz); // tip up and back over the crown
      g.add(f);
      SK.add(g);
    }
  }

  // rings of wind circling the body (spun in Critter.update)
  if (P.windring) {
    const s = P.windring;
    for (let k = 0; k < 2; k++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(B.w * (0.95 + k * 0.2) * s, 0.025, 6, 48, Math.PI * 1.4),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 - k * 0.15, depthWrite: false }));
      const g = new THREE.Group();
      g.position.y = B.h * (0.3 + k * 0.35);
      g.rotation.set(Math.PI / 2 + (k ? 0.25 : -0.2), 0, 0);
      g.add(r);
      g.userData.spin = k ? -2.2 : 3;
      cr.torso.add(g);
      (cr.spinners ||= []).push(g);
      flatten(g);
    }
  }

  // a ridge of big crystals down the spine and a crystal tiara
  if (P.crystalridge) {
    const s = P.crystalridge, cm = mat('crystal', C.crystal ?? C.accent, { rim: 1 });
    const gem = (r, h) => { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, h / r, 1); g.translate(0, h * 0.5, 0); return g; };
    const parts = [];
    for (let k = 0; k < 6; k++) {
      const t = k / 5, a = 0.25 + t * 1.5; // from the shoulders over the back
      const r = (0.12 - t * 0.04) * s, h = (0.5 - t * 0.18) * s;
      for (const x of k % 2 ? [-1, 1] : [0]) {
        const g = gem(r * (x ? 0.75 : 1), h * (x ? 0.7 : 1));
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, v(x * 0.5, Math.cos(a), -Math.sin(a)).normalize()));
        g.translate(x * B.w * 0.18, B.h * 0.48 + Math.cos(a) * B.h * 0.46, -Math.sin(a) * B.w * 0.46);
        parts.push(g);
      }
    }
    TO.add(inked(mergeGeometries(parts), cm, OL * 0.6));
    const hp = [];
    for (const [x, h] of [[0, 0.42], [-0.28, 0.28], [0.28, 0.28]]) {
      const g = gem(headR * 0.1 * s, headR * h * s);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, v(x, 1, -0.3).normalize()));
      g.translate(x * headR, headR * 0.82, -headR * 0.1);
      hp.push(g);
    }
    SK.add(inked(mergeGeometries(hp), cm, OL * 0.6));
  }

  // stone armour: shoulder slabs and heavy bracers on the paws
  if (P.stonearmor) {
    const s = P.stonearmor, rm = mat('rock', C.rock ?? 0x6e6258, { rim: 0.6 });
    const slab = (r) => { const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1.15, 0.7, 1); return g; };
    for (const x of [-1, 1]) {
      const sh = inked(slab(B.w * 0.26 * s), rm, OL * 0.7);
      sh.position.set(x * B.w * B.chubby * 0.5, B.h * 0.9, 0);
      sh.rotation.set(0.2, x * 0.4, x * -0.35);
      TO.add(sh);
    }
    for (const arm of cr.arms) {
      const br = inked(new THREE.CylinderGeometry(0.11 * s, 0.13 * s, B.armLen * 0.55, 7), rm, OL * 0.6);
      br.position.y = -B.armLen * 0.72;
      arm.add(br);
    }
  }
  // a drill bit on top of the hard hat (spun in Critter.update): steel cone with a spiral ridge on a collar
  if (P.drill) {
    const s = P.drill * headR, steel = mat('steel', C.steel ?? 0xc8d0dc, { rim: 1 }), collarM = mat('collar', C.collar ?? 0x5a5a6a);
    const H = 0.95 * s, R = 0.28 * s, turns = 3.2, pts = [];
    for (let i = 0; i <= 48; i++) { const t = i / 48, a = t * turns * Math.PI * 2, r = R * (1 - t) * 1.04; pts.push(v(Math.cos(a) * r, t * H, Math.sin(a) * r)); }
    const cone = new THREE.ConeGeometry(R, H, 18, 1, true); cone.translate(0, H / 2, 0);
    const bit = mergeGeometries([cone, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.035 * s, 5)]);
    const spin = new THREE.Group();
    spin.add(inked(bit, steel, OL * 0.5));
    spin.userData.spin = 9; spin.userData.axis = 'y';
    const collar = inked(new THREE.CylinderGeometry(R * 1.05, R * 1.25, 0.16 * s, 16), collarM, OL * 0.5);
    collar.position.y = -0.04 * s;
    const g = new THREE.Group();
    g.add(collar, spin); spin.position.y = 0.04 * s;
    g.position.set(0, headR * 1.2, -headR * 0.06); g.rotation.x = 0.3;
    cr.skull.add(g);
    (cr.spinners ||= []).push(spin);
  }

  // a narwhal's horn: a long ivory spiral from the forehead, tipped forward (Moonwhal); it doesn't spin
  if (P.narhorn) {
    const s = P.narhorn * headR, ivory = mat('horn', C.horn ?? 0xfff4d8, { rim: 1 });
    const H = 1.35 * s, R = 0.15 * s, pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * 4 * Math.PI * 2, r = R * (1 - t) * 1.05; pts.push(v(Math.cos(a) * r, t * H, Math.sin(a) * r)); }
    const cone = new THREE.ConeGeometry(R, H, 14, 1, true); cone.translate(0, H / 2, 0);
    const horn = inked(mergeGeometries([cone, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.022 * s, 4)]), ivory, OL * 0.5);
    horn.position.set(0, headR * 0.72, headR * 0.62); horn.rotation.x = 0.95;
    SK.add(horn);
  }

  // little star freckles on the cheeks and brow (Moonwhal): flat pale-gold stars, slightly glowing
  if (P.starfreckles) {
    const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.4 : 1; (i ? sh.lineTo : sh.moveTo).call(sh, Math.cos(a) * r, -Math.sin(a) * r); }
    const geo = new THREE.ShapeGeometry(sh), sm = new THREE.MeshBasicMaterial({ color: 0xfff2a8, side: THREE.DoubleSide });
    for (const [x, y, z, k] of [[-0.62, -0.08, 0.74, 1], [-0.5, 0.06, 0.82, 0.7], [0.62, -0.08, 0.74, 1], [0.5, 0.06, 0.82, 0.7], [-0.32, 0.62, 0.68, 0.8], [0.36, 0.7, 0.6, 0.65]]) {
      const st = new THREE.Mesh(geo, sm), n = v(x, y, z).normalize(); st.scale.setScalar(headR * 0.13 * k * P.starfreckles);
      st.position.copy(n).multiplyScalar(headR * 1.01); st.lookAt(n.clone().multiplyScalar(headR * 3)); SK.add(st);
    }
  }

  // big digging claws on the paws
  if (P.claws) {
    const s = P.claws, cm = mat('claw', C.claw ?? 0xfff2dc);
    for (const arm of cr.arms) {
      const parts = [];
      for (let k = -1; k <= 1; k++) {
        const c = new THREE.ConeGeometry(0.045 * s, 0.22 * s, 7); c.translate(0, -0.11 * s, 0);
        c.rotateX(0.5); c.rotateZ(k * 0.32);
        c.translate(k * 0.05 * s, -B.armLen - 0.06, 0.05);
        parts.push(c);
      }
      arm.add(inked(mergeGeometries(parts), cm, OL * 0.4));
    }
  }
  // a floppy striped nightcap drooping to one side, with a pompom (and a little gold crown round the brim)
  if (P.nightcap) {
    const s = P.nightcap * headR, cap = new THREE.Group();
    const pts = [v(0, 0, 0), v(0.02, 0.32, -0.04), v(0.12, 0.6, -0.1), v(0.32, 0.78, -0.12), v(0.56, 0.74, -0.08), v(0.7, 0.52, -0.02), v(0.74, 0.3, 0.02)].map((q) => q.multiplyScalar(s));
    const curve = new THREE.CatmullRomCurve3(pts), TS = 48, RS = 14, r0 = 0.62 * s;
    // one tube, tapered ring by ring, with stripes painted in as vertex colours
    const geo = new THREE.TubeGeometry(curve, TS, 1, RS, false), pos = geo.attributes.position, cols = [];
    const c1 = new THREE.Color(C.cap ?? 0x6a78d8), c2 = new THREE.Color(C.cap2 ?? 0xf4f0ff);
    for (let i = 0; i < pos.count; i++) {
      const u = Math.floor(i / (RS + 1)) / TS, c = curve.getPointAt(u), r = r0 * (1 - u) ** 1.1 + 0.035 * s;
      pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * r, c.y + (pos.getY(i) - c.y) * r, c.z + (pos.getZ(i) - c.z) * r);
      const col = Math.floor(u * 7) % 2 ? c2 : c1; cols.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    cap.add(inked(geo, mat('capv', 0xffffff, { vertexColors: true }), OL * 0.5));
    const m2 = mat('cap2', C.cap2 ?? 0xf4f0ff);
    const pom = inked(sphere(0.15 * s), m2, OL * 0.5);
    pom.position.copy(curve.getPoint(1));
    const brim = inked(new THREE.TorusGeometry(r0 * 0.98, 0.1 * s, 8, 28), m2, OL * 0.5);
    brim.rotation.x = Math.PI / 2;
    cap.add(pom, brim);
    if (P.capcrown) {
      const gold = mat('gold', 0xffc93a, { rim: 0.9 }), parts = [];
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.2, c = new THREE.ConeGeometry(0.09 * s, 0.34 * s * P.capcrown, 4);
        c.translate(Math.sin(a) * r0 * 1.0, 0.2 * s, Math.cos(a) * r0 * 1.0);
        parts.push(c.toNonIndexed());
      }
      const band = new THREE.CylinderGeometry(r0 * 1.02, r0 * 1.05, 0.15 * s, 24, 1, true); band.translate(0, 0.08 * s, 0);
      parts.push(band.toNonIndexed());
      cap.add(inked(mergeGeometries(parts), gold, OL * 0.5));
      const gem = new THREE.Mesh(sphere(0.07 * s), new THREE.MeshBasicMaterial({ color: C.orb ?? 0xff8ad8 }));
      gem.position.set(0, 0.1 * s, r0 * 1.06);
      cap.add(gem);
    }
    cap.position.set(0, headR * 0.7, -headR * 0.08); cap.rotation.set(-0.12, 0, 0.12);
    SK.add(cap);
  }

  // a curling wave rising behind it, with a foam crest: it brings its own river
  if (P.wave) {
    const s = P.wave, W = B.w * 0.85 * s, H = B.h * 1.12 * s, Z = -B.w * 0.5;
    const pts = [v(0, -0.12, 0.1), v(0, 0.3, -0.35), v(0, 0.72, -0.48), v(0, 1.0, -0.36), v(0, 1.08, -0.1), v(0, 0.96, 0.08)].map((q) => v(0, q.y * H, Z + q.z * H));
    const curve = new THREE.CatmullRomCurve3(pts), TS = 40, RS = 16;
    const geo = new THREE.TubeGeometry(curve, TS, 1, RS, false), pos = geo.attributes.position, cols = [];
    const deep = new THREE.Color(C.wave ?? 0x2a9ee8), light = new THREE.Color(C.wave2 ?? 0x9ae8ff);
    for (let i = 0; i < pos.count; i++) {
      const u = Math.floor(i / (RS + 1)) / TS, c = curve.getPointAt(u), r = 0.09 * H * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.02 * H;
      pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * W / 0.12 * r / H, c.y + (pos.getY(i) - c.y) * r, c.z + (pos.getZ(i) - c.z) * r);
      const col = deep.clone().lerp(light, u); cols.push(col.r, col.g, col.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    TO.add(inked(geo, mat('wave', 0xffffff, { vertexColors: true, rim: 1 }), OL * 0.6));
    // foam blobs along the lip of the curl
    const foam = mat('foam', 0xffffff), fp = [];
    for (let k = 0; k < 9; k++) {
      const x = (k / 8 - 0.5) * W * 1.7, q = curve.getPointAt(0.9 + Math.sin(k * 2.3) * 0.04), g = sphere(0.06 * H * (0.8 + ((k * 7) % 3) * 0.2));
      g.translate(x, q.y + 0.02 * H, q.z);
      fp.push(g);
    }
    TO.add(inked(mergeGeometries(fp), foam, OL * 0.4));
  }

  // a little whirlwind spinning behind it, wrapped in streaks and a couple of upward-falling leaves
  if (P.tornado) {
    const s = P.tornado, H = B.h * 1.25 * s, prof = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(B.w * (0.1 + 0.75 * t ** 1.5) * s, t * H)); }
    const tex = getStreakTex();
    const mk = (sc, op) => {
      const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), new THREE.MeshBasicMaterial({ map: tex, color: C.wind ?? 0x8fd0ff, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }));
      m.scale.setScalar(sc);
      return m;
    };
    const g = new THREE.Group(), g2 = new THREE.Group();
    g.add(mk(1, 0.95)); g2.add(mk(0.7, 0.8)); g2.rotation.y = 1;
    for (let k = 0; k < 3; k++) {
      const lf = inked(leafGeo().scale(0.2 * s, 0.2 * s, 0.26 * s), cr.mats.accent, OL * 0.4), a = k * 2.1, t = 0.35 + k * 0.25;
      lf.position.set(Math.cos(a) * B.w * (0.14 + 0.75 * t ** 1.5) * s, t * H, Math.sin(a) * B.w * (0.14 + 0.75 * t ** 1.5) * s);
      lf.rotation.set(0.6, a, 0.4);
      g.add(lf);
    }
    g.userData.spin = 7; g.userData.axis = 'y'; g2.userData.spin = -11; g2.userData.axis = 'y';
    const base = new THREE.Group();
    base.position.set(0, -0.05, -B.w * 0.85); base.rotation.x = -0.3;
    base.add(g, g2);
    cr.torso.add(base);
    (cr.spinners ||= []).push(g, g2);
    if (cr.tail) cr.tail.visible = false; // the whirlwind is its tail now
  }

  // tesla-coil antennae on the bell: two glowing tips with a bolt arcing between them (spun so it crackles)
  if (P.antennae) {
    const s = P.antennae, stalk = mat('stalk', C.dark), parts = [];
    const tips = [-1, 1].map((x) => v(x * headR * 0.62 * s, headR * (1.2 + 0.62 * s), -headR * 0.05));
    for (const [i, x] of [-1, 1].entries()) {
      const a = v(x * headR * 0.3, headR * 1.05, -headR * 0.05), m = v(x * headR * 0.36 * s, headR * (1.1 + 0.35 * s), -headR * 0.05);
      parts.push(seg(a, m, headR * 0.05, headR * 0.04), seg(m, tips[i], headR * 0.04, headR * 0.03));
      for (let k = 0; k < 3; k++) { const r = new THREE.TorusGeometry(headR * (0.09 - k * 0.012), headR * 0.022, 5, 12); r.rotateX(Math.PI / 2); const p = m.clone().lerp(tips[i], 0.25 + k * 0.25); r.translate(p.x, p.y, p.z); parts.push(r.toNonIndexed()); }
    }
    SK.add(inked(mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g))), stalk, OL * 0.4));
    const glowM = new THREE.MeshBasicMaterial({ color: C.bolt ?? 0xffe14d });
    const haloM = new THREE.MeshBasicMaterial({ color: C.bolt ?? 0xffe14d, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const t of tips) {
      const b = new THREE.Mesh(sphere(headR * 0.15 * s), glowM), h = new THREE.Mesh(sphere(headR * 0.3 * s), haloM);
      b.position.copy(t); h.position.copy(t);
      cr.skull.add(b, h);
      (cr.glows ||= []).push(b);
    }
    // the arc: a zigzag bolt laid between the tips, spun around that axis
    const bg = boltGeo(); bg.translate(-0.05, -0.3, 0);
    const arc = new THREE.Group(), bolt = new THREE.Mesh(bg, glowM);
    const span = tips[1].x - tips[0].x;
    bolt.rotation.z = Math.PI / 2; bolt.scale.set(0.6 * s, span / 0.6, 0.6 * s);
    arc.add(bolt);
    arc.position.set(0, tips[0].y, tips[0].z);
    arc.userData.spin = 13; arc.userData.axis = 'x';
    cr.skull.add(arc);
    (cr.spinners ||= []).push(arc);
  }

  // a mantle of glacier ice: a jagged cape hanging from the shoulders, wrapped round the back, with a frost collar
  if (P.icecape) {
    const s = P.icecape, W = B.w * B.chubby * 1.7 * s, L = B.h * 1.0 * s, sh = new THREE.Shape();
    sh.moveTo(-W * 0.5, 0); sh.lineTo(W * 0.5, 0);
    const n = 7;
    for (let k = 0; k <= n; k++) { const x = W * (0.62 - (k / n) * 1.24), y = -L * (k % 2 ? 0.78 : 1) * (1 - Math.abs(k / n - 0.5) * 0.35); sh.lineTo(x, y); }
    sh.lineTo(-W * 0.5, 0);
    const geo = new THREE.ShapeGeometry(sh, 4), pos = geo.attributes.position;
    // wrap it round the back: bend x around a cylinder behind the body
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), d = -pos.getY(i) / L, R = B.w * (0.8 + d * 0.3) * B.chubby, a = x / (B.w * 0.8 * B.chubby); // flares out toward the hem
      pos.setXYZ(i, Math.sin(a) * R, pos.getY(i), -Math.cos(a) * R - 0.02 - d * 0.1 * s);
    }
    geo.computeVertexNormals();
    const cm = toon(C.crystal ?? 0xb8f4ff, { uniforms: U, side: THREE.DoubleSide, rim: 1 });
    cr.mats.g_cape = cm;
    const g = new THREE.Group(); g.add(new THREE.Mesh(geo, cm)); // a curved sheet: no ink hull, the rim light edges it
    g.position.y = B.h * 0.92;
    TO.add(g);
    // frost collar: ice shards standing up round the neck
    const gem = (r, h) => { const q = new THREE.OctahedronGeometry(r, 0); q.scale(1, h / r, 1); q.translate(0, h * 0.5, 0); return q; }, parts = [];
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.35 + (k / 8) * 1.3), q = gem(0.06 * s, (0.2 + (k % 2) * 0.1) * s);
      q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, v(Math.sin(a) * 0.5, 1, Math.cos(a) * 0.5).normalize()));
      q.translate(Math.sin(a) * B.w * 0.62 * B.chubby, B.h * 0.92, Math.cos(a) * B.w * 0.56);
      parts.push(q);
    }
    TO.add(inked(mergeGeometries(parts), mat('crystal', C.crystal ?? C.accent, { rim: 1 }), OL * 0.5));
  }

  // glowing sound-wave arcs ringing out beside the ears
  if (P.soundwaves) {
    const s = P.soundwaves, wm = new THREE.MeshBasicMaterial({ color: C.wave ?? 0x9af0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const x of [-1, 1]) for (let k = 0; k < 3; k++) {
      const r = headR * (0.22 + k * 0.17) * s, arc = new THREE.Mesh(new THREE.TorusGeometry(r, headR * 0.035 * s, 5, 18, 1.5), wm);
      arc.rotation.set(0, x > 0 ? 0 : Math.PI, -0.75);
      arc.position.set(x * headR * (1.05 + 0.02 * k), headR * 0.9, -headR * 0.05);
      SK.add(arc);
    }
  }

  // castle battlements along the top of the shell, with a little pennant flying from a turret
  if (P.battlements) {
    const s = P.battlements, rm = mat('rock', C.rock ?? 0x6e6258, { rim: 0.6 }), parts = [];
    const R = B.w * B.chubby * 0.52, y0 = B.h * 0.98;
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.62 + (k / 8) * 0.76), box = new THREE.BoxGeometry(0.13 * s, (k % 2 ? 0.1 : 0.2) * s, 0.12 * s);
      box.rotateY(a); box.translate(Math.sin(a) * R, y0 + (k % 2 ? 0.05 : 0.1) * s, Math.cos(a) * R);
      parts.push(box.toNonIndexed());
    }
    const wall = new THREE.CylinderGeometry(R * 1.02, R * 1.08, 0.12 * s, 20, 1, true, Math.PI * 0.6, Math.PI * 0.8); wall.translate(0, y0 - 0.02 * s, 0);
    parts.push(wall.toNonIndexed());
    const tower = new THREE.CylinderGeometry(0.09 * s, 0.11 * s, 0.36 * s, 8); tower.translate(0, y0 + 0.12 * s, -R * 0.98);
    parts.push(tower.toNonIndexed());
    TO.add(inked(mergeGeometries(parts), rm, OL * 0.5));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.34 * s, 5), cr.mats.dark);
    pole.position.set(0, y0 + 0.46 * s, -R * 0.98);
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.22 * s, 3), mat('flag', C.flag ?? 0xff5a5a));
    flag.rotation.z = -Math.PI / 2; flag.scale.set(1, 1, 0.3); flag.position.set(0.11 * s, y0 + 0.56 * s, -R * 0.98);
    TO.add(pole, flag);
  }

  // a ring of flames round the face like the corona of a sun (animated with the other flames)
  if (P.sunmane) {
    const s = P.sunmane, n = 11;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, g = new THREE.Group();
      if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) < 0) continue; // keep clear under the chin
      g.position.set(Math.sin(a) * headR * 0.92, Math.cos(a) * headR * 0.88, -headR * 0.25);
      g.rotation.z = -a;
      const outer = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flame ?? 0xff7a1e }));
      const inner = new THREE.Mesh(flameGeo(), new THREE.MeshBasicMaterial({ color: C.flameIn ?? 0xfff6a0 }));
      outer.userData.base = 0.36 * s; inner.userData.base = 0.22 * s; inner.position.set(0, 0.02, 0.03);
      g.add(outer, inner);
      cr.flames.push(outer, inner);
      cr.skull.add(g);
    }
  }

  flatten(SK); flatten(TO);
}

// merge every mesh under g into one mesh per material, baked into g's local space
function flatten(g) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(), buckets = new Map();
  g.traverse((o) => {
    if (!o.isMesh) return;
    let b = buckets.get(o.material);
    if (!b) buckets.set(o.material, b = { hull: !!o.userData.hull, geos: [] });
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const a of Object.keys(geo.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'uv' && !(a === 'color' && o.material.vertexColors)) geo.deleteAttribute(a);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    b.geos.push(geo);
  });
  let merged;
  try { merged = [...buckets].map(([m, b]) => { const mesh = new THREE.Mesh(mergeGeometries(b.geos), m); mesh.userData.hull = b.hull; mesh.castShadow = !b.hull && !m.transparent; return mesh; }); } catch (e) { return; }
  if (!merged.length || merged.some((m) => !m.geometry)) return;
  for (const c of [...g.children]) g.remove(c);
  g.add(...merged);
}

let streakTex = null;
// diagonal white wind streaks on a clear background, wrapped around the whirlwind
function getStreakTex() {
  return (streakTex ||= canvasTex(256, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.strokeStyle = '#fff'; c.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      c.globalAlpha = 0.5 + (k % 3) * 0.25; c.lineWidth = 5 + (k % 4) * 3;
      const x = (k / 14) * w, y = ((k * 37) % h);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 70, y - 26); c.stroke();
      c.beginPath(); c.moveTo(x - w, y); c.lineTo(x - w + 70, y - 26); c.stroke();
    }
  }, { repeat: [2, 1] }));
}
