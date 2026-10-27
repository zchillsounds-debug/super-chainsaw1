// node tools/sunbird.mjs [WxH] : D4, the Sun-Bird. Stargazer Nuri reads the vault mural (Dune Camp) → the Singing Dunes by day (silent stones)
// and by night (the Lark's Crown over the three stones) → sing all three → Aurelark rises → the legend battle (won; its Sunrise Song must
// fire once) → the dunes after. Env ONLY=nuri,dunes,battle, LOSE=1 loses the battle. Screenshots in tools/out/sb-*.
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
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/sb-${n}-${tag}.png`, timeout: 120000 }); };
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
if (want('nuri')) {
  await start('dunecamp', 28, 5, 'e', 11, []);
  console.log('Nuri hint:', await face(29, 4, 'e'), '| goal:', await pg.evaluate(() => __game.screens.goalLine(__save.adv.flags)));
  await shot('nuri');
  await tapA(); console.log('  ', await say()); await close();
  console.log('sunbird1:', await pg.evaluate(() => !!__save.adv.flags.sunbird1), '| Nuri still here:', await pg.evaluate(() => !!__game.screens.worldObj.npcs?.find((n) => n.d?.id === 'star_c' || n.id === 'star_c')));
  const r = await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 30; o.hy = 5; o.dir = 'e'; o.placeHero(); o.tryMove?.('e'); __sim(2.5); return [o.key, o.hx, o.hy]; });
  console.log('east edge →', JSON.stringify(r));
}
if (want('dunes')) {
  for (const [n, hr] of [['day', 11], ['night', 22]]) {
    await start('singing', 10, 6, 'n', hr, ['sunbird1']);
    await shot('dunes-' + n);
    console.log(n, 'stone hint:', await face(6, 3, 'n')); await tapA(); console.log('  ', await say()); await close();
    console.log(n, 'Nuri:', await face(10, 6, 'n')); await tapA(); console.log('  ', await say()); await close();
  }
  // (still night) sing all three
  for (const [x, y] of [[6, 2], [22, 5], [19, 10]]) { await face(x, y + 1, 'n'); await tapA(); console.log('sing', x, y, ':', await say()); if (x === 22) await shot('dunes-sung2'); await close(); }
  await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(2)); await close();
  console.log('wake:', await pg.evaluate(() => !!__save.adv.flags.sunbird_wake), '| marks:', await pg.evaluate(() => __game.screens.goalLine(__save.adv.flags)));
  await face(13, 10, 'n'); await shot('dunes-awake');
}
if (want('battle')) {
  await start('singing', 13, 8, 'n', 22, ['sunbird1', 'sunbird_wake']);
  console.log('Aurelark hint:', await face(13, 8, 'n'));
  await tapA();
  const log = [];
  for (let step = 0; step < 60; step++) {
    await pg.waitForTimeout(400);
    const st = await pg.evaluate((LOSE) => {
      const S = __game.screens, wo = S.worldObj;
      if (S.mode === 'world' && wo) { const t = document.querySelector('.wd-box')?.textContent?.slice(0, 70); if (wo.dialog) { wo.dialog.next(); wo.dialog?.next(); return 'say: ' + t; } return wo.busy ? 'busy' : 'calm'; }
      if (S.mode === 'results') { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results'; }
      const bt = __game.battle;
      if (bt) { const p = bt.fighters[LOSE ? 1 : 0], q = bt.fighters[LOSE ? 0 : 1]; let rose = false; for (let i = 0; i < 90 && bt.phase !== 'done'; i++) { p.hp = p.maxHp; if (bt.phase === 'fight') q.hp = 1; __sim(0.5); rose ||= !!bt.fighters[1].endured; } __sim(2); return `battle vs ${bt.fighters[1].def.name} (Lv ${bt.fighters[1].lv ?? '?'}, shiny ${!!bt.fighters[1].def.skin}) sunrise=${rose}`; }
      return S.mode;
    }, !!process.env.LOSE);
    if (step === 3 && await pg.evaluate(() => !!__game.battle)) await shot('battle');
    if (log[log.length - 1] !== st) log.push(st);
    if (st === 'calm' && step > 4) break;
  }
  console.log(log.join('\n'));
  console.log('legend:', await pg.evaluate(() => [!!__save.adv.flags.legend_aurelark, __save.unlocked.includes('aurelark')]), '| goal:', await pg.evaluate(() => __game.screens.goalLine(__save.adv.flags)));
  await shot('after');
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
