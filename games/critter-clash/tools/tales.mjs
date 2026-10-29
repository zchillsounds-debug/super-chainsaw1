// node tools/tales.mjs [WxH] : R904, Camp Elder Zahra's fireside tales at the Dune Camp. By day: her hint. After dark: hears all five tales
// (clearing A.taleDay between them, as if night by night), answers the first question wrong and the rest right, and checks the berries,
// the tale log and the Storyteller's Turban. Shots: the fire by her tent at night (tools/out/tale-fire-*), scenes of the first tale (tale-*)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const RIGHT = ['A golden feather', 'So travellers can follow it in the dark', 'The moon', 'The gentle sister', 'Every wish ever dropped in'];
const start = (hr) => pg.evaluate((hr) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,redrock_arrive,dunecamp_arrive,cup_sandstorm,devils2,citymap,salt1_asked,salt1_found,salt1_done,salt2_asked,salt2_found,salt2_done,salt3_asked,salt3_found,salt3_done'.split(',')) f[k] = true;
  const now = new Date();
  __save.adv = { hero: 'cindermunch', map: 'dunecamp', x: 7, y: 6, dir: 'n', flags: f, hats: [], spawn: { map: 'oasis', x: 14, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hr - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(1); const o = __game.screens.worldObj; o.hx = 7; o.hy = 6; o.dir = 'n'; o.placeHero(); __sim(0.3); return o.phase;
}, hr);
const text = () => pg.evaluate(() => document.querySelector('.wd-box')?.textContent?.replace(/▼/g, '').slice(0, 160));
const close = async () => { const out = []; for (let k = 0; k < 12 && await pg.evaluate(() => !!document.querySelector('.wd-box') && !document.querySelector('.wd-opts button')); k++) { out.push(await text()); await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next(); __sim(0.3); }); await pg.waitForTimeout(80); } return out; };
const opts = () => pg.evaluate(() => [...document.querySelectorAll('.wd-opts button')].map((q) => q.textContent));
const pick = (i) => pg.evaluate((i) => { document.querySelectorAll('.wd-opts button')[i].dispatchEvent(new PointerEvent('pointerdown')); __sim(0.2); }, i);
const mark = () => pg.evaluate(() => { const a = __game.screens.worldObj.npcs.find((q) => q.n.id === 'elder_c'); return a?.mark ? a.markKind : null; });
const zahra = () => pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 7; o.hy = 6; o.dir = 'n'; o.placeHero(); o.interact(); __sim(0.3); });
console.log('day phase', await start(12)); await pg.waitForTimeout(1200); await close();
console.log('day mark', await mark()); await zahra(); console.log('day:', (await close()).join(' / ').slice(0, 220)); console.log('day mark after', await mark());
console.log('night phase', await start(22)); await pg.waitForTimeout(1500); await close();
console.log('night mark', await mark());
await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 7; o.hy = 6; o.dir = 's'; o.placeHero(); __sim(0.5); }); await pg.waitForTimeout(500);
await pg.screenshot({ path: `tools/out/tale-fire-${tag}.png`, timeout: 120000 });
for (let n = 0; n < 5; n++) {
  await pg.evaluate(() => { delete __save.adv.taleDay; });
  await zahra(); await close(); const o1 = await opts(); await pick(0); await pg.waitForTimeout(300);
  if (!await pg.evaluate(() => !!document.querySelector('.arcade.tale'))) { console.log('tale did not open', o1); break; }
  const name = await pg.evaluate(() => document.querySelector('.arcade.tale .arc-top b').textContent);
  for (let s = 0; s < 4; s++) {
    if (n === 0 && (s === 0 || s === 2)) { await pg.evaluate(() => document.querySelector('.arcade-wrap').__arcade.step(4.5)); await pg.waitForTimeout(250); await pg.screenshot({ path: `tools/out/tale-${s}-${tag}.png`, timeout: 120000 }); }
    else await pg.evaluate(() => document.querySelector('.arcade-wrap').__arcade.step(0.8));
    await pg.evaluate(() => document.querySelector('.arcade-wrap').__arcade.tap());
  }
  await pg.waitForTimeout(500); await pg.evaluate(() => __sim(0.3)); await close();
  const q = await text(), o = await opts(), ri = o.findIndex((t) => RIGHT.includes(t));
  if (n === 0) { await pg.waitForTimeout(300); await pg.screenshot({ path: `tools/out/tale-q-${tag}.png`, timeout: 120000 }); }
  await pick(n === 0 ? (ri + 1) % 3 : ri); await pg.waitForTimeout(200);
  console.log(name, '| q:', q?.slice(0, 70), '| opts', o.join(' · '), '|', (await close()).join(' / ').slice(0, 200));
}
await zahra(); console.log('again:', (await close()).join(' / ').slice(0, 160), await opts()); 
console.log('save:', await pg.evaluate(() => JSON.stringify({ tales: __save.adv.tales, day: !!__save.adv.taleDay, hat: __save.adv.hats.includes('storyturban'), berries: __save.berries, n: __save.adv.cnt?.tale })));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
