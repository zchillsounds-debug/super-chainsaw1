// node tools/beats.mjs <chain> [WxH] : R906: a chained story playthrough. Starts from a chain's flags and, beat by beat, finds the story
// NPC on its map (window.__maps), stands the hero next to it, talks, and plays out what happens like advstory (dialogue tapped through,
// first answer, battles forced wins). Flags carry over from beat to beat, so each beat must leave the game ready for the next.
// A beat 'in:<map>:<building>/in<k>' talks to an interior's k-th NPC. A beat '+flag,flag' sets flags by hand (a cup won with advcup, a map arrived at). Prints each beat's new flags, and errors. Chains: ch1, ch2, ch3, post3, lab (Pecan after the Sun Gate). SAY=1 prints every line. LOSE=1 loses every battle (the story must not move on).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const chain = process.argv[2] || 'ch3';
const [w, h] = (process.argv[3] || '915x412').split('x').map(Number);
const CH1 = 'intro';
const CH2 = 'intro quest crowned ending cup_sprout cup_thunder cup_grove cup_champion cup_midnight cup_sky cup_legend trial_friendship trial_heart trial_wisdom';
const CH3 = CH2 + ' isle_arrive cup_coral cup_gale cup_caldera skua_b morra sunstone';
const CHAINS = {
  ch1: [CH1, ['pecan', 'dashpost', '+rival1', '+cup_sprout', 'rival2', '+cup_thunder', 'mama', 'pip', 'mama', '+cup_grove', 'sage', '+cup_champion', 'vex', '+cup_midnight', '+cup_sky', '+cup_legend', 'dash5', 'king', 'pecan']],
  ch2: [CH2, ['gill_s', '+isle_arrive,cup_coral', 'dash_c', '+cup_gale', 'gull_b', 'dash_e', '+cup_caldera', 'gill', 'morra_a', 'keeper_a', 'pecan']],
  ch3: [CH3, ['tamsin', '+cup_mirage', '+redrock_arrive,cup_canyon', 'devil_r', 'dash_r', '+dunecamp_arrive,cup_sandstorm', 'guard_c2', 'in:dunecamp:hq_c/in0', '+sungate_arrive', 'baron_g', 'pecan']],
  lab: [CH3 + ' sands_arrive cup_mirage cup_canyon devils1 dash_canyon cup_sandstorm devils2 citymap baron gate_open', ['pecan']],
  post3: [CH3 + ' sands_arrive cup_mirage cup_canyon devils1 dash_canyon dunecamp_arrive cup_sandstorm devils2 citymap sungate_arrive baron gate_open post_mirage post_sandstorm buried_vault', ['star_c', 'nuri_s', 'sabah_g', 'baron_g', 'pecan']],
};
const [start, beats] = CHAINS[chain];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=low' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate((fl) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: ['grow', 'tricks', 'grove', 'koala', 'bat', 'fox', 'jelly', 'otter', 'gate'] });
  __save.adv = { hero: 'cindermunch', map: 'village', x: 4, y: 6, dir: 's', flags: Object.fromEntries(fl.split(' ').map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 } };
}, start);
// play out the world until it's calm (the advstory loop)
const play = async () => {
  const log = [];
  for (let step = 0; step < 60; step++) {
    await pg.waitForTimeout(500);
    const st = await pg.evaluate((LOSE) => {
      const S = __game.screens, wo = S.worldObj;
      if (S.mode === 'world' && wo) {
        const t = document.querySelector('.wd-box')?.textContent?.slice(0, 160);
        if (wo.dialog) { wo.dialog.next(); wo.dialog?.next(); return 'say: ' + t; }
        return wo.busy ? 'busy' : 'calm';
      }
      if (S.mode === 'results') { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results'; }
      const bt = __game.battle;
      if (bt) { const p = bt.fighters[LOSE ? 1 : 0], q = bt.fighters[LOSE ? 0 : 1]; for (let i = 0; i < 450 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') q.hp = 1; __sim(0.1); } __sim(2); return (LOSE ? 'lost to ' : 'battle vs ') + bt.fighters[1].def.name + ' (' + bt.wins.join('-') + ')'; }
      const mw = document.querySelector('.modal-wrap'); if (mw) { [...mw.querySelectorAll('button')].pop()?.click(); return 'modal: ' + mw.textContent.slice(0, 50); }
      return S.mode;
    }, !!process.env.LOSE);
    if (log[log.length - 1] !== st) log.push(st);
    if (st === 'calm' && step > 2) break;
  }
  return log;
};
let bad = 0;
for (const beat of beats) {
  const before = await pg.evaluate(() => Object.keys(__save.adv.flags));
  if (beat[0] === '+') { await pg.evaluate((f) => { for (const k of f.split(',')) __save.adv.flags[k] = true; }, beat.slice(1)); console.log(`== ${beat}`); continue; }
  const r = await pg.evaluate((id) => {
    if (id.includes('/')) { const [map, nid] = id.split('/'); Object.assign(__save.adv, { map, x: 6, y: 5, dir: 'n' }); __game.screens.adventure(); __sim(0.4); return { map }; } // an interior: 'in:<map>:<building>/in<k>'
    const map = Object.keys(__maps).find((m) => (__maps[m].npcs || []).some((n) => n.id === id));
    if (!map) return { err: 'no map has ' + id };
    const n = __maps[map].npcs.find((q) => q.id === id);
    Object.assign(__save.adv, { map, x: n.x, y: n.y + 1, dir: 'n' });
    __game.screens.adventure(); __sim(0.4);
    return { map };
  }, beat);
  if (r.err) { console.log(`== ${beat}: ${r.err}`); bad++; continue; }
  const pre = await play(); // an arrival scene first, if any
  const t = await pg.evaluate((id) => {
    id = id.split('/').pop();
    const wo = __game.screens.worldObj, a = wo.npcs.find((q) => q.n.id === id);
    if (!a) return 'not on the map (hidden by its flags)';
    window.__said = []; const say = wo.say.bind(wo); wo.say = (l, ...r) => { __said.push(...l); return say(l, ...r); }; // (SAY=1 prints these)
    const D = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }, back = { n: 's', s: 'n', e: 'w', w: 'e' };
    for (const d of ['s', 'w', 'e', 'n']) { const [dx, dy] = D[d], x = a.x + dx, y = a.y + dy; if (wo.walkable(x, y) && !wo.occupied(x, y, 'hero')) { wo.hx = x; wo.hy = y; wo.dir = back[d]; wo.interact(); return 'ok'; } }
    return 'no free tile beside it';
  }, beat);
  if (t !== 'ok') { console.log(`== ${beat} (${r.map}): ${t}`); bad++; continue; }
  const log = await play();
  const after = await pg.evaluate(() => ({ f: Object.keys(__save.adv.flags) }));
  const nw = after.f.filter((k) => !before.includes(k));
  console.log(`== ${beat} (${r.map})${pre.length > 2 ? ' [arrival: ' + pre.filter((s) => s.startsWith('say')).length + ' lines]' : ''}: +${nw.join(',') || '(no new flags)'}`);
  for (const s of log.filter((s) => !s.startsWith('say'))) console.log('   ' + s);
  if (process.env.SAY) for (const s of await pg.evaluate(() => __said)) console.log('   > ' + s); // SAY=1: every line
  else console.log('   last line: ' + (log.filter((s) => s.startsWith('say')).pop() || '-'));
  if (!nw.length) bad++;
  await pg.screenshot({ path: `tools/out/beat-${chain}-${beat.replace(/[/:]/g, "_")}.png` });
}
console.log('flags:', await pg.evaluate(() => Object.keys(__save.adv.flags).join(' ')));
console.log(`beats with no new flags or missing: ${bad}`);
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none');
await b.close();
