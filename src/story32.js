// Round 32: story everywhere. What carries the round's story between the scenes (scenes32.js):
// - beats: small scenes that play once, when Salim is calm in the right place (Arsaber's chapter, the act scenes, the
//   people who come back: Niketas, Lubna and Shabib), plus Rafi' the courier's news and Salim's words at the landmarks
// - the hired guards' own stories, told while walking (four beats each, one per region visit)
// - the Rum speak: orders shouted in fights, and the hold masters' words as Salim comes through their doors
// - Things Found: writing and objects lying in every region (Arsaber's dispatches among them), and letters found on fallen
//   captains, all kept in the Codex. The Leaves and Letters of Round 25 are kept there too now.
// - the three new choices (niketas, copies, crews) and what they change: Renown, lines in later scenes and the ending
// State: p.s25.said.r32_<id> (beats seen), p.s25.found32 (things found), p.s25.g32[kind] (guard beats), p.s25.ch.
import * as THREE from 'three';
import { SITES, heightAt, waterDepth } from './terrain.js';
import { resolve } from './collision.js';
import { REGION, HUB } from './region.js';
import { makeItem } from './items.js';
import { freeSpot } from './sidequests.js';
import { CODEX, unlock } from './narrative.js';
import { S25, LEAVES } from './story25.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';
import * as S32 from './scenes32.js';

const ORDER = ['sawad', 'marsh', 'karkh', 'docks', 'hamrin'];
const RI = ORDER.indexOf(REGION);

