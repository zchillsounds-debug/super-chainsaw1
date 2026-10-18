// Adventure interiors: every house, Berry Center, lab and shop in the world can be walked into.
// A room is a small tile map built on demand from the building it belongs to ('in:<map>:<building id>').
// Tiles: W wall, C shelf, X machine (arcade cabinet, smoothie blender, lab console), Q bed, D table,
// O potted plant, K counter (talk across it), Y rug (walkable), H hat stand (Hat Shop). Walking south off the doormat goes back out.
import { MAPS } from './worldmaps.js';
import { CUPS, CRITTERS } from './data.js';

// stadium lobby trophy cases, left to right, in story order
export const CUP_ORDER = ['sprout', 'thunder', 'grove', 'champion', 'midnight', 'sky', 'legend'];

const ROOMS = {
  house: [
    'WWWWWWWWWWW',
    'WCCX....OQW',
    'W........QW',
    'W..DD.....W',
    'W..DD.YYY.W',
    'W.....YYY.W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  center: [
    'WWWWWWWWWWWWW',
    'WCC.......XCW',
    'W...KKKKK...W',
    'W...........W',
    'WDD.......DDW',
    'W....YYY....W',
    'WO...YYY...OW',
    'WWWWWW.WWWWWW',
  ],
  lab: [
    'WWWWWWWWWWWWW',
    'WCCCX...XCCCW',
    'W...........W',
    'W..DD...DD..W',
    'W...........W',
    'W.....YYY...W',
    'WO....YYY..OW',
    'WWWWWW.WWWWWW',
  ],
  shop: [
    'WWWWWWWWWWW',
    'WHHH...HHHW',
    'W...KKK...W',
    'W.........W',
    'WH.......HW',
    'W...YYY...W',
    'WO..YYY..OW',
    'WWWWW.WWWWW',
  ],
  lobby: [
    'WWWWWWWWWWWWWWW',
    'WUUUU.....UUUOW',
    'W.....KKK.....W',
    'W.............W',
    'WDD.........DDW',
    'W.....YYY.....W',
    'WO....YYY....OW',
    'WWWWWWW.WWWWWWW',
  ],
  arcade: [
    'WWWWWWWWWWWWW',
    'WXXX.....XXXW',
    'W...........W',
    'WX....D....XW',
    'WX.........XW',
    'W....YYY....W',
    'WO...YYY...OW',
    'WWWWWW.WWWWWW',
  ],
};

