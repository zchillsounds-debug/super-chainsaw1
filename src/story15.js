// Round 15 story data per region: what each captain says as he falls, and how each act's last fight is set up.
// Lines are short and plain (one sentence each); every one has Arabic in story_ar.js.
import { REGION } from './region.js';

export const LIEUT = {
  sawad: {
    chief: { who: 'Farud', text: 'Ghassan paid me to take the chest. Hisham has the Pages now, at the kilns.', act: 2, card: { ar: 'الأتون', en: 'Act II · The Kilns', sub: 'Hisham is burning the Pages in the kilns. Stop him.' } },
    second: { who: 'Hisham', text: 'I sold the Pages to Ghassan for a bag of silver. He has the rest, at the old arch.', act: 3, card: { ar: 'الطاق', en: 'Act III · The Broken Arch', sub: 'Ghassan has cut off the village\'s water. Find him at the arch.' } },
  },
  marsh: {
    chief: { who: 'Marwan', text: 'Rawh paid us to hide his boats. Sahl keeps them at the fish racks, east.', act: 4, card: { ar: 'المرسى', en: 'The Fish Racks', sub: 'Take Rawh\'s boats from Sahl, so he cannot run.' } },
    second: { who: 'Sahl', text: 'Rawh is at the old weir with the Pages. He sails for Baghdad tonight.', act: 4, card: { ar: 'السِّكر القديم', en: 'The Old Weir', sub: 'Rawh is waiting for a boat that will not come.' } },
  },
  karkh: {
    chief: { who: '\'Asim', text: '\'Utba moved the Pages to the paper-sellers\' lane. Layth guards them.', act: 5, card: { ar: 'سوق الورّاقين', en: 'The Paper-Sellers\' Lane', sub: 'Layth guards the Pages among the paper shops.' } },
    second: { who: 'Layth', text: 'Too late. \'Utba took them to the square. He burns them at sunset.', act: 5, card: { ar: 'الساحة', en: 'The Square', sub: 'Stop \'Utba before he lights the pyre.' } },
  },
  // Round 20: Act VI, the river quays. The buyer's steward Ghanim means to sink the first copies before they sail.
  docks: {
    chief: { who: 'Bilal', text: 'Ghanim pays us to hold the river. Mus\'ab keeps the copyists\' boat at the yard.', act: 6, card: { ar: 'دار الصناعة', en: 'The Boatyard', sub: 'Free the copyists\' boat from Mus\'ab.' } },
    second: { who: 'Mus\'ab', text: 'The boat is yours. But Ghanim cut the bridge, and he waits at its foot.', act: 6, card: { ar: 'الجسر', en: 'The Bridge of Boats', sub: 'Ghanim will not let the copies sail. Face him at the bridge.' } },
  },
  hamrin: {}, // Round 21: the endgame's captains are in the holds (holds.js)
}[REGION];

