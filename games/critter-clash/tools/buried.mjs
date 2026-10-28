// node tools/buried.mjs [WxH] : Chapter 3 (D3), the Buried City's lower floors. From the Sun Hall's chest room down the stairs into
// the Hall of Mirrors (arrival scene), turn the five mirrors that matter with A (the beam re-traces each time; the sun disc lights,
// the gate sinks), on into the dark Starless Vault (arrival scene), walk the maze to the chest (Sun-Seeker's Hat) and read the mural.
// ONLY=sun (R809): the vault's own thread of sun: five mirrors up through the whole vault light it up and open the sun alcove (Mirror Circlet).
// Env ONLY=mirrors,vault,sun. Screenshots in tools/out/bc-*.
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
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/bc-${n}-${tag}.png`, timeout: 120000 }); };
const all = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'cup_canyon', 'cup_sandstorm', 'devils1', 'sunshard', 'dash_canyon', 'citymap', 'baron', 'gate_open', 'buried_arrive', 'buried_gate', 'buried_chest'];
const start = (map, x, y, dir, extra = []) => pg.evaluate(([map, x, y, dir, flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 42;
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map, x, y, dir, flags: f, hats: ['suncrown'], hat: 'suncrown', spawn: { map: 'oasis', x: 12, y: 12 }, shift: { day: now.toISOString().slice(0, 10), h: (11 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [map, x, y, dir, [...all, ...extra]]);
const W = () => pg.evaluate(() => { const o = __game.screens.worldObj; return o && `${o.key} ${o.hx},${o.hy} dlg=${!!document.querySelector('.wd-box')}`; });
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(150); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(150); await pg.evaluate(() => __sim(1.2)); };
const close = async () => { for (let k = 0; k < 8 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(80); } };
if (want('mirrors')) {
  // up the stairs behind the Sun Hall's chest: the Hall of Mirrors' arrival scene
  await start('buried1', 10, 1, 'n');
  await walk('ArrowUp', 0.4); await pg.waitForTimeout(2000); await pg.evaluate(() => __sim(2.5));
  console.log('stairs:', await W(), 'arrive:', await pg.evaluate(() => !!__save.adv.flags.buried2_arrive));
  await shot('mirrors-arrive'); await close();
  // the gate bumps while it's shut
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.load('buried2', 10, 5, 'n'); __sim(0.5); });
  await walk('ArrowUp', 0.5); console.log('shut gate:', await W());
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.load('buried2', 9, 13, 'n'); __sim(0.8); });
  await shot('mirrors-start');
  // turn the five that matter (stand beside each, face it, A)
  for (const [x, y, d] of [[5, 10, 'n'], [5, 5, 's'], [12, 5, 's'], [12, 12, 'n'], [15, 12, 'n']]) {
    await pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = d; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.8); }, [x, y, d]);
    console.log(' turned', x, y, d, await pg.evaluate(() => { const P = __game.screens.worldObj.puz; return P.mirrors.map((m) => m.o).join('') + ' end ' + P.beamEnd.map((v) => v.toFixed(1)).join(',') + ' lit ' + P.disc.lit; }));
  }
  console.log('gate flag:', await pg.evaluate(() => !!__save.adv.flags.buried_beam), 'saved:', await pg.evaluate(() => JSON.stringify(__save.adv.mirrors)));
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 10; o.hy = 9; o.dir = 'n'; o.placeHero(); __sim(1); }); await close();
  await shot('mirrors-solved');
  // reload: the mirrors and the open gate stay
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.load('buried2', 10, 5, 'n'); __sim(0.8); });
  console.log('reload lit:', await pg.evaluate(() => __game.screens.worldObj.puz.disc.lit));
  await walk('ArrowUp', 2.0); await pg.waitForTimeout(2000); await pg.evaluate(() => __sim(2.5));
  console.log('north:', await W(), 'vault arrive:', await pg.evaluate(() => !!__save.adv.flags.buried3_arrive));
  await shot('vault-arrive'); await close();
}
if (want('vault')) {
  await start('buried3', 10, 13, 'n', ['buried_beam', 'buried2_arrive', 'buried3_arrive']);
  await shot('vault-in');
  // BFS through the dark maze to the chest, walking it step by step
  const path = await pg.evaluate(() => { const o = __game.screens.worldObj, prev = new Map([['10,13', null]]), q = [[10, 13]];
    while (q.length) { const [x, y] = q.shift(); if (x === 8 && y === 2) break; for (const [dx, dy, d] of [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']]) { const k = (x + dx) + ',' + (y + dy); if (prev.has(k) || !o.walkable(x + dx, y + dy) || o.solid.has(k)) continue; prev.set(k, [x, y, d]); q.push([x + dx, y + dy]); } }
    const out = []; let k = '8,2'; while (prev.get(k)) { const [x, y, d] = prev.get(k); out.unshift(d); k = x + ',' + y; } return out; });
  console.log('path', path.length, path.join(''));
  const keys = { n: 'ArrowUp', s: 'ArrowDown', e: 'ArrowRight', w: 'ArrowLeft' };
  for (const d of path) { await pg.keyboard.down(keys[d]); await pg.waitForTimeout(60); await pg.evaluate(() => __sim(0.2)); await pg.keyboard.up(keys[d]); await pg.evaluate(() => __sim(0.15)); if (await pg.evaluate(() => __game.screens.mode !== 'world')) { console.log(' interrupted at', await W(), await pg.evaluate(() => __game.screens.mode)); break; } if (await pg.evaluate(() => !!document.querySelector('.wd-box'))) { console.log(' dialog at', await W()); await close(); } }
  await pg.evaluate(() => __sim(0.6));
  console.log('at chest:', await W());
  await shot('vault-maze');
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.4); });
  console.log('chest:', await pg.evaluate(() => [!!__save.adv.flags.buried_vault, (__save.adv.hats || []).includes('sunseeker')].join(',')));
  await shot('vault-chest'); await close();
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 11; o.hy = 2; o.dir = 'n'; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.4); });
  console.log('mural:', await pg.evaluate(() => (__sim(3), document.querySelector('.wd-box')?.textContent.slice(0, 80))));
  await shot('vault-mural'); await close();
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 9; o.hy = 3; o.dir = 'n'; o.placeHero(); __sim(1); });
  await shot('vault-room');
}
if (want('sun')) {
  await start('buried3', 15, 13, 'e', ['buried_beam', 'buried2_arrive', 'buried3_arrive', 'buried_vault']);
  await shot('sun-start');
  for (const [x, y, d] of [[15, 13, 'e'], [16, 10, 'n'], [4, 8, 's'], [4, 7, 'n'], [14, 5, 's']]) {
    await pg.evaluate(([x, y, d]) => { const o = __game.screens.worldObj; o.hx = x; o.hy = y; o.dir = d; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.8); }, [x, y, d]);
    console.log(' turned', x, y, d, await pg.evaluate(() => { const P = __game.screens.worldObj.puz; return P.mirrors.map((m) => m.o).join('') + ' end ' + P.beamEnd.map((v) => v.toFixed(1)).join(',') + ' lit ' + P.disc.lit; }));
  }
  await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(0.5));
  console.log('solved:', await pg.evaluate(() => !!__save.adv.flags.vault_lit), 'say:', await pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 80)));
  await shot('sun-solved'); await close(); await pg.waitForTimeout(2500); await pg.evaluate(() => __sim(1.5));
  console.log('reloaded lit:', await pg.evaluate(() => { const o = __game.screens.worldObj; return `${o.key} dark=${!!o.M.dark} sunI=${o.M.mood.sunI} gate=${o.puz.gates[0].open}`; }));
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 10; o.hy = 6; o.dir = 'n'; o.placeHero(); __sim(1); });
  await shot('sun-lit');
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 14; o.hy = 2; o.dir = 'e'; o.placeHero(); __sim(0.3); o.tapA = true; __sim(0.4); });
  console.log('alcove chest:', await pg.evaluate(() => [!!__save.adv.flags.vault_alcove, (__save.adv.hats || []).includes('mirrorcirclet'), document.querySelector('.wd-box')?.textContent.slice(0, 60)].join(' | ')));
  await close(); await pg.evaluate(() => { const o = __game.screens.worldObj; __save.adv.hat = 'mirrorcirclet'; o.load('buried3', 12, 2, 'w'); __sim(1.5); });
  await shot('sun-alcove');
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