// who lives where: [critter, name, lines, dir, x, y]; plus furniture text
const PEOPLE = {
  'village:home': { npcs: [], wall: '#ffe2c8', rug: '#ff8a7a' },
  'village:house2': { npcs: [['woolt', 'Grandpa Woolt', ['Grandpa Woolt: Baaah, back in my day we battled uphill, both ways, in the snow!', "Grandpa Woolt: Here's a secret: dodge THROUGH an attack, not away from it. You're safe while you roll."], 's', 3, 2]], wall: '#d8e8ff', rug: '#7aa8ff' },
  'village:lab': { npcs: [['hootsy', 'Aide Hoot', ['Aide Hoot: Hoo! Welcome to the Pecan Lab. The professor studies how critters GROW.', 'Aide Hoot: Win enough battles and a critter gets bigger and stronger. The professor calls it growth. I call it a growth spurt!'], 's', 6, 2]], wall: '#e8f0f8', rug: '#8ad8c8' },
  'bloom:berry': { visitor: ['clovebun', 'Hopper Bea', ['Hopper Bea: The berry smoothies here are the best in Clashara. I come in even when I\'m not hurt!'], 'w', 9, 4] },
  'bloom:house3': { npcs: [['emberfly', 'Firefly Flo', ['Firefly Flo: Bzz! My big brother lost to the Sprout Cup three times. Then he trained in the tall grass and WON!', 'Firefly Flo: Wild critters give you lots of XP. That\'s how you grow!'], 'e', 2, 5]], wall: '#fff0b8', rug: '#ffb030' },
  'bloom:hats': { npcs: [['woolt', 'Milliner Mo', [], 's', 5, 1, 'hatshop']], kind: 'shop', wall: '#f0e0ff', rug: '#b08aff' },
  'seashell:berry2': { visitor: ['ripples', 'Diver Kai', ['Diver Kai: I dive for shells every day. The water critters around here are SO quick.'], 'e', 3, 4] },
  'seashell:hut': { npcs: [['bubbalotl', 'Captain Coral', ['Captain Coral: Arr! This hut used to be a boat. Then it sank. Then I dragged it up the beach.', 'Captain Coral: Spark critters zap water critters hard. Mind the Thunder Cup!'], 's', 6, 2]], wall: '#c8f0f0', rug: '#3ac8c8' },
  'glowcap:berry3': { visitor: ['lilypop', 'Moss Kid', ['Moss Kid: The Berry Center here grows its berries on glowcaps. They taste a bit like moonlight.'], 'w', 9, 4], wall: '#e8d8ff' },
  'glowcap:shroom1': { npcs: [['snoozlo', 'Snoozy Sal', ['Snoozy Sal: ...zzz... shh. The mushrooms are sleeping. ...zzz...', 'Snoozy Sal: ...if you nap with a critter... you become friends... zzz...'], 'e', 3, 2]], wall: '#e0d0ff', rug: '#8a6aff' },
  'glowcap:shroom2': { npcs: [['squeakwing', 'Auntie Squeak', ['Auntie Squeak: You\'re the one who brought little Pip home! Squeak squeak! The whole family is talking about you.', 'Auntie Squeak: Gust critters blow leaf critters away. Bats know these things.'], 's', 7, 2]], wall: '#d0fff0', rug: '#2fd8b8' },
  'ember:berry4': { visitor: ['kindlekit', 'Ash', ['Ash: The nurse makes her smoothies with ice from Frostpeak. That\'s the only cold thing in Cinder Town!'], 'e', 3, 4] },
  'ember:forge': { npcs: [['rolladillo', 'Smith Anvil', ['Smith Anvil: CLANG! CLANG! Oh, hello! I make the trophies for the Champion Cup.', 'Smith Anvil: Stone critters shrug off fire. Fire critters melt leaf. Leaf critters crack stone. Simple!'], 's', 6, 2]], wall: '#e8c8a8', rug: '#c8603a' },
  'neon:arcade': { npcs: [['jiggawatt', 'Gamer Volt', ['Gamer Volt: High score! ...Oh, you\'re not here to watch? Nobody ever is.', 'Gamer Volt: Pro tip: a super move freezes the whole arena. Use it when your foe is close!'], 's', 6, 2], ['voltferret', 'Pixel', ['Pixel: I\'ve played this cabinet for nine hours. I think I can see in pixels now.'], 'n', 3, 4]], kind: 'arcade', wall: '#3a2a5a', rug: '#ff5ad8', dark: true },
  'neon:berry5': { visitor: ['jiggawatt', 'Night Owl', ['Night Owl: This Berry Center never closes. Neither does the Midnight Stadium!'], 'w', 9, 4], wall: '#e8e0ff' },
  'neon:tower2': { npcs: [['whirlwhisk', 'Sky Lin', ['Sky Lin: From the top of this tower you can see Captain Puff\'s balloon in the east.', 'Sky Lin: Captain Puff only flies critters who\'ve won the Midnight Cup. House rules!'], 's', 5, 2]], wall: '#d0e8ff', rug: '#5ad8ff' },
  'cloudtop:berry6': { visitor: ['whirlwhisk', 'Breeze', ['Breeze: The nurse up here is the highest nurse in all of Clashara. Literally!'], 'e', 3, 4] },
  'frostpeak:berry7': { visitor: ['pengsicle', 'Snowy', ['Snowy: Warm smoothies? In Frostpeak they make them HOT. Wonderful!'], 'w', 9, 4] },
  'frostpeak:lodge': { npcs: [['woolt', 'Lodge Keeper Fleece', ['Lodge Keeper Fleece: Come in, come in, out of the snow! The fire is lovely and warm.', 'Lodge Keeper Fleece: Many critters have climbed to the Peak. Only one gets the Crown.'], 's', 3, 2]], wall: '#e8d0b0', rug: '#5a8ad8' },
};

const ITEMS = {
  C: 'A shelf full of books about critters. One is called "So Your Critter Grew Three Sizes".',
  X: 'It hums and blinks. Better not touch anything.',
  Q: 'A comfy bed with a fluffy pillow.',
  D: 'A table with a bowl of berries on it.',
  O: 'A happy little plant. It looks well watered.',
  H: 'A hat stand.',
  U: 'A trophy case.',
};

