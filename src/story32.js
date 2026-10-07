// Round 32: story everywhere. What carries it between the act scenes:
// - Arsaber's own chapter: in al-Karkh he walks the burned paper-sellers' lane unarmed and meets Salim (let him walk, or
//   call the watch). It changes the parley at the khan, his words and strength at the bridge, and his letter in the epilogue.
// - one scene inside each act, once the act's first captain is down (the names of the dead guards, the flood, Ishaq's
//   instrument maker, the copyists' night, Jabir's spear brought down from the quarry)
// - the hired guards' own stories: Ma'n, Dirar, Tamim and Talha each tell three, one per region, when the road is calm
//   after a fight or two together; the third pays something back. Each keeps his own count, whoever is hired.
// - a family going home to al-Karkh (Umayma, her brother Nadr, her boy Qays), met in each region and on the quays at
//   dusk; two small choices (give them your water; pay for their timber). Nasim, 'Amr's camp boy, in every camp.
// - the other side: soldiers shout in fights, some carry letters, and one deserter in each act region waits by a cold
//   fire: spare him or turn him in. The number spared is remembered in the hills and at the end.
// - Finds: objects in each region and one in every named dungeon, kept with the letters in the Codex
// - lines on the road: Salim and the hired guard, at the places the story passed through
// State: choices in p.s25.ch (lane, fam, famgold, des_<region>), beats seen in p.s25.said, the guards' stories in
// p.s25.g32 (kept through New Game+, like the camp's own stories), finds in p.codex.
import * as THREE from 'three';
import { REGION, HUB, IS_EPILOGUE } from './region.js';
import { SITES, heightAt } from './terrain.js';
import { S25, chosen } from './story25.js';
import { BOSS } from './story15.js';
import { CODEX, unlock, giveItem } from './narrative.js';
import { makeItem } from './items.js';
import { npc } from './hub.js';
import { freeSpot } from './sidequests.js';
import { LOOK, byzify } from './byz.js';
import { saveGame } from './save.js';
import { roomCenter } from './interior.js';
import * as S32 from './scenes32.js';
import { t } from './i18n.js';

const ACT_REGIONS = ['sawad', 'marsh', 'karkh', 'docks'];
const REG = IS_EPILOGUE ? 'epilogue' : REGION;

// ---------------------------------------------------------------- the hired guards' stories
export const GUARD_ARC = {
  spear: [
    [['Ma\'n', 'My village was on the Sarat canal. Tahir\'s Khurasanis camped in it for the siege. They burned the palms for firewood.'], ['Salim', 'Your people?'], ['Ma\'n', 'Scattered. I took the first pay anyone offered.']],
    [['Ma\'n', 'A boatman says a woman from my village sells bread on the quays now. He did not know her name.'], ['Salim', 'Ask him again.'], ['Ma\'n', 'I asked him nine times. He thinks I am mad.']],
    [['Ma\'n', 'It was my sister. She has a husband, two children and a temper. She says palms grow back in seven years.'], ['Salim', 'Will you go?'], ['Ma\'n', 'When you are done with me. Seven years is a long time to plant. I should start.']],
  ],
  bow: [
    [['Dirar', 'I hunted gazelle on the desert edge before the war. Then al-Amin\'s men paid better for shooting men.'], ['Salim', 'And now?'], ['Dirar', 'Now you pay. I count every arrow, guard. I know where each one went.']],
    [['Dirar', 'In the siege I shot a man on a roof. In the smoke I took him for a Khurasani archer. He was a baker, putting out a fire.'], ['Salim', '...'], ['Dirar', 'I do not want an answer. I only wanted somebody to know.']],
    [['Dirar', 'A boy in the camp wants to learn the bow. I told him I teach gazelle, not men. He said that suited him.'], ['Salim', 'It suits you too.'], ['Dirar', 'Yes. I think it does.']],
  ],
  naft: [
    [['Tamim', 'I was a naffat in the city\'s own ranks. In the siege they ordered us to burn the houses by the Harb gate, so Tahir\'s men could not use them.'], ['Salim', 'You did it?'], ['Tamim', 'I did it. One of them was my uncle\'s.']],
    [['Tamim', 'Naft is only oil from the ground, you know. It lights lamps as well as roofs. My grandfather sold it for lamps.'], ['Salim', 'Why did you stop?'], ['Tamim', 'Lamps pay less than wars.']],
    [['Tamim', 'When this is done I will sell lamp oil on the quays. Clean oil, for reading by. My uncle says he will buy the first jar.'], ['Salim', 'He forgave you?'], ['Tamim', 'He says the fire was the caliph\'s, and the house is ours to build again. I am helping him with the roof.']],
  ],
  knives: [
    [['Talha', 'In the siege we fought for al-Amin with reed helmets and tarred mats for shields, and no pay. The \'ayyarun of the Harbiyya.'], ['Salim', 'Why?'], ['Talha', 'Because the generals had run, and somebody had to.']],
    [['Talha', 'My band scattered when the city fell. Half went to Tahir for pay. Half went into the river.'], ['Salim', 'And you?'], ['Talha', 'I went to whoever paid next. You, guard. Do not make a speech of it.']],
    [['Talha', 'Here. Your purse. I took it the first day you hired me, to see if you would notice.'], ['Salim', 'I noticed.'], ['Talha', 'I know. You never said a word. An \'ayyar keeps faith with whoever keeps faith with him. That is all the law we have.']],
  ],
};
const GUARD_NAME = { spear: 'Ma\'n', bow: 'Dirar', naft: 'Tamim', knives: 'Talha' };
// what the third talk pays back
const GUARD_GIFT = {
  spear: (g) => { g.player.renown = (g.player.renown || 0) + 10; return t('Ma\'n fights beside you with a lighter heart.') + ` (+10 ${t('Renown')})`; },
  bow: (g) => { g.player.renown = (g.player.renown || 0) + 10; return t('Dirar will teach the camp boys to hunt.') + ` (+10 ${t('Renown')})`; },
  naft: (g) => { g.player.potions = (g.player.potions || 0) + 2; g.refreshInv?.(); return t('Tamim gives you two flasks of his uncle\'s good oil.') + ' (+2)'; },
  knives: (g) => { const n = 40 * Math.max(1, g.player.level); g.player.gold += n; g.audio.gold?.(); return t('Talha gives back your purse, with interest.') + ` (+${n})`; },
};
// at the end, on the quays
export const GUARD_BYE = {
  spear: [['Ma\'n', 'My sister\'s barge leaves at dawn. Seven years of palms, guard. Come and eat the first dates.'], ['Salim', 'I will hold you to it.']],
  bow: [['Dirar', 'The camp boy brought down his first gazelle yesterday. He cried, and then he ate it. A good start.'], ['Salim', 'Teach him to count his arrows.']],
  naft: [['Tamim', 'My uncle has a roof again, and I have a stall by the water. Lamp oil, clean, for reading. The copyists buy it.'], ['Salim', 'Then every copy has a little of your fire in it.']],
  knives: [['Talha', 'I go back to the Harbiyya. Somebody has to watch the lanes now the soldiers are leaving.'], ['Salim', 'Keep faith, Talha.'], ['Talha', 'With you? Always. With the rest of them, we will see.']],
};

