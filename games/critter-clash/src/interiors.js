// Adventure interiors: every house, Berry Center, lab and shop in the world can be walked into.
// A room is a small tile map built on demand from the building it belongs to ('in:<map>:<building id>').
// Tiles: W wall, p fossil plinth (the museum), C shelf, X machine (arcade cabinet, smoothie blender, lab console), Q bed, D table,
// O potted plant, K counter (talk across it), Y rug (walkable), H hat stand (Hat Shop). Walking south off the doormat goes back out.
import { MAPS } from './worldmaps.js';
import { save } from './save.js';
import { CUPS, CRITTERS, cupById } from './data.js';
const shade = (hex, k) => { const n = parseInt(String(hex).replace('#', ''), 16); return (Math.round((n >> 16 & 255) * k) << 16) | (Math.round((n >> 8 & 255) * k) << 8) | Math.round((n & 255) * k); }; // a colour, dimmed

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
  // a Glowcap toadstool home: toadstool stools round the table, more glowcap lamps
  toad: [
    'WWWWWWWWWWW',
    'WCCX....OQW',
    'WO.......QW',
    'W.JDDJ....W',
    'W..DD.YYY.W',
    'W.....YYY.W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  // a Neon City high-rise flat: a telescope at the window and a squashy beanbag
  flat: [
    'WWWWWWWWWWW',
    'WCCX..N.OQW',
    'W........QW',
    'W..DD..E..W',
    'W..DD.YYY.W',
    'W.....YYY.W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  center: [
    'WWWWWWWWWWWWW',
    'WCCo.....oXCW',
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
  forge: [
    'WWWWWWWWWWW',
    'WFF....CC.W',
    'W.........W',
    'W..A......W',
    'W......DD.W',
    'W.....YYY.W',
    'WO....YYYOW',
    'WWWWW.WWWWW',
  ],
  lodge: [
    'WWWWWWWWWWW',
    'WCCIFFL.OQW',
    'W..MYY...QW',
    'W..DD.....W',
    'W..DD.....W',
    'W.........W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  cabin: [
    'WWWWWWWWWWW',
    'WCC..b..anW',
    'W........nW',
    'W..DD.....W',
    'Wb.DD.YYY.W',
    'W.....YYY.W',
    'WO..q....bW',
    'WWWWW.WWWWW',
  ],
  home: [
    'WWWWWWWWWWW',
    'WCC.SX..OQW',
    'W........QW',
    'W..DD.....W',
    'W..DD.YYY.W',
    'W.....YYY.W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  cottage: [
    'WWWWWWWWWWW',
    'WCC.G...OQW',
    'W........QW',
    'W.r.......W',
    'W.k...DD..W',
    'W.....DD..W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  kidroom: [
    'WWWWWWWWWWW',
    'WC..j...OQW',
    'W........QW',
    'W...YYY...W',
    'W...YYY..tW',
    'W.........W',
    'WO.......OW',
    'WWWWW.WWWWW',
  ],
  shop: [
    'WWWWWWWWWWW',
    'WHHH...HHHW',
    'W...KKK...W',
    'WV.......ZW',
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
  tower: [ // the Battle Tower hall (Starfall Atoll): the Tower Master's counter, a long rug, plants and tables for the fans
    'WWWWWWWWWWWWWWW',
    'WO...........OW',
    'W.....KKK.....W',
    'W.............W',
    'WD....YYY....DW',
    'W.....YYY.....W',
    'WO....YYY....OW',
    'WWWWWWW.WWWWWWW',
  ],
  // the Sunwell Museum: twelve fossil plinths (p), a curator's desk, and a sand-coloured rug
  museum: [
    'WWWWWWWWWWWWW',
    'Wp.p.p.p.p.pW',
    'W...........W',
    'W.p.p...p.p.W',
    'W...........W',
    'W.p..YYY..p.W',
    'WO...YYY...OW',
    'WWWWWW.WWWWWW',
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
  'village:home': { npcs: [], kind: 'home', name: 'Home', wall: '#ffe2c8', rug: '#ff8a7a' },
  'village:house2': { npcs: [['woolt', 'Grandpa Woolt', ['Grandpa Woolt: Baaah, back in my day we battled uphill, both ways, in the snow!', "Grandpa Woolt: Here's a secret: dodge THROUGH an attack, not away from it. You're safe while you roll.", 'Grandpa Woolt: That clock? It was a prize from the very first Sprout Cup. It still keeps perfect time. Mostly.'], 's', 3, 2]], kind: 'cottage', name: "Grandpa's Cottage", wall: '#e8dcc8', rug: '#a86a8a', floor: { a: '#b88a5a', b: '#b28454' } },
  'village:lab': { npcs: [['hootsy', 'Aide Hoot', ['Aide Hoot: Hoo! Welcome to the Pecan Lab. The professor studies how critters GROW.', 'Aide Hoot: Win enough battles and a critter gets bigger and stronger. The professor calls it growth. I call it a growth spurt!'], 's', 6, 2]], wall: '#e8f0f8', rug: '#8ad8c8' },
  'bloom:berry': { visitor: ['clovebun', 'Hopper Bea', ['Hopper Bea: The berry smoothies here are the best in Clashara. I come in even when I\'m not hurt!'], 'w', 9, 4] },
  'bloom:house3': { npcs: [['emberfly', 'Firefly Flo', ['Firefly Flo: Bzz! My big brother lost to the Sprout Cup three times. Then he trained in the tall grass and WON!', 'Firefly Flo: Wild critters give you lots of XP. That\'s how you grow!', 'Firefly Flo: Those are my glow friends in the jar. I let them out every morning! They always come back.'], 'e', 2, 5, 'lost:blink']], kind: 'kidroom', name: "Flo's Room", wall: '#fff0b8', rug: '#ffb030' },
  'bloom:hats': { npcs: [['woolt', 'Milliner Mo', [], 's', 5, 1, 'hatshop']], kind: 'shop', wall: '#f0e0ff', rug: '#b08aff' },
  'seashell:berry2': { visitor: ['ripples', 'Diver Kai', ['Diver Kai: I dive for shells every day. The water critters around here are SO quick.'], 'e', 3, 4] },
  'seashell:hut': { npcs: [['bubbalotl', 'Captain Coral', ['Captain Coral: Arr! This hut used to be a boat. Then it sank. Then I dragged it up the beach.', 'Captain Coral: Spark critters zap water critters hard. Mind the Thunder Cup!'], 's', 6, 2]], kind: 'cabin', name: "Captain's Hut", wall: '#c8f0f0', rug: '#3ac8c8', floor: { a: '#c89a62', b: '#c0925a' } },
  'glowcap:berry3': { visitor: ['lilypop', 'Moss Kid', ['Moss Kid: The Berry Center here grows its berries on glowcaps. They taste a bit like moonlight.'], 'w', 9, 4], wall: '#e8d8ff' },
  'glowcap:shroom1': { npcs: [['snoozlo', 'Snoozy Sal', ['Snoozy Sal: ...zzz... shh. The mushrooms are sleeping. ...zzz...', 'Snoozy Sal: ...if you nap with a critter... you become friends... zzz...'], 'e', 3, 2]], kind: 'toad', name: 'Toadstool House', wall: '#e0d0ff', rug: '#8a6aff' },
  'glowcap:shroom2': { npcs: [['squeakwing', 'Auntie Squeak', ['Auntie Squeak: You\'re the one who brought little Pip home! Squeak squeak! The whole family is talking about you.', 'Auntie Squeak: Gust critters blow leaf critters away. Bats know these things.'], 's', 7, 2]], kind: 'toad', name: 'Toadstool House', wall: '#d0fff0', rug: '#2fd8b8' },
  'ember:berry4': { visitor: ['kindlekit', 'Ash', ['Ash: The nurse makes her smoothies with ice from Frostpeak. That\'s the only cold thing in Cinder Town!'], 'e', 3, 4] },
  'ember:forge': { npcs: [['rolladillo', 'Smith Anvil', ['Smith Anvil: CLANG! CLANG! Oh, hello! I make the trophies for the Champion Cup.', 'Smith Anvil: Stone critters shrug off fire. Fire critters melt leaf. Leaf critters crack stone. Simple!', 'Smith Anvil: That furnace never goes out. Smith Ash keeps it fed from the chimney side. HAH!'], 'w', 4, 3]], kind: 'forge', name: 'Forge', floor: { a: '#8a7a74', b: '#84746e' }, wall: '#c8a48a', rug: '#c8603a' },
  'neon:arcade': { npcs: [['jiggawatt', 'Gamer Volt', ['Gamer Volt: High score! ...Oh, you\'re not here to watch? Nobody ever is.', 'Gamer Volt: Pro tip: a super move freezes the whole arena. Use it when your foe is close!', 'Gamer Volt: Try CRITTER CLASH TURBO! Gold berries are worth five red ones, and a long catch streak multiplies your score. Zaps break the streak.', 'Gamer Volt: The blue cabinets on the right are SKY HOP. Little taps, not big ones! Every pillar is 10 points.'], 's', 6, 2], ['voltferret', 'Pixel', ['Pixel: I\'ve played this cabinet for nine hours. I think I can see in pixels now.', 'Pixel: SKY HOP gets faster the further you fly. My record is... seven pillars. Don\'t tell Volt.'], 'n', 3, 4]], kind: 'arcade', wall: '#3a2a5a', rug: '#ff5ad8', dark: true },
  'neon:berry5': { visitor: ['jiggawatt', 'Night Owl', ['Night Owl: This Berry Center never closes. Neither does the Midnight Stadium!'], 'w', 9, 4], wall: '#e8e0ff' },
  'neon:tower2': { npcs: [['whirlwhisk', 'Sky Lin', ['Sky Lin: From the top of this tower you can see Captain Puff\'s balloon in the east.', 'Sky Lin: Captain Puff only flies critters who\'ve won the Midnight Cup. House rules!'], 's', 5, 2]], kind: 'flat', name: 'Sky Flat', wall: '#d0e8ff', rug: '#5ad8ff' },
  'cloudtop:berry6': { visitor: ['whirlwhisk', 'Breeze', ['Breeze: The nurse up here is the highest nurse in all of Clashara. Literally!'], 'e', 3, 4] },
  'frostpeak:berry7': { visitor: ['pengsicle', 'Snowy', ['Snowy: Warm smoothies? In Frostpeak they make them HOT. Wonderful!'], 'w', 9, 4] },
  // ---- Chapter 2: the Sunscatter Isles ----
  'oasis:hats_o': { npcs: [['fennzap', 'Hatter Zara', [], 's', 5, 1, 'hatshop']], kind: 'shop', name: 'Sand Hats', wall: '#f4e0c0', rug: '#d8643a' },
  'oasis:stadium_m': { npcs: [['humpdrop', 'Pavilion Guide Nadia', ['Pavilion Guide Nadia: Welcome to the Sunwell Pavilion! The arena floor sits right on top of the old spring.', 'Pavilion Guide Nadia: Mind the geysers. And when the fountains rise in a ring around you, stay in the dry middle. Or roll out, fast!', 'Pavilion Guide Nadia: The Keeper waters her Sizzlard every morning. It hates it. It is VERY shiny.'], 'n', 2, 5]], wall: '#f6e8d0', rug: '#1fa8b0' }, // the Mirage Stadium's lobby, in the pavilion's teal and sand
  'redrock:stadium_r': { npcs: [['scarabold', 'Rock Watcher Dun', ['Rock Watcher Dun: The Canyon Stadium has no roof. Lovely for the sun. Less lovely when the cliff drops a stone on you!', 'Rock Watcher Dun: A red ring on the floor means a rock is coming. And when the cliff rumbles, a whole line of them comes down. Step off the line!', 'Rock Watcher Dun: Chief Maro\'s Scarabold is shiny as a polished pebble. It rolled half these boulders here itself.'], 'n', 2, 5]], wall: '#f2dcc0', rug: '#c8502a' }, // the Canyon Stadium's lobby: sandstone and terracotta
  'dunecamp:stadium_s': { npcs: [['fennzap', 'Dome Keeper Yusuf', ['Dome Keeper Yusuf: Welcome to the Sandstorm Dome! The sail-cloth keeps out the sun. The sand... has its own opinions.', 'Dome Keeper Yusuf: When a little twister spins up on the floor, step away. When the whole dome howls, the sand blows sideways. Lean into it!', "Dome Keeper Yusuf: Warden Rasha's Siroccat is shiny as a new coin. It rides the wind like a kite."], 'n', 2, 5]], wall: '#f4e4c4', rug: '#c8862a' }, // the Sandstorm Dome's lobby: canvas and rust
  'dunecamp:berry_c': { visitor: ['humpdrop', 'Caravan Cook Safi', ['Caravan Cook Safi: Date smoothies! The camp\'s Berry Center runs on dates. And sand. Mostly dates.'], 'w', 9, 4], wall: '#fff0e4' },
  'dunecamp:tent_w': { npcs: [['cactortle', 'Weaver Tamar\'s Apprentice', ["Weaver's Apprentice: Teal and cream, teal and cream. I've woven eleven tents this year. My Cactortle has woven zero. It keeps eating the thread.", "Weaver's Apprentice: The Dust Devils asked us to weave them a tent. All black. We said no. They bought cheap cloth from the canyon instead."], 's', 4, 2]], wall: '#f4e4c4', rug: '#1fa8b0' },
  'dunecamp:tent_s': { npcs: [['siroccat', 'Stargazer Nuri\'s Sister', ["Stargazer Lila: Nuri counts the stars. I count the sandstorms. Seven this month!", "Stargazer Lila: Old songs say the buried city's gate opens only when the sun stone is whole again. The Dust Devils have been asking about that song a lot."], 's', 4, 2]], wall: '#f6e8cc', rug: '#d8643a' },
  'dunecamp:hq_c': { npcs: [['siroccat', 'Dust Devil Cook', [], 's', 6, 2, 'devilmap']], wall: '#5a3a32', rug: '#ffb040', dark: true }, // the cook gives up the Baron's map (citymap)
  'oasis:museum_o': { npcs: [['cactortle', 'Curator Petra', [], 's', 6, 2, 'museum']], kind: 'museum', name: 'Sunwell Museum', wall: '#f4e4c4', rug: '#2aa8a0' },
  'oasis:berry_o': { visitor: ['humpdrop', 'Traveller Idris', ['Traveller Idris: Humpdrop stores water in its humps, so it never gets thirsty on the dunes. I wish I had humps.'], 'w', 9, 4], wall: '#fff0dc' },
  'coral:hats_c': { npcs: [['toucharge', 'Shellkeeper Sandy', [], 's', 5, 1, 'hatshop']], kind: 'shop', name: 'Shell Hats', wall: '#dff8f4', rug: '#3ad0c0' },
  'coral:berry_c': { visitor: ['blowfin', 'Puffy Pua', ['Puffy Pua: The smoothies here come with a little paper umbrella. Blowfin always tries to eat it.'], 'w', 9, 4], wall: '#ffe8f0' },
  'coral:cottage_c': { npcs: [['smokeshell', 'Grandma Kalani', ['Grandma Kalani: Welcome, mainlander! My Smokeshell keeps the cottage nice and toasty. A bit too toasty, some days.', 'Grandma Kalani: Fire critters love the volcano on Ember Isle. Bring a water critter if you go to the Caldera Cup!', 'Grandma Kalani: In my day the Starfall lighthouse shone every night. Sailors could always find home. Now... nothing but dark.'], 'e', 3, 2]], wall: '#fff0dc', rug: '#ffa64a' },
  'bluffs:berry_g': { visitor: ['skimray', 'Glider Noe', ['Glider Noe: The nurse ties every smoothie cup down with string. Up here, they blow away otherwise!'], 'e', 3, 4], wall: '#e4f4ff' },
  'atoll:hideout_a': { npcs: [ // the Gloom Gull hideout; after the finale, Morra turns it into the Battle Tower
    ['hootsy', 'Gloom Gull Noddy', ['Gloom Gull Noddy: Caw! This is the Gloom Gull hideout! Members only! ...Do you want to be a member? We have snacks.', 'Gloom Gull Noddy: Captain Morra is up at the lighthouse. She is VERY scary. I am only a bit scary.'], 's', 7, 3, null, '!sunstone'],
    ['toucharge', 'Tower Master Morra', [], 's', 7, 1, 'tower', 'sunstone', { shiny: true, scale: 1.15 }],
    ['hootsy', 'Tower Fan Noddy', ['Tower Fan Noddy: Caw! The captain says battling is a better hobby than stealing the sun. I agree! Mostly.', 'Tower Fan Noddy: Seven wins in a row and the captain herself steps in. Her Toucharge is SHINY. And mean.'], 'e', 2, 3, null, 'sunstone'],
    ['squeakwing', 'Tower Fan Petra', ['Tower Fan Petra: I watch every streak. The best ever? Somebody got to twelve. Then sneezed. Then lost.', 'Tower Fan Petra: Rest at the Port Coral Berry Center between streaks! Your streak waits for you.'], 'w', 12, 3, null, 'sunstone'],
  ], kind: 'tower', wall: '#e4dccc', rug: '#3a5aa8' },
  'bluffs:loft_g': { npcs: [['whirlwhisk', 'Apprentice Nalu', ['Apprentice Nalu: Welcome to the Kite Loft! Every kite on the Bluffs was stitched right here.', 'Apprentice Nalu: The secret is a long tail. A kite without a tail spins like a Whirlwhisk. I would know.', 'Apprentice Nalu: Kitemaker Hana? She\'s out at the south cliff edge, testing kites in the updraft. She practically lives there.'], 's', 5, 2]], kind: 'kidroom', name: 'Kite Loft', wall: '#e0f0ff', rug: '#5ab8ff' },
  'ember_isle:berry_e': { visitor: ['smokeshell', 'Toasty Keoni', ["Toasty Keoni: The nurse chills the smoothies in a bucket of sea water. On Ember Isle, that's the fanciest fridge there is."], 'w', 9, 4], wall: '#ffe8e0' },
  'ember_isle:shack_e': { npcs: [['blowfin', 'Surfer Malia', ['Surfer Malia: Ash surfs lava on a stone board. I surf WATER, like a normal person. Wanna see my board? It has a shark on it.', "Surfer Malia: Water critters soak fire critters. If you're going up against Magda, bring a splash!", 'Surfer Malia: At night you can see the crater glow from the beach. Spooky. Pretty, but spooky.'], 'e', 3, 2, 'surf']], kind: 'cabin', name: 'Surf Shack', wall: '#fff0d0', rug: '#ff8a3a', floor: { a: '#c89a62', b: '#c0925a' } },
  'ember_isle:lab_e': { npcs: [['toucharge', 'Assistant Pele', ['Assistant Pele: Welcome to the Volcano Lab! Professor Flint is at the stadium, battling. He says it counts as fieldwork.', 'Assistant Pele: Our readings say the volcano is 99% asleep. The 1% is what worries me.', 'Assistant Pele: Professor Pecan sends us letters! He wants to know how island critters grow. Bigger. They grow bigger.'], 's', 6, 2]], wall: '#e8eef0', rug: '#ff8a3a' },
  'frostpeak:lodge': { npcs: [['woolt', 'Lodge Keeper Fleece', ['Lodge Keeper Fleece: Come in, come in, out of the snow! The fire is lovely and warm.', 'Lodge Keeper Fleece: Many critters have climbed to the Peak. Only one gets the Crown.', 'Lodge Keeper Fleece: See a blue X in the snow out there? Dig! Ice gems turn up every day. Bring them to me and I\'ll pay in berries.'], 's', 7, 2]], kind: 'lodge', name: 'Mountain Lodge', wall: '#e8d0b0', rug: '#c8443a' },
};

// the museum's plinths in reading order (back row first, left to right): plinth n shows FOSSILS[n]
export const fossilAt = (tiles, x, y) => { let n = 0; for (let j = 0; j < tiles.length; j++) for (let i = 0; i < tiles[j].length; i++) { if (j === y && i === x) return n; if (tiles[j][i] === 'p') n++; } return -1; };

const ITEMS = {
  p: 'A fossil plinth.',
  C: 'A shelf full of books about critters. One is called "So Your Critter Grew Three Sizes".',
  X: 'It hums and blinks. Better not touch anything.',
  Q: 'A comfy bed with a fluffy pillow.',
  D: 'A table with a bowl of berries on it.',
  O: 'A happy little plant. It looks well watered.',
  H: 'A hat stand.',
  b: 'A barrel of salty sea biscuits. Crunchy!',
  F: 'The furnace roars. It\'s so hot your whiskers curl!',
  A: 'A heavy iron anvil, warm to the touch. There\'s a half-finished trophy on it.',
  U: 'A trophy case.',
  o: 'A pot of pink blossoms.',
  S: 'A trophy shelf.',
  G: 'A tall old clock. Tick... tock... The pendulum swings very slowly. Just like Grandpa.',
  r: 'A creaky rocking chair with a woolly blanket. Grandpa Woolt knitted it himself. Of course he did.',
  k: 'A basket of yarn balls. One has rolled under the chair.',
  j: 'A big jar of fireflies on a stool. They blink hello!',
  t: 'A toy chest. Inside: a stuffed Cindermunch, three bouncy balls and a paper crown.',
  V: 'A tall dressing mirror.',
  J: 'A toadstool stool. It\'s squishier than it looks.',
  N: 'A brass telescope pointed at the sky. Far away to the east, a balloon drifts over the clouds.',
  n: 'A canvas hammock between two posts. It swings a little when the waves are big. Captain Coral says it\'s "better than any bed".',
  a: 'The old ship\'s anchor. "Never lost it, never used it," says Captain Coral. There\'s a coil of rope beside it.',
  q: 'A sea chest, lid open: gold coins, a fat white pearl... and a note: "TREASURE (fake). Real treasure = friends." Hmm.',
  L: 'A neat stack of split logs for the fire. They smell of pine and snow.',
  M: 'A big squashy armchair facing the fire. {hero} sinks into it and almost falls asleep.',
  I: 'Two pairs of skis and poles. A tag on one says "for rent: ask Fleece".',
  E: 'A huge squashy beanbag. {hero} flops into it... and might never get up again.',
  Z: 'A tower of hat boxes tied up with ribbons. Milliner Mo says the bottom one is "not for sale. Ever."',
};

export function interiorMap(key) {
  const [, outer, bid] = key.split(':');
  const O = MAPS[outer], b0 = O?.buildings?.find((x) => x.id === bid), b = b0?.after && save.adv?.flags?.[b0.after.flag] ? { ...b0, ...b0.after } : b0; // (a building can change after a story flag)
  if (!b) return null;
  const P = PEOPLE[`${outer}:${bid}`] || {};
  const kind = P.kind || (b.stadium ? 'lobby' : b.heal ? 'center' : b.lab ? 'lab' : 'house');
  const tiles = ROOMS[kind];
  const W = tiles[0].length, H = tiles.length, door = tiles[H - 1].indexOf('.');
  const has = (f) => !f || (f[0] === '!' ? !save.adv?.flags?.[f.slice(1)] : !!save.adv?.flags?.[f]); // an 8th entry: only there once a flag is set ('!flag': until it is)
  const npcs = (P.npcs || []).map(([critter, name, lines, dir, x, y, story, need, opt], k) => ({ id: 'in' + k, critter, name, lines, dir, x, y, wander: story ? 0 : 1, story, need, ...(opt || {}) })).filter((n) => has(n.need)); // (a 9th entry: extra NPC fields, e.g. shiny)
  if (b.stadium) { // a front desk to sign up for the cup, and two fans who can't wait
    const cup = cupById(b.stadium), m = cup.matches;
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
    if (t === 'X' && kind === 'arcade') { signs.push({ x, y, text: '', hide: true, act: x > row.length / 2 ? 'arcade:hop' : 'arcade' }); return; } // CRITTER CLASH TURBO on the left wall, SKY HOP on the right (arcade.js)
    if (t === 'X' && kind === 'center') text = 'A berry smoothie blender. It smells like strawberries.';
    if (t === 'C' && kind === 'center') text = 'Jars of berries line the shelf: strawberry, blueberry, glowberry...';
    if (t === 'C' && kind === 'center' && x === 1) { signs.push({ x, y, text: '', hide: true, act: 'board' }); return; }
    if (t === 'C' && kind === 'center' && x === row.length - 2) { signs.push({ x, y, text: '', hide: true, act: 'pcbox' }); return; } // the Critter Box: pick who leads the way
    if (t === 'o') text = { seashell: 'A fish tank! Two little fish chase each other round and round the weeds.', ember: 'A lava lamp. The blobs rise... and sink... and rise. You could watch it all day.', neon: 'A cactus made of neon tubes. It never needs watering!', frostpeak: 'A little potted pine with real snow on it. The nurse keeps it by the window so it stays cold.', cloudtop: 'A cloud tree! Its puffs are soft as pillows.', glowcap: 'A glowcap lamp. It hums very, very quietly.' }[outer] || 'A pot of pink blossoms. They smell like berry jam.';
    if (t === 'X' && kind === 'lab' && outer === 'ember_isle') text = x > W / 2 ? 'The growth chamber hums. A little Pumicub shape floats in the bubbly green, fast asleep. A sticky note: "For Prof. Pecan. Island critters DO grow bigger!"' : 'A seismograph scribbles a wobbly line. Every few seconds: a tiny bump. The volcano, snoring.';
    else if (t === 'X' && kind === 'lab') text = x > W / 2 ? 'The growth chamber! A sleepy little critter shape floats in bubbly green. A label says: "DO NOT TAP THE GLASS."' : 'A screen shows a growing critter: small, medium, HUGE.';
    if (t === 'C' && bid === 'home') { signs.push({ x, y, text: '', hide: true, act: 'wardrobe' }); return; }
    if (t === 'S') { signs.push({ x, y, text: '', hide: true, act: 'shelf' }); return; }
    if (t === 'X' && kind === 'home') text = 'The TV is showing Critter Clash highlights. {hero} watches their own best move. Then again. Then once more.';
    if (t === 'F' && kind === 'lodge') text = 'A crackling log fire. {hero} warms their paws. Toasty!';
    if (t === 'C' && kind === 'cabin') text = 'Charts of the coast, a brass telescope, and a bottle with a tiny ship inside.';
    if (t === 'C' && kind === 'forge') text = 'Racks of tongs and hammers. One hammer is labelled "NOT FOR CRITTERS".';
    if (t === 'C' && kind === 'shop') text = 'Hat boxes, stacked to the ceiling. One is labelled "EXTRA FLOPPY".';
    if (t === 'U') { const n = [...row].slice(0, x).filter((c) => c === 'U').length; signs.push({ x, y, text, hide: true, act: 'case:' + CUP_ORDER[n] }); return; }
    if (t === 'p') { signs.push({ x, y, text: '', hide: true, act: 'fossil:' + fossilAt(tiles, x, y) }); return; }
    signs.push({ x, y, text, hide: true, act: t === 'Q' && kind === 'home' ? 'rest' : t === 'V' ? 'mirror' : t === 'X' && kind === 'center' ? 'smoothie' : t === 'H' ? 'hatshop' : null });
  }));
  if (kind === 'kidroom') signs.push({ x: 2, y: 2, hide: true, text: 'Flo\'s play tent! Inside: a pillow fort, a torch, and a crayon drawing of a firefly holding a giant trophy. It says "ME, ONE DAY".' }); // world.js buildTent
  return {
    cup: b.stadium, shroom: outer === 'glowcap' && (bid.startsWith('shroom') || !!b.heal), cityView: !!O.city && (kind === 'house' || kind === 'flat'),
    name: b.heal ? `${O.name.replace(/ (Town|City|Gardens|Hollow|Village)$/, '')} Berry Center` : b.label || P.name || (b.id === 'home' ? 'Home' : 'House'),
    indoor: kind, tiles, npcs, signs, music: kind === 'center' ? 'center' : kind === 'lobby' || kind === 'tower' ? 'tower' : O.music, // Berry Centers have their own lullaby; stadium lobbies and the Tower hall a warm-up groove
    exit: { map: outer, x: b.x + b.door, y: b.y + b.h, dir: 's' },
    enter: { x: door, y: H - 2 },
    palette: P.dark ? { a: '#4a3a6a', b: '#46365f' } : P.floor || { a: '#d8a86a', b: '#d2a264' },
    wall: P.wall || (b.stadium ? '#f4ecff' : b.heal ? '#ffe0ec' : '#fff1d8'), rug: P.rug || (b.stadium ? cupById(b.stadium).color : b.heal ? '#ff7aa8' : '#7aa8ff'),
    outer: shade(P.wall || (b.stadium ? '#f4ecff' : b.heal ? '#ffe0ec' : '#fff1d8'), 0.34), // a dim echo of the room's own walls around it (tall phones see a lot of it), not a black void
    mood: P.dark ? { sun: 0xd0b0ff, sunI: 1.1, sky: 0xb09aff, gnd: 0x3a2a4a, hemiI: 1.2, fog: shade(P.wall || '#4a3a6a', 0.22) } : { sun: 0xfff0d8, sunI: 1.3, sky: 0xfff4e0, gnd: 0x8a6a4a, hemiI: 1.25, fog: shade(P.wall || (b.stadium ? '#f4ecff' : b.heal ? '#ffe0ec' : '#fff1d8'), 0.24) },
  };
}

const rooms = {};
export const getMap = (key) => MAPS[key] || (key?.startsWith('in:') ? (rooms[key] ||= interiorMap(key)) : null);
