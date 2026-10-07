import * as THREE from 'three';
import { heightAt, SITES, ROADS, waterDepth, hamrinOpen } from './terrain.js';
import { REGION, IS_SAWAD, IS_MARSH, IS_KARKH, IS_DOCKS, IS_HAMRIN, HUB } from './region.js';
import { colliders } from './buildings.js';
import { blocked } from './world.js';
import { resolve, buildGrid } from './collision.js';
import { npc } from './hub.js';
import { humanoid, animateHumanoid, camel, animateCamel, buffalo, animateBuffalo } from './characters.js';
import { SIDE, CODEX, questState, setQuest, converse, giveItem, unlock } from './narrative.js';
import { makeItem } from './items.js';
import { crate, jar } from './props.js';
import * as SCENES from './scenes.js';
import { saveGame } from './save.js';
import { mulberry32 } from './noise.js';
import { t } from './i18n.js';
import { DUNGEONS } from './dungeons.js';

// Round 16 side content: short quest chains (four per region, eight in the marshes and al-Karkh since Round 20), a daily bounty board in each hub,
// timed world events the trail points to, and tracking any task on the trail by tapping it in the tracker.

const BASE = { sawad: 2, marsh: 7, karkh: 10, docks: 13, hamrin: 20 }[REGION];
const lvl = (g, add = 0) => Math.max(BASE, g.player.level) + add;
const V3 = (x, z, y = 0) => new THREE.Vector3(x, heightAt(x, z) + y, z);
// nearest walkable spot to a point: off every collider, out of deep water
export function freeSpot(x, z, pad = 1.2) {
  for (let r = 0; r < 14; r += 0.8) for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + r, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!blocked(px, pz, pad) && waterDepth(px, pz) < 0.12 && Math.abs(px) < 126 && Math.abs(pz) < 126 && (!IS_HAMRIN || hamrinOpen(px, pz) > 0.6)) return [px, pz]; // Round 29: not on a Hamrin rock face
  }
  return [x, z];
}
export const people = {
  potter: { robe: '#8a6a4a', robe2: '#4a3a2a', turban: 0xd8cfb8, beard: 0x3a2a1a, beardLen: 0.6, skin: 0x9a6a44, weapon: null, sash: 0x6a3a1a, build: 1.05, belly: 0.4 },
  scribe: { robe: '#e8e0cc', robe2: '#3a4a6a', turban: 0xf0ead8, beard: 0x2a1c12, beardLen: 0.5, skin: 0xa8714a, weapon: null, sash: 0x3a4a6a, build: 0.9 },
  trader: { robe: '#5a3a2a', robe2: '#c8a050', turban: 0x8a2a1a, beard: 0x1a120c, beardLen: 0.8, skin: 0x8a5a3a, weapon: null, sash: 0xc8a050, build: 1.1, belly: 0.3 },
  boatman: { robe: '#d8ccb0', robe2: '#4a5a4a', turban: 0x3a3a2a, beard: 0x2a1a10, beardLen: 0.7, skin: 0x7a4a2a, weapon: null, sash: 0x4a5a4a, build: 1.0 },
  fisher: { robe: '#c8bca0', robe2: '#5a4a3a', turban: 0x6a5a40, beard: 0x3a2a1a, beardLen: 0.4, skin: 0x7a4a2a, weapon: null, sash: 0x5a4a3a, build: 0.95 },
  herder: { robe: '#4a4234', robe2: '#8a7a5a', turban: 0xe0d8c0, beard: 0x6a6a60, beardLen: 0.9, skin: 0x7a4a2a, weapon: null, sash: 0x8a7a5a, build: 0.95 },
  cutter: { robe: '#6a5a40', robe2: '#2a3020', turban: 0xb8a878, beard: 0x8a8070, beardLen: 0.6, skin: 0x8a5a3a, weapon: null, sash: 0x2a3020, build: 0.9 },
  dyer: { robe: '#2a3a6a', robe2: '#8a2a4a', turban: 0x2a3a6a, beard: 0x1a120c, beardLen: 0.5, skin: 0x9a6a44, weapon: null, sash: 0x8a2a4a, build: 1.0 },
  seller: { robe: '#e0d4b8', robe2: '#5a3a2a', turban: 0xe8e0d0, beard: 0x3a2a1a, beardLen: 0.7, skin: 0xa8714a, weapon: null, sash: 0x5a3a2a, build: 0.95, belly: 0.3 },
  father: { robe: '#5a4a3a', robe2: '#2a4a3a', turban: 0xc8b890, beard: 0x2a1a10, beardLen: 0.6, skin: 0x8a5a3a, weapon: null, sash: 0x2a4a3a, build: 1.0 },
  carter: { robe: '#7a5a3a', robe2: '#3a2a1a', turban: 0x5a3a20, beard: 0x1a120c, beardLen: 0.5, skin: 0x8a5a3a, weapon: null, sash: 0x3a2a1a, build: 1.1 },
  oldman: { robe: '#5a5446', robe2: '#3a362c', turban: null, cap: 0x4a4236, capBand: 0x2a241c, beard: 0xb8b4a8, beardLen: 0.8, skin: 0x9a7050, weapon: null, sash: 0x3a362c, build: 0.95, hunch: 0.15 },
  miller: { robe: '#d8d0bc', robe2: '#6a5a3e', turban: 0xe8e2d2, beard: 0x5a4a3a, beardLen: 0.7, skin: 0x9a6a44, weapon: null, sash: 0x6a5a3e, build: 1.1, belly: 0.35 },
  child: { robe: '#c8a878', robe2: '#6a3a2a', turban: null, cap: 0x5a3a2a, capBand: 0x2a1a10, skin: 0xa8714a, weapon: null, sash: 0x6a3a2a, scale: 0.66, build: 0.85 },
};