// ---------------------------------------------------------------- Things Found
// at: [site, dx, dz]. kind: dispatch (Arsaber's) | object | paper
export const FOUND = {
  sawad: [
    { id: 'fs1', kind: 'dispatch', at: ['serai', -11, -6], t: 'Arsaber to the Logothete, on the gold', x: '"Bardanes asks why we trouble with the astronomer\'s chest when there is gold in every village. I told him gold is spent in a year."' },
    { id: 'fs2', kind: 'dispatch', at: ['arch', -10, -9], t: 'Arsaber, a note to himself', x: '"The guard\'s brother died on the dune. Tatzates says he does not remember the face. I believe him, and I wish I did not."' },
    { id: 'fs3', kind: 'object', at: ['village', 14, -10], t: 'A mended clay camel', x: 'A child\'s clay camel with one leg broken off, found by the canal. Someone has mended it with bitumen, twice.' },
    { id: 'fs4', kind: 'object', at: ['kiln', 11, -8], t: 'The water tally board', x: 'A canal village\'s tally board: who drew water, and when. Since Bardanes cut the canal, the last column is empty.' },
  ],
  marsh: [
    { id: 'fm1', kind: 'dispatch', at: ['serai', -10, 7], t: 'Arsaber to the Logothete, on the siphon oil', x: '"Kallinikos asks for more siphon oil. I have asked him what he means to burn with it. He has not answered."' },
    { id: 'fm2', kind: 'dispatch', at: ['arch', 11, -8], t: 'Arsaber, on the marsh people', x: '"The marsh people paddle out to watch our boats at night. They do not hide. They only watch. It is worse than arrows."' },
    { id: 'fm3', kind: 'object', at: ['village', -12, 9], t: 'A toy mashuf', x: 'A reed toy boat, sealed with bitumen like the real ones, with a tiny mast. Scratched on the hull: Saqr.' },
    { id: 'fm4', kind: 'object', at: ['kiln', 10, 9], t: 'The knotted cord', x: 'A fisherman\'s cord with a knot for every boat taken this year. Nineteen knots.' },
  ],
  karkh: [
    { id: 'fk1', kind: 'dispatch', at: ['serai', 11, 7], t: 'Arsaber to the Logothete, on the pyre', x: '"Krateros has built a pyre in the square and calls it insurance. If it burns, I will answer for it myself."' },
    { id: 'fk2', kind: 'dispatch', at: ['kiln', -11, 8], t: 'Arsaber, on a book bought in the ash', x: '"I bought a book in the ash today, a treatise on the astrolabe with its corners burned. I paid the boy twice what he asked. He looked at me as if I were mad."' },
    { id: 'fk3', kind: 'object', at: ['village', 12, 11], t: 'A paper-seller\'s sign', x: 'A shop sign, half burned: "...sellers of paper, pens and ink. Accounts kept."' },
    { id: 'fk4', kind: 'object', at: ['arch', -9, 12], t: 'An arrow in a doorframe', x: 'A siege arrow pulled from a doorframe, a strip of cloth tied to it: a family\'s ration list for the last week of the siege. Bread: none.' },
  ],
  docks: [
    { id: 'fd1', kind: 'dispatch', at: ['serai', -10, -8], t: 'Arsaber, on the ship', x: '"The ship is ready. I have room for one chest and eleven instruments, and I have the chest. Why does it feel empty?"' },
    { id: 'fd2', kind: 'dispatch', at: ['arch', 10, 10], t: 'Arsaber, on the guard', x: '"If the guard reaches the bridge, I will fight him. I do not know which ending I would want to write home about."' },
    { id: 'fd3', kind: 'object', at: ['village', -11, -9], t: 'A boatman\'s toll token', x: 'A toll token of fired clay, stamped with a fish. Jabir would have argued it down to half.' },
    { id: 'fd4', kind: 'object', at: ['kiln', 9, -10], t: 'The copyists\' practice sheets', x: 'Practice sheets floating in a crate: the same line of the Pages written forty times, by forty hands.' },
  ],
  hamrin: [
    { id: 'fh1', kind: 'dispatch', at: ['serai', -7, 7], t: 'Arsaber\'s last order', x: '"To whoever commands what is left: the company is disbanded. Go home by the Lamis. Take nothing that was not yours." Signed with one letter: A.' },
    { id: 'fh2', kind: 'dispatch', at: ['kiln', 7, -7], t: 'Tatzates\' answer', x: 'Scratched on the back of Arsaber\'s order, in another hand: "Nothing was ever mine. I will stay."' },
    { id: 'fh3', kind: 'object', at: ['village', 9, 9], t: 'A shepherd\'s tally stick', x: 'A tally stick, the notches worn smooth: two hundred sheep. Then a new notch, cut deep, and beside it: "one Greek."' },
    { id: 'fh4', kind: 'object', at: ['arch', -7, -7], t: 'A cracked horn plate', x: 'A cracked plate of horn from a bow, Armenian work. The maker\'s mark is a running fox.' },
  ],
}[REGION] || [];
const FOUND_TOTAL = 20;
const FOUND_ALL = ['fs', 'fm', 'fk', 'fd', 'fh'].flatMap((k) => [1, 2, 3, 4].map((i) => k + i));
// letters found on fallen captains, in the order they are found
export const LETTERS = [
  ['From a mother in Amorion', '"Eat what they give you, and do not volunteer for anything."'],
  ['A pay chit', 'Four nomismata owed, unpaid since the Taurus. Someone has written under it: "Ask the envoy."'],
  ['A sergeant\'s list', 'A list of names in a sergeant\'s hand. Beside six of them, a small cut.'],
  ['From a sister', '"They say the Baghdad market has a street for every trade. Buy me a knife. A good one."'],
  ['Orders, half burned', '"...take the grain from the canal villages, but leave them seed for the spring."'],
  ['A tally of days', 'A soldier\'s count of the days since he left home. Two hundred and twelve, and then nothing.'],
  ['An unfinished letter', '"Eirene, the river here is wider than the Bosporus, and the dates are"'],
  ['A poultice, in two hands', 'A recipe for a poultice for sword cuts, written in Greek, and copied again under it in Arabic.'],
  ['A wager', '"If Krateros burns the books, I win the mule."'],
  ['A deserter\'s note', 'Left on a pack: "I have gone home. Tell the Logothete I drowned."'],
  ['A hill man\'s receipt', 'In Armenian letters: "For passage of forty men, twenty silver. Paid: nothing."'],
  ['A drawing of a horse', 'A horse drawn in charcoal, very carefully, and under it a child\'s name.'],
  ['An order of the day', '"No man is to read any book he carries. They are cargo."'],
  ['A complaint to the quartermaster', '"The bread here is better than ours. Send none."'],
  ['Arabic, practised', 'A few words of Arabic written ten times over, badly: "Water, please. Bread, please. How much?"'],
  ['From a captain to his son', '"Learn your letters. A man who can read is never only a soldier."'],
];
const PLACE_KIND = { dispatch: 'Arsaber\'s dispatch', object: 'Something left behind', paper: 'A letter of the Rum' };

