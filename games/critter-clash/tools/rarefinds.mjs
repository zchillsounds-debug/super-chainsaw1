// node tools/rarefinds.mjs [WxH] : Chapter 3 (D3) rare finds on Dune Road: mirage hour (noon to three, clear: shinies x3 and
// shimmering mirage pools that fade as you walk up), sandstorm Siroccat swarms, desert-night Fennzap. Prints each wild list.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,post_mirage'.split(',').map((k) => [k, true]));
for (const [n, clock, storm] of [['noon', 9, false], ['mirage', 13, false], ['storm', 13, true], ['night', 22, false]]) {
  const r = await pg.evaluate(([flags, clock, storm]) => {
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
    __save.critters.cindermunch.level = 40;
    __save.adv = { hero: 'cindermunch', map: 'duneroad', x: 6, y: 7, dir: 's', flags, clock, rain: false, sandstorm: storm, spawn: { map: 'oasis', x: 12, y: 12 } };
    __game.screens.adventure(); __sim(1);
    const o = __game.screens.worldObj, c = {}; if (o.mirages?.length) { const Q = o.mirages[0]; o.hx = Math.round((Q.px - 1) / 2) ; o.hy = Math.round((Q.pz - 1) / 2) + 4; o.placeHero(); __sim(0.5); } for (const [id] of o.wildList()) c[id] = (c[id] || 0) + 1;
    return `lucky=${o.luckyNight()} mirages=${o.mirages?.length || 0} storm=${o.sandstorm} wild=${JSON.stringify(c)}`;
  }, [flags, clock, storm]);
  console.log(n.padEnd(7), r);
  await pg.waitForTimeout(3200); await pg.evaluate(() => __sim(0.3));
  await pg.screenshot({ path: `tools/out/rf-${n}-${tag}.png` });
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