// ------------------------------------------------------------------ the twelve quests
// step kinds: kill (a band at a spot), take (an object, often guarded), escort (lead someone or something home),
// visit (a quiet place and a moment), return (talk to the giver). The last step is the completion line.
const Q = {
  sawad: [
    { id: 'potter', t: 'The Potter\'s Tools', giver: { name: 'Zayd', title: 'Potter', look: 'potter', at: [17, 74], face: -1.4 },
      offer: 'Olbianos\' raiders took my kiln tools when they took the yard. Without them I am a man who knows how to make pots, and nothing else.',
      steps: [
        { kind: 'take', text: 'Recover Zayd\'s kiln tools from the raiders at the kiln yard.', at: [SITES.kiln.x + 16, SITES.kiln.z - 12], label: 'Take the potter\'s tools', item: 'Bundle of Kiln Tools', guard: { pack: ['deserter', 'deserter', 'spearman'], n: 4 } },
        { kind: 'return', text: 'Bring the tools back to Zayd.', lines: [['Salim', 'Your tools. The knife-men will not miss them.'], ['Zayd', 'My father\'s scrapers! Come back in a month, guard. The first good jar from the new firing is yours.']] },
        { text: 'Zayd is firing his kiln again.' }],
      reward: { gold: 90, item: 'rare', renown: 10 } },
    { id: 'ledger', t: 'The Scribe\'s Ledger', giver: { name: 'Nadr', title: 'Scribe', look: 'scribe', at: [6, 62], face: 0.8 },
      offer: 'Byzantine soldiers robbed me on the east road. They took my ledger: three years of every debt and sale in this village. Without it, honest men cannot prove what they paid.',
      steps: [
        { kind: 'kill', text: 'Drive off the soldiers on the east road.', at: [40, 30], pack: ['bandit', 'archer', 'bandit'], n: 4, elite: 'Lekapenos' },
        { kind: 'take', text: 'Find Nadr\'s ledger among the soldiers\' plunder.', at: [43, 32], label: 'Take the ledger', item: 'Nadr\'s Ledger' },
        { kind: 'return', text: 'Return the ledger to Nadr.', lines: [['Nadr', 'Every page there. You have saved a dozen families from paying twice.']] },
        { text: 'The village\'s accounts are whole again.' }],
      reward: { gold: 110, item: 'rare', renown: 10, codex: 'paper' } },
    { id: 'string', t: 'The Camel Trader\'s String', giver: { name: 'Hudba', title: 'Camel trader', look: 'trader', at: [26, 70], face: -2.4 },
      offer: 'My camels bolted when the Byzantine horsemen came. Two of them are standing in the desert east of the road, and the men who scared them are still out there.',
      steps: [
        { kind: 'kill', text: 'Scatter the horsemen near Hudba\'s camels.', at: [38, -22], pack: ['deserter', 'spearman'], n: 4 },
        { kind: 'escort', text: 'Lead Hudba\'s two camels back to the village.', at: [40, -26], who: 'camels', to: [26, 66] },
        { kind: 'return', text: 'Tell Hudba his camels are home.', lines: [['Hudba', 'Both of them! And not a scratch. Here: a trader pays his debts.']] },
        { text: 'Hudba\'s camels are safe.' }],
      reward: { gold: 140, item: 'rare', renown: 12 } },
    { id: 'spear', t: 'Jabir\'s Spear', giver: { name: 'Ishaq' },
      offer: 'The villagers found the place on the dunes where the caravan fell. Jabir\'s spear is still there. You should be the one to bring it home.',
      steps: [
        { kind: 'visit', text: 'Go to the dunes north of the village, where the caravan fell.', at: [12, 124], label: 'Kneel by the spear', scene: 'spear' },
        { kind: 'return', text: 'Tell Ishaq you have brought it home.', lines: [['Salim', 'I have it. I will carry it to Baghdad, and home after that.'], ['Ishaq', 'Then he finishes the journey with you.']] },
        { text: 'Salim carries his brother\'s spear.' }],
      reward: { gold: 0, legend: 'Jabir\'s Spearhead', renown: 15 } },
    // Round 29: one more chain per region, each with a turn in the middle and a meeting out on the land
    { id: 'seed', t: 'Seed for the Sowing', giver: { name: 'Rifa\'a', title: 'Miller', look: 'miller', at: [22, 64], face: -2.0 },
      offer: 'Someone emptied my storehouse in the night: the village\'s seed grain, kept back for the autumn sowing. Without it there is no harvest next year. The tracks go west.',
      steps: [
        { kind: 'kill', text: 'Follow the tracks west and drive off the foragers with the grain cart.', at: [-30, 20], pack: ['akontistes', 'bandit', 'deserter'], n: 4 },
        { kind: 'meet', text: 'The cart was already empty. Find the farmer the foragers spoke of, south-west of the road.', at: [-40, -4], label: 'Speak with Sa\'d', who: { name: 'Sa\'d', title: 'Farmer', look: 'oldman', face: 1.2 },
          lines: [['Sa\'d', 'Yes, I took it. The Rum burned my fields to the root, and I have four children who ate grass last week.'], ['Salim', 'Rifa\'a has a village behind him too.'], ['Sa\'d', 'Then take it back. Half is buried by the old well. The soldiers dug up the rest and kept it.']] },
        { kind: 'take', text: 'Take the rest of the seed back from the soldiers\' camp to the south.', at: [-20, -30], label: 'Take the seed sacks', item: 'Sacks of Seed Grain', guard: { pack: ['kontaratos', 'deserter', 'deputatos'], n: 3 } },
        { kind: 'return', text: 'Bring the seed to Rifa\'a, and tell him about Sa\'d.', lines: [['Salim', 'Your seed. Half of it was taken by a man whose fields were burned. He told me where the rest was.'], ['Rifa\'a', 'A thief who gives back half is a neighbour. ... Send him to me. He can sow beside us this autumn, and we will see how the bread comes out.']] },
        { text: 'Rifa\'a and Sa\'d will sow the same fields.' }],
      reward: { gold: 130, item: 'rare', renown: 14 } },
  ],
  marsh: [
    { id: 'son', t: 'The Boatman\'s Son', giver: { name: 'Hilal', title: 'Boatman', look: 'boatman', at: [26, 82], face: -1.6 },
      offer: 'Kallinikos\' men took my boy Saqr to make me carry their boats. They keep him in a hut on the west causeway. He is eleven.',
      steps: [
        { kind: 'kill', text: 'Free Saqr from Kallinikos\' men on the west causeway.', at: [-18, 55], pack: ['netter', 'bandit', 'slinger'], n: 4, elite: 'Spondyles' },
        { kind: 'escort', text: 'Bring Saqr home to his father.', at: [-16, 56], who: 'child', name: 'Saqr', to: [24, 80] },
        { kind: 'return', text: 'Speak with Hilal.', lines: [['Hilal', 'Saqr! ... Thank you. My boat is yours, whenever you need it.']] },
        { text: 'Saqr is home.' }],
      reward: { gold: 150, item: 'rare', renown: 15 } },
    { id: 'nets', t: 'Cut Nets', giver: { name: 'Jamil', title: 'Fisherman', look: 'fisher', at: [-2, 70], face: 0.6 },
      offer: 'Every night someone cuts our nets on the east causeway. Kallinikos\' raiders, hiding in the reeds. A village that cannot fish cannot eat.',
      steps: [
        { kind: 'kill', text: 'Root the ambushers out of the reeds on the east causeway.', at: [36, 44], pack: ['reedman'], n: 5, hidden: true },
        { kind: 'return', text: 'Tell Jamil the reeds are clear.', lines: [['Jamil', 'Then tonight we fish. Take some of the catch money. You earned it.']] },
        { text: 'The fishermen mend their nets in peace.' }],
      reward: { gold: 120, item: 'rare', renown: 10, codex: 'mashuf' } },
    { id: 'buffalo', t: 'The Strayed Buffalo', giver: { name: 'Rabah', title: 'Herdsman', look: 'herder', at: [-6, 92], face: 0.9 },
      offer: 'My best buffalo swam off in the night and came ashore by the reed camp road. Kallinikos\' men have her tied, and they are arguing about who eats her.',
      steps: [
        { kind: 'kill', text: 'Drive the men away from Rabah\'s buffalo, south of the reed camp.', at: [-46, 4], pack: ['bandit', 'netter', 'slinger'], n: 4 },
        { kind: 'escort', text: 'Lead the buffalo back to Rabah.', at: [-44, 6], who: 'buffalo', to: [-4, 88] },
        { kind: 'return', text: 'Speak with Rabah.', lines: [['Rabah', 'There she is, the old queen. Her milk feeds three families. Take this, and my thanks.']] },
        { text: 'The buffalo is home.' }],
      reward: { gold: 160, item: 'rare', renown: 15, codex: 'buffalo' } },
    { id: 'debts', t: 'The Debt Ledger', giver: { name: 'Bashshar', title: 'Reed cutter', look: 'cutter', at: [2, 74], face: 1.2 },
      offer: 'Kallinikos bought up the whole village\'s debts when he came, and wrote them all down. His men use that book to take our boats and our reed. Burn it, and we are free.',
      steps: [
        { kind: 'take', text: 'Take Kallinikos\' debt ledger from his clerk\'s guards on the south-east causeway.', at: [30, -60], label: 'Take the debt ledger', item: 'Kallinikos\' Debt Ledger', guard: { pack: ['spearman', 'slinger', 'netter'], n: 4, elite: 'Kanabos' } },
        { kind: 'return', text: 'Bring the ledger to Bashshar.', lines: [['Bashshar', 'Into the fire with it. ... There. My grandchildren will never know what was owed.']] },
        { text: 'The village owes Kallinikos nothing.' }],
      reward: { gold: 180, item: 'legendary', renown: 18 } },
    // Round 20: four more for the marshes
    { id: 'sluice', t: 'The Dry Channel', giver: { name: 'Mazin', title: 'Water-keeper', look: 'herder', at: [16, 92], face: 2.6 },
      offer: 'Kallinikos\' men have closed the old sluice on the west channel. The water we drink comes down that channel. Three days now, and the children drink from the marsh.',
      steps: [
        { kind: 'kill', text: 'Drive Kallinikos\' men from the sluice on the west channel.', at: [-26, 24], pack: ['bandit', 'netter', 'slinger'], n: 4 },
        { kind: 'return', text: 'Tell Mazin the channel runs again.', lines: [['Mazin', 'I hear it already. Sweet water, coming home. Take this, and drink first, guard.']] },
        { text: 'The west channel runs again.' }],
      reward: { gold: 170, item: 'rare', renown: 14, codex: 'sluices' } },
    { id: 'decoys', t: 'The Fowler\'s Nets', giver: { name: 'Asad', title: 'Fowler', look: 'fisher', at: [22, 78], face: -1.6 },
      offer: 'Every winter the ducks come down to the marsh, and every winter I feed my family with my nets. Kallinikos\' men took them all to their camp in the south-west, to snare men instead of birds.',
      steps: [
        { kind: 'take', text: 'Take back Asad\'s nets from the camp in the south-west.', at: [-46, -10], label: 'Take the fowler\'s nets', item: 'Fowling Nets', guard: { pack: ['netter', 'netter', 'bandit'], n: 4 } },
        { kind: 'return', text: 'Bring the nets to Asad.', lines: [['Asad', 'Torn here and here, but I can mend them. The ducks will not know what happened. Here, for your trouble.']] },
        { text: 'Asad is fowling again.' }],
      reward: { gold: 180, item: 'rare', renown: 14 } },
    { id: 'roof', t: 'Reed for the Roof', giver: { name: '\'Umayr', title: 'Reed builder', look: 'cutter', at: [-2, 84], face: 1.6 },
      offer: 'The great mudhif lost half its roof in the spring flood. I have cut reed enough to mend it, out on the east beds, but Kallinikos\' raiders lie in the reeds there and my buffalo will not go alone.',
      steps: [
        { kind: 'kill', text: 'Clear the ambushers from the east reed beds.', at: [42, 30], pack: ['reedman', 'reedman', 'slinger'], n: 4, hidden: true },
        { kind: 'escort', text: 'Lead the laden buffalo back to the village.', at: [40, 28], who: 'buffalo', to: [6, 84], ambush: [[24, 52, ['reedman', 'netter']]] },
        { kind: 'return', text: 'Speak with \'Umayr.', lines: [['\'Umayr', 'Enough for the whole roof, and some left over for my sister\'s. The guest hall will stand another twenty years.']] },
        { text: 'The mudhif has its roof again.' }],
      reward: { gold: 200, item: 'legendary', renown: 18 } },
    { id: 'bitter', t: 'Bitter Water', giver: { name: 'Aws', title: 'Healer', look: 'scribe', at: [6, 70], face: 0.2 },
      offer: 'Half the village has the flux. Someone has been fouling the sweet-water tank by the reed camp road with dead fish. I know who pays them.',
      steps: [
        { kind: 'kill', text: 'Catch the men fouling the water tank on the reed camp road.', at: [-18, 54], pack: ['bandit', 'bandit', 'slinger'], n: 3, elite: 'Apsimar' },
        { kind: 'return', text: 'Tell Aws the tank is safe.', lines: [['Aws', 'Then I can clean it, and in a week no one will be sick. To deny a village water. There is no lower thing a man can do.']] },
        { text: 'The sweet water is clean again.' }],
      reward: { gold: 190, item: 'rare', renown: 16 } },
    // Round 29
    { id: 'mashuf', t: 'The Missing Mashuf', giver: { name: 'Khalaf', title: 'Boat-builder', look: 'boatman', at: [12, 76], face: 2.2 },
      offer: 'My new mashuf is gone from the landing: forty days of work, the pitch still soft. Someone saw it poled west into the reeds at dawn.',
      steps: [
        { kind: 'kill', text: 'Search the reeds to the west for Khalaf\'s boat.', at: [-36, 36], pack: ['reedman', 'reedman', 'tribolos'], n: 4, hidden: true },
        { kind: 'meet', text: 'Someone is hiding in the reeds nearby. Find him.', at: [-30, 42], label: 'Speak with the boy', who: { name: 'Dahir', title: '', look: 'child', face: 2.6 },
          lines: [['Dahir', 'Do not tell Khalaf it was me! Kallinikos\' men said they would burn our hut if I did not bring them a boat.'], ['Salim', 'Where is it now?'], ['Dahir', 'At their landing in the south. They load it with what they take from the villages.']] },
        { kind: 'take', text: 'Take the mashuf\'s pole and paddle from the raiders\' landing in the south.', at: [10, -40], label: 'Take the pole and paddle', item: 'Khalaf\'s Punting Pole', guard: { pack: ['netter', 'akontistes', 'reedman'], n: 4, elite: 'Moschos' } },
        { kind: 'return', text: 'Tell Khalaf where his boat is, and who took it.', lines: [['Salim', 'Your boat is at their landing; you can pole it home now. A boy took it, because they threatened his family.'], ['Khalaf', 'Dahir. His father taught me to bend reed. ... Tell him he can come and learn the pitch from me. A boy who can steal a mashuf can build one.']] },
        { text: 'Dahir is learning to build boats.' }],
      reward: { gold: 170, item: 'rare', renown: 15 } },
  ],
  karkh: [
    { id: 'vats', t: 'The Dyers\' Vats', giver: { name: '\'Abbad', title: 'Dyer', look: 'dyer', at: [-50, 74], face: -0.6 },
      offer: 'Krateros\' soldiers squat in my dye yard by the north lane. They broke half the vats looking for coin. Indigo is worth more than coin, if they only knew.',
      steps: [
        { kind: 'kill', text: 'Clear the soldiers out of the dye yard on the north lane.', at: [-28, 62], pack: ['deserter', 'guard', 'archer'], n: 4 },
        { kind: 'return', text: 'Tell \'Abbad his yard is clear.', lines: [['\'Abbad', 'Then the blue comes back to al-Karkh. Take this. A dyer remembers his friends.']] },
        { text: '\'Abbad\'s vats are filling again.' }],
      reward: { gold: 160, item: 'rare', renown: 12 } },
    { id: 'pens', t: 'The Copyist\'s Pens', giver: { name: 'Sa\'id', title: 'Paper-seller', look: 'seller', at: [-70, 76], face: 0.4 },
      offer: 'Krateros\' men took my pens and my inks, and my best paper, and stacked them in their camp on the east lane. Without pens I cannot copy, and without copying I cannot eat.',
      steps: [
        { kind: 'take', text: 'Take back Sa\'id\'s pens and inks from the camp on the east lane.', at: [61, 4], label: 'Take the pens and inks', item: 'Reed Pens and Inks', guard: { pack: ['guard', 'archer', 'naffat'], n: 4, elite: 'Garidas' } },
        { kind: 'return', text: 'Bring the pens to Sa\'id.', lines: [['Sa\'id', 'My good reeds, and the iron-gall ink! I will copy you anything you like, for free, for as long as I live.']] },
        { text: 'Sa\'id is copying again.' }],
      reward: { gold: 170, item: 'rare', renown: 12, codex: 'paper' } },
    { id: 'children', t: 'Lost in the Ruins', giver: { name: 'Ma\'mar', title: 'Weaver', look: 'father', at: [-56, 96], face: 3.0 },
      offer: 'My two children went looking for our old house, south of the canal. They have not come back, and the lanes there are full of Krateros\' men.',
      steps: [
        { kind: 'kill', text: 'Find Ma\'mar\'s children south of the bridge, and drive off the men around them.', at: [22, -26], pack: ['guard', 'deserter'], n: 4 },
        { kind: 'escort', text: 'Lead the two children back to the khan.', at: [20, -24], who: 'children', to: [-56, 92], ambush: [[-8, 14, ['deserter', 'deserter', 'archer']]] },
        { kind: 'return', text: 'Speak with Ma\'mar.', lines: [['Ma\'mar', 'You found them. You found them both. I have nothing worth giving you, but take this.']] },
        { text: 'The children are home.' }],
      reward: { gold: 150, item: 'legendary', renown: 18 } },
    { id: 'toll', t: 'The Bridge Toll', giver: { name: 'Nu\'aym', title: 'Carter', look: 'carter', at: [-46, 80], face: -1.0 },
      offer: 'Krateros\' men stand on the north bridge and take a dirham from everyone who crosses. From widows, from children, from me. Someone should make them stop.',
      steps: [
        { kind: 'kill', text: 'Throw the toll-takers off the north bridge.', at: [16, 62], pack: ['guard', 'guard', 'spearman'], n: 4, elite: 'Mavrianos' },
        { kind: 'return', text: 'Tell Nu\'aym the bridge is free.', lines: [['Nu\'aym', 'Free! I will tell every carter in the quarter whose name to bless. Here, for the road.']] },
        { text: 'Anyone may cross the north bridge.' }],
      reward: { gold: 140, item: 'rare', renown: 12 } },
    // Round 20: four more for al-Karkh
    { id: 'bread', t: 'The Baker\'s Flour', giver: { name: 'Fadl', title: 'Baker', look: 'potter', at: [-66, 100], face: 2.8 },
      offer: 'The quarter eats from my oven, and Krateros\' men took my flour for their own. Twenty sacks, stacked in their store by the paper-sellers\' lane.',
      steps: [
        { kind: 'take', text: 'Take back Fadl\'s flour from the store near the paper-sellers\' lane.', at: [-44, -36], label: 'Take the flour sacks', item: 'Sacks of Flour', guard: { pack: ['guard', 'guard', 'archer'], n: 4 } },
        { kind: 'return', text: 'Bring the flour to Fadl.', lines: [['Fadl', 'Bread tomorrow, for everyone. The first loaf is yours, and this as well.']] },
        { text: 'Fadl\'s oven is lit.' }],
      reward: { gold: 180, item: 'rare', renown: 14, codex: 'bread' } },
    { id: 'letters', t: 'The Letter-Writer', giver: { name: 'Hayyan', title: 'Letter-writer', look: 'seller', at: [-74, 88], face: 1.4 },
      offer: 'I write letters for those who cannot. Families to their sons in Basra, in Kufa, in Khurasan. The courier who carried them was robbed on the east lanes by Krateros\' men.',
      steps: [
        { kind: 'kill', text: 'Find the men who robbed him on the east lanes.', at: [48, 34], pack: ['deserter', 'guard', 'archer'], n: 4 },
        { kind: 'return', text: 'Bring the letters back to Hayyan.', lines: [['Hayyan', 'Not one opened. These mothers will hear from their sons, and their sons from them. Thank you.']] },
        { text: 'The letters go out again.' }],
      reward: { gold: 170, item: 'rare', renown: 14 } },
    { id: 'carriers', t: 'The Water-Carriers', giver: { name: 'Rufay\'', title: 'Water-carrier', look: 'carter', at: [-52, 92], face: -2.0 },
      offer: 'We carry water from the Sarat to every house that has no well. Now Krateros\' men stand on the canal steps and take a coin for every skin we fill.',
      steps: [
        { kind: 'kill', text: 'Clear Krateros\' men from the canal steps south of the bridge.', at: [12, -40], pack: ['guard', 'guard', 'spearman'], n: 4, elite: 'Chalkeus' },
        { kind: 'return', text: 'Tell Rufay\' the steps are free.', lines: [['Rufay\'', 'Free water for al-Karkh. My father carried water in the siege, and no one taxed it even then.']] },
        { text: 'The water-carriers fill their skins for nothing.' }],
      reward: { gold: 200, item: 'legendary', renown: 18 } },
    { id: 'binder', t: 'The Bookbinder\'s Tools', giver: { name: 'Thumama', title: 'Bookbinder', look: 'scribe', at: [-60, 74], face: 0.4 },
      offer: 'My awls, my bone folders and my presses are in my old shop, under the ash on the south lane. Krateros\' men camp in the ruins there now. Without my tools no book in this quarter gets a cover.',
      steps: [
        { kind: 'take', text: 'Recover Thumama\'s tools from the ruins on the south lane.', at: [-20, -66], label: 'Take the bookbinder\'s tools', item: 'Bookbinding Tools', guard: { pack: ['deserter', 'deserter', 'naffat'], n: 4 } },
        { kind: 'return', text: 'Bring the tools to Thumama.', lines: [['Thumama', 'My press! Hakam\'s copies will need covers, and now they shall have the best in Baghdad.']] },
        { text: 'Thumama is binding again.' }],
      reward: { gold: 190, item: 'rare', renown: 16 } },
    // Round 29
    { id: 'copper', t: 'The Bath-Keeper\'s Copper', giver: { name: 'Hammad', title: 'Bath-keeper', look: 'carter', at: [-50, 86], face: -0.4 },
      offer: 'Krateros\' men tore the great copper boiler out of my bathhouse and carted it off. A quarter that cannot wash cannot stay well. They went east.',
      steps: [
        { kind: 'kill', text: 'Catch the men who carted off the boiler, east of the khan.', at: [30, 40], pack: ['guard', 'akontistes', 'deserter'], n: 4 },
        { kind: 'meet', text: 'The boiler was sold. Find the coppersmith who bought it, in the south lanes.', at: [-20, 20], label: 'Speak with Ghalib', who: { name: 'Ghalib', title: 'Coppersmith', look: 'potter', face: 0.4 },
          lines: [['Ghalib', 'I paid good silver for that boiler, and I did not know whose it was. Now the same men come back each week for more.'], ['Salim', 'Then they will not come back again.'], ['Ghalib', 'If they do not, Hammad can have his boiler for the price of the cart. They wait for me by the old wall.']] },
        { kind: 'kill', text: 'Drive off the men who squeeze Ghalib, by the old wall.', at: [40, -10], pack: ['kontaratos', 'guard', 'tribolos'], n: 4, elite: 'Doukitzes' },
        { kind: 'return', text: 'Tell Hammad his boiler is coming home.', lines: [['Hammad', 'Ghalib is an honest man, then. I will pay the cart and his trouble.'], ['Hammad', 'Come and wash when it is hot again, guard. The first bath is yours.']] },
        { text: 'The bathhouse is warm again.' }],
      reward: { gold: 180, item: 'rare', renown: 15 } },
    // Round 30: Yusuf's ledger in the burned suq
    { id: 'ledger', camp: 'yusuf', t: 'The Ledger of Debts', giver: { name: 'Yusuf', title: '', look: 'trader', at: [-52, 80], face: -0.9 },
      offer: 'Under the floor of my old stall in the burned suq I kept a ledger. Every debt in this quarter, forty years of them. Krateros\' men are digging the ruins for silver. If they find that book, they will sell the debts to the worst men in Baghdad.',
      steps: [
        { kind: 'kill', text: 'Drive Krateros\' diggers out of the ruins of Yusuf\'s stall in the burned suq.', at: [16, 62], pack: ['guard', 'deserter', 'naffat'], n: 4, elite: 'Trypes' },
        { kind: 'meet', text: 'The floor was dug up and the ledger is gone. A water-carrier was seen running from the ruins; find him.', at: [30, 40], label: 'Speak with \'Abbad', who: { name: '\'Abbad', title: 'Water-carrier', look: 'carter', face: 0.6 },
          lines: [['\'Abbad', 'The ledger? I have it. I pulled it out before the soldiers came.'], ['\'Abbad', 'My own name is in it. Twelve dirhams, for my daughter\'s wedding, two years ago. I meant to burn that page. I could not do it.'], ['Salim', 'Yusuf asked for his book back, not for your debt.'], ['\'Abbad', 'Then let him read it himself. But the diggers\' captain knows I took it. His men are camped by the canal.']] },
        { kind: 'kill', text: 'Break the diggers\' camp by the canal before they hunt the water-carrier down.', at: [40, -10], pack: ['guard', 'crossbow', 'deserter', 'deputatos'], n: 4, elite: 'Maleinos' },
        { kind: 'return', text: 'Bring Yusuf his ledger, and tell him who saved it.', lines: [['Salim', 'Your ledger. A water-carrier, \'Abbad, saved it from the diggers. His name is in it.'], ['Yusuf', 'Twelve dirhams, for a wedding. ... Forty years of debts, and half the people in this book are dead, or ruined by the siege.'], ['Yusuf', 'Hand me that lamp. ... There. Now nobody in al-Karkh owes Yusuf a single dirham. It is the best trade I ever made.']] },
        { text: 'Yusuf burned his ledger. The quarter owes him nothing.' }],
      reward: { gold: 160, item: 'rare', renown: 18 } },
  ],
  // Round 20: Act VI, the river quays
  docks: [
    { id: 'skiff', t: 'The Ferryman\'s Skiff', giver: { name: 'Yazid', title: 'Ferryman', look: 'carter', at: [-40, 104], face: -0.8 },
      offer: 'Arsaber\'s men took my skiff at the north jetty. They use it to row out and search the barges. Forty years I have ferried this river, and now I stand on the bank like a stranger.',
      steps: [
        { kind: 'kill', text: 'Drive Arsaber\'s men off the north jetty.', at: [36, 60], pack: ['guard', 'crossbow', 'deserter'], n: 4 },
        { kind: 'return', text: 'Tell Yazid his skiff is free.', lines: [['Yazid', 'My skiff! Then I will row the copyists across myself, if they ask. Take this, with an old man\'s thanks.']] },
        { text: 'Yazid ferries the river again.' }],
      reward: { gold: 200, item: 'rare', renown: 14 } },
    { id: 'pitch', t: 'Pitch for the Hulls', giver: { name: 'Ma\'qil', title: 'Shipwright', look: 'dyer', at: [-56, 90], face: 0.6 },
      offer: 'Without pitch my hulls leak like sieves. Arsaber\'s engineers carried off every jar of it from the yard, to their camp inland. They want the boats to sink.',
      steps: [
        { kind: 'take', text: 'Take back the pitch jars from the engineers\' camp inland.', at: [-58, -30], label: 'Take the pitch jars', item: 'Jars of Pitch', guard: { pack: ['engineer', 'guard', 'crossbow'], n: 4 } },
        { kind: 'return', text: 'Bring the pitch to Ma\'qil.', lines: [['Ma\'qil', 'Good black pitch from Hit. The copyists\' boat will ride dry all the way to Basra.']] },
        { text: 'Ma\'qil\'s hulls are tight again.' }],
      reward: { gold: 210, item: 'rare', renown: 14, codex: 'rivercraft' } },
    { id: 'wages', t: 'The Porters\' Wages', giver: { name: 'Jundub', title: 'Porter', look: 'father', at: [-44, 88], face: -0.2 },
      offer: 'We carried bales for the warehouse masters all season. Now Rhentakios holds the quay, and his toll-men beat us off the road. Every porter on the river is owed.',
      steps: [
        { kind: 'kill', text: 'Break the toll-men on the quay road by the warehouses.', at: [32, 22], pack: ['guard', 'guard', 'spearman'], n: 4, elite: 'Barys' },
        { kind: 'return', text: 'Tell Jundub the road is open.', lines: [['Jundub', 'The road is ours again. The porters made a purse for whoever did this. It is yours.']] },
        { text: 'The porters are paid.' }],
      reward: { gold: 240, item: 'rare', renown: 16 } },
    { id: 'daughter', t: 'The Copyist\'s Daughter', giver: { name: 'Wasil', title: 'Copyist', look: 'seller', at: [-58, 100], face: 1.4 },
      offer: 'My daughter carries my finished quires to Hakam each night. Last night she did not come home. Someone saw her hiding in the old lanes to the south-west.',
      steps: [
        { kind: 'kill', text: 'Find Wasil\'s daughter in the south-west lanes and drive off the men around her.', at: [-62, -18], pack: ['guard', 'deserter', 'crossbow'], n: 4 },
        { kind: 'escort', text: 'Lead her back to the khan.', at: [-60, -16], who: 'children', to: [-56, 96], ambush: [[-30, 50, ['deserter', 'deserter', 'crossbow']]] },
        { kind: 'return', text: 'Speak with Wasil.', lines: [['Wasil', 'And the quires are safe in her bag, every one. You have saved two things I love tonight.']] },
        { text: 'Wasil\'s daughter is home.' }],
      reward: { gold: 190, item: 'legendary', renown: 18, codex: 'copyists' } },
    // Round 29
    { id: 'pilot', t: 'The Pilot\'s Lantern', giver: { name: 'Bakr', title: 'River pilot', look: 'boatman', at: [-44, 96], face: 0.8 },
      offer: 'My brother-in-law Mundhir went to the far boatyard with a lantern last night and did not come back. His wife has not slept.',
      steps: [
        { kind: 'kill', text: 'Search the boatyard east of the quays.', at: [30, 30], pack: ['crossbow', 'guard', 'akontistes'], n: 4 },
        { kind: 'meet', text: 'His lantern lay broken on the slip. Follow the trail into the warehouse lanes.', at: [-52, -40], label: 'Speak with Mundhir', who: { name: 'Mundhir', title: 'Lamplighter', look: 'fisher', face: 1.0 },
          lines: [['Mundhir', 'I saw them loading stolen bales onto a barge, and they saw me. I have been hiding here since.'], ['Salim', 'Can you walk?'], ['Mundhir', 'If you walk beside me. They will be watching the quays.']] },
        { kind: 'escort', text: 'Bring Mundhir home to the quays.', at: [-50, -38], who: 'man', look: 'fisher', to: [-44, 92], ambush: [[-40, 40, ['guard', 'deputatos', 'crossbow']]] },
        { kind: 'return', text: 'Speak with Bakr.', lines: [['Bakr', 'Home, and on his own feet. My sister will cry for an hour and then shout at him for two.'], ['Bakr', 'Any boat on this river will carry you, guard. Say my name.']] },
        { text: 'Mundhir is home.' }],
      reward: { gold: 190, item: 'legendary', renown: 18 } },
    // Round 30: Bishr's iron for the Bridge of Boats
    { id: 'chains', camp: 'bishr', t: 'Iron for the Bridge', giver: { name: 'Bishr', title: '', look: 'father', at: [-41, 104], face: -2.4 },
      offer: 'The Bridge of Boats has been held together with rope since the siege. Its chains went into Tahir\'s engines. There is a barge of iron bars at the boatyard, and Arsaber\'s men sit on it like hens on eggs. Bring me that iron and I will forge the bridge new chains.',
      steps: [
        { kind: 'take', text: 'Take the barge of iron bars back from Arsaber\'s men at the boatyard.', at: [36, 60], label: 'Take the iron bars', item: 'Iron Bars', guard: { pack: ['guard', 'crossbow', 'kontaratos'], n: 3 } },
        { kind: 'meet', text: 'Bishr will need hands. Find the old chain-maker who lives by the warehouses.', at: [30, 22], label: 'Speak with Mukhariq', who: { name: 'Mukhariq', title: 'Chain-maker', look: 'carter', face: -0.8 },
          lines: [['Mukhariq', 'Bishr has iron? Then he will need hands. I made the old bridge chains, before the siege took them for the engines.'], ['Salim', 'Then come and make them again.'], ['Mukhariq', 'My tools are in my old shop by the south slips. Arsaber\'s men keep it as a guardhouse now.']] },
        { kind: 'kill', text: 'Clear Arsaber\'s guardhouse out of the chain-maker\'s shop by the south slips.', at: [-58, -30], pack: ['guard', 'spearman', 'deserter', 'tribolos'], n: 4, elite: 'Kamytzes' },
        { kind: 'return', text: 'Bring Bishr his iron and a chain-maker with his tools.', lines: [['Salim', 'Your iron. And a chain-maker, with his tools.'], ['Bishr', 'Mukhariq! I thought the river had you, with the rest of them.'], ['Bishr', 'Twelve links a day, the two of us. The bridge will hold by the spring floods. Then this city can walk to work again.']] },
        { text: 'Bishr and Mukhariq forge the bridge\'s chains.' }],
      reward: { gold: 180, item: 'rare', renown: 18 } },
  ],
  hamrin: [ // Round 21: the endgame's work is in the holds, the bounties and the events; Round 29: one chain here too
    { id: 'flock', t: 'The Shepherd\'s Flock', giver: { name: 'Ghaylan', title: 'Shepherd', look: 'herder', at: [6, 88], face: -1.8 },
      offer: 'Tatzates\' men drove my flock into the western gorges when they came through. Three hundred head. Someone has been watering them; I see the tracks at the springs.',
      steps: [
        { kind: 'kill', text: 'Clear the men holding the western pass.', at: [-58, 36], pack: ['akontistes', 'guard', 'spearman'], n: 4 },
        { kind: 'meet', text: 'Find whoever has been watering the flock, up the gorge.', at: [-50, 20], label: 'Speak with the old soldier', who: { name: 'Niketas', title: 'Deserter', look: 'oldman', face: 0.6 },
          lines: [['Niketas', 'The sheep? I have kept them alive. Thirty years I have marched for the Rum. I am done with it.'], ['Salim', 'Your company will hang you if they find you.'], ['Niketas', 'Then walk me to the east road, Baghdadi, and I will tell your shepherd where every ewe is penned.']] },
        { kind: 'escort', text: 'Walk Niketas to the east road. His old company is looking for him.', at: [-48, 22], who: 'man', look: 'oldman', to: [50, 40], ambush: [[0, 40, ['kontaratos', 'akontistes', 'deputatos']]] },
        { kind: 'return', text: 'Tell Ghaylan where his flock is penned.', lines: [['Salim', 'In the old fold under the cliff fort. A Rum soldier kept them alive, and then went home.'], ['Ghaylan', 'Then there is one less soldier in the world, and three hundred more sheep. A good trade.']] },
        { text: 'Ghaylan\'s flock is home.' }],
      reward: { gold: 260, item: 'legendary', renown: 20 } },
    // Round 30: the camp men's own tasks. 'Amr: his old comrade from the Anbar gate
    { id: 'lastline', camp: 'amr', t: 'The Last Line', giver: { name: '\'Amr', title: '', look: 'father', at: [-20, 78], face: 0.9 },
      offer: 'There is a man in these hills who stood beside me at the Anbar gate. Hasan. We held a line for al-Amin together, and when it broke he ran north. The shepherds say he leads a band on the salt road now. Find him before the company does. I want to speak to him once.',
      steps: [
        { kind: 'meet', text: 'Find Hasan, \'Amr\'s old comrade, in the western hills.', at: [-58, 36], label: 'Speak with Hasan', who: { name: 'Hasan', title: 'Deserter', look: 'herder', face: 1.4 },
          lines: [['Hasan', '\'Amr sent you? Tell him I am not coming down to be lectured.'], ['Salim', 'He wants to talk. That is all.'], ['Hasan', 'My men are not my men. They take what they want, and I keep them from taking worse. Durayd and his lot in the gorge are the worst. While they ride, I cannot leave.']] },
        { kind: 'kill', text: 'Break Durayd\'s riders in the western gorge, so Hasan can leave his band.', at: [-34, 50], pack: ['deserter', 'spearman', 'crossbow', 'akontistes'], n: 4, elite: 'Durayd' },
        { kind: 'return', text: 'Tell \'Amr that Hasan is free to come down.', lines: [['Salim', 'Durayd\'s riders are broken. Hasan can come down, if he wants to.'], ['\'Amr', 'He came to the camp at dawn. We did not say much. We stood at the drill post and watched Nasim hold a line.'], ['\'Amr', 'He will teach the shepherds\' boys the sling. Two old men, holding something worth holding. Thank you, Salim.']] },
        { text: '\'Amr and Hasan teach the camp\'s boys together.' }],
      reward: { gold: 220, item: 'rare', renown: 20 } },
  ],
}[REGION];

