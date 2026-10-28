// node tools/oasisfish.mjs [WxH] : R809/R810: four catches in the Sunwell pool (the oasis fish, forced rolls), Pool Angler Layla's hat, the
// Amber Sands Records rows and the fish album; then Quick Battle's Match Setup with the three desert stadiums unlocked. ONLY=fish,quick.
// Screenshots in tools/out/of-*.
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
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/of-${n}-${tag}.png`, timeout: 120000 }); };
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

if (want('fish')) {
  await start('oasis', 16, 9, 'w', 11, ['rod']);
  console.log('pool hint:', await face(16, 9, 'w'));
  const fish = async (q) => { await pg.evaluate((q) => { const o = __game.screens.worldObj, R = Math.random; let i = 0; Math.random = () => (i < q.length && /\.reel /.test(new Error().stack.split('\n')[2] || '') ? q[i++] : R()); o.fishing = { rod: new o.hero.root.constructor() }; o.hero.root.add(o.fishing.rod); o.reel('catch'); Math.random = R; }, q); return say(); };
  for (const q of [[0.6, 0.5, 0.0, 0.3], [0.6, 0.5, 0.4, 0.3], [0.6, 0.5, 0.8, 0.3], [0.6, 0.05, 0.9]]) { console.log('catch:', await fish(q)); await close(); }
  console.log('oasis fish:', await pg.evaluate(() => Object.keys(__save.adv.fishLog.sp).join(', ')));
  console.log('Layla hint:', await face(18, 9, 'w'));
  await tapA(); console.log('Layla:', await say()); await shot('layla'); await close();
  console.log('hat:', await pg.evaluate(() => __save.adv.hats.includes('palmangler')), 'berries', await pg.evaluate(() => __save.berries));
  await pg.evaluate(() => __game.screens.worldJournal('rec'));
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { const el = [...document.querySelectorAll('.jr-bar, li')].find((e) => e.textContent.includes('Oasis fish')); el?.scrollIntoView({ block: 'center' }); });
  await shot('rec');
  console.log('rec rows:', await pg.evaluate(() => [...document.querySelectorAll('li')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /Oasis fish|Desert landmarks|Kinds of fish/.test(t)).join(' | ')));
  await pg.evaluate(() => __game.screens.worldJournal('fish'));
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { const el = [...document.querySelectorAll('.jr-head')].find((e) => e.textContent.includes('Oasis')); el?.scrollIntoView(); });
  await shot('album');
}
if (want('quick')) {
  await pg.evaluate(() => { __save.adv = { flags: { cup_mirage: true, cup_canyon: true, cup_sandstorm: true } }; __game.screens.title(); });
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { const S = __game.screens; S.ctx = { kind: 'quick' }; S.select(); S.sel = 0; S.matchSheet(false); });
  await pg.waitForTimeout(800);
  console.log('arenas:', await pg.evaluate(() => [...document.querySelectorAll('.tp-ar')].map((b) => b.textContent).join(' | ')));
  await shot('setup');
  await pg.evaluate(() => [...document.querySelectorAll('.tp-ar')].find((b) => /Canyon/.test(b.textContent))?.click());
  await pg.evaluate(() => [...document.querySelectorAll('.train-pick button')].find((b) => /Fight|Start|Go/i.test(b.textContent))?.click());
  await pg.waitForFunction(() => !!__game.battle, null, { timeout: 30000 }).catch(() => {});
  console.log('quick battle arena:', await pg.evaluate(() => __game.arena?.key + ' ' + !!__game.battle));
  await pg.evaluate(() => __sim(4)); await shot('qb');
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