// ---------------------------------------------------------------- the family going home to al-Karkh
const FAMILY_LOOK = {
  Umayma: { robe: '#6a4a5a', robe2: '#3a2a3a', wrap: 0xb8a68a, skin: 0xa8714a, weapon: null, sash: 0x8a5a3a, build: 0.82, girth: 0.92, hemY: 0.06, hair: 'long' },
  Nadr: { robe: '#7a6a4a', robe2: '#3a3020', turban: 0xd8cfb8, beard: 0x2a1a10, beardLen: 0.5, skin: 0x9a6a44, weapon: null, sash: 0x5a4a2a, build: 1.0 },
  Qays: { robe: '#c8a878', robe2: '#5a3a2a', turban: null, cap: 0x7a4a2a, capBand: 0x3a2010, skin: 0xa8714a, weapon: null, sash: 0x5a3a2a, scale: 0.62, build: 0.85 },
};
const FAMILY = {
  sawad: { at: [16, -18], lines: [
    { who: 'Umayma', text: 'Is this the road to Baghdad? We left al-Karkh when the fires started. A year in my cousin\'s village is long enough.' },
    { who: 'Nadr', text: 'My sister thinks our house is still standing. I have stopped arguing with her.' },
    { who: 'Qays', text: 'Is that a real sword? Have you killed anyone with it?' },
    { who: 'Salim', text: 'Too many. Carry your mother\'s bundle, Qays. That is the harder job.' },
    { who: 'Umayma', text: 'The canals are foul from here to the river. We have not had clean water in two days.' },
    { choice: { prompt: 'The boy is looking at your water flask.', options: [
      { label: 'Give them your water.', fx: 'water' },
      { label: 'Point them to the clean well in the village.', fx: 'road' }] } },
    { who: 'Qays', text: 'It is cold! Mother, it is cold!', when: (g) => chosen(g, 'fam') === 'water' },
    { who: 'Umayma', text: 'We will remember this, guard. Every one of us.', when: (g) => chosen(g, 'fam') === 'water' },
    { who: 'Nadr', text: 'The village well. Good. Thank you, guard.', when: (g) => chosen(g, 'fam') !== 'water' },
  ] },
  marsh: { at: [-14, -10], lines: [
    { who: 'Nadr', text: 'The boatmen want three dirhams each to take us across. We have four between us.' },
    { who: 'Qays', text: 'Khalaf is teaching me to pole a boat. He says I am terrible.' },
    { who: 'Umayma', text: 'You gave us your water on the canal road. Qays has told everyone in the marsh.', when: (g) => chosen(g, 'fam') === 'water' },
    { who: 'Umayma', text: 'We found the well, guard. And now we have found a marsh.', when: (g) => chosen(g, 'fam') !== 'water' },
    { who: 'Salim', text: 'Khalaf owes me a favour. Tell him the guard said to take you across.' },
    { who: 'Nadr', text: 'If that works, I will believe anything about you they say in the camp.' },
  ] },
  karkh: { at: [14, -16], lines: [
    { caption: 'Umayma stood in what was left of a doorway, with ash to her ankles.' },
    { who: 'Umayma', text: 'This was the door. You can still see where my husband cut the year we were married into the frame.' },
    { who: 'Nadr', text: 'The walls stand. Half the walls. We have built with less.' },
    { who: 'Qays', text: 'Where will I sleep?' },
    { who: 'Umayma', text: 'Here, Qays. Under the sky until there is a roof, and then under the roof.' },
    { choice: { prompt: 'Timber costs more than they have.', options: [
      { label: 'Pay for their timber (100 gold).', fx: 'yes' },
      { label: 'Wish them well.', fx: 'no' }] } },
    { who: 'Nadr', text: 'That is a roof. That is a whole roof. I do not know what to say.', when: (g) => chosen(g, 'famgold') === 'yes' },
    { who: 'Salim', text: 'Say nothing. Build it.', when: (g) => chosen(g, 'famgold') === 'yes' },
    { who: 'Umayma', text: 'Then we build slowly. Go well, guard.', when: (g) => chosen(g, 'famgold') !== 'yes' },
  ] },
  docks: { at: [16, -14], lines: [
    { who: 'Nadr', text: 'I carry bales on the quays now. Two copper a bale. My back has opinions about it.' },
    { who: 'Umayma', text: 'The roof is up. Come and see it, when the war lets you go.', when: (g) => chosen(g, 'famgold') === 'yes' },
    { who: 'Umayma', text: 'We have two walls and a cloth over them. It keeps the dew off. Mostly.', when: (g) => chosen(g, 'famgold') !== 'yes' },
    { who: 'Qays', text: 'I carry water for the copyists in the khan. Hakam gives me a copper and lets me watch them write.' },
    { who: 'Salim', text: 'Watch carefully, Qays. That is worth more than the copper.' },
  ] },
  epilogue: { at: [8, -6], lines: [
    { who: 'Qays', text: 'Hakam is teaching me my letters. I can write my name. And yours. Look.' },
    { who: 'Salim', text: '...That is my name. Badly, but that is my name.' },
    { who: 'Umayma', text: 'The first bread from the new oven. You do not get to refuse it.', when: (g) => chosen(g, 'famgold') === 'yes' },
    { who: 'Umayma', text: 'We have a roof now, at last. The neighbours raised it with us, one beam each.', when: (g) => chosen(g, 'famgold') !== 'yes' },
    { who: 'Nadr', text: 'Half of al-Karkh is building. The other half is selling timber. It sounds like a city again.' },
  ] },
};
// Nasim, the boy 'Amr took on, practising beside him in every camp
const NASIM = {
  sawad: 'Are you the guard who fights the Rum? \'Amr says you hold your spear like a stick.',
  marsh: '\'Amr made me stand in the mud all morning. He says if I can hold a line in mud I can hold it anywhere.',
  karkh: 'I used to sell water in these lanes, before the fire. Now I am learning to guard the wells instead.',
  docks: 'The copyists\' boat is the most important boat on the river. \'Amr says so. He says we guard it with our lives. I said yes.',
  hamrin: '\'Amr says the hills are no place for a boy. I said I am not a boy, I am a line. He laughed for the first time.',
};