// ------------------------------------------------------------------ bounty board (daily)
const BOUNTY_NAMES = ['Sphenos', 'Pastilas', 'Tzoulas', 'Kolybas', 'Gouber', 'Rodophyles', 'Maleses', 'Petzeas', 'Chasanes', 'Zoupas'];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function rollBounties(g) {
  const seed = [...(today() + REGION)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), rnd = mulberry32(seed);
  const roadPt = () => { const r = ROADS[Math.floor(rnd() * ROADS.length)], k = Math.floor(rnd() * (r.length - 1)), u = 0.2 + rnd() * 0.6; return [r[k][0] + (r[k + 1][0] - r[k][0]) * u, r[k][1] + (r[k + 1][1] - r[k][1]) * u]; };
  const farPt = () => { for (let i = 0; i < 30; i++) { const p = roadPt(); if (Math.hypot(p[0] - SITES.village.x, p[1] - SITES.village.z) > 45) return p; } return roadPt(); };
  const pool = { sawad: ['bandit', 'archer', 'spearman', 'deserter'], marsh: ['bandit', 'slinger', 'netter', 'reedman'], karkh: ['guard', 'archer', 'naffat', 'deserter'], docks: ['guard', 'crossbow', 'deserter', 'spearman'], hamrin: ['guard', 'crossbow', 'spearman', 'deserter', 'archer'] }[REGION];
  const areas = [{ kind: 'qanat', name: 'the ruined qanats' }, ...({ sawad: [{ kind: 'kiln', name: 'the kiln tunnels' }, { kind: 'cellar', name: 'the caravanserai storerooms' }], marsh: [{ kind: 'granary', name: 'the drowned granary' }], karkh: [{ kind: 'cellars', name: 'the merchants\' cellars' }], docks: [{ kind: 'customs', name: 'the customs vaults' }], hamrin: [] }[REGION]), ...DUNGEONS.map((d) => ({ kind: d.id, name: d.title.replace(/^The /, 'the ') }))];
  const sites = Object.entries({ serai: SITES.serai, kiln: SITES.kiln }).map(([, s]) => s);
  const kinds = ['hunt', 'recover', 'escort', 'clear', 'hunt', 'recover'];
  const out = []; const used = new Set();
  while (out.length < 3) {
    const k = kinds[Math.floor(rnd() * kinds.length)]; if (used.has(k) && rnd() < 0.7) continue; used.add(k);
    if (k === 'hunt') { const at = farPt(), name = BOUNTY_NAMES[Math.floor(rnd() * BOUNTY_NAMES.length)], type = pool[Math.floor(rnd() * pool.length)]; out.push({ kind: k, at, name, type, text: `Hunt ${name}, one of Arsaber\'s captains on the roads.` }); }
    else if (k === 'recover') { const at = farPt(); out.push({ kind: k, at, text: 'Recover stolen goods from a band on the roads.' }); }
    else if (k === 'escort') { const s = sites[Math.floor(rnd() * sites.length)]; const [x, z] = freeSpot(s.x + 6, s.z + 8); out.push({ kind: k, to: [x, z], text: `Escort a laden ${IS_MARSH ? 'buffalo' : 'camel'} from the hub to the ${s === SITES.serai ? (IS_MARSH ? 'reed camp' : IS_KARKH ? 'burned suq' : IS_DOCKS ? 'warehouses' : 'caravanserai') : (IS_MARSH ? 'fish racks' : IS_KARKH ? 'paper-sellers\' lane' : IS_DOCKS ? 'boatyard' : 'kiln yard')}.` }); }
    else { const a = areas[Math.floor(rnd() * areas.length)]; out.push({ kind: k, area: a.kind, text: `Clear ${a.name} and open the chest at the bottom.` }); }
  }
  return out.map((b, i) => ({ ...b, i, pool, renown: 15 + Math.floor(rnd() * 3) * 5, gold: 60 + Math.floor(rnd() * 4) * 20 }));
}

