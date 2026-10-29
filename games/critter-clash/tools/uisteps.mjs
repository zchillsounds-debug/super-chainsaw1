// shared by uishots.mjs and sfxcheck.mjs: an end-game save and the steps that open every Adventure menu, modal and Journal tab
export const endGameSave = () => {
  const F = new Set('intro quest rival1 crowned ending isle_arrive sunstone morra skua_b glider lantern rod festlamp_done tower_bronze sands_arrive cup_sandstorm caravan3_done gcap_done aq_done aqueduct_flow tess_a'.split(' '));
  for (const M of Object.values(__maps)) { for (const n of M.npcs || []) for (const k of ['hideFlag', 'showFlag']) n[k] && F.add(n[k]); for (const e of Object.values(M.edges || {})) e.need && F.add(e.need); for (const bd of M.buildings || []) bd.stadium && F.add('cup_' + bd.stadium); }
  __save.trainer = { name: 'Samantha', partner: 'cindermunch' }; __save.tutorialDone = true; __save.berries = 1234;
  __save.unlocked = __critters.map((c) => c.id); __critters.forEach((c) => { __save.critters[c.id].level = 30; }); __save.seenStage = Object.fromEntries(__critters.map((c) => [c.id, 3])); __save.news = ['tricks', 'grove', 'otter', 'frogmole', 'grow', ...Array.from({ length: 40 }, (_, i) => 'adv' + i)];
  __save.adv = { hero: 'cindermunch', map: 'bloom', x: 10, y: 8, dir: 's', flags: Object.fromEntries([...F].map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 },
    hats: __hats.slice(0, 40).map((x) => x.id), clock: 12, rain: false, time: 40000, steps: 900,
    seen: Object.fromEntries(Object.keys(__maps).map((k) => [k, 1])), tower: { streak: 9, best: 15, run: 1, wins: 40 },
    fishLog: { n: 30, sp: { 'Pond Minnow': 12 } }, consts: [], notes: [0, 1, 2], snaps: [] };
};
export const world = "__game.endBattle?.(); S.adventure(); __sim(0.3);";
const click = (txt) => `[...document.querySelectorAll('.modal-wrap button')].find((e) => e.textContent.includes(${JSON.stringify(txt)}))?.click()`;
const scroll = (sel) => `{ const l = document.querySelector(${JSON.stringify(sel)}); if (l) l.scrollTop = 1e6; }`;
export const STEPS = [
  ['title', `__game.endBattle?.(); S.title()`],
  ['howto', `S.title(); S.howTo()`],
  ['howto-adv', `S.title(); S.howTo('adv')`],
  ['howto-modes', `S.title(); S.howTo('modes')`],
  ['howto-tips', `S.title(); S.howTo('tips')`],
  ['credits', `S.credits()`],
  ['menu', `${world} S.worldMenu()`],
  ['j-today', `${world} S.worldJournal('today')`],
  ['j-today2', `${world} S.worldJournal('today'); ${scroll('.jr-list')}`],
  ['j-fav', `${world} S.worldJournal('fav')`],
  ['j-fish', `${world} S.worldJournal('fish')`],
  ['j-fish2', `${world} S.worldJournal('fish'); ${scroll('.jr-list')}`], // R878: the bottom of the fish list (desert pools)
  ['j-night', `${world} S.worldJournal('night')`],
  ['j-rec', `${world} S.worldJournal('rec')`],
  ['j-rec2', `${world} S.worldJournal('rec'); ${scroll('.jr-list')}`],
  ['j-champ', `${world} S.worldJournal('champ')`],
  ['map', `${world} S.worldMap()`],
  ['map-isles', `__save.adv.map = 'coral'; __save.adv.x = 10; __save.adv.y = 10; ${world} S.worldMap()`],
  ['buddy', `__save.adv.map = 'bloom'; __save.adv.x = 10; __save.adv.y = 8; ${world} S.buddyPick()`],
  ['hats', `${world} S.worldMenu(); ${click('Hats')}`],
  ['shop', `${world} S.hatGrid('Milliner Mo: Which one catches your eye?', __hats.slice(40, 52), () => {}, () => {}, true)`],
  ['say', `${world} S.worldObj.say(['Prof. Pecan: Well now, {name}! This is a fairly long line of dialogue to check how the box wraps on a small phone screen.'], null, 'Prof. Pecan')`],
  ['ask', `${world} S.worldObj.ask('Milliner Mo: Welcome to the Hat Shop! A hat for every head. (You have 1234 🍓)', ['Buy a hat', 'Wear a hat', 'Bye'], () => {})`],
  ['ask4', `${world} S.worldObj.ask('Ferry Captain: Where to today, sailor?', ['Port Coral', 'Ember Isle', 'Starfall Atoll', 'Stay here'], () => {})`],
  ['stars', `${world} S.worldObj.stargaze()`],
  ['ring', `${world} S.worldObj.fairyRing()`],
  ['arcade', `${world} S.worldObj.load('in:neon:arcade', 4, 5, 'n'); __sim(0.2); { const wo = S.worldObj; S.worldStory('arcade', wo, null); [...document.querySelectorAll('.wd-opts button')][0]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }`],
  ['hop', `${world} S.worldObj.load('in:neon:arcade', 4, 5, 'n'); __sim(0.2); { const wo = S.worldObj; S.worldStory('arcade:hop', wo, null); [...document.querySelectorAll('.wd-opts button')][0]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }`],
  ['settings', `S.leaveWorld(); S.title(); document.querySelector('.gear').click()`],
  ['backup', `S.leaveWorld(); S.title(); document.querySelector('.gear').click(); document.querySelector('.bk-up')?.click()`],
  ['restore', `S.leaveWorld(); S.title(); document.querySelector('.gear').click(); document.querySelector('.bk-in')?.click()`],
  ['matchsetup', `S.leaveWorld(); S.ctx = { kind: 'quick' }; S.select(); S.matchSheet(false)`],
  ['challenges', `S.leaveWorld(); S.title(); S.challenges()`],
  ['cups', `S.leaveWorld(); S.title(); S.cups()`],
  ['dex', `S.leaveWorld(); S.title(); S.dex()`],
  ['toastmenu', `${world} S.worldMenu(); S.toast('🎉 Clashara explored: 75%! A reward waits at home.')`],
];
