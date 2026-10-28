// node tools/caveitem.mjs [WxH]: R846 the grotto's glowcap. Drops a glowcap in the Sunwell Grotto, shoots it landed, has the player
// eat it (heal, 10 s of glowcap), drops a dripstone on the player (it should miss), then one on the CPU (it should hit).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=high');
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.screenshot({ path: `tools/out/glowcap-${w}x${h}-${n}.png`, timeout: 120000 }); };
const info = await pg.evaluate(() => {
  const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 30);
  g.startBattle(D('humpdrop'), D('scarabold'), { difficulty: 0.01, playerLevel: 30, cpuLevel: 30, arena: 'grotto' });
  for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
  g.paused = true;
  const B = g.battle, [p, c] = B.fighters;
  B.items.timer = 999; B.hazards.timer = 999; for (const f of B.fighters) { f.setState('dizzy'); f.dizzyT = 99; } p.x = -3; p.z = 1; c.x = 3; c.z = -1;
  B.items.spawn('glowcap'); const it = B.items.list[B.items.list.length - 1]; it.x = -0.4; it.z = 1.2;
  return { cave: B.items.cave };
});
const step = (s) => pg.evaluate((s) => { __game.paused = false; __sim(s); __game.paused = true; }, s);
await step(0.9); await shot('a-landed');
const r = await pg.evaluate(() => {
  const B = __game.battle, [p] = B.fighters; p.setState('idle'); p.hp = Math.round(p.maxHp * 0.5);
  const it = B.items.list.find((i) => i.kind === 'glowcap'); p.x = it.x; p.z = it.z;
  const hp0 = p.hp; __game.paused = false; __sim(0.05); __game.paused = true;
  return { heal: p.hp - hp0, glowcap: +(p.glowcap || 0).toFixed(1), glows: B.items.glows.length };
});
await step(0.5); await shot('b-glow');
const r2 = await pg.evaluate(() => {
  const B = __game.battle, [p, c] = B.fighters, H = B.hazards; p.invuln = c.invuln = 0; p.setState('idle'); c.setState('idle');
  const hp0 = p.hp, chp0 = c.hp;
  H.spawnAt(p.x, p.z); H.spawnAt(c.x, c.z); for (const q of H.list) q.t = 99;
  __game.paused = false; __sim(0.1); __game.paused = true;
  return { pLost: hp0 - p.hp, cLost: chp0 - c.hp };
});
await step(0.1); await shot('c-missed');
await pg.evaluate(() => { __game.paused = false; __sim(11); __game.paused = true; });
const r3 = await pg.evaluate(() => ({ glowsAfter: __game.battle.items.glows.length, glowcapAfter: __game.battle.fighters[0].glowcap }));
console.log(JSON.stringify({ ...info, ...r, ...r2, ...r3 }));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