// ---------------------------------------------------------------- Salim at the landmarks
const LANDMARK = {
  sawad: { serai: 'Jabir always took the room by the gate. First to hear trouble, he said.', kiln: 'The kilns never stop. Even in a war, somebody needs bricks.', arch: 'The old kings built this arch to last. It has outlasted them.' },
  marsh: { serai: 'A fort made of reeds. The marsh folk must laugh at it.', kiln: 'A whole village under the water. The flood took it, or the war. Out here it is hard to tell.', arch: 'The weir is older than Baghdad. It has held back worse than Kallinikos.' },
  karkh: { serai: 'Every door on this lane had a name over it once.', kiln: 'Ash to the ankle. All of it was paper.', arch: 'Krateros chose the market square. He wanted the city to watch.' },
  docks: { serai: 'The ribs of a ship nobody will finish this year.', kiln: 'Burned hulls, and the copyists\' boat somewhere among them.', arch: 'The bridge of boats. Half of Baghdad crosses here on an ordinary day.' },
  hamrin: { serai: 'Stone and wind. Jabir would have hated these hills.', kiln: 'The frontier road. Eight days to the Rum, the soldiers wrote.', arch: 'Somewhere up here is the man who loosed the arrow.' },
}[REGION] || {};

// ---------------------------------------------------------------- Rafi' the courier: news of what Salim chose, a region later
const NEWS = {
  marsh: [
    { when: (c) => c.photeinos === 'qadi', text: 'Photeinos reached the qadi\'s court. He talks all day, they say. The clerks have run out of ink twice.' },
    { when: (c) => c.photeinos === 'free', text: 'A Greek was seen walking south toward Wasit, alone, with no sword. He asked a ferryman the way to the scribes\' market.' },
    { when: (c) => c.niketas === 'qadi', text: 'That old Rum you sent to the qadi? \'Amr\'s men say he carries water without being asked. Nobody knows what to do with him.' },
  ],
  karkh: [
    { when: (c) => c.marsh === 'stay', text: 'From the Nahrawan: the reed village has its roof up. They asked me to find you and say so.' },
    { when: (c) => c.marsh === 'chase', text: 'From the Nahrawan: the reed village burned to the water. They are building again on the other bank. They say you did what you had to.' },
    { when: () => true, text: 'The barid runs again from Wasit to the Round City. First time since the siege. Write to someone, guard.' },
  ],
  docks: [
    { when: (c) => c.lubna, text: 'A woman named Lubna asked after you at the post. She says the bricks held.' },
    { when: () => true, text: 'Every boatman on the Tigris knows your name now. Half of them say you owe them money. That is fame.' },
  ],
}[REGION] || [];

