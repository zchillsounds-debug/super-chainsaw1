// node tools/caravan.mjs [WxH] : Chapter 3 (D3), the Sunwell caravan chain: Hakim (Sunwell Oasis) → Potter Ines (Redrock Canyon)
// → Weaver Tamar (the Dune Camp) → back to Hakim, who gives a shiny Humpdrop. Checks the ❗ marks and the Journal favours list.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const flags = Object.fromEntries('intro,quest,crowned,ending,isle_arrive,sunstone,rail_open,sands_arrive,cup_mirage,post_mirage,redrock_arrive,cup_canyon,devils1,sunshard,dash_canyon,dunecamp_arrive'.split(',').map((k) => [k, true]));
await pg.evaluate((flags) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  __save.critters.cindermunch.level = 40;
  __save.adv = { hero: 'cindermunch', map: 'oasis', x: 3, y: 12, dir: 'w', flags, clock: 12, rain: false, sandstorm: false, spawn: { map: 'oasis', x: 12, y: 12 } };
  __game.screens.adventure(); __sim(0.3);
}, flags);
const go = (m, x, y, d) => pg.evaluate(([m, x, y, d]) => { const wo = __game.screens.worldObj; wo.load(m, x, y, d); wo.dir = d; __sim(1); }, [m, x, y, d]);
const talk = (id) => pg.evaluate((id) => { const wo = __game.screens.worldObj, a = wo.npcs.find((q) => q.n.id === id); if (!a) return 'no ' + id; wo.talk(a); const out = []; for (let i = 0; i < 12 && wo.dialog; i++) { out.push(document.querySelector('.wd-box')?.textContent?.slice(0, 70)); wo.dialog.next(); } return out.join(' | '); }, id);
const marks = () => pg.evaluate(() => { const wo = __game.screens.worldObj; return wo.npcs.filter((a) => a.mark?.visible || a.bang?.visible).map((a) => a.n.id).join(',') || '-'; });
await go('oasis', 3, 12, 'w'); console.log('oasis marks:', await marks());
await pg.screenshot({ path: 'tools/out/cv-hakim.png' });
console.log('Hakim:', await talk('hakim_o'));
await go('redrock', 10, 7, 'n'); console.log('redrock marks:', await marks());
console.log('Ines (deliver):', await talk('potter_r'));
console.log('Ines (next):', await talk('potter_r'));
await go('dunecamp', 22, 6, 'n');
console.log('Tamar (deliver):', await talk('weaver_c'));
console.log('Tamar (next):', await talk('weaver_c'));
await go('oasis', 3, 12, 'w');
console.log('Hakim (deliver):', await talk('hakim_o'));
console.log('Hakim (after):', await talk('hakim_o'));
console.log('done:', await pg.evaluate(() => ['caravan1_done', 'caravan2_done', 'caravan3_done'].map((k) => k + '=' + !!__save.adv.flags[k]).join(' ')), 'shiny humpdrop:', await pg.evaluate(() => (__save.shinies || []).includes('humpdrop') && __save.unlocked.includes('humpdrop')));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
