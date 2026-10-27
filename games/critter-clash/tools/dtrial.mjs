// node tools/dtrial.mjs [WxH] : D4, the Desert Trial: Elder Sabah at the Sun Gate, four battles in a row (each in its own desert arena, the last in a
// sandstorm), auto-won; then the weekly pay-out, the Sun Gate Laurel and the Champ page. Screenshots in tools/out/dt-*.
// (setup shared with tools/sunbird.mjs: Stargazer Nuri reads the vault mural (Dune Camp) → the Singing Dunes by day (silent stones)
// and by night (the Lark's Crown over the three stones) → sing all three → Aurelark rises → the legend battle (won; its Sunrise Song must
// fire once) → the dunes after. Env ONLY=nuri,dunes,battle, LOSE=1 loses the battle. Screenshots in tools/out/dt-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const only = (process.env.ONLY || '').split(',').filter(Boolean), want = (k) => !only.length || only.includes(k);
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/dt-${n}-${tag}.png`, timeout: 120000 }); };
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'redrock_arrive', 'cup_canyon', 'devils1', 'sunshard', 'dash_canyon', 'dunecamp_arrive', 'cup_sandstorm', 'devils2', 'citymap', 'sungate_arrive', 'baron', 'gate_open', 'buried_gate', 'buried_chest', 'buried_beam', 'buried_vault', 'buried2_arrive', 'buried3_arrive', 'post_sandstorm', 'post_mirage', 'buried_arrive', 'tower_bronze', 'glider', 'legend_moonwhal', 'legend_solmoth', 'dash_show', ...['sprout', 'thunder', 'grove', 'champion', 'midnight', 'sky', 'legend', 'coral', 'gale', 'caldera'].map((c) => 'cup_' + c)];
const start = (map, x, y, dir, hour, extra = []) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map, x, y, dir, flags: f, hats: [], spawn: { map: 'dunecamp', x: 5, y: 11 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, [...story, ...extra], hour]).then(() => close());
const say = async () => { await pg.waitForTimeout(1500); return pg.evaluate(() => { __sim(1); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 120); }); };
const close = async () => { for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(80); } await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1.5)); };
const face = (x, y, dir) => pg.evaluate(([x, y, dir]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = dir; o.placeHero(); __sim(0.3); return o.aHint(); }, [x, y, dir]);
const tapA = () => pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); });

await start('sungate', 15, 9, 'n', 11, ['sunbird1', 'sunbird_wake', 'legend_aurelark']);
console.log('Sabah hint:', await face(15, 9, 'n'));
for (let k = 0; k < 5; k++) {
  await tapA();
  const log = [];
  for (let step = 0; step < 60; step++) {
    await pg.waitForTimeout(400);
    const st = await pg.evaluate(() => {
      const S = __game.screens, wo = S.worldObj;
      if (S.mode === 'world' && wo) { const t = document.querySelector('.wd-box')?.textContent?.slice(0, 90); if (wo.dialog) { wo.dialog.next(); wo.dialog?.next(); return 'say: ' + t; } return wo.busy ? 'busy' : 'calm'; }
      if (S.mode === 'results') { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results'; }
      const bt = __game.battle;
      if (bt) { const ar = __game.arena.key, sand = !!bt.env?.sand; const p = bt.fighters[0], q = bt.fighters[1]; for (let i = 0; i < 90 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') q.hp = 1; __sim(0.5); } __sim(2); return `battle vs ${bt.fighters[1].def.name} in ${ar}${sand ? ' (sandstorm)' : ''}`; }
      return S.mode;
    });
    if (step === 2 && await pg.evaluate(() => !!__game.battle && __game.battle.phase !== 'done')) await shot('fight' + k);
    if (log[log.length - 1] !== st) log.push(st);
    if (st === 'calm' && step > 4) break;
  }
  console.log(`-- talk ${k + 1}:`, log.filter((x) => !x.startsWith('say')).join(' > '), '|', log.filter((x) => x.startsWith('say')).slice(-1)[0] || '');
  await face(15, 9, 'n');
}
console.log('paid:', await pg.evaluate(() => [__save.adv.dtrialWins, __save.adv.hats.includes('sunlaurel')]));
await pg.evaluate(() => __game.screens.worldJournal('champ'));
await pg.evaluate(() => { const el = [...document.querySelectorAll('.jr-head')].find((e) => e.textContent.includes('Desert')); el?.scrollIntoView(); });
await shot('champ');
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