// ---------------------------------------------------------------- the other side
const DESERTER = {
  sawad: { name: 'Doukitzes', at: ['kiln', -26, 18], lines: [
    { who: 'Doukitzes', text: 'Do not. I have no sword. I threw it in the canal the night Olbianos burned the books.' },
    { who: 'Doukitzes', text: 'I wrote to my mother every week. I never sent one. The officers read everything.' },
    { who: 'Salim', text: 'Where will you go?' },
    { who: 'Doukitzes', text: 'South, to the Gulf ports. A ship to anywhere that is not a war. If you let me.' },
  ] },
  marsh: { name: 'Leon', at: ['kiln', 24, -18], lines: [
    { who: 'Leon', text: 'Kallinikos made us pour the fire on the reed houses. There were people in them. I heard them.' },
    { who: 'Leon', text: 'I put my siphon in the water and walked into the reeds. I have been eating raw fish for six days.' },
    { who: 'Salim', text: 'And now?' },
    { who: 'Leon', text: 'Now I am too tired to run from you. Do what you want.' },
  ] },
  karkh: { name: 'Zonaras', at: ['kiln', -24, -18], lines: [
    { who: 'Zonaras', text: 'Krateros says if we cannot keep the Pages, we burn the whole quarter with them.' },
    { who: 'Zonaras', text: 'I have a city of my own, guard, and a wife in it. I would not want it burned for a book.' },
    { who: 'Salim', text: 'Then why are you hiding in its ash?' },
    { who: 'Zonaras', text: 'Because the watch hangs Rum on sight, and my own captain hangs deserters. This lane is the only place nobody looks.' },
  ] },
  docks: { name: 'Kosmas', at: ['kiln', 22, 20], lines: [
    { who: 'Kosmas', text: 'I am a sailor, not a soldier. The envoy hired the ship, and us with it.' },
    { who: 'Kosmas', text: 'He is not a bad man, the envoy. He talks to the books as if they could hear him. But he will not go home with empty hands.' },
    { who: 'Salim', text: 'And you?' },
    { who: 'Kosmas', text: 'I would go home with empty hands and be glad of them.' },
  ] },
};
const DES_AFTER = {
  spare: [{ who: 'Salim', text: 'Go. Keep off the roads by day.' }, { caption: 'He went, without looking back, as fast as a tired man can.' }],
  turn: [{ who: 'Salim', text: 'You will answer to the qadi. He is fairer than your captain.' }, { caption: 'The camp\'s men took him in. The qadi would hear him in Baghdad.' }],
};
// a shout when a fight starts (a soldier near Salim, by his troop's name)
const SHOUTS = ['There! The guard!', 'Close the ring! He is one man!', 'For the envoy\'s silver!', 'Hold the line! Hold!', 'Do not let him reach the captain!', 'They told us this would be easy.', 'Home by spring, they said.', 'Archers! On him!', 'It is him. The one from the caravan.', 'Kill him and we all eat tonight!'];
// letters carried by the company's men (on one body in fifteen, each found once)
export const LETTERS = [
  ['l1', 'To Theodora, in Amorion: "The dates here are sweeter than honey. I will bring you a sack, if the officers do not eat them first."'],
  ['l2', 'A pay chit, torn: "Owed to the bearer: four months. Signed for the envoy." On the back: "Owed. Always owed."'],
  ['l3', '"Brother, do not join the army. Whatever they tell you about the east, it is mostly dust and the smell of burning."'],
  ['l4', 'A list in a careful hand: "Things to say to Maria: that I am sorry about the goat. That I will mend the roof. That I am sorry about the goat."'],
  ['l5', '"Captain: the men ask why we burn the villages if we came only for books. I could not answer them. Can you?"'],
  ['l6', 'A child\'s drawing of a horse, folded small. Under it, in a soldier\'s hand: "From Niko, aged six. Keep it dry."'],
  ['l7', '"The Arab guard killed Doukas at the kilns. He fought like a man with nothing to lose. They say his brother died on the road."'],
  ['l8', '"Mother, I have learned some of their words. Water is maa. Bread is khubz. Enough is kafa. I say that one most."'],
  ['l9', 'Orders, half burned: "...no copyist to be harmed. The envoy wants them living. Any man who..." The rest is ash.'],
  ['l10', '"If I do not come back, the vineyard goes to Kale, not to my cousin. He drinks."'],
  ['l11', 'A tally of days scratched on a strip of leather: two hundred and twelve marks, and then none.'],
  ['l12', '"We are paid in their own dirhams now, taken from their own markets. I buy bread with money from the bakery we burned."'],
  ['l13', '"Tatzates shoots like a hawk and drinks like a fish, and never speaks of the caravan. Not once."'],
  ['l14', '"The envoy reads every night. A book of their astronomers. He says they count the stars better than we do. The officers laugh behind his back."'],
  ['l15', '"Eirene: I am not dead. I am only far away. Those are different things. Wait."'],
  ['l16', 'A recipe for lentils, in a cook\'s scrawl, with a note: "As the woman in the Sawad made it. Better than ours. Do not tell the cook."'],
];
// things lying in the world, three per region, and one in every named dungeon
export const FINDS_ALL = {
  sawad: [
    ['fs1', ['village', 14, -10], 'A child\'s clay whistle', 'A clay whistle shaped like a bird, cracked down one wing. It still plays one note. Somebody in the village will miss it.'],
    ['fs2', ['serai', -12, 9], 'A caravan bell', 'A bronze camel bell with the caravan\'s mark scratched inside: Jabir\'s mark. The clapper is gone.'],
    ['fs3', ['arch', -14, -8], 'A blocked sluice gate', 'A canal sluice, jammed shut with a soldier\'s shield wedged in the slot. This is how Bardanes cut the village\'s water.'],
  ],
  marsh: [
    ['fm1', ['village', -12, 12], 'A reed-house post', 'A reed bundle post from a burned house, charred to the waist. The marsh people build a whole house from reeds in four days, and lose it in four minutes.'],
    ['fm2', ['serai', 12, 10], 'A broken siphon nozzle', 'A bronze nozzle from one of Kallinikos\'s fire siphons, cast like an open mouth. It still smells of naft.'],
    ['fm3', ['arch', 10, -12], 'A fisherman\'s tally stick', 'A tally stick notched for each day\'s catch. After the spring the notches stop, and someone has cut a line across it.'],
  ],
  karkh: [
    ['fk1', ['village', -12, -10], 'A paper-seller\'s sign', 'A painted board, half burned: "...paper of Samarqand, Khurasan and Baghdad, by the ream or the leaf." Forty shops on this lane sold paper.'],
    ['fk2', ['serai', 12, -12], 'A melted inkwell', 'A glass inkwell slumped in the fire into a green puddle, with the ink burned black inside it.'],
    ['fk3', ['arch', -10, 12], 'An astrolabe plate', 'A brass astrolabe plate, warped by heat, cut for the latitude of Baghdad. Signed: "Nu\'aym made it."'],
  ],
  docks: [
    ['fd1', ['village', 12, 12], 'A toll ledger', 'A river toll ledger: barges, cargoes, dues. The last page is in a different hand: "No toll today. The bridge is burning."'],
    ['fd2', ['serai', -12, -10], 'A copyist\'s reed pen', 'A reed pen, cut fine and worn down to a stub. Whoever used it wrote until there was nothing left to hold.'],
    ['fd3', ['arch', 12, -12], 'A ship\'s lantern', 'A Roman ship\'s lantern of horn and bronze. Arsaber\'s ship carried four of these. This one fell in the river and came back.'],
  ],
  hamrin: [
    ['fh1', ['village', 12, -10], 'A frontier pass', 'A safe-conduct for the frontier road, sealed with the envoy\'s wax. The name on it has been scraped off and written over three times.'],
    ['fh2', ['serai', -10, 10], 'A broken bowstring', 'A silk bowstring, cut cleanly. Tatzates kept spares in every hold. This one he cut himself.'],
    ['fh3', ['arch', 10, 12], 'A soldier\'s game board', 'A board scratched into a flat stone for a game of the Rum, with pebbles for pieces. One side was winning.'],
  ],
};
const FINDS = FINDS_ALL[REGION] || [];
export const DFINDS = {
  cistern: ['A water-seller\'s cup', 'A copper cup on a chain, the kind water-sellers hang from their skins. In the siege a cup of clean water cost a dirham.'],
  kiln2: ['A brick maker\'s stamp', 'A wooden stamp for marking bricks with the yard\'s name. The yard made bricks for the Round City\'s walls, sixty years ago.'],
  grainvault: ['A grain measure', 'A wooden qafiz measure, sealed with the market inspector\'s mark. In the siege the inspector set the price of grain every morning, and it rose every morning.'],
  warren: ['A reed helmet', 'A helmet woven from reeds and tarred, the kind the \'ayyarun wore in the siege. It would not stop an arrow. They wore it anyway.'],
  salt: ['A salt cake', 'A cake of rock salt stamped with a merchant\'s mark. Salt paid soldiers once. Here it paid for nothing but the men who dug it.'],
  undercroft: ['A drowned ledger', 'A merchant\'s ledger, swollen with water. On the last dry page: "Moved the good cloth to the undercroft. They will not look below the river."'],
  wharfvault: ['A sealed jar of dates', 'A jar of dates, still sealed, marked for Wasit. Somebody\'s whole season, waiting for a barge that never came.'],
  mines: ['A sapper\'s lamp', 'A clay lamp black with soot, with tally marks scratched on its base. Each mark is a day underground.'],
  countermine: ['A listening jar', 'A large jar set into the floor of the gallery. The defenders put their ears to it to hear the sappers digging toward them.'],
  palace: ['A broken tile', 'A glazed tile from a palace wall: blue and white vines. Somebody\'s grandfather fired it for al-Mansur\'s city.'],
};
const FIND_TOTAL = 15 + Object.keys(DFINDS).length + LETTERS.length;
// lines on the road (Salim, then the hired guard), once each, at the places the story passed through
const ROAD = {
  sawad: [['serai', 'We were meant to sleep at this khan the night Jabir died.', 'Then sleep here when this is over. Somebody has to.'], ['kiln', 'The kilns made bricks for the Round City once. Now they burn paper.', 'Paper burns quicker than brick, at least.'], ['arch', 'The old Persian arch. Jabir said it was built by giants. He knew it was not.', 'Big men, then. Big men with a lot of slaves.']],
  marsh: [['serai', 'Reed houses. They build one in four days, they say.', 'And lose it in an hour, if Kallinikos comes by.'], ['kiln', 'Nothing here but water and reeds and men who want to kill us.', 'And fish. Do not forget the fish.'], ['arch', 'The old weir. When it held, this was all fields.', 'When it held, I would have been a farmer.']],
  karkh: [['serai', 'The paper-sellers\' lane. Jabir wanted me to learn to read here.', 'You still could. Ash washes off a page.'], ['kiln', 'Every door on this street is burned. Every one.', 'Not every one. Look, that family is back.'], ['arch', 'The square. They held markets here that the whole world came to.', 'They will again. Markets come back before people do.']],
  docks: [['serai', 'Everything Baghdad eats comes up this river.', 'And everything it fears goes down it.'], ['kiln', 'Burned hulks. The Rum fired them so no one could follow.', 'Then we follow on foot.'], ['arch', 'The Bridge of Boats. Jabir would have argued the toll.', 'And won, from what you say of him.']],
  hamrin: [['serai', 'The frontier is eight days north. The Pages were nearly there.', 'Nearly is a long way, in these hills.'], ['kiln', 'Tatzates knows these hills. He picked them.', 'Then we unpick them, one hold at a time.'], ['arch', 'The end of the road. I thought it would feel like something.', 'It will. Later. It always comes later.']],
}[REGION] || [];