// ------------------------------------------------------------------ world events
const EVENTS = {
  sawad: [
    { id: 'caravan', t: 'A caravan under attack', text: 'Help the caravan on the road before the raiders take it.', at: [12, 30], pack: ['bandit', 'archer', 'bandit', 'spearman'], prop: 'caravan' },
    { id: 'well', t: 'A well being fouled', text: 'Stop the soldiers fouling the well by the kiln road.', at: [-34, -12], pack: ['deserter', 'deserter', 'naffat'], prop: 'well' },
  ],
  marsh: [
    { id: 'boats', t: 'An ambush on the water', text: 'Fishermen are ambushed on the west causeway. Break the ambush.', at: [-34, 40], pack: ['reedman', 'reedman', 'slinger', 'netter'], prop: 'boats' },
    { id: 'reedfire', t: 'The reed stacks are burning', text: 'Raiders fired the reed stacks on the east causeway. Drive them off.', at: [30, 50], pack: ['bandit', 'slinger', 'naffat'], prop: 'fire' },
  ],
  karkh: [
    { id: 'granary', t: 'A granary on fire', text: 'Krateros\' men set a granary alight on the east lane. Stop them before they carry off the grain.', at: [60, 24], pack: ['naffat', 'guard', 'deserter', 'naffat'], prop: 'fire' },
    { id: 'convoy', t: 'A grain convoy ambushed', text: 'Krateros\' men are robbing a grain convoy near the north bridge.', at: [-2, 60], pack: ['guard', 'archer', 'deserter'], prop: 'caravan' },
  ],
  docks: [
    { id: 'storefire', t: 'A warehouse on fire', text: 'Arsaber\'s men have fired a warehouse by the quay road. Drive them off before it spreads.', at: [-6, 18], pack: ['naffat', 'guard', 'crossbow', 'naffat'], prop: 'fire' },
    { id: 'porters', t: 'Porters ambushed', text: 'A file of porters is being robbed on the quay road, south of the warehouses.', at: [30, -8], pack: ['guard', 'deserter', 'crossbow'], prop: 'caravan' },
  ],
  // Round 21: the Hamrin hills
  hamrin: [
    { id: 'salters', t: 'Salt traders waylaid', text: 'Soldiers of the company have stopped a salt caravan in the western gorge. Drive them off.', at: [-34, 50], pack: ['guard', 'crossbow', 'deserter', 'spearman'], prop: 'caravan' },
    { id: 'shepherds', t: 'The shepherds\' fold is burning', text: 'Raiders fired a fold in the southern valley to drive off the flock.', at: [-6, -14], pack: ['naffat', 'guard', 'deserter', 'naffat'], prop: 'fire' },
  ],
}[REGION];

