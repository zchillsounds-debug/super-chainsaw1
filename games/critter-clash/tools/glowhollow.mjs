// node tools/glowhollow.mjs [WxH]: R847-R848 Glowcap Hollow. The crack east of the Sunwell Spring stays shut until Odette's journal
// is back, then leads in; Forager Pim asks for the six big glowcaps, each is picked by walking onto it, Pim gives the Glowcap Hat. Shots tools/out/hollow-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const story = ['intro', 'quest', 'crowned', 'ending', 'isle_arrive', 'sunstone', 'rail_open', 'sands_arrive', 'cup_mirage', 'post_mirage', 'spring_arrive', 'cup_sprout', 'rod'];
await pg.evaluate(([flags]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of flags) f[k] = true;
  __save.critters.cindermunch.level = 44;
  const now = new Date();
  __save.adv = { hats: [], flags: f, cnt: {}, seen: { route1: true, oasis: true }, hero: 'cindermunch', map: 'wellspring', x: 19, y: 8, dir: 'e', wellDay: now.toISOString().slice(0, 10), spawn: { map: 'oasis', x: 5, y: 11 }, sandstorm: false, rain: false, shift: { day: now.toISOString().slice(0, 10), h: (11 - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(0.5);
}, [story]);
const close = async () => { await pg.waitForTimeout(800); for (let k = 0; k < 14 && await pg.evaluate(() => !!document.querySelector('.wd-box:not(.wd-ask)')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } await pg.evaluate(() => __sim(1)); };
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/hollow-${n}-${tag}.png`, timeout: 120000 }); };
const W = () => pg.evaluate(() => { const o = __game.screens.worldObj; return o && `${o.key} ${o.hx},${o.hy}`; });
const say = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent.slice(0, 220));
const answer = async (i) => { await pg.waitForTimeout(600); await pg.evaluate(() => __sim(1.5)); const q = await say(); await pg.evaluate((i) => document.querySelectorAll('.wd-ask button')[i]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), i); return q; };
const walk = async (key, sec) => { await pg.keyboard.down(key); await pg.waitForTimeout(120); await pg.evaluate((s) => __sim(s), sec); await pg.keyboard.up(key); await pg.waitForTimeout(120); await pg.evaluate(() => __sim(0.8)); };
await close();
// the crack is shut until Odette has her journal back
await walk('ArrowRight', 1.2); await pg.evaluate(() => __sim(1));
console.log('no lamp:', await W(), '|', (await say() || '').slice(0, 90)); await close();
await pg.evaluate(() => { __save.adv.flags.odjournal_done = true; });
await walk('ArrowRight', 1.2); await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(2)); await pg.waitForTimeout(500);
console.log('through:', await W(), 'arrive:', await pg.evaluate(() => !!__save.adv.flags.hollow_arrive), '|', (await say() || '').slice(0, 90));
await shot('arrive'); await close();
const talk = async () => { await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 11; o.hy = 9; o.dir = 'e'; o.placeHero(); __sim(0.5); o.tapA = true; __sim(0.5); }); const ll = []; for (let k = 0; k < 6; k++) { await pg.waitForTimeout(400); await pg.evaluate(() => __sim(3)); const t = await say(); if (!t) break; ll.push(t.slice(0, 80)); await pg.evaluate(() => { __game.screens.worldObj.tapA = true; __sim(0.3); }); } return ll.join(' / '); };
console.log('mark before:', await pg.evaluate(() => __game.screens.worldObj.npcs.find((a) => a.n.id === 'pim_h')?.mark ? 'mark' : 'none'));
console.log('Pim 1:', await talk()); await close();
const caps = await pg.evaluate(() => __maps.glowhollow.glowcaps);
for (const [i, [x, y]] of caps.entries()) {
  await pg.evaluate(([x, y]) => { const o = __game.screens.worldObj; o.hx = x - 1; o.hy = y; o.dir = 'e'; o.placeHero(); __sim(0.3); }, [x, y]);
  // step onto it from the west if that's open, else from wherever is
  const ok = await pg.evaluate(([x, y]) => { const o = __game.screens.worldObj; for (const [dx, dy, d] of [[-1, 0, 'e'], [1, 0, 'w'], [0, -1, 's'], [0, 1, 'n']]) if (o.tile(x + dx, y + dy) === '.' || o.tile(x + dx, y + dy) === '"') { o.hx = x + dx; o.hy = y + dy; o.dir = d; o.placeHero(); return d; } return null; }, [x, y]);
  const key = { e: 'ArrowRight', w: 'ArrowLeft', s: 'ArrowDown', n: 'ArrowUp' }[ok];
  await walk(key, 0.25);
  if (i === 0) await shot('pick');
  console.log('cap', i, [x, y], 'from', ok, '->', await W(), '|', (await say() || '').slice(0, 70));
  await close();
}
console.log('mark ready:', await pg.evaluate(() => __game.screens.worldObj.npcs.find((a) => a.n.id === 'pim_h')?.mark ? 'mark' : 'none'));
console.log('Pim 2:', await talk()); await close();
console.log('hat:', await pg.evaluate(() => __save.adv.hats.join(',')), 'done:', await pg.evaluate(() => !!__save.adv.flags.gcap_done));
await pg.evaluate(() => { __save.adv.hat = 'glowcaphat'; const o = __game.screens.worldObj; o.hx = 8; o.hy = 6; o.dir = 's'; o.placeHero(); o.load?.('glowhollow', 8, 6, 's'); __sim(1.5); }); await shot('hat');
// back out west to the spring
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 1; o.hy = 6; o.dir = 'w'; o.placeHero(); __sim(0.3); });
await walk('ArrowLeft', 1); await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(1.5));
console.log('back:', await W());
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