// ---------------------------------------------------------------- the hired guards' stories (beat i from the (i+1)th region)
const GUARD32 = {
  spear: [
    [['G', 'I was with Tahir\'s men at the siege. The winning side. It does not feel like winning.'], ['Salim', 'What does it feel like?'], ['G', 'Like carrying water to a fire you started.']],
    [['G', 'We threw fire over the walls into al-Karkh. Nobody asked who lived under the roofs.'], ['Salim', 'Someone should have.'], ['G', 'Yes.']],
    [['G', 'This lane. I stood on the wall above it with a pot of fire. I see it every night.'], ['Salim', 'Then help me carry the Pages out of it.'], ['G', 'That I can do.']],
    [['G', 'When this is done I will join the river guard. Somebody has to stand between the city and the next fire.'], ['Salim', '\'Amr is looking for men who can hold a line.'], ['G', 'Then I will start with him.']],
  ],
  bow: [
    [['G', 'I grew up in the reeds. I can hit a duck in the dark. People are bigger than ducks.'], ['Salim', 'And they shoot back.'], ['G', 'Ducks don\'t. I miss ducks.']],
    [['G', 'My father says the river ends in a sea so wide you can\'t see the other side. I don\'t believe him.'], ['Salim', 'Jabir saw it once, at Basra. He said it smells of salt and money.']],
    [['G', 'When the copies go down to Basra, I want to be on the barge.'], ['Salim', 'Guarding books?'], ['G', 'Guarding books, and looking at the sea.']],
    [['G', 'I\'ll hire on the Basra barge. If the sea is real, I\'ll send you a shell.'], ['Salim', 'And if it isn\'t?'], ['G', 'Then I\'ll send you a duck.']],
  ],
  naft: [
    [['G', 'Naft is honest. It burns what you throw it at. It\'s the throwing that isn\'t.'], ['Salim', 'Who did you throw it at?'], ['G', 'Whoever the captain pointed to. That\'s the dishonest part.']],
    [['G', 'In the siege I burned a bridge on the Sarat canal. A week later I had to swim home.'], ['Salim', 'Did you laugh?'], ['G', 'Not then. Now, a little.']],
    [['G', 'The Rum burn on water. I\'ve heard of it all my life. Seeing it makes me want to put mine down.'], ['Salim', 'You can.'], ['G', 'Not yet. Not while they have theirs.']],
    [['G', 'When we\'re done, I\'ll sell lamp oil. Same stuff, smaller pots. Nobody gets hurt.'], ['Salim', 'Save me some. I have a lot of lamps to light.']],
  ],
  knives: [
    [['G', 'In the siege we fought with reed shields and stones. The Khurasanis laughed until we took their wall.'], ['Salim', 'Did you keep it?'], ['G', 'For an afternoon. Best afternoon of my life.']],
    [['G', 'My quarter was the Harbiyya. I knew every roof in it. Now I know where every roof used to be.'], ['Salim', 'Will you build it again?'], ['G', 'I\'ll steal the bricks for it, at least.']],
    [['G', 'The Rum think the lanes are theirs because they hold the square. Lanes belong to whoever knows where they go.'], ['Salim', 'Do you?'], ['G', 'Every one. Even the burned ones.']],
    [['G', 'When it\'s done I\'ll teach the boys on the quays to climb. Better roofs than swords.'], ['Salim', '\'Amr will say the same about spears.'], ['G', '\'Amr is wrong about most things. Not that.']],
  ],
};

// ---------------------------------------------------------------- the Rum speak
const SHOUT = {
  bandit: ['Surround him!', 'That is the guard. The one from the dune!'], guard: ['Shields together! Hold!', 'Close the line!'], wall: ['Lock shields! Step!'],
  standard: ['To the standard! To me!'], archer: ['Loose on him!', 'Aim low, at the legs!'], spearman: ['Points down! Let him come!'], naffat: ['Light the siphon!'],
  netter: ['Throw high, drag low!'], engineer: ['Raise the engine!'], crossbow: ['Steady. Breathe out.'], deputatos: ['Bring the wounded to me!'], kontaratos: ['Brace!'],
  kynegos: ['Slip the dogs!'], sapper: ['Down into the earth!'], hippo: ['Ride round him!'], rider: ['Lances!'], akontistes: ['Javelins!'], tribolos: ['Spikes on the ground!'],
  kontophoros: ['Clear a lane for the lance!'], slinger: ['Stones! On him!'], deserter: ['Now! Out of cover!'], reedman: ['From the reeds, now!'],
};
const DOOR = {
  dam: ['Photeinos', 'I know what is in that chest, guard. Do you?'], kilns: ['Olbianos', 'I sat at the Teacher\'s feet once. Come and see what I learned instead.'],
  stockade: ['Katakylas', 'Every reed here is mine. Mind where you step.'], sunken: ['Petronas', 'The water is rising, guard. It always does.'],
  quarter: ['Narses', 'This quarter burned once. It can burn again.'], vaults: ['Kalokyros', 'You will not see me. No one ever does.'],
  shipyard: ['Rhentakios', 'The envoy pays well. Does your astronomer?'], hulks: ['Skleros', 'The copyists sing while they wait. It is starting to annoy me.'],
  quarry: ['Krambonites', 'Every stone in this quarry has a man behind it.'], fort: ['Charsianites', 'This fort has never fallen. Come and be the first to try.'],
  gorge: ['Pankalos', 'One bridge, guard, and I am standing on the far end of it.'], rivalhold: ['Tatzates', 'You came. Good. I was tired of waiting.'],
};

