// Round 15 story data per region (Round 23: Arsaber's mission): what each captain says as he falls, and how each act's last fight is set up.
// Lines are short and plain (one sentence each); every one has Arabic in story_ar.js.
import { REGION } from './region.js';

export const LIEUT = {
  sawad: {
    chief: { who: 'Photeinos', text: 'Bardanes paid me in the envoy\'s gold. Olbianos has the Pages now, at the kilns.', act: 2, card: { ar: 'الأتون', en: 'Act II · The Kilns', sub: 'Olbianos is burning the Pages in the kiln galleries. Stop him.' } },
    second: { who: 'Olbianos', text: 'I chose silver over a dead man\'s words. Bardanes has the rest, at the old arch.', act: 3, card: { ar: 'الطاق', en: 'Act III · The Broken Arch', sub: 'Bardanes has cut off the village\'s water. Find him at the arch.' } },
  },
  marsh: {
    chief: { who: 'Katakylas', text: 'Kallinikos hid his boats with Petronas, in the drowned village to the east.', act: 4, card: { ar: 'القرية الغارقة', en: 'The Sunken Village', sub: 'Take Kallinikos\'s boats from Petronas, so he cannot run.' } },
    second: { who: 'Petronas', text: 'Kallinikos is at the old weir with the Pages. He sails tonight.', act: 4, card: { ar: 'السِّكر القديم', en: 'The Old Weir', sub: 'Kallinikos is waiting for a boat that will not come.' } },
  },
  karkh: {
    chief: { who: 'Narses', text: 'Krateros moved the Pages to the vaults under the paper-sellers\' lane. Kalokyros guards them.', act: 5, card: { ar: 'مخازن الورّاقين', en: 'The Warehouse Vaults', sub: 'Kalokyros guards the Pages in the store-rooms under the paper shops.' } },
    second: { who: 'Kalokyros', text: 'Too late. Krateros took them to the square. If he cannot keep them, he will burn them.', act: 5, card: { ar: 'الساحة', en: 'The Square', sub: 'Stop Krateros before he lights the pyre.' } },
  },
  // Round 20: Act VI, the river quays. Round 23: Arsaber himself means to carry the first copies north.
  docks: {
    chief: { who: 'Rhentakios', text: 'Arsaber pays us to hold the river. Skleros keeps the copyists\' boat among the burned hulks.', act: 6, card: { ar: 'السفن المحروقة', en: 'The Hulks', sub: 'Free the copyists\' boat from Skleros.' } },
    second: { who: 'Skleros', text: 'The boat is yours. But Arsaber cut the bridge, and his ship waits at its foot.', act: 6, card: { ar: 'الجسر', en: 'The Bridge of Boats', sub: 'Arsaber means to carry the copies north. Face him at the bridge.' } },
  },
  hamrin: {}, // Round 21: the endgame's captains are in the holds (holds.js)
}[REGION];