export function setupStory32(g) {
  const p = g.player, tmp = new THREE.Vector3();
  const st = () => S25(g);
  const ch = () => st().ch;
  const said = () => st().said;
  const choose = (k, v) => { ch()[k] = v; g.onChoice32?.(k, v); };
  const play = (def) => g.director.play(def);
  const asOther = (n) => S32.other(n);
  const ishaq = () => (g.npc ? { rig: g.npc, st: g.npcSt } : null);
  const calmNear = (r = 24) => !g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p.pos) < r);
  const dist = (a) => Math.hypot(p.pos.x - a[0], p.pos.z - a[1]);
  const lv = () => Math.max(1, p.level);

  // ---------------- the Codex: finds and letters
  for (const [id, text] of LETTERS) CODEX['f32_' + id] = { t: 'A soldier\'s letter', cat: 'Letters from the Company', x: text };
  for (const list of Object.values(FINDS_ALL)) for (const [id, , name, text] of list) CODEX['f32_' + id] = { t: name, cat: 'Finds', x: text };
  for (const [id, [name, text]] of Object.entries(DFINDS)) CODEX['f32_d_' + id] = { t: name, cat: 'Finds', x: text };
  const foundN = () => Object.keys(p.codex || {}).filter((k) => k.startsWith('f32_')).length;
  const found = (id, title, text) => {
    unlock(g, 'f32_' + id); g.audio.pickup?.();
    const n = foundN();
    g.ui.dialog(t(title) + ` · ${n}/${FIND_TOTAL}`, t(text), () => {
      g.ui.toast(`${t('Finds and letters')}: ${n}/${FIND_TOTAL}`, 'codex');
      if (n >= FIND_TOTAL && !st().f32done) {
        st().f32done = true;
        try { const it = makeItem(lv(), 'legendary', 'belt'); it.name = 'The Chronicler\'s Satchel'; it.flavor = '"' + t('Everything the war dropped, picked up and kept.') + '"'; giveItem(g, it); } catch (e) { /* none */ }
        g.ui.toast(t('Every find and every letter. The Chronicler\'s Satchel is yours.'), 'quest');
      }
      saveGame(g);
    });
  };
  const paperM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, emissive: 0x403020, emissiveIntensity: 0.6 });
  const objM = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.6, metalness: 0.3, emissive: 0x302010, emissiveIntensity: 0.5 });
  const glints = []; // { pos, sparkT, live(), take() }
  const glint = (pos, live, take, walk = false) => glints.push({ pos, sparkT: Math.random(), live, take, walk });

  // world finds: examined where they lie
  if (!IS_EPILOGUE) for (const [id, [site, ox, oz], name, text] of FINDS) {
    const S = SITES[site]; if (!S) continue;
    const [x, z] = freeSpot(S.x + ox, S.z + oz, 0.9), pos = new THREE.Vector3(x, heightAt(x, z), z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.22), objM); m.position.copy(pos).setY(pos.y + 0.08); m.rotation.y = Math.random() * 3; g.scene.add(m);
    const done = () => !!p.codex?.['f32_' + id];
    m.visible = !done();
    const it = { pos, r: 2.2, label: t('Examine') + ': ' + t(name), act: () => { if (done()) return; m.visible = false; g.interactables = g.interactables.filter((q) => q !== it); found(id, name, text); } };
    if (!done()) g.interactables.push(it);
    glint(pos, () => !done(), null);
  }

  // letters on the dead (one body in fifteen; an officer more often), walked over to pick up, never mid-fight
  const nextLetter = () => LETTERS.find(([id]) => !p.codex?.['f32_' + id]);
  const prevKill = g.onKill;
  g.onKill = (e) => {
    prevKill?.(e);
    if (e.boss || e.T?.quad || e.T?.summoned || IS_EPILOGUE) return;
    const L = nextLetter(); if (!L || Math.random() > (e.elite ? 0.35 : 0.065)) return;
    if (glints.some((q) => q.letter === L[0])) return;
    const pos = e.pos.clone(); pos.y = e.interior ? e.pos.y : heightAt(pos.x, pos.z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), paperM); m.position.copy(pos).setY(pos.y + 0.04); m.rotation.y = Math.random() * 3; g.scene.add(m);
    const q = { pos, sparkT: 0, letter: L[0], walk: true, inside: !!g.interior, live: () => !p.codex?.['f32_' + L[0]], take: () => { g.scene.remove(m); found(L[0], 'A soldier\'s letter', L[1]); } };
    q.mesh = m; glints.push(q);
  };

  // dungeon finds: one in a middle room of every named dungeon
  let placedFor = null;
  const placeDungeonFind = () => {
    const I = g.interior; if (!I || placedFor === I) return;
    placedFor = I;
    const id = I.def?.id, F = DFINDS[id]; if (!F || p.codex?.['f32_d_' + id] || !I.I?.rooms?.length) return;
    const rooms = I.I.rooms, r = rooms[Math.max(1, Math.floor(rooms.length / 2))], base = roomCenter(r);
    const pos = new THREE.Vector3(base.x + 2.2, I.I.entrance.y, base.z + 2.2);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.24), objM); m.position.copy(pos).setY(pos.y + 0.09); (I.I.group || g.scene).add(m);
    const it = { pos, r: 2.2, interior: true, label: t('Examine') + ': ' + t(F[0]), act: () => { m.visible = false; g.interactables = g.interactables.filter((q) => q !== it); found('d_' + id, F[0], F[1]); } };
    g.interactables.push(it);
    glint(pos, () => g.interior === I && !p.codex?.['f32_d_' + id], null);
  };

  // ---------------- the family, Nasim and the deserter (people in the world)
  const fam = FAMILY[REG];
  const family = {};
  if (fam && HUB?.spawn) {
    const [bx, bz] = freeSpot(HUB.spawn[0] + fam.at[0], HUB.spawn[1] + fam.at[1], 1.4);
    const spots = { Umayma: [bx, bz], Nadr: freeSpot(bx + 1.4, bz + 0.6, 0.9), Qays: freeSpot(bx - 1.0, bz + 0.9, 0.7) };
    for (const who of ['Umayma', 'Nadr', 'Qays']) family[who] = npc(g, FAMILY_LOOK[who], spots[who], 2.6, who, who === 'Qays' ? '' : t('Going home to al-Karkh'), () => talkFamily(who));
  }
  const famKey = 'fam32_' + REG;
  function talkFamily(who) {
    if (said()[famKey] || g.cinematic) { g.ui.dialog(who, t({ Umayma: 'Go well, guard.', Nadr: 'Mind the roads.', Qays: 'Show me your sword again?' }[who])); return; }
    const script = fam.lines.map((L) => L.choice ? { choice: { prompt: L.choice.prompt, options: L.choice.options.map((o) => ({ label: o.label, fx: () => famChoice(o.fx) })) } } : { ...L, when: L.when ? () => L.when(g) : undefined });
    const cast = { Nadr: asOther(family.Nadr), Qays: asOther(family.Qays) };
    for (const n of Object.values(family)) n.rig.visible = true;
    play(S32.chat(g, asOther(family.Umayma), script, { cast })).then(() => { said()[famKey] = true; saveGame(g); });
  }
  function famChoice(v) {
    if (REG === 'sawad') { choose('fam', v); if (v === 'water') { if ((p.potions || 0) > 0) { p.potions -= 1; g.refreshInv?.(); } p.renown = (p.renown || 0) + 5; } }
    if (REG === 'karkh') { const can = v === 'yes' && p.gold >= 100; choose('famgold', can ? 'yes' : 'no'); if (can) { p.gold -= 100; p.renown = (p.renown || 0) + 10; g.audio.gold?.(); } else if (v === 'yes') setTimeout(() => g.ui.toast(t('You do not have 100 gold.')), 300); }
  }
  if (!IS_EPILOGUE && HUB?.trainer && NASIM[REGION]) {
    const [x, z] = freeSpot(HUB.trainer[0] + 2.2, HUB.trainer[1] - 2.0, 0.8);
    const n = npc(g, { robe: '#c8a878', robe2: '#6a3a2a', turban: null, cap: 0x5a3a2a, capBand: 0x2a1a10, skin: 0xa8714a, weapon: 'spear', sash: 0x6a3a2a, scale: 0.68, build: 0.85 }, [x, z], 0.5, 'Nasim', t('\'Amr\'s pupil'), () => g.ui.dialog('Nasim', t(NASIM[REGION])));
    n.st.action = null;
  }
  const D = !IS_EPILOGUE && DESERTER[REGION];
  const desKey = 'des_' + REGION;
  if (D && !ch()[desKey]) {
    const S = SITES[D.at[0]];
    const [x, z] = freeSpot(S.x + D.at[1], S.z + D.at[2], 1.2);
    const look = byzify({ ...LOOK.psilos(), weapon: null, offhand: null });
    const n = npc(g, look, [x, z], 0, D.name, t('Deserter'), () => talkDeserter(n));
    n.st.crouch = 0.8;
    const poi = { x, z, icon: '?', color: '#d8c8a0' }; g.pois?.push(poi); n.poi = poi;
  }
  function talkDeserter(n) {
    if (ch()[desKey] || g.cinematic) return;
    if (!calmNear(20)) { g.ui.toast(t('Deal with the men around first')); return; }
    n.rig.visible = true; n.st.crouch = 0;
    const script = [...D.lines, { choice: { prompt: t('He waits for your answer.'), options: [
      { label: 'Spare him. Let him go south.', fx: () => choose(desKey, 'spare') },
      { label: 'Turn him in to the qadi\'s men.', fx: () => choose(desKey, 'turn') }] } },
    ...DES_AFTER.spare.map((L) => ({ ...L, when: () => ch()[desKey] === 'spare' })), ...DES_AFTER.turn.map((L) => ({ ...L, when: () => ch()[desKey] === 'turn' }))];
    play(S32.chat(g, asOther(n), script)).then(() => {
      if (ch()[desKey] === 'turn') p.renown = (p.renown || 0) + 10;
      g.ui.toast(t(ch()[desKey] === 'spare' ? 'You let him go.' : 'He will answer before the qadi.'), 'quest');
      n.rig.visible = false; g.scene.remove(n.rig); g.npcs = g.npcs.filter((x) => x !== n); g.interactables = g.interactables.filter((i) => i.npc !== n);
      if (n.poi) g.pois = g.pois.filter((q) => q !== n.poi);
      saveGame(g);
    });
  }
  const spared = () => ACT_REGIONS.filter((r) => ch()['des_' + r] === 'spare').length;
  g.spared32 = spared;

  // ---------------- what Arsaber's lane changes on the quays: his words at the bridge, and his strength
  if (REGION === 'docks' && BOSS) {
    if (ch().lane === 'watch') { BOSS.level += 1; BOSS.intro = { ...BOSS.intro, text: 'No watch to call on this bridge, guard. Only the two of us.' }; }
    if (ch().lane === 'walk') BOSS.intro = { ...BOSS.intro, text: 'You let me walk once, guard. I cannot do the same for you.' };
  }
  g.onChoice32 = (k, v) => {
    if (k === 'lane' && v === 'watch') { p.renown = (p.renown || 0) + 10; setTimeout(() => g.ui.toast(t('The watch has posted Arsaber\'s face at every gate.') + ' (+10 ' + t('Renown') + ')', 'quest'), 4000); }
    if (k === 'lane' && v === 'walk') setTimeout(() => g.ui.toast(t('Arsaber walked on. He will remember it.'), 'quest'), 4000);
  };

  // ---------------- the guards' own stories
  const arcs = () => (st().g32 ||= {});
  let killsAt = g.kills || 0, arcT = 0;
  const tryArc = () => {
    const C = g.companion; if (!C || C.down || !GUARD_ARC[C.kind]) return false;
    const A = (arcs()[C.kind] ||= { n: 0, at: null });
    if (A.n >= 3 || A.at === REGION || (g.kills || 0) - killsAt < 6 || arcT < 75) return false;
    if (Math.hypot(C.pos.x - p.pos.x, C.pos.z - p.pos.z) > 6) return false;
    const n = A.n, lines = GUARD_ARC[C.kind][n].map(([who, text]) => ({ who, text }));
    A.n = n + 1; A.at = REGION; killsAt = g.kills || 0; arcT = 0;
    play(S32.chat(g, asOther(C), lines, { closeIn: 0 })).then(() => {
      if (n === 2) g.ui.toast(GUARD_GIFT[C.kind](g), 'quest');
      saveGame(g);
    });
    return true;
  };

  // ---------------- the scene inside each act
  const midKey = 'mid32_' + REGION;
  const tryMid = () => {
    if (said()[midKey] || !S32.MIDACT[REGION] || !HUB?.ishaq) return false;
    if (REGION === 'hamrin') {
      const done = ['quarry', 'fort', 'gorge'].filter((id) => g.holds?.state(id)?.done).length;
      if (!done || !said().h26scout || !g.npc || Math.hypot(p.pos.x - g.npc.position.x, p.pos.z - g.npc.position.z) > 16) return false;
      said()[midKey] = true;
      const E = S32.hillMan(g);
      play(S32.chat(g, asOther(E), S32.MIDACT.hamrin, { closeIn: 0, onEnd: () => E.remove() })).then(() => {
        try { const it = makeItem(lv(), 'legendary', 'amulet'); it.name = 'Jabir\'s Spear-Grip'; it.flavor = '"' + t('Wound badly, held well.') + '"'; giveItem(g, it); } catch (e) { /* none */ }
        st().spear32 = true; saveGame(g);
      });
      return true;
    }
    if (!g.chief?.dead || !g.npc || Math.hypot(p.pos.x - g.npc.position.x, p.pos.z - g.npc.position.z) > 9) return false;
    said()[midKey] = true;
    play(S32.chat(g, asOther(ishaq()), S32.MIDACT[REGION])).then(() => saveGame(g));
    if (g.npcMark) g.npcMark.visible = false;
    return true;
  };
  const tryLane = () => {
    if (REGION !== 'karkh' || said().lane32 || ch().lane || !g.chief?.dead || g.matriarch?.dead || g.bossActive) return false;
    if (HUB?.ishaq && dist(HUB.ishaq) < 30) return false;
    said().lane32 = true;
    play(S32.arsaberLane(g, choose)).then(() => saveGame(g));
    return true;
  };
  // the deserters' word reaches the hills
  const tryHills = () => {
    if (REGION !== 'hamrin' || said().hills32 || spared() < 3 || !HUB?.ishaq || dist(HUB.ishaq) > 14) return false;
    if (g.bark?.('Ishaq', 'A deserter came down from the holds last night. He had heard of a guard who lets tired men go home. He told us where the gorge is watched.', 7000)) { said().hills32 = true; p.renown = (p.renown || 0) + 10; return true; }
    return false;
  };

  // headless tests force the beats (shots/r32story.mjs)
  g.s32test = { arc: () => { arcT = 999; killsAt = -99; return tryArc(); }, mid: tryMid, lane: tryLane, hills: tryHills, glints: () => glints.length };

  // ---------------- per frame
  let calmT = 0, shoutCd = 8, alerted = new Set(), roadReply = null, shout = null;
  const roadDone = (i) => said()['road32_' + REGION + '_' + i];
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (!g.started) return;
    shoutCd -= dt; arcT += dt;
    if (g.interior) placeDungeonFind();
    // glints and pickups
    let fight = false; for (const e of g.enemies) if (!e.dead && e.alerted && e.pos.distanceTo(p.pos) < 18) { fight = true; break; }
    for (let i = glints.length - 1; i >= 0; i--) {
      const q = glints[i];
      if (!q.live()) { if (q.mesh) g.scene.remove(q.mesh); glints.splice(i, 1); continue; }
      if (q.inside !== undefined && q.inside !== !!g.interior) continue;
      const d = Math.hypot(p.pos.x - q.pos.x, p.pos.z - q.pos.z);
      if (d < 24 && (q.sparkT -= dt) <= 0) { q.sparkT = 0.8; g.fx.glow.spawn({ pos: { x: q.pos.x, y: q.pos.y + 0.35, z: q.pos.z }, life: 0.6, size: 0.45, size1: 0.1, color: new THREE.Color(2.4, 2.0, 1.2) }); }
      if (q.walk && d < 1.5 && !fight && !g.cinematic && !g.ui.dialogOpen && !p.dead) { glints.splice(i, 1); q.take(); }
    }
    if (g.cinematic) return;
    // a soldier shouts as a fight starts
    let fresh = null;
    for (const e of g.enemies) if (!e.dead && e.alerted && !alerted.has(e)) { alerted.add(e); if (!e.boss && !e.T?.quad && e.pos.distanceTo(p.pos) < 20) fresh = e; }
    if (alerted.size > 300) alerted = new Set([...alerted].filter((e) => !e.dead));
    if (fresh && shoutCd <= 0 && !shout && Math.random() < 0.6) shout = { e: fresh, t: 3, text: SHOUTS[Math.floor(Math.random() * SHOUTS.length)] };
    if (shout && ((shout.t -= dt) <= 0 || shout.e.dead)) shout = null; // it waits a moment for the guard's line to clear
    else if (shout && g.bark?.(shout.e.name || shout.e.T?.name || 'Soldier', shout.text, 2600)) { shout = null; shoutCd = 22; }
    if (roadReply && (roadReply.t -= dt) <= 0) { const C = g.companion; if (C && !C.down) g.bark(C.K.name, roadReply.text, 4200, true); roadReply = null; }
    // the beats wait for quiet
    const quiet = !g.interior && !p.dead && !g.ui.dialogOpen && g.briefed && !g.bossActive && calmNear() && !!g.director;
    calmT = quiet ? calmT + dt : 0;
    if (calmT < 2.5 || IS_EPILOGUE) return;
    if (tryMid() || tryLane() || tryArc() || tryHills()) { calmT = 0; return; }
    // lines on the road, at the story's places
    ROAD.forEach(([site, salim, guard], i) => {
      const S = SITES[site]; if (!S || roadDone(i) || roadReply) return;
      if (Math.hypot(p.pos.x - S.x, p.pos.z - S.z) > 13) return;
      if (g.bark('Salim', salim, 4200)) { said()['road32_' + REGION + '_' + i] = true; if (g.companion && !g.companion.down) roadReply = { t: 5.4, text: guard }; }
    });
  };

  // ---------------- the epilogue: the family on the quays, the guard's farewell, and more for the camp men to say
  g.epAdd32 = (key, L) => {
    if (key === 'yusuf' && chosen(g, 'famgold') === 'yes') L.push(['Yusuf', 'A woman called Umayma bought timber from me with your silver. I gave her the good beams at the bad price. Do not tell anyone.']);
    if (key === 'bishr' && st().spear32) L.push(['Bishr', 'Leave Jabir\'s spear with me a day. I will wind that grip properly.'], ['Salim', 'No. I will leave it as he made it.'], ['Bishr', 'Good answer.']);
    if (key === 'amr') { const n = spared(); if (n >= 3) L.push(['\'Amr', 'They say you let the Rum deserters walk home. All of them. Soft, the camp says. I say it takes more nerve than a spear.']); else if (n === 0 && ACT_REGIONS.some((r) => ch()['des_' + r])) L.push(['\'Amr', 'Every deserter you found, you gave to the qadi. Hard, but it is the law. The law is a line too.']); }
  };
  if (IS_EPILOGUE) {
    const ish = g.npcs.find((x) => x.name === 'Ishaq');
    if (ish) {
      const prevTalk = ish.talk;
      ish.talk = () => {
        const C = g.companion, s = said();
        const ready = ['yusuf', 'bishr', 'amr'].every((k) => s['ep29_' + k]);
        if (!ready || s.ep29_done || s.ep32_guard || !C || C.down || !(arcs()[C.kind]?.n > 0)) return prevTalk?.();
        s.ep32_guard = true;
        play(S32.chat(g, asOther(C), GUARD_BYE[C.kind].map(([who, text]) => ({ who, text })))).then(() => prevTalk?.());
      };
    }
  }
}