// ---------------------------------------------------------------- the beats: once each, in the right place, when calm
// near: a point (or null for anywhere), r: radius, out: true = out on the land (not in the camp)
const holdDone = (g, id) => !!g.holds?.state?.(id)?.done;
const SITE = (k) => SITES[k] ? [SITES[k].x, SITES[k].z] : null;
const ISH = () => HUB?.ishaq || null;
function beats(g, s) {
  const c = s.ch, said = s.said;
  return {
    sawad: [
      { id: 'caravanBoys', near: SITE('serai'), r: 24, scene: S32.caravanBoys },
      { id: 'niketasMeet', near: SITE('kiln'), r: 34, if: () => holdDone(g, 'dam'), scene: S32.niketasMeet },
      { id: 'lubnaRoad', out: true, if: () => said.r32_caravanBoys || g.act >= 2, scene: S32.lubnaRoad },
    ],
    marsh: [
      { id: 'reedCount', near: ISH(), r: 22, scene: S32.reedCount },
      { id: 'lubnaMarsh', near: ISH(), r: 24, if: () => said.r32_lubnaRoad && said.r32_reedCount, scene: S32.lubnaMarsh },
      { id: 'niketasMarsh', out: true, if: () => !!c.niketas, scene: S32.niketasMarsh },
      { id: 'reedsOverheard', out: true, if: () => holdDone(g, 'stockade'), scene: S32.reedsOverheard },
    ],
    karkh: [
      { id: 'lastLesson', near: ISH(), r: 9, if: () => said.ishaq, scene: S32.lastLesson },
      { id: 'lubnaHome', out: true, if: () => said.r32_lubnaRoad, scene: S32.lubnaHome },
      { id: 'truceInAsh', near: SITE('kiln'), r: 40, if: () => holdDone(g, 'quarter') && !holdDone(g, 'vaults'), scene: S32.truceInAsh },
    ],
    docks: [
      { id: 'ferrymanDebt', out: true, scene: S32.ferrymanDebt },
      { id: 'niketasDocks', out: true, if: () => !!c.niketas && said.r32_ferrymanDebt, scene: S32.niketasDocks },
      { id: 'lubnaQuays', near: ISH(), r: 26, if: () => said.r32_lubnaHome, scene: S32.lubnaQuays },
      { id: 'copiesWhere', near: ISH(), r: 10, if: () => holdDone(g, 'shipyard'), scene: S32.copiesWhere },
    ],
    hamrin: [
      { id: 'envoyLetter', near: ISH(), r: 22, if: () => said.h26scout, scene: S32.envoyLetter },
    ],
  }[REGION] || [];
}