// the act's last fight: who, where, his kit, and the lines for the intro and his second phase
export const BOSS = {
  sawad: {
    type: 'commander', level: 6, phaseAt: 0.6, duelAt: 0.25, volley: 'fire', barrage: 'naft', summon: ['naffat', 'bandit', 'spearman'],
    intro: { text: 'Turn back, guard. Those Pages are going to Constantinople.', card: { ar: 'بردانس', en: 'Bardanes', sub: 'Commander of the envoy\'s company' } },
    banner: ['Bardanes', 'Commander of the envoy\'s company'],
  },
  marsh: {
    type: 'rawh', level: 9, phaseAt: 0.5, volley: 'stones', barrage: 'nets', summon: ['reedman', 'netter', 'slinger'],
    intro: { text: 'Paper, guard? The envoy pays in gold. Name your price.', card: { ar: 'كالينيكوس', en: 'Kallinikos', sub: 'Master of the liquid-fire siphons' } },
    phase: 'Nets! Drag him into the water!',
    banner: ['Kallinikos', 'Master of the liquid-fire siphons'],
  },
  karkh: {
    type: 'utba', level: 12, phaseAt: 0.65, duelAt: 0.35, volley: 'arrows', barrage: 'firepots', summon: ['guard', 'archer', 'naffat'],
    intro: { text: 'If Constantinople cannot have them, no one will.', card: { ar: 'كراتيروس', en: 'Krateros', sub: 'Arsaber\'s captain in al-Karkh' } },
    phase: 'Archers! Bring him down!',
    duel: 'Light the stalls. Let the whole square burn.',
    duelCaption: 'The stalls are burning. Stay inside the ring.',
    banner: ['Krateros', 'Arsaber\'s captain in al-Karkh'],
  },
  docks: {
    type: 'ghanim', level: 14, phaseAt: 0.6, duelAt: 0.3, volley: 'bolts', barrage: 'stones', summon: ['crossbow', 'guard', 'engineer'],
    intro: { text: 'Your caliph\'s sons are busy killing each other, guard. Who will stop me?', card: { ar: 'أرسابر', en: 'Arsaber', sub: 'Envoy of Constantinople' } },
    phase: 'Darts! Hold the bridge!',
    duel: 'No one sails tonight. Not you, not your paper.',
    duelCaption: 'Arsaber fires the bridge. Stay inside the ring.',
    banner: ['Arsaber', 'Envoy of Constantinople'],
  },
  // Round 21: no field boss in the hills; Tatzates' sculpt is warmed at load for his hold
  hamrin: { type: 'zubayr', level: 30, banner: ['Tatzates', 'The bowman on the dune'] },
}[REGION];

// Ishaq's words when Salim speaks with him in each region's hub corner
export const ISHAQ_TALK = {
  sawad: [
    'You are Jabir\'s brother. I am <b>Ishaq</b>. I hired your caravan. He is alive, and he is on my account now: I mean to bring him home.',
    'Under my instruments was a cedar chest: the Pages of <b>the Teacher</b>, who died in a prison by the river fourteen years ago. While the caliph\'s sons fight over Baghdad, an envoy from Constantinople, <b>Arsaber</b>, came in under the smoke of their war. He wants the best learning of this city carried north, and the Pages most of all.',
    'His company in the Sawad answers to <b>Bardanes</b>. <b>Photeinos</b> holds the old caravanserai, <b>Olbianos</b> the kilns, and Bardanes the broken arch. Your brother asked you for one thing.',
  ],
  marsh: [
    'The fishermen here owe Kallinikos nothing, and they do not like him. They say he paid for boats and silence.',
    '<b>Katakylas</b> holds the reed stockade to the west. <b>Petronas</b> keeps the boats in the drowned village to the east. Without boats, Kallinikos cannot leave.',
    'Mind the deep water. Wade where it is shallow, and watch the reeds. Their raiders fight from them.',
  ],
  karkh: [
    'This was the greatest market in the world before the siege. Now look at it.',
    'Arsaber\'s men here answer to <b>Krateros</b>. <b>Narses</b> holds the burned quarter and <b>Kalokyros</b> the vaults under the paper-sellers\' lane.',
    'The scholars of the House of Wisdom have promised to copy the Pages. Bring them here, and they are safe for ever.',
  ],
  docks: [
    'Hakam\'s copyists worked through the night. The first copies are to go downriver, to Wasit and Basra, at dawn.',
    '<b>Arsaber</b> himself holds the quays, and a ship waits there to carry the Pages north. <b>Rhentakios</b> keeps the shipyard and <b>Skleros</b> has taken the copyists\' boat among the hulks.',
    'Ten cities, Salim. Once the copies are on the water, no one can gather them all again.',
  ],
  hamrin: [
    'Arsaber\'s company came this way, toward the frontier. What is left of it still holds these hills: his own men, and the turncoats he hired.',
    'They hold four places. The old <b>quarry</b> to the west, the <b>fort</b> on the eastern cliff, the <b>bridge</b> over the gorge to the south, and a hold in the far ravine where <b>Tatzates</b> went to ground.',
    'Rest by the fires inside, Salim. The men there will not fight fair, and the ground is worse.',
  ],
}[REGION];