export function interiorMap(key) {
  const [, outer, bid] = key.split(':');
  const O = MAPS[outer], b = O?.buildings?.find((x) => x.id === bid);
  if (!b) return null;
  const P = PEOPLE[`${outer}:${bid}`] || {};
  const kind = P.kind || (b.stadium ? 'lobby' : b.heal ? 'center' : b.lab ? 'lab' : 'house');
  const tiles = ROOMS[kind];
  const W = tiles[0].length, H = tiles.length, door = tiles[H - 1].indexOf('.');
  const npcs = (P.npcs || []).map(([critter, name, lines, dir, x, y, story], k) => ({ id: 'in' + k, critter, name, lines, dir, x, y, wander: story ? 0 : 1, story }));
  if (b.stadium) { // a front desk to sign up for the cup, and two fans who can't wait
    const cup = CUPS.find((c) => c.id === b.stadium), m = cup.matches;
    npcs.push({ id: 'desk', critter: 'hootsy', name: 'Front Desk', dir: 's', x: 7, y: 1, story: 'cupdesk' });
    npcs.push({ id: 'fan1', critter: m[0].critter, name: 'Fan', dir: 'e', x: 3, y: 3, act: 'cheer', lines: [`Fan: ${m[0].name} is my favourite! Their ${CRITTERS.find((c) => c.id === m[0].critter).name} is first up in the ${cup.name}.`, `Fan: ${m.length} battles in a row. No breaks! That's the ${cup.name}.`] });
    npcs.push({ id: 'fan2', critter: m[m.length - 1].critter, name: 'Fan', dir: 'w', x: 11, y: 3, act: 'wave', lines: [`Fan: Nobody beats ${m[m.length - 1].name}. Nobody! ...Well, almost nobody.`, 'Fan: The posters on the wall are this season\'s line-up. Collect them all!'] });
  }
  if (b.heal) {
    npcs.push({ id: 'nurse', critter: 'lilypop', name: 'Nurse Lilypop', dir: 's', x: (W - 1) / 2, y: 1, story: 'nurse' });
    if (P.visitor) { const [critter, name, lines, dir, x, y] = P.visitor; npcs.push({ id: 'visitor', critter, name, lines, dir, x, y }); }
  }
  // furniture you can look at (A in front of it); the hero's own bed at home is a rest point
  const signs = [];
  tiles.forEach((row, y) => [...row].forEach((t, x) => {
    if (!ITEMS[t]) return;
    let text = ITEMS[t];
    if (t === 'X' && kind === 'arcade') text = 'An arcade cabinet: CRITTER CLASH TURBO. The high score is 999,999 by "VOLT".';
    if (t === 'X' && kind === 'center') text = 'A berry smoothie blender. It smells like strawberries.';
    if (t === 'C' && kind === 'center') text = 'Jars of berries line the shelf: strawberry, blueberry, glowberry...';
    if (t === 'C' && kind === 'center' && x === 1) { signs.push({ x, y, text: '', hide: true, act: 'board' }); return; }
    if (t === 'X' && kind === 'lab') text = 'A screen shows a growing critter: small, medium, HUGE.';
    if (t === 'C' && bid === 'home') { signs.push({ x, y, text: '', hide: true, act: 'wardrobe' }); return; }
    if (t === 'C' && kind === 'shop') text = 'Hat boxes, stacked to the ceiling. One is labelled "EXTRA FLOPPY".';
    if (t === 'U') { const n = [...row].slice(0, x).filter((c) => c === 'U').length; signs.push({ x, y, text, hide: true, act: 'case:' + CUP_ORDER[n] }); return; }
    signs.push({ x, y, text, hide: true, act: t === 'Q' && bid === 'home' ? 'rest' : t === 'X' && kind === 'center' ? 'smoothie' : t === 'H' ? 'hatshop' : null });
  }));
  return {
    cup: b.stadium,
    name: b.label || (b.id === 'home' ? 'Home' : 'House'),
    indoor: kind, tiles, npcs, signs, music: O.music,
    exit: { map: outer, x: b.x + b.door, y: b.y + b.h, dir: 's' },
    enter: { x: door, y: H - 2 },
    palette: P.dark ? { a: '#4a3a6a', b: '#46365f' } : { a: '#d8a86a', b: '#d2a264' },
    wall: P.wall || (b.stadium ? '#f4ecff' : b.heal ? '#ffe0ec' : '#fff1d8'), rug: P.rug || (b.stadium ? CUPS.find((c) => c.id === b.stadium).color : b.heal ? '#ff7aa8' : '#7aa8ff'),
    outer: 0x3a2a2a, // a warm dusk around the room, not a black void
    mood: P.dark ? { sun: 0xd0b0ff, sunI: 1.1, sky: 0xb09aff, gnd: 0x3a2a4a, hemiI: 1.2, fog: 0x1a1410 } : { sun: 0xfff0d8, sunI: 1.3, sky: 0xfff4e0, gnd: 0x8a6a4a, hemiI: 1.25, fog: 0x1a1410 },
  };
}

const rooms = {};
export const getMap = (key) => MAPS[key] || (key?.startsWith('in:') ? (rooms[key] ||= interiorMap(key)) : null);
