// node tools/mesa.mjs [WxH] : Redrock Mesa. The rope lift before the Canyon Cup (tied up), after it (ride up), the mesa, its chest,
// and the ride back down. Screenshots in tools/out/me-*.
// (setup shared with tools/sunbird.mjs: Stargazer Nuri reads the vault mural (Dune Camp) → the Singing Dunes by day (silent stones)
// and by night (the Lark's Crown over the three stones) → sing all three → Aurelark rises → the legend battle (won; its Sunrise Song must
// fire once) → the dunes after. Env ONLY=nuri,dunes,battle, LOSE=1 loses the battle. Screenshots in tools/out/me-*.
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
const shot = async (n) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `tools/out/me-${n}-${tag}.png`, timeout: 120000 }); };
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

const pre = story.slice(0, story.indexOf('cup_canyon'));
await pg.evaluate(() => {});
await start('redrock', 14, 4, 'n', 11);
await pg.evaluate(() => { delete __save.adv.flags.cup_canyon; }); await pg.evaluate(() => { const o = __game.screens.worldObj; o.load('redrock', 14, 4, 'n'); __sim(0.5); });
console.log('closed lift:', await face(14, 4, 'n')); await tapA(); console.log('  ', await say()); await close();
await pg.evaluate(() => { __save.adv.flags.cup_canyon = true; });
console.log('Bo:', await face(13, 5, 'n')); await tapA(); console.log('  ', await say()); await close();
console.log('open lift:', await face(14, 4, 'n')); await tapA(); console.log('  ', await say()); await close();
await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(2)); await close();
console.log('up →', await pg.evaluate(() => { const o = __game.screens.worldObj; return [o.key, o.hx, o.hy, o.dir, o.aHint()].join(); }));
await shot('mesa');
console.log('chest:', await face(16, 3, 'n')); await tapA(); console.log('  ', await say()); await close();
console.log('chest flag:', await pg.evaluate(() => [!!__save.adv.flags.mesa_chest, __save.adv.hats.includes('mesaband')]));
await face(11, 4, 'n'); await shot('mesa-omar');
console.log('down lift:', await face(18, 9, 's')); await tapA(); await close();
await pg.waitForTimeout(1500); await pg.evaluate(() => __sim(2)); await close();
console.log('down →', await pg.evaluate(() => { const o = __game.screens.worldObj; return [o.key, o.hx, o.hy].join(); }));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