export function setupSideQuests(game) {
  const p = game.player, g = game;
  p.renown ||= 0;
  const live = new Map(); // quest id -> live objects for its current step
  const tracked = { key: null };
  // register in the journal / tracker
  for (const q of Q) SIDE[q.id] = { t: q.t, giver: q.giver.name, steps: q.steps.map((s) => s.text) };
  CODEX.buffalo = { t: 'Water Buffalo', cat: 'Places', x: 'The marsh people kept water buffalo for milk, butter and dung fuel. The animals spend the hot hours almost under water and graze on the reed beds. A family\'s herd was its wealth, passed from parent to child.' };

  // ---------------- givers
  for (const q of Q) {
    let n = g.npcs.find((x) => x.name === q.giver.name);
    if (!n) { const [x, z] = freeSpot(...q.giver.at); n = npc(g, people[q.giver.look], [x, z], q.giver.face, q.giver.name, q.giver.title, () => {}); }
    q.npc = n; const prev = n.talk;
    q.mark = mark(n.rig);
    n.talk = () => {
      const s = questState(p, q.id), st = q.steps[s];
      const hubMan = prev && (q.giver.name === 'Ishaq' || q.camp); // Round 30: the camp men keep their own panels
      if (s === -1) return converse(g, { start: { who: q.giver.name, text: q.offer, choices: [{ label: 'I will help.', fx: () => accept(q) }, { label: q.camp ? 'Not now. Show me your trade.' : 'Not now.', ...(hubMan ? { fx: () => setTimeout(prev, 0) } : {}) }] } });
      if (st?.kind === 'return') return g.director.play(SCENES.conversation(g, n, st.lines.map(([who, text]) => ({ who, text })))).then(() => advance(q));
      if (hubMan) return prev();
      converse(g, { start: { who: q.giver.name, text: s >= q.steps.length - 1 ? t(q.steps[q.steps.length - 1].text) : t(st.text), choices: [{ label: 'Farewell.' }] } });
    };
  }
  buildGrid();
  if (!g.isTouch) g.ui.root.querySelector('#quest')?.addEventListener('click', (e) => { const k = e.target.closest('[data-k]'); if (k) g.track(k.dataset.k); });
  function accept(q) { setQuest(g, q.id, 0); tracked.key = 'q:' + q.id; activate(q); }
  function advance(q) {
    const s = questState(p, q.id); clear(q);
    const next = s + 1; setQuest(g, q.id, next);
    if (next >= q.steps.length - 1) reward(q); else activate(q);
  }
  function reward(q) {
    const R = q.reward;
    if (q.camp) (p.campq30 ||= {})[q.camp] = true;
    if (R.gold) { p.gold += R.gold + p.level * 10; g.audio.gold?.(); }
    if (R.item) giveItem(g, makeItem(p.level + 1, R.item));
    if (R.legend) { const it = makeItem(p.level + 1, 'legendary', 'amulet'); it.name = R.legend; it.flavor = '"Carried the whole road home."'; giveItem(g, it); }
    if (R.codex) unlock(g, R.codex);
    renown(R.renown);
    if (tracked.key === 'q:' + q.id) tracked.key = null;
    g.refreshInv?.(); saveGame(g);
  }
  function renown(n) { if (!n) return; p.renown = (p.renown || 0) + n; g.ui.toast(`+${n} ${t('Renown')}`, 'lvl'); }

  // ---------------- step objects
  function spawnBand(at, st, tag) {
    const [x, z] = freeSpot(...at), out = g.spawnPack(st.pack, x, z, st.n || st.pack.length, lvl(g, 1), { spread: 4, hidden: !!st.hidden });
    if (st.elite) out.push(...g.spawnPack(st.pack[0], x, z, 1, lvl(g, 2), { elite: true, name: st.elite, spread: 0 }));
    for (const e of out) e.sideTag = tag;
    return out;
  }
  function activate(q) {
    const s = questState(p, q.id), st = q.steps[s]; if (!st || live.has(q.id)) return;
    const L = { pack: [], objs: [], acts: [] }; live.set(q.id, L);
    if (st.kind === 'kill') L.pack = spawnBand(st.at, st, q.id);
    if (st.kind === 'take') {
      if (st.guard) L.pack = spawnBand(st.at, st.guard, q.id);
      const [x, z] = freeSpot(st.at[0] + 1.5, st.at[1] + 1.5), o = st.item.includes('Ledger') || st.item.includes('Pens') ? crate() : jar(0x7a5a3a, 1.1);
      o.position.copy(V3(x, z)); g.scene.add(o); L.objs.push(o);
      const glow = beacon(o.position); L.objs.push(glow);
      const it = { pos: o.position, r: 2.6, label: st.label, act: () => {
        if (L.pack.some((e) => !e.dead)) { g.ui.toast(t('The guards still watch it')); g.audio.denied?.(); return; }
        giveItem(g, { id: 9200 + q.id.length, slot: 'amulet', rarity: 'legendary', name: st.item, base: 'Quest item', level: 1, stats: {}, questId: q.id, flavor: '"Someone is waiting for this."' });
        advance(q);
      } };
      g.interactables.push(it); L.acts.push(it); L.target = o.position;
    }
    if (st.kind === 'visit') {
      const [x, z] = freeSpot(...st.at), pos = V3(x, z);
      const spear = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.8 }), steel = new THREE.MeshStandardMaterial({ color: 0xa8aeb4, metalness: 0.8, roughness: 0.35 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 2.4, 6), wood); shaft.position.y = 1.0; spear.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 6), steel); tip.position.y = 2.36; spear.add(tip);
      spear.rotation.z = 0.25; spear.position.copy(pos); g.scene.add(spear); const bc = beacon(pos); L.objs.push(spear, bc);
      const it = { pos, r: 2.6, label: st.label, act: () => { bc.visible = false; g.director.play(spearScene(g, pos, spear)).then(() => advance(q)); } };
      g.interactables.push(it); L.acts.push(it); L.target = pos;
    }
    if (st.kind === 'escort') {
      const [x, z] = freeSpot(...st.at);
      const make = () => st.who === 'buffalo' ? { rig: buffalo(0x2c2a2a), beast: 'buffalo' } : st.who === 'camels' ? { rig: camel(0xb88a58), beast: 'camel' } : st.who === 'man' ? { rig: humanoid({ detail: 'lo', ...people[st.look || 'father'] }), beast: null } : { rig: humanoid({ detail: 'lo', ...people.child }), beast: null };
      const count = st.who === 'camels' || st.who === 'children' ? 2 : 1;
      L.follow = [];
      for (let i = 0; i < count; i++) { const f = make(); f.pos = V3(x + i * 1.6, z + i); f.st = { phase: 0, walkBlend: 0, action: null, actionT: 0, hitT: 0, seed: Math.random() * 9 }; f.facing = 0; f.rig.position.copy(f.pos); g.scene.add(f.rig); L.objs.push(f.rig); L.follow.push(f); }
      L.dest = V3(...st.to); L.target = L.follow[0].pos;
      for (const [ax, az, pack] of st.ambush || []) L.pack.push(...spawnBand([ax, az], { pack, n: pack.length }, q.id));
    }
    // Round 29: meet someone out in the world (a short conversation scene); for a twist, a band can come at the end
    if (st.kind === 'meet') {
      const [x, z] = freeSpot(...st.at), n0 = colliders.length;
      const n = npc(g, people[st.who.look], [x, z], st.who.face ?? 0, st.who.name, st.who.title || '', () => {});
      const col = colliders.slice(n0); L.objs.push(n.rig); const bc = beacon(n.rig.position); L.objs.push(bc);
      const act = g.interactables.find((i) => i.npc === n); if (act) { act.label = st.label; L.acts.push(act); }
      L.meetNpc = n; L.meetCol = col; L.target = n.rig.position;
      n.talk = () => {
        if (L.pack.some((e) => !e.dead)) { g.ui.toast(t('Deal with the men around first')); return; }
        bc.visible = false; n.rig.visible = true; // the hub hides people far from Salim; make sure he is shown for his scene
        g.director.play(SCENES.conversation(g, n, st.lines.map(([who, text]) => ({ who, text })))).then(() => advance(q));
      };
      if (st.guard) L.pack = spawnBand([x + 4, z + 4], st.guard, q.id);
    }
    if (st.kind === 'return') L.target = q.npc.pos;
    if (st.kind === 'kill') L.target = null; // the band itself
  }
  function clear(q) {
    const L = live.get(q.id); if (!L) return;
    for (const o of L.objs) g.scene.remove(o);
    g.interactables = g.interactables.filter((i) => !L.acts.includes(i));
    if (L.meetNpc) { g.npcs = g.npcs.filter((n) => n !== L.meetNpc); for (const c of L.meetCol) { const k = colliders.indexOf(c); if (k >= 0) colliders.splice(k, 1); } }
    live.delete(q.id);
  }
  function mark(rig) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x40a0ff, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 }));
    m.position.y = 2.6; rig.add(m); return m;
  }
  function beacon(pos) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 7, 12, 1, true).translate(0, 3.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.0, 0.6), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(pos); g.scene.add(m); return m;
  }

  // ---------------- bounties
  const B = () => { const b = (p.bounty ||= {}); const d = today(); if (!b[REGION] || b[REGION].day !== d) b[REGION] = { day: d, taken: [false, false, false], done: [false, false, false] }; return b[REGION]; };
  const bounties = rollBounties(g);
  const blive = new Map();
  function startBounty(b) {
    const S = B(); S.taken[b.i] = true; saveGame(g);
    activateBounty(b); tracked.key = 'b:' + b.i; g.refreshTracker?.();
    g.ui.toast(`${t('Bounty taken')}: ${t(b.text)}`, 'quest');
  }
  function activateBounty(b) {
    if (blive.has(b.i)) return; const L = { pack: [], objs: [], acts: [] }; blive.set(b.i, L);
    if (b.kind === 'hunt') { L.pack = spawnBand(b.at, { pack: [b.type, b.type, b.pool[0]], n: 3 }, 'b' + b.i); const [x, z] = freeSpot(...b.at); const boss = g.spawnPack(b.type, x, z, 1, lvl(g, 3), { elite: true, name: b.name, spread: 0 })[0]; L.pack.push(boss); L.boss = boss; }
    if (b.kind === 'recover') {
      L.pack = spawnBand(b.at, { pack: b.pool, n: 4 }, 'b' + b.i);
      const [x, z] = freeSpot(b.at[0] + 2, b.at[1] + 2), o = crate(); o.position.copy(V3(x, z)); g.scene.add(o); L.objs.push(o, beacon(o.position));
      const it = { pos: o.position, r: 2.6, label: 'Take back the stolen goods', act: () => { if (L.pack.some((e) => !e.dead)) { g.ui.toast(t('The guards still watch it')); return; } finishBounty(b); } };
      g.interactables.push(it); L.acts.push(it); L.target = o.position;
    }
    if (b.kind === 'escort') {
      const [x, z] = freeSpot(HUB.spawn[0] + 3, HUB.spawn[1] - 4), f = IS_MARSH ? { rig: buffalo(0x302c2a), beast: 'buffalo' } : { rig: camel(0xa07850), beast: 'camel' };
      f.pos = V3(x, z); f.st = { phase: 0, walkBlend: 0, seed: 1 }; f.facing = 0; g.scene.add(f.rig); L.objs.push(f.rig); L.follow = [f]; L.dest = V3(...b.to); L.target = f.pos;
      // an ambush halfway
      const mx = (x + b.to[0]) / 2, mz = (z + b.to[1]) / 2; L.pack = spawnBand([mx, mz], { pack: b.pool, n: 3 }, 'b' + b.i);
    }
  }
  function finishBounty(b) {
    const L = blive.get(b.i); if (L) { for (const o of L.objs) g.scene.remove(o); g.interactables = g.interactables.filter((i) => !L.acts.includes(i)); blive.delete(b.i); }
    const S = B(); S.done[b.i] = true;
    p.gold += b.gold + p.level * 8; p.mats ||= {}; p.mats.scrap = (p.mats.scrap || 0) + 3; p.mats.silk = (p.mats.silk || 0) + 1; if (b.kind !== 'recover') p.mats.gem = (p.mats.gem || 0) + 1;
    g.audio.gold?.(); g.ui.banner(t('Bounty complete'), `+${b.gold + p.level * 8} ${t('dinars')} · +${b.renown} ${t('Renown')}`, 2600);
    renown(b.renown); if (tracked.key === 'b:' + b.i) tracked.key = null;
    g.refreshTracker?.(); saveGame(g);
  }
  // the board itself, in the hub corner
  {
    const [bx, bz] = freeSpot(HUB.ishaq[0] + 5, HUB.ishaq[1] - 4, 1.4), board = boardProp(); board.position.copy(V3(bx, bz)); board.rotation.y = Math.atan2(HUB.spawn[0] - bx, HUB.spawn[1] - bz);
    g.scene.add(board); colliders.push({ type: 'box', x: bx, z: bz, hw: 1.1, hd: 0.3, rot: board.rotation.y }); buildGrid();
    g.interactables.push({ pos: board.position, r: 2.8, label: 'Read the bounty board', act: () => openBoard() });
    g.pois?.push({ x: bx, z: bz, icon: '✎', color: '#e8c070' });
  }
  function openBoard() {
    document.getElementById('shop')?.remove(); g.closePanels?.();
    const S = B(), w = document.createElement('div'); w.id = 'shop'; w.className = 'panel';
    const rows = bounties.map((b) => {
      const st = S.done[b.i] ? `<b class="bdone">${t('Done')}</b>` : S.taken[b.i] ? `<b class="btaken">${t('Taken')}</b>` : `<button class="sbtn" data-i="${b.i}">${t('Take')}</button>`;
      return `<div class="srow bounty"><div class="bico">${({ hunt: '⚔', recover: '⚱', escort: '⇢', clear: '▼' })[b.kind]}</div><div class="sinfo"><span>${t(b.text)}</span><small>◉ ${b.gold + p.level * 8} · ${t('Renown')} +${b.renown}</small></div>${st}</div>`;
    }).join('');
    w.innerHTML = `<div class="ptitle">${t('Bounty Board')} <span class="close" role="button" aria-label="Close">✕</span></div><div class="sbody"><div class="slabel">${t('New bounties are posted every day.')}</div><div class="slist">${rows}</div></div><div class="sfoot"><span>${t('Renown')}: <b>${p.renown || 0}</b></span></div>`;
    g.ui.root.appendChild(w);
    w.querySelector('.close').onclick = () => w.remove();
    w.querySelectorAll('button[data-i]').forEach((btn) => btn.onclick = () => { startBounty(bounties[+btn.dataset.i]); openBoard(); });
  }
  // clearing an interior counts for a 'clear' bounty when its chest is opened
  const zones = g.zones, openChest = zones.openChest.bind(zones);
  zones.openChest = () => { const kind = g.interior?.def.kind; openChest(); const S = B(); for (const b of bounties) if (b.kind === 'clear' && S.taken[b.i] && !S.done[b.i] && kind === b.area) finishBounty(b); };

  // ---------------- world events
  const ev = { next: 150 + Math.random() * 120, cur: null };
  function startEvent() {
    const E = EVENTS[Math.floor(Math.random() * EVENTS.length)], [x, z] = freeSpot(...E.at);
    if (Math.hypot(x - p.pos.x, z - p.pos.z) < 25) return false; // never spawn on top of the hero
    const pack = spawnBand([x, z], { pack: E.pack, n: E.pack.length }, 'ev');
    for (const e of pack) { e.alerted = false; }
    const objs = [];
    if (E.prop === 'caravan') for (let i = 0; i < 2; i++) { const c = camel(i ? 0xa07040 : 0xc49a68); c.position.copy(V3(x + 3 + i * 2.2, z - 2)); c.rotation.y = 0.6; g.scene.add(c); objs.push(c); }
    if (E.prop === 'well') { const j = jar(0x5a4a2a, 1.4); j.position.copy(V3(x + 2, z)); g.scene.add(j); objs.push(j); }
    if (E.prop === 'boats') { /* the ambushers hide in the reeds */ for (const e of pack.slice(0, 2)) e.hidden = true; }
    ev.cur = { E, pack, objs, pos: V3(x, z), t: 150, fire: E.prop === 'fire' ? V3(x + 3, z + 2) : null };
    tracked.key = 'ev';
    g.ui.banner(t('World event'), t(E.t), 3000); g.audio.stinger?.('ambush'); g.refreshTracker?.();
    return true;
  }
  function endEvent(won) {
    const c = ev.cur; if (!c) return;
    for (const o of c.objs) g.scene.remove(o);
    if (won) { g.dropItem(makeItem(p.level + 1, Math.random() < 0.3 ? 'legendary' : 'rare'), c.pos); g.dropItem({ gold: 40 + p.level * 12, rarity: 'common' }, c.pos); renown(10); g.ui.banner(t('Event complete'), t(c.E.t), 2400); }
    else { for (const e of c.pack) if (!e.dead) { g.scene.remove(e.rig); e.removed = true; e.dead = true; } g.ui.toast(t('The raiders got away.')); }
    ev.cur = null; ev.next = 240 + Math.random() * 180; if (tracked.key === 'ev') tracked.key = null; g.refreshTracker?.();
  }

  // ---------------- tracker entries and the trail target
  const extraLines = () => {
    const S = B(), out = [];
    if (ev.cur) out.push({ key: 'ev', text: `⚑ ${t(ev.cur.E.t)} (${Math.ceil(ev.cur.t)}s)` });
    for (const b of bounties) if (S.taken[b.i] && !S.done[b.i]) out.push({ key: 'b:' + b.i, text: `${t('Bounty')}: ${t(b.text)}` });
    return out;
  };
  g.sideLines = () => extraLines().map((l) => ({ ...l, side: true, on: tracked.key === l.key }));
  g.sideKeyFor = (id) => 'q:' + id;
  g.trackedKey = () => tracked.key;
  g.track = (key) => { tracked.key = tracked.key === key ? null : key; g.refreshTracker?.(); g.guide && (g.guide.path = null, g.guide.repath = 0); g.ui.toast(tracked.key ? t('Tracking on the trail') : t('Trail follows the story'), ''); };
  // where the trail leads for the tracked task (null: fall back to the main story)
  g.trackTarget = () => targetFor(tracked.key);
  const targetFor = (k) => {
    if (!k) return null;
    const bandPos = (pack) => { const e = pack.find((x) => !x.dead); return e ? e.pos : null; };
    if (k === 'ev') return ev.cur ? { pos: bandPos(ev.cur.pack) || ev.cur.pos, text: ev.cur.E.text } : null;
    if (k.startsWith('b:')) {
      const b = bounties[+k.slice(2)], L = blive.get(b.i); if (!b) return null;
      if (b.kind === 'clear') return { pos: b.area === 'qanat' ? new THREE.Vector3(SITES.village.x - 1, 0, SITES.village.z + 6.5) : (g.interactables.find((i) => i.area === b.area)?.pos || SITES.kiln), text: b.text };
      if (!L) return null;
      if (b.kind === 'escort') { const f = L.follow[0]; return { pos: f.pos.distanceTo(p.pos) > 12 ? f.pos : L.dest, text: b.text }; }
      return { pos: (L.target && !L.pack.some((e) => !e.dead) ? L.target : bandPos(L.pack)) || L.target, text: b.text };
    }
    const q = Q.find((x) => 'q:' + x.id === k); if (!q) return null;
    const s = questState(p, q.id), st = q.steps[s], L = live.get(q.id); if (!st || !st.kind) return null;
    if (st.kind === 'escort' && L) { const f = L.follow[0]; return { pos: f.pos.distanceTo(p.pos) > 12 ? f.pos : L.dest, text: st.text }; }
    if (L?.pack.some((e) => !e.dead)) return { pos: bandPos(L.pack), text: st.text };
    return { pos: L?.target || V3(...(st.at || q.giver.at)), text: st.text };
  };

  // Round 30: every task on the maps: givers with work to offer, each live step's target, taken bounties, the event
  g.questMarks = () => {
    if (g.interior) return [];
    const out = [], S = B();
    for (const q of Q) {
      const s = questState(p, q.id), st = q.steps[s];
      if (s === -1) { out.push({ pos: q.npc.pos || q.npc.rig.position, kind: 'offer', name: q.t }); continue; }
      if (!st || s >= q.steps.length - 1) continue;
      const tg = targetFor('q:' + q.id); if (tg?.pos) out.push({ pos: tg.pos, kind: st.kind === 'meet' ? 'meet' : st.kind === 'return' ? 'return' : 'task', name: q.t, key: 'q:' + q.id, on: tracked.key === 'q:' + q.id });
    }
    for (const b of bounties) if (S.taken[b.i] && !S.done[b.i]) { const tg = targetFor('b:' + b.i); if (tg?.pos) out.push({ pos: tg.pos, kind: 'bounty', name: b.text, key: 'b:' + b.i, on: tracked.key === 'b:' + b.i }); }
    if (ev.cur) { const tg = targetFor('ev'); if (tg?.pos) out.push({ pos: tg.pos, kind: 'event', name: ev.cur.E.t, key: 'ev', on: tracked.key === 'ev' }); }
    return out;
  };

  // ---------------- per frame
  const tickFollow = (L, dt) => {
    let i = 0;
    for (const f of L.follow) {
      const lead = i === 0 ? p.pos : L.follow[i - 1].pos, d = f.pos.distanceTo(lead), near = p.pos.distanceTo(f.pos) < 14;
      let moving = false;
      if (near && d > 2.6) { const dir = new THREE.Vector3(lead.x - f.pos.x, 0, lead.z - f.pos.z).normalize(); f.pos.addScaledVector(dir, Math.min(d - 2.2, (f.beast ? 4.6 : 5.2) * dt)); resolve(f.pos, 0.5, false); f.pos.y = heightAt(f.pos.x, f.pos.z); f.facing += angDiff(f.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 5); moving = true; }
      f.st.walkBlend = THREE.MathUtils.lerp(f.st.walkBlend, moving ? 1 : 0, Math.min(1, dt * 5)); f.st.phase += dt * (moving ? 4.4 : 0); f.st.graze = !moving && f.beast;
      f.rig.position.copy(f.pos);
      if (f.beast === 'camel') { f.rig.rotation.y = f.facing - Math.PI / 2; animateCamel(f.rig, f.st, g.t); } else if (f.beast === 'buffalo') { f.rig.rotation.y = f.facing - Math.PI / 2; animateBuffalo(f.rig, f.st, g.t); } else { f.rig.rotation.y = f.facing; animateHumanoid(f.rig, f.st, g.t, dt); }
      i++;
    }
    return L.follow.every((f) => f.pos.distanceTo(L.dest) < 7);
  };
  g.sideMarks = Q.map((q) => q.mark); // Round 26: hidden in cutscenes (game.cineTick); they showed as specks on the dusk horizon
  let lt = 0;
  g.sideTick = (dt) => {
    if (g.interior) return;
    for (const q of Q) {
      const s = questState(p, q.id); q.mark.visible = s === -1 || q.steps[s]?.kind === 'return'; q.mark.rotation.y += dt * 2;
      const L = live.get(q.id); if (!L) continue; const st = q.steps[s];
      if (st.kind === 'kill' && L.pack.length && L.pack.every((e) => e.dead)) advance(q);
      else if (st.kind === 'escort' && tickFollow(L, dt)) advance(q);
    }
    for (const b of bounties) {
      const L = blive.get(b.i); if (!L) continue;
      if (b.kind === 'hunt' && L.boss?.dead) finishBounty(b);
      else if (b.kind === 'escort' && tickFollow(L, dt)) finishBounty(b);
    }
    // world events: one at a time, never during the act's last fight or a cutscene
    if (ev.cur) { ev.cur.t -= dt; if (ev.cur.fire && Math.random() < 0.8) g.fx.fire(ev.cur.fire, 1.2); if (ev.cur.pack.every((e) => e.dead)) endEvent(true); else if (ev.cur.t <= 0) endEvent(false); }
    else if (!g.bossActive && !g.cinematic && g.briefed && (ev.next -= dt) <= 0) { if (!startEvent()) ev.next = 20; }
    if ((lt -= dt) <= 0) { lt = 1; if (ev.cur || bounties.some((b) => blive.has(b.i))) g.refreshTracker?.(); }
  };
  // restore saved progress: re-open each task's current step, and taken bounties
  g.restoreSide = () => {
    for (const q of Q) { const s = questState(p, q.id); if (s >= 0 && s < q.steps.length - 1) activate(q); }
    const S = B(); for (const b of bounties) if (S.taken[b.i] && !S.done[b.i] && b.kind !== 'clear') activateBounty(b);
  };
  g.restoreSide();
  g.__side = { startEvent, endEvent, ev, bounties, startBounty, finishBounty, Q, live, blive, openBoard };
}
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// A notice board: two posts, a plank face pinned with paper bounties
export function boardProp() {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.85 }), paper = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 });
  for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), wood); post.position.set(s * 0.95, 1.2, 0); post.castShadow = true; g.add(post); }
  const face = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.2, 0.08), wood); face.position.set(0, 1.55, 0); face.castShadow = true; g.add(face);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.5), wood); roof.position.set(0, 2.24, 0.05); roof.rotation.x = 0.2; g.add(roof);
  for (let i = 0; i < 5; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), paper); n.position.set(-0.75 + i * 0.37, 1.55 + (i % 2 ? 0.15 : -0.12), 0.05); n.rotation.z = (i % 3 - 1) * 0.08; g.add(n); }
  return g;
}

