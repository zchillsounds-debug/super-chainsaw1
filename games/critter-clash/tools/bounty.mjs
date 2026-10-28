// node tools/bounty.mjs [WxH] : R828: the Caravan Guild's bounty board in Sunwell Oasis. Reads the board (two desert jobs + a WANTED
// outlaw), checks the outlaw stands on its map, beats it (forced win), finishes the jobs by counter, collects pay and a Guild Seal;
// with five seals the Caravan Guild Fez. Shots tools/out/bounty-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'cup_canyon', 'dash_canyon', 'cup_sandstorm', 'cup_sprout'];
const start = (map, x, y, dir, hour = 11) => pg.evaluate(([map, x, y, dir, flags, hour]) => {
  const keep = __save.adv?.cnt ? __save.adv : null;
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { ...(keep || { hats: [], flags: f, cnt: {}, seen: { route1: true, oasis: true, duneroad: true, redrock: true, flats: true, dunecamp: true } }), hero: 'cindermunch', map, x, y, dir, spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false, shift: { day: now.toISOString().slice(0, 10), h: (hour - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, story, hour]).then(close);
const close = async () => { await pg.waitForTimeout(1000); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } await pg.evaluate(() => __sim(1.5)); };
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/bounty-${n}-${tag}.png`, timeout: 120000 }); };
const talk = async (x, y, dir, snap) => { await pg.evaluate(([x, y, dir]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = dir; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.3); }, [x, y, dir]); const t = []; await pg.waitForTimeout(500); for (let k = 0; k < 10; k++) { const l = await pg.evaluate(() => { __sim(1.5); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 400); }); if (!l) { await pg.waitForTimeout(400); if (!(await pg.evaluate(() => !!document.querySelector('.wd-box')))) break; continue; } t.push(l); if (snap && /GUILD|done/.test(l)) { await shot(snap); snap = null; } await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.4); }); } await close(); return t.join(' / '); };
await start('oasis', 21, 7, 'n');
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 23; o.hy = 7; o.dir = 'n'; o.placeHero(); __sim(1.5); });
await shot('board');
console.log('board 1:', await talk(23, 6, 'n', 'read'));
const W = await pg.evaluate(() => { const b = __save.adv.bounty; return { list: b.list, flag: Object.keys(__save.adv.flags).length }; });
console.log('jobs', JSON.stringify(W));
// where's the outlaw?
for (const m of ['duneroad', 'redrock', 'flats', 'dunecamp']) {
  await start(m, 5, 5, 's');
  const o = await pg.evaluate(() => { const o = __game.screens.worldObj, a = o.npcs.find((q) => q.n.id === 'wanted'); return a ? { x: a.x, y: a.y, name: a.n.name } : null; });
  if (!o) continue;
  console.log('outlaw on', m, JSON.stringify(o));
  await pg.evaluate(([x, y]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y + 1; o.dir = 'n'; o.placeHero(); __sim(1.5); }, [o.x, o.y]);
  await shot('outlaw');
  await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.4); });
  for (let k = 0; k < 6 && !(await pg.evaluate(() => !!__game.battle)); k++) await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.8); });
  await pg.waitForFunction(() => !!__game.battle, null, { timeout: 30000 }).catch(() => {});
  console.log('fight:', await pg.evaluate(() => { const B = __game.battle; return B ? `${B.fighters[1].def.name} title ${B.trainer?.title} arena ${__game.arena.key}` : 'no battle'; }));
  await pg.evaluate(() => { __sim(3); }); await shot('fight');
  await pg.evaluate(() => { const bt = __game.battle, p = bt.fighters[0], q = bt.fighters[1]; for (let i = 0; i < 40 && bt.phase !== 'done'; i++) { if (bt.phase === 'fight') { q.hp = 0; bt.onKO(p, q); } __sim(1); } });
  for (let k = 0; k < 10 && await pg.evaluate(() => __game.screens.mode !== 'world'); k++) { await pg.waitForTimeout(800); await pg.evaluate(() => { document.querySelector('.recruit .btn, .modal-wrap .btn')?.click(); [...document.querySelectorAll('button')].find((x) => /Continue/.test(x.textContent))?.click(); }); }
  await close();
  console.log('after win: outlaw still here?', await pg.evaluate(() => __game.screens.worldObj.npcs.some((q) => q.n.id === 'wanted')), 'flag', await pg.evaluate(() => Object.keys(__save.adv.flags).filter((k) => k.startsWith('wanted_')).join(',')));
  break;
}
const b0 = await pg.evaluate(() => __save.berries || 0);
await pg.evaluate(() => { const c = __save.adv.cnt; for (const k of ['sandwild', 'sandfish', 'sanddig', 'lantern', 'sled']) c[k] = (c[k] || 0) + 3; __save.adv.flags['lampduel_x'] = true; __save.adv.flags['champre_x'] = true; __save.adv.seals = 4; });
await start('oasis', 23, 6, 'n');
console.log('board 2:', await talk(23, 6, 'n', 'paid'));
console.log('berries +', (await pg.evaluate(() => __save.berries || 0)) - b0, 'seals', await pg.evaluate(() => __save.adv.seals), 'fez', await pg.evaluate(() => __save.adv.hats.includes('guildfez')));
console.log('board 3:', (await talk(23, 6, 'n')).slice(0, 200));
await pg.evaluate(() => { __save.adv.hat = 'guildfez'; }); await start('oasis', 22, 7, 's'); await pg.evaluate(() => __sim(1)); await shot('fez');
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