// the act's last fight: who, where, his kit, and the lines for the intro and his second phase
export const BOSS = {
  sawad: {
    type: 'commander', level: 6, phaseAt: 0.6, duelAt: 0.25, volley: 'fire', barrage: 'naft', summon: ['naffat', 'bandit', 'spearman'],
    intro: { text: 'Turn back, guard. Those Pages are not worth your life.', card: { ar: 'غسّان', en: 'Ghassan', sub: 'The man who paid for the ambush' } },
    banner: ['Ghassan', 'Renegade commander of the siege of Baghdad'],
  },
  marsh: {
    type: 'rawh', level: 9, phaseAt: 0.5, volley: 'stones', barrage: 'nets', summon: ['reedman', 'netter', 'slinger'],
    intro: { text: 'Paper, guard? My buyer pays in gold. Name your price.', card: { ar: 'روح', en: 'Rawh', sub: 'Ghassan\'s paymaster' } },
    phase: 'Nets! Drag him into the water!',
    banner: ['Rawh', 'Ghassan\'s paymaster'],
  },
  karkh: {
    type: 'utba', level: 12, phaseAt: 0.65, duelAt: 0.35, volley: 'arrows', barrage: 'firepots', summon: ['guard', 'archer', 'naffat'],
    intro: { text: 'Paper burns, guard. So do the men who carry it.', card: { ar: 'عتبة', en: '\'Utba', sub: 'Captain of the buyer\'s men' } },
    phase: 'Archers! Bring him down!',
    duel: 'Light the stalls. Let the whole square burn.',
    duelCaption: 'The stalls are burning. Stay inside the ring.',
    banner: ['\'Utba', 'Captain of the buyer\'s men'],
  },
  docks: {
    type: 'ghanim', level: 14, phaseAt: 0.6, duelAt: 0.3, volley: 'bolts', barrage: 'stones', summon: ['crossbow', 'guard', 'engineer'],
    intro: { text: 'Copies, guard? Then I will sink every boat on the river.', card: { ar: 'غانم', en: 'Ghanim', sub: 'The buyer\'s steward' } },
    phase: 'Crossbows! Hold the bridge!',
    duel: 'No one sails tonight. Not you, not your paper.',
    duelCaption: 'Ghanim fires the bridge. Stay inside the ring.',
    banner: ['Ghanim', 'The buyer\'s steward'],
  },
  // Round 21: no field boss in the hills; Zubayr's sculpt is warmed at load for his hold
  hamrin: { type: 'zubayr', level: 30, banner: ['Zubayr', 'The bowman on the dune'] },
}[REGION];

// Ishaq's words when Salim speaks with him in each region's hub corner
export const ISHAQ_TALK = {
  sawad: [
    'You are Jabir\'s brother. I am <b>Ishaq</b>. I hired your caravan, and I am sorry. He was a better man than my coin deserved.',
    'Under my instruments was a cedar chest: the Pages of <b>the Teacher</b>, who died in a prison by the river fourteen years ago. Someone in Baghdad wants his words to burn. <b>Ghassan</b> was paid to see it done.',
    '<b>Farud</b> holds the old caravanserai, <b>Hisham</b> the kilns, and Ghassan the broken arch. If the Pages still exist, they are between those three. Your brother asked you for one thing.',
  ],
  marsh: [
    'The fishermen here owe Rawh nothing, and they do not like him. They say he paid for boats and silence.',
    '<b>Marwan</b> hides his boats in the reed camp to the west. <b>Sahl</b> keeps the rest at the fish racks to the east. Without boats, Rawh cannot leave.',
    'Mind the deep water. Wade where it is shallow, and watch the reeds. The marsh men fight from them.',
  ],
  karkh: [
    'This was the greatest market in the world before the siege. Now look at it.',
    'The buyer\'s men answer to <b>\'Utba</b>. <b>\'Asim</b> holds the burned suq and <b>Layth</b> the paper-sellers\' lane.',
    'The scholars of the House of Wisdom have promised to copy the Pages. Bring them here, and they are safe for ever.',
  ],
  docks: [
    'Hakam\'s copyists worked through the night. The first copies are to go downriver, to Wasit and Basra, at dawn.',
    'The buyer\'s steward, <b>Ghanim</b>, holds the quays. <b>Bilal</b> keeps the warehouses and <b>Mus\'ab</b> has taken the copyists\' boat at the yard.',
    'Ten cities, Salim. Once the copies are on the water, no one can gather them all again.',
  ],
  hamrin: [
    'These hills were full of deserters after the siege: men from both armies, with nowhere to go and nothing to lose.',
    'They hold four places. The old <b>quarry</b> to the west, the <b>fort</b> on the eastern cliff, the <b>bridge</b> over the gorge to the south, and a hold in the far ravine where <b>Zubayr</b> went to ground.',
    'Rest by the fires inside, Salim. The men there will not fight fair, and the ground is worse.',
  ],
}[REGION];