// Jabir's spear on the dune: a quiet scene, no combat
function spearScene(g, pos, spear) {
  const p = g.player, st = p.st;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    actors: [{ rig: p.rig, pos: p.pos, get facing() { return p.facing; }, set facing(v) { p.facing = v; }, st }],
    shots: [
      { dur: 4.2, fadeIn: 0.8, caption: 'The sand had nearly covered it.', enter: () => { p.pos.set(pos.x + 1.2, 0, pos.z + 1.0); p.pos.y = heightAt(p.pos.x, p.pos.z); p.facing = Math.atan2(pos.x - p.pos.x, pos.z - p.pos.z); st.crouch = 0.85; },
        cam: { p0: () => V(pos.x + 5, pos.y + 2.2, pos.z + 5), t0: () => V(pos.x, pos.y + 0.8, pos.z), p1: () => V(pos.x + 3.6, pos.y + 1.6, pos.z + 3.8), t1: () => V(pos.x, pos.y + 0.9, pos.z), fov: 36 }, run: () => { st.crouch = 0.85; } },
      { dur: 4.0, line: { who: 'Salim', text: 'I said I would bring it back, brother. This too.', rig: p.rig, cue: 'breath' },
        cam: { p0: () => V(pos.x - 3.0, pos.y + 1.5, pos.z + 2.6), t0: () => V((p.pos.x + pos.x) / 2, p.pos.y + 0.9, (p.pos.z + pos.z) / 2), p1: () => V(pos.x - 2.6, pos.y + 1.3, pos.z + 2.2), t1: () => V((p.pos.x + pos.x) / 2, p.pos.y + 0.9, (p.pos.z + pos.z) / 2), fov: 38 }, run: () => { st.crouch = 0.85; } },
      { dur: 3.4, caption: 'He carried the spear back to the village.', enter: (d) => { spear.visible = false; d.fade(1, 1.0); } },
    ],
    tick: (d, dt) => { g.anim(p.rig, st, dt); p.rig.position.copy(p.pos); p.rig.rotation.y = p.facing; },
    end: () => { st.crouch = 0; },
  };
}
