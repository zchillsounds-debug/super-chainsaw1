// node tools/nightmarket.mjs [WxH] : R820: Sunwell Oasis's night market. HOURS=21,18,11: the lanterns round the pool (lit after dark),
// Fortune Teller Zara (where today's Alpha is, the Mirage Merchant's curio) and Lantern Maker Yusra (one sky lantern a night; seven → a hat),
// neither there by day. Shots tools/out/market-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_sprout'];
const start = (map, x, y, dir, hour) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  const keep = __save.adv?.cnt ? __save.adv : null;
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { ...(keep || { hats: ['mirageturban'], flags: f, seen: { route1: true, oasis: true, duneroad: true } }), hero: 'cindermunch', map, x, y, dir, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, story, hour]).then(close);
const close = async () => { await pg.waitForTimeout(1200); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(80); } await pg.evaluate(() => __sim(1.5)); };
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/market-${n}-${tag}.png`, timeout: 120000 }); };
const talk = async (x, y, dir, snap) => { await pg.evaluate(([x, y, dir]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = dir; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); }, [x, y, dir]); const t = []; for (let k = 0; k < 10; k++) { const l = await pg.evaluate(() => { __sim(1.5); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 150); }); if (!l) break; t.push(l); if (snap && /drifts/.test(l)) await shot(snap); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.4); }); } await close(); return t.join(' / '); };
for (const hr of (process.env.HOURS || '21,18,11').split(',').map(Number)) {
  await start('oasis', 12, 12, 'n', hr);
  console.log(hr + 'h:', await pg.evaluate(() => { const o = __game.screens.worldObj; return `phase ${o.phase} zara ${o.npcs.some((a) => a.n.id === 'zara_o')} yusra ${o.npcs.some((a) => a.n.id === 'yusra_o')}`; }));
  await pg.evaluate(() => __sim(2)); await shot('h' + hr);
  if (hr === 21) {
    console.log('Zara:', await talk(7, 9, 'e'));
    for (let n = 0; n < 8; n++) {
      if (n) await pg.evaluate(() => { __save.adv.lanternNight = 'x'; });
      const t = await talk(18, 10, 'w', n === 0 ? 'lantern' : null);
      if (n === 0 || n >= 6) console.log(`Yusra ${n + 1}:`, t.slice(0, 400));
    }
    // R825: Lamplight Duelist Kamal: one duel a night (forced win), then 'come back tomorrow night'
    await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 19; o.hy = 7; o.dir = 'w'; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); });
    for (let k = 0; k < 6 && !(await pg.evaluate(() => !!__game.battle)); k++) await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.8); });
    await pg.waitForFunction(() => !!__game.battle, null, { timeout: 30000 }).catch(() => {});
    console.log('duel:', await pg.evaluate(() => { const B = __game.battle; return B ? `${B.fighters[1].def.name} Lv ${B.opts?.cpuLevel ?? '?'} env ${JSON.stringify(B.env)} arena ${__game.arena.key}` : 'no battle'; }));
    await pg.evaluate(() => { __sim(3); }); await shot('duel');
    const b0 = await pg.evaluate(() => __save.berries || 0);
    console.log('  battle end:', await pg.evaluate(() => { const bt = __game.battle, p = bt.fighters[0], q = bt.fighters[1]; for (let i = 0; i < 40 && bt.phase !== 'done'; i++) { if (bt.phase === 'fight') { q.hp = 0; bt.onKO(p, q); } __sim(1); } return bt.phase + ' ' + __game.screens.mode; }));
    for (let k = 0; k < 10 && await pg.evaluate(() => __game.screens.mode !== 'world'); k++) { await pg.waitForTimeout(800); const m = await pg.evaluate(() => { const S = __game.screens; if (S.mode === 'results') { const st = document.querySelector('.streak')?.textContent.slice(0, 80); document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); return 'results: ' + st; } return S.mode; }); if (m?.startsWith('results')) console.log(' ', m); }
    await close();
    await pg.evaluate(() => { __game.autoplay = false; });
    console.log('duel flag', await pg.evaluate(() => Object.keys(__save.adv.flags).filter((k) => k.startsWith('lampduel_')).join(',')), 'berries +', (await pg.evaluate(() => __save.berries || 0)) - b0, 'mode', await pg.evaluate(() => __game.screens.mode));
    if (await pg.evaluate(() => __game.screens.mode === 'world')) console.log('Kamal again:', await talk(19, 7, 'w'));
    console.log('hat:', await pg.evaluate(() => __save.adv.hats.includes('lanternhat')), 'count', await pg.evaluate(() => __save.adv.cnt.lantern));
    await pg.evaluate(() => { __save.adv.hat = 'lanternhat'; }); await start('oasis', 7, 10, 's', 21); await pg.evaluate(() => __sim(1)); await shot('hat');
  }
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
