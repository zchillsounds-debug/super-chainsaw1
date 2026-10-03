// Which map this page load builds (Round 15). Each act region is its own map: the Sawad outside Baghdad
// (Acts I-III), the Nahrawan marshes (Act IV) and al-Karkh (Act V). Travelling between them saves the game and
// reloads the page into the next region, so a phone only ever holds one map in memory.
const P = new URLSearchParams(location.search);
const ORDER = ['sawad', 'marsh', 'karkh'];
export const FIRST_ACT = { sawad: 1, marsh: 4, karkh: 5 };

function pick() {
  const q = P.get('region'); if (ORDER.includes(q)) return q;
  try { if (sessionStorage.getItem('sob.newgame')) return 'sawad'; } catch { /* storage unavailable */ }
  let act = 1; try { act = JSON.parse(localStorage.getItem('sob.save.v1'))?.act || 1; } catch { /* no save */ }
  return regionForAct(act);
}
export function regionForAct(act) { return act >= 5 ? 'karkh' : act === 4 ? 'marsh' : 'sawad'; }
export const REGION = pick();
export const IS_SAWAD = REGION === 'sawad', IS_MARSH = REGION === 'marsh', IS_KARKH = REGION === 'karkh';

// Hub corner: the merchant, smith, stash and trainer travel with Salim and Ishaq and set up in each region.
export const HUB = {
  sawad: { merchant: [7, 81], smith: [10, 92], stash: [-6, 91], trainer: [-9, 81], ishaq: [-2, 84], spawn: [1, 88] },
  marsh: { merchant: [20, 74], smith: [24, 86], stash: [2, 87], trainer: [-1, 75], ishaq: [8, 80], spawn: [10, 90] },
  karkh: { merchant: [-52, 80], smith: [-54, 92], stash: [-70, 92], trainer: [-73, 80], ishaq: [-64, 86], spawn: [-62, 96] },
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
}[REGION];

export const REGION_NAME = { sawad: 'The Sawad', marsh: 'The Nahrawan Marshes', karkh: 'Al-Karkh' }[REGION];
