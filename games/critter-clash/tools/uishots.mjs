// node tools/uishots.mjs [WxH] [step,step] : the C5 UI pass. Opens every Adventure menu, modal and Journal tab with an
// end-game save, screenshots each (tools/out/ui-<WxH>-<step>.png) and reports layout problems: anything that spills
// out of the screen or out of its modal, text cut off sideways, and buttons under 26 px tall.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const only = process.argv[3]?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
// an end-game save: every flag a townsfolk or edge gate mentions, every cup, plus a few hats, fish, stars and notes
await pg.evaluate(() => {
  const F = new Set('intro quest rival1 crowned ending isle_arrive sunstone morra skua_b glider lantern rod festlamp_done tower_bronze'.split(' '));
  for (const M of Object.values(__maps)) { for (const n of M.npcs || []) for (const k of ['hideFlag', 'showFlag']) n[k] && F.add(n[k]); for (const e of Object.values(M.edges || {})) e.need && F.add(e.need); for (const bd of M.buildings || []) bd.stadium && F.add('cup_' + bd.stadium); }
  __save.trainer = { name: 'Samantha', partner: 'cindermunch' }; __save.tutorialDone = true; __save.berries = 1234;
  __save.unlocked = __critters.map((c) => c.id); __critters.forEach((c) => { __save.critters[c.id].level = 30; }); __save.seenStage = Object.fromEntries(__critters.map((c) => [c.id, 3])); __save.news = ['tricks', 'grove', 'otter', 'frogmole', 'grow', ...Array.from({ length: 40 }, (_, i) => 'adv' + i)];
  __save.adv = { hero: 'cindermunch', map: 'bloom', x: 10, y: 8, dir: 's', flags: Object.fromEntries([...F].map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 },
    hats: __hats.slice(0, 40).map((x) => x.id), clock: 12, rain: false, time: 40000, steps: 900,
    seen: Object.fromEntries(Object.keys(__maps).map((k) => [k, 1])), tower: { streak: 9, best: 15, run: 1, wins: 40 },
    fishLog: { n: 30, sp: { 'Pond Minnow': 12 } }, consts: [], notes: [0, 1, 2], snaps: [] };
});
const world = "__game.endBattle?.(); S.adventure(); __sim(0.3);";
const click = (txt) => `[...document.querySelectorAll('.modal-wrap button')].find((e) => e.textContent.includes(${JSON.stringify(txt)}))?.click()`;
const scroll = (sel) => `{ const l = document.querySelector(${JSON.stringify(sel)}); if (l) l.scrollTop = 1e6; }`;
const STEPS = [
  ['menu', `${world} S.worldMenu()`],
  ['j-today', `${world} S.worldJournal('today')`],
  ['j-today2', `${world} S.worldJournal('today'); ${scroll('.jr-list')}`],
  ['j-fav', `${world} S.worldJournal('fav')`],
  ['j-fish', `${world} S.worldJournal('fish')`],
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
const CHECK = `(() => {
  const W = innerWidth, H = innerHeight, bad = [];
  const layers = [...document.querySelectorAll('.modal-wrap, .wd-box')].filter((e) => !e.matches('.wd-box') || !document.querySelector('.modal-wrap')); const top = layers[layers.length - 1];
  if (!top) return ['nothing open'];
  const box = (top.querySelector('.modal') || top).getBoundingClientRect();
  if (box.left < -1 || box.top < -1 || box.right > W + 1 || box.bottom > H + 1) bad.push('MODAL off-screen ' + [box.left, box.top, box.right, box.bottom].map(Math.round));
  for (const e of top.querySelectorAll('*')) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    // inside a scrolling list is fine vertically
    let sc = e.parentElement; while (sc && sc !== top && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    const name = (e.tagName + '.' + String(e.className).split(' ')[0] + ' "' + (e.textContent || '').trim().slice(0, 18) + '"');
    if (r.right > box.right + 2 || r.left < box.left - 2) bad.push('SIDE ' + name + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' of ' + Math.round(box.left) + '..' + Math.round(box.right));
    else if ((!sc || sc === top) && (r.bottom > box.bottom + 2 || r.top < box.top - 2)) bad.push('VERT ' + name + ' ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + Math.round(box.top) + '..' + Math.round(box.bottom));
    if (e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && (cs.webkitLineClamp || 'none') === 'none' && cs.overflowX !== 'visible' && !/(auto|scroll)/.test(cs.overflowX) && e.clientWidth > 0) bad.push('CUT ' + name + ' ' + e.scrollWidth + '>' + e.clientWidth);
    if ((e.tagName === 'BUTTON' || e.classList.contains('btn')) && r.height < 26 && !e.closest('.jr-album')) bad.push('SMALL ' + name + ' h' + Math.round(r.height));
  }
  return [...new Set(bad)].slice(0, 12);
})()`;
for (const [name, js] of STEPS) {
  if (only && !only.includes(name)) continue;
  try {
    await pg.evaluate(`(() => { const S = __game.screens; document.querySelectorAll('.modal-wrap, .prof-wrap, .wd-box').forEach((m) => m.remove()); __game.modalClose = null; if (S.worldObj) { S.worldObj.dialog = null; S.worldObj.busy = false; } ${js}; })()`);
    await pg.waitForTimeout(900); await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* infinite */ } }));
    await pg.evaluate(() => { const p = document.querySelector('.wd-box p'); const D = __game.screens.worldObj?.dialog; if (p && D && !document.querySelector('.wd-ask')) D.next(); }); // finish the typing
    await pg.waitForTimeout(200);
    const bad = await pg.evaluate(CHECK);
    console.log(`${w}x${h} ${name}: ${bad.length ? bad.join(' | ') : 'ok'}`);
    await pg.screenshot({ path: `tools/out/ui-${w}x${h}-${name}.png` });
  } catch (e) { console.log(`${w}x${h} ${name}: ERROR ${e.message.split('\n')[0]}`); }
}
if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
await b.close();