export function setupStory32(g) {
  const p = g.player;
  const S = () => { const s = S25(g); s.found32 ||= {}; s.g32 ||= {}; s.g32at ||= {}; return s; };
  const calm = (r = 24) => !g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p.pos) < r);
  const idle = () => g.started && g.director && !g.cinematic && !g.ui.dialogOpen && !p.dead && !g.epilogue29;

  // ------------------------------------------------ what the choices change
  const prevChoice = g.onChoice25;
  g.onChoice25 = (k, v) => {
    prevChoice?.(k, v);
    const R = { niketas: { qadi: 10, hide: 5 }, copies: { wisdom: 10, market: 10 }, crews: { lamis: 15, bridge: 10 }, lubna: { paid: 5 } }[k]?.[v];
    if (R) p.renown = (p.renown || 0) + R;
  };
  // the Hamrin flock quest's Niketas remembers Salim
  g.meetLines32 = (qid, lines) => {
    const n = S25(g).ch.niketas; if (qid !== 'flock' || !n) return null;
    return [['Niketas', 'Guard. You again. Every road I take, you are at the end of it.'], ['Salim', 'You said somewhere with sheep.'], ['Niketas', 'And here they are. Walk me to the east road, and I will tell your shepherd where every ewe is penned.']];
  };

  // ------------------------------------------------ Things Found: in the world
  const items = [];
  const paperM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, emissive: 0x403020, emissiveIntensity: 0.6 });
  const sealM = new THREE.MeshStandardMaterial({ color: 0x4a1a4a, roughness: 0.6 });
  const objM = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85, emissive: 0x2a1a0a, emissiveIntensity: 0.5 });
  const placeAt = (pos, kind) => {
    const grp = new THREE.Group();
    if (kind === 'object') { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.2), objM); m.position.y = 0.07; m.rotation.y = 0.7; grp.add(m); }
    else { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.24), paperM); sh.position.y = 0.05; sh.rotation.y = -0.5; grp.add(sh);
      if (kind === 'dispatch') { const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10), sealM); seal.position.set(-0.05, 0.07, 0.02); grp.add(seal); } }
    grp.position.copy(pos); g.scene.add(grp); return grp;
  };
  // every thing found has a Codex entry, so it can be read again
  for (const F of FOUND) CODEX['f32_' + F.id] = { t: F.t, cat: 'Things Found', x: F.x };
  LETTERS.forEach(([tt, x], i) => { CODEX['l32_' + i] = { t: tt, cat: 'Letters of the Rum', x }; });
  for (const L of LEAVES) CODEX['lv25_' + L.id] = { t: { leaf: 'A leaf of the Pages', letter: 'A soldier\'s letter', dispatch: 'Arsaber\'s dispatch', tally: 'Tatzates\' quiver lid' }[L.kind], cat: 'Leaves and Letters', x: L.text };
  for (const L of LEAVES) if (S25(g).leaves?.[L.id]) (p.codex ||= {})['lv25_' + L.id] = true; // found before this round
  const prevLeafTick = g.tickExtra; // leaves found from now on go into the Codex as they are read
  g.tickExtra = (dt) => { prevLeafTick?.(dt); const lv = S25(g).leaves; for (const L of LEAVES) if (lv?.[L.id] && !p.codex?.['lv25_' + L.id]) (p.codex ||= {})['lv25_' + L.id] = true; };

  for (const F of FOUND) {
    const Sx = SITES[F.at[0]] || (F.at[0] === 'village' && HUB?.ishaq ? { x: HUB.ishaq[0], z: HUB.ishaq[1] } : null); if (!Sx) continue;
    let [x, z] = freeSpot(Sx.x + F.at[1], Sx.z + F.at[2], 0.9);
    const pos = new THREE.Vector3(x, 0, z);
    for (let k = 0; k < 8 && waterDepth?.(pos.x, pos.z) > 0.25; k++) pos.lerp(new THREE.Vector3(Sx.x, 0, Sx.z), 0.25);
    resolve(pos, 0.5); pos.y = heightAt(pos.x, pos.z);
    items.push({ F, grp: placeAt(pos, F.kind), pos, sparkT: Math.random() });
  }
  const read = (title, body, after) => { g.audio.pickup?.(); g.ui.dialog(title, body, after); };
  const foundOne = (F) => {
    const s = S(); s.found32[F.id] = true; (p.codex ||= {})['f32_' + F.id] = true;
    const n = FOUND_ALL.filter((id) => s.found32[id]).length;
    read(t(PLACE_KIND[F.kind]) + ` · ${n}/${FOUND_TOTAL}`, t(F.x), () => {
      g.ui.toast(`${t('Things Found')}: ${n}/${FOUND_TOTAL}`, 'codex');
      if (n >= FOUND_TOTAL && !s.said.r32_allFound) {
        s.said.r32_allFound = true;
        try { const it = makeItem(Math.max(1, p.level), 'legendary', 'amulet'); it.name = 'The Account Kept'; it.flavor = '"' + t('Every thing left behind, remembered.') + '"'; g.dropItem(it, p.pos.clone().add(new THREE.Vector3(1, 0, 0.5))); } catch (e) { /* none */ }
        p.renown = (p.renown || 0) + 25;
        g.ui.toast(t('All twenty found. The Account Kept is yours.') + ' (+25 ' + t('Renown') + ')', 'quest');
      }
      saveGame(g);
    });
  };
  // letters on fallen captains (elites, bosses and named captains), one at a time, in order
  const drops = [];
  const nextLetter = () => { const s = S(); for (let i = 0; i < LETTERS.length; i++) if (!s.found32['l' + i] && !drops.some((d) => d.i === i)) return i; return -1; };
  const prevKill = g.killEnemy.bind(g);
  g.killEnemy = (e, src) => {
    const was = e.dead; prevKill(e, src);
    if (was || !e.dead || e.spared || g.epilogue29) return;
    if (!(e.elite || e.boss || e.wanted31 || e.holdKey)) return;
    if (Math.random() > (e.boss || e.holdKey ? 0.8 : 0.4)) return;
    const i = nextLetter(); if (i < 0) return;
    const pos = e.pos.clone(); pos.x += 0.6; resolve(pos, 0.4); pos.y = g.interior ? e.pos.y : heightAt(pos.x, pos.z);
    drops.push({ i, pos, grp: placeAt(pos, 'paper'), sparkT: 0, interior: !!g.interior });
  };

  g.__r32 = { items, drops, beats: () => beats(g, S()), S32 }; // for tests
  // ------------------------------------------------ barks in sequence (a guard's story, the courier's news)
  const queue = []; let qT = 0;
  const say = (who, text) => queue.push([who, text]);

  // ------------------------------------------------ per frame
  let wait = 0, walkT = 0, shoutCd = 0, doorT = 0;
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (!g.started) return;
    const s = S();
    // queued barks: one after another, never in a scene
    if (qT > 0) qT -= dt;
    if (queue.length && qT <= 0 && !g.cinematic && !g.ui.dialogOpen) { const [who, text] = queue.shift(); g.bark(who, text, 3200, true); qT = 3.6 + text.length / 30; }
    shoutCd -= dt;
    // the Rum shout as they come at him
    if (!g.cinematic && shoutCd <= 0) for (const e of g.enemies) {
      if (e.dead || !e.alerted || e.shout32) continue;
      if (e.pos.distanceTo(p.pos) > 20) continue;
      e.shout32 = true; const L = SHOUT[e.type]; if (!L || Math.random() > 0.45) continue;
      if (g.bark(e.T?.name || 'Rum', L[Math.floor(Math.random() * L.length)], 2200, true)) { shoutCd = 9; break; }
    }
    // a hold master's words at his door
    const hid = g.interior?.def?.kind === 'hold' ? g.interior.def.id : null;
    if (hid && DOOR[hid] && !s.said['r32_door_' + hid]) { if ((doorT += dt) > 2.2 && !g.cinematic) { s.said['r32_door_' + hid] = true; g.bark(DOOR[hid][0], DOOR[hid][1], 4200, true); } } else if (!hid) doorT = 0;
    // things lying about, and letters on the fallen: walked over when the fight is done
    const fighting = !calm(18);
    for (const it of items) {
      if (s.found32[it.F.id]) { if (it.grp.visible) it.grp.visible = false; continue; }
      if (g.interior) continue;
      const d = Math.hypot(p.pos.x - it.pos.x, p.pos.z - it.pos.z);
      if (d < 26 && (it.sparkT -= dt) <= 0) { it.sparkT = 0.8; g.fx.glow.spawn({ pos: { x: it.pos.x, y: it.pos.y + 0.32, z: it.pos.z }, life: 0.6, size: 0.42, size1: 0.1, color: new THREE.Color(2.0, 1.6, 1.4) }); }
      if (d < 1.5 && !g.ui.dialogOpen && !p.dead && !fighting && !g.cinematic) foundOne(it.F);
    }
    for (let k = drops.length - 1; k >= 0; k--) {
      const D = drops[k];
      if (D.interior !== !!g.interior) { D.grp.visible = false; continue; } D.grp.visible = true;
      const d = Math.hypot(p.pos.x - D.pos.x, p.pos.z - D.pos.z);
      if ((D.sparkT -= dt) <= 0) { D.sparkT = 0.8; g.fx.glow.spawn({ pos: { x: D.pos.x, y: D.pos.y + 0.3, z: D.pos.z }, life: 0.6, size: 0.4, size1: 0.1, color: new THREE.Color(2.2, 1.8, 1.2) }); }
      if (d < 1.5 && !g.ui.dialogOpen && !p.dead && !fighting && !g.cinematic) {
        g.scene.remove(D.grp); drops.splice(k, 1);
        s.found32['l' + D.i] = true; (p.codex ||= {})['l32_' + D.i] = true;
        const n = LETTERS.filter((_, i) => s.found32['l' + i]).length;
        read(t('A letter of the Rum') + ` · ${n}/${LETTERS.length}`, `<b>${t(LETTERS[D.i][0])}</b><br>${t(LETTERS[D.i][1])}`, () => {
          g.ui.toast(`${t('Letters of the Rum')}: ${n}/${LETTERS.length}`, 'codex');
          if (n >= LETTERS.length && !s.said.r32_allLetters) { s.said.r32_allLetters = true; p.renown = (p.renown || 0) + 25; g.ui.toast(t('Every letter read. Someone should send them home.') + ' (+25 ' + t('Renown') + ')', 'quest'); }
          saveGame(g);
        });
      }
    }
    if (!idle() || g.interior) { wait = 0; return; }
    if (!calm()) { wait = 0; walkT = 0; return; }
    wait += dt;
    const hub = ISH(), dHub = hub ? Math.hypot(p.pos.x - hub[0], p.pos.z - hub[1]) : 999;
    // the beats
    if (wait > 2.5) for (const B of beats(g, s)) {
      if (s.said['r32_' + B.id]) continue;
      if (B.if && !B.if()) continue;
      if (B.out && dHub < 34) continue;
      if (B.near && Math.hypot(p.pos.x - B.near[0], p.pos.z - B.near[1]) > B.r) continue;
      s.said['r32_' + B.id] = true; wait = 0;
      g.director.play(S32.stage32(g, B.scene(g))).then(() => saveGame(g));
      return;
    }
    // Rafi' the courier's news, once per region, in the camp
    if (NEWS.length && !s.said['r32_news_' + REGION] && dHub < 18 && wait > 4 && !queue.length) {
      s.said['r32_news_' + REGION] = true;
      const c = s.ch; for (const N of NEWS) if (N.when(c)) say('Rafi\' the courier', N.text);
    }
    // Salim at the landmarks
    for (const k in LANDMARK) {
      const P = SITE(k); if (!P || s.said['r32_lm_' + REGION + k]) continue;
      if (Math.hypot(p.pos.x - P[0], p.pos.z - P[1]) < 20 && g.bark('Salim', LANDMARK[k])) { s.said['r32_lm_' + REGION + k] = true; break; }
    }
    // the guard's story, while walking the land together
    const C = g.companion, kind = C?.kind || p.companion?.kind;
    if (C && !C.down && kind && GUARD32[kind] && dHub > 30 && !queue.length) {
      const moving = !!p.vel && Math.hypot(p.vel.x, p.vel.z) > 0.8;
      if (moving) walkT += dt;
      const n = s.g32[kind] || 0;
      if (walkT > 55 && n < 4 && RI >= n && s.g32at[kind] !== REGION) {
        walkT = 0; s.g32[kind] = n + 1; s.g32at[kind] = REGION;
        for (const [who, text] of GUARD32[kind][n]) say(who === 'G' ? C.K.name : 'Salim', text);
        saveGame(g);
      }
    }
  };
}
