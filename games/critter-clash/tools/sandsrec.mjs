// node tools/sandsrec.mjs [WxH] : D4, the Amber Sands' Journal Records. Counts the gift box spots on each desert map (every outdoor map should
// have 2: the Records row expects that), then opens the Records tab on a save just off the boat (sands_arrive), one mid-way through and one
// with everything done (100%: the Amber Wreath). Env ONLY=boxes,snap,rec. Screenshots in tools/out/sr-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const only = (process.env.ONLY || '').split(',').filter(Boolean), want = (k) => !only.length || only.includes(k);
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/sr-${n}-${tag}.png`, timeout: 120000 }); };
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', 'dash_canyon', 'dunecamp_arrive', 'cup_sandstorm', 'devils2', 'citymap', 'sungate_arrive', 'baron', 'gate_open'];
const start = (flags, extra = {}) => pg.evaluate(([flags, extra]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 40;
  __save.adv = { hero: 'cindermunch', map: 'oasis', x: 12, y: 12, dir: 's', flags: f, hats: [], spawn: { map: 'oasis', x: 12, y: 12 }, sandstorm: false, ...extra };
  __game.screens.adventure(); __sim(0.5);
}, [flags, extra]);
const maps = ['oasis', 'duneroad', 'redrock', 'dunecamp', 'sungate', 'buried1', 'buried2', 'buried3'];
if (want('boxes')) {
  await start(story);
  for (const m of maps) {
    const r = await pg.evaluate((m) => { const o = __game.screens.worldObj; const M = __maps[m]; o.load(m, M.edges?.s?.at?.[0] ?? 12, M.edges?.s?.at?.[1] ?? 7, 's'); __sim(0.4); return [o.key, o.itemSpots.length, o.itemSpots.join(' ')]; }, m);
    console.log('boxes', JSON.stringify(r));
  }
}
if (want('snap')) { // a photo by each desert landmark (no picture: just the album row and the set bonus)
  await start(story, { snaps: [] });
  for (const [m, x, y] of [['oasis', 15, 5], ['redrock', 14, 6], ['dunecamp', 16, 6], ['sungate', 13, 9]]) {
    const r = await pg.evaluate(([m, x, y]) => { const o = __game.screens.worldObj; o.load(m, x, y, 'n'); __sim(0.3); const b0 = __save.berries || 0; o.landmarkSnap(null); return [m, (__save.adv.snaps || []).join(','), (__save.berries || 0) - b0]; }, [m, x, y]);
    console.log('snap', JSON.stringify(r));
  }
}
const rec = async (n) => {
  const r = await pg.evaluate(() => { const S = __game.screens, R = S.records(); S.exploreCheck(); S.worldJournal('rec'); return [R.pc, R.ipc, R.spc, R.tpc, R.todo.filter((t) => /Desert|Fossil|Buried/.test(t.name)).map((t) => `${t.name} ${t.n}/${t.of}`).join('; ')]; });
  console.log(n, JSON.stringify(r));
  await pg.evaluate(() => { const el = [...document.querySelectorAll('.jr-head')].find((e) => e.textContent.includes('Amber')); el?.scrollIntoView(); });
  await shot(n);
};
if (want('rec')) {
  await start(['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive']);
  await rec('arrive');
  await start(story, { fossils: ['sandshell', 'sunbeetle', 'rayfin', 'mesatooth', 'tailspine'], snaps: ['sunwell', 'lift'], hats: ['pith', 'suncrown'] });
  await rec('mid');
  // everything: every desert trainer, box, favour, hat, fossil, landmark and critter
  const full = await pg.evaluate(() => {
    const F = {}, ms = Object.keys(__maps).filter((k) => __maps[k].sands);
    for (const k of ms) { for (const n of __maps[k].npcs || []) if (n.trainer) F[n.id] = true; if (!__maps[k].indoor && !__maps[k].noItems) { F[`it_${k}_0`] = true; F[`it_${k}_1`] = true; } }
    for (const k of ['caravan1', 'caravan2', 'caravan3']) { F[k + '_asked'] = true; F[k + '_done'] = true; }
    for (const k of ['buried_gate', 'buried_chest', 'buried_beam', 'buried_vault', 'cup_mirage', 'cup_canyon', 'cup_sandstorm']) F[k] = true;
    return F;
  });
  await start([...story], { fossils: ['sandshell', 'sunbeetle', 'rayfin', 'mesatooth', 'tailspine', 'sandclaw', 'thunderegg', 'hornskull', 'fanfin', 'stonecoil', 'trilobug', 'sunfeather'], snaps: ['sunwell', 'lift', 'dome', 'sungate'], hats: ['pith', 'sandgog', 'cactcrown', 'dunehat', 'suncrown', 'sunseeker', 'fossilhat'] });
  await pg.evaluate((full) => { Object.assign(__save.adv.flags, full); for (const id of ['scarabold', 'fennzap', 'siroccat', 'sizzlard', 'cactortle', 'humpdrop']) __save.unlocked.includes(id) || __save.unlocked.push(id); }, full);
  await rec('full');
  await pg.waitForTimeout(3500);
  console.log('wreath:', await pg.evaluate(() => [!!__save.adv.flags.sands_full, __save.adv.hats.includes('amberwreath'), document.querySelector('.toast')?.textContent || '']));
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
