// Which map this page load builds (Round 15). Each act region is its own map: the Sawad outside Baghdad
// (Acts I-III), the Nahrawan marshes (Act IV) and al-Karkh (Act V). Travelling between them saves the game and
// reloads the page into the next region, so a phone only ever holds one map in memory.
const P = new URLSearchParams(location.search);
const ORDER = ['sawad', 'marsh', 'karkh', 'docks', 'hamrin'];
export const FIRST_ACT = { sawad: 1, marsh: 4, karkh: 5, docks: 6, hamrin: 7 };

function pick() {
  const q = P.get('region'); if (ORDER.includes(q)) return q;
  try { if (sessionStorage.getItem('sob.newgame')) return 'sawad'; } catch { /* storage unavailable */ }
  let act = 1; try { act = JSON.parse(localStorage.getItem('sob.save.v1'))?.act || 1; } catch { /* no save */ }
  return regionForAct(act);
}
// Round 20: Act VI, the river quays of al-Karkh on the Tigris (act 7 = the chronicle finished, still on the quays)
// Round 21: once the chronicle is finished (act 7) Salim can ride north to the Hamrin hills, the endgame map; the
// choice is remembered (sob.endgame) so a reload comes back to wherever he last was
export function regionForAct(act) {
  if (act >= 7) { try { if (localStorage.getItem('sob.endgame') === 'hamrin') return 'hamrin'; } catch { /* storage unavailable */ } }
  return act >= 6 ? 'docks' : act === 5 ? 'karkh' : act === 4 ? 'marsh' : 'sawad';
}
export const REGION = pick();
export const IS_SAWAD = REGION === 'sawad', IS_MARSH = REGION === 'marsh', IS_KARKH = REGION === 'karkh', IS_DOCKS = REGION === 'docks';
export const IS_HAMRIN = REGION === 'hamrin';
export const IS_CITY = IS_KARKH || IS_DOCKS; // the two Baghdad maps share their ground, weather and street life

// Hub corner: the merchant, smith, stash and trainer travel with Salim and Ishaq and set up in each region.
export const HUB = {
  sawad: { merchant: [7, 81], smith: [10, 92], stash: [-6, 91], trainer: [-9, 81], ishaq: [-2, 84], spawn: [1, 88] },
  marsh: { merchant: [20, 74], smith: [24, 86], stash: [2, 87], trainer: [-1, 75], ishaq: [8, 80], spawn: [10, 90] },
  karkh: { merchant: [-52, 80], smith: [-54, 92], stash: [-70, 92], trainer: [-73, 80], ishaq: [-64, 86], spawn: [-62, 96] },
  docks: { merchant: [-38, 92], smith: [-41, 104], stash: [-58, 104], trainer: [-60, 92], ishaq: [-50, 98], spawn: [-48, 108] },
  hamrin: { merchant: [2, 78], smith: [0, 90], stash: [-18, 90], trainer: [-20, 78], ishaq: [-10, 84], spawn: [-8, 98] },
}[REGION];

// Main-quest chain per region: two named captains on the road (chief, second) and the act's final fight.
export const STORY = {
  sawad: {
    quests: [
      { id: 'serai', text: 'Defeat Farud at the old caravanserai' },
      { id: 'graves', text: 'Drive Hisham\'s men from the kiln yard' },
      { id: 'boss', text: 'Face Ghassan at the ruined Persian arch' },
    ],
    chief: 'serai', second: 'graves', boss: 'boss',
    banner: ['', 'The road from the village', 'The kiln yard', 'The road to the arch'],
  },
  marsh: {
    quests: [
      { id: 'reedcamp', text: 'Find Marwan in the reed camp to the west' },
      { id: 'landing', text: 'Take Rawh\'s boats from Sahl at the fish racks' },
      { id: 'rawh', text: 'Face Rawh at the old weir' },
    ],
    chief: 'reedcamp', second: 'landing', boss: 'rawh',
    banner: ['', '', '', '', 'The Nahrawan marshes'],
  },
  karkh: {
    quests: [
      { id: 'burnedsuq', text: 'Find \'Asim in the burned suq' },
      { id: 'warraqin', text: 'Drive Layth from the paper-sellers\' lane' },
      { id: 'utba', text: 'Stop \'Utba in the square before sunset' },
    ],
    chief: 'burnedsuq', second: 'warraqin', boss: 'utba',
    banner: ['', '', '', '', '', 'Al-Karkh', 'Al-Karkh'],
  },
  docks: {
    quests: [
      { id: 'warehouses', text: 'Find Bilal among the river warehouses' },
      { id: 'boatyard', text: 'Free the copyists\' boat from Mus\'ab at the boatyard' },
      { id: 'ghanim', text: 'Face Ghanim at the bridge of boats' },
    ],
    chief: 'warehouses', second: 'boatyard', boss: 'ghanim',
    banner: ['', '', '', '', '', '', 'The river quays', 'The river quays'],
  },
  // Round 21: the endgame: four holds in the ravines, the last of them Zubayr's (no field boss on this map)
  hamrin: {
    quests: [
      { id: 'quarry', text: 'Clear the Quarry Galleries' },
      { id: 'fort', text: 'Take the Cliff Fort' },
      { id: 'gorge', text: 'Cross the Gorge Bridge' },
      { id: 'rivalhold', text: 'Find Zubayr in his hold' },
    ],
    chief: null, second: null, boss: null,
    banner: ['', '', '', '', '', '', '', 'The Hamrin hills'],
  },
}[REGION];

export const REGION_NAME = { sawad: 'The Sawad', marsh: 'The Nahrawan Marshes', karkh: 'Al-Karkh', docks: 'The River Quays', hamrin: 'The Hamrin Hills' }[REGION];
