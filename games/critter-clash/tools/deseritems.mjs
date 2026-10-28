// node tools/deseritems.mjs [WxH] [arena]: R826 desert power-ups. Drops a water flask and a golden scarab in a desert arena,
// shoots them falling and landed, has the player pick the scarab up (shield on), then lands a blow on the shield and checks it ate it.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), arena = process.argv[3] || 'oasis';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=high');
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const tag = `${arena}-${w}x${h}`;
const shot = async (n) => { await pg.screenshot({ path: `tools/out/ditem-${tag}-${n}.png`, timeout: 120000 }); };
const info = await pg.evaluate((a) => {
  const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 30);
  g.startBattle(D('humpdrop'), D('sizzlard'), { difficulty: 0.01, playerLevel: 30, cpuLevel: 30, arena: a });
  for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
  g.paused = true;
  const B = g.battle, [p, c] = B.fighters;
  B.items.timer = 999; for (const f of B.fighters) { f.setState('dizzy'); f.dizzyT = 99; } p.x = -3.5; p.z = 1; c.x = 3.5; c.z = -1;
  B.items.spawn('flask'); B.items.spawn('scarab');
  const [f1, s1] = B.items.list.slice(-2);
  f1.x = -0.6; f1.z = 1.8; s1.x = 0.9; s1.z = 0.6;
  return { desert: B.items.desert };
}, arena);
const step = (s) => pg.evaluate((s) => { __game.paused = false; __sim(s); __game.paused = true; }, s);
await step(0.25); await shot('a-falling');
await step(0.6); await shot('b-landed');
const r = await pg.evaluate(() => {
  const B = __game.battle, [p, c] = B.fighters;
  p.setState('idle');
  p.hp = Math.round(p.maxHp * 0.5); p.burnT = 3; p.dizzy = 60;
  const got = (k) => { let it = B.items.list.find((i) => i.kind === k); if (!it) { B.items.spawn(k); it = B.items.list[B.items.list.length - 1]; } it.t = 1; return it; };
  const fl = got('flask'); p.x = fl.x; p.z = fl.z;
  const hp0 = p.hp; __game.paused = false; __sim(0.05); __game.paused = true;
  const out = { flaskHeal: p.hp - hp0, burn: p.burnT, dizzy: p.dizzy };
  const sc = got('scarab'); p.x = sc.x; p.z = sc.z; __game.paused = false; __sim(0.05); __game.paused = true;
  out.scarab = +p.scarab.toFixed(1); out.shields = B.items.shields.length; out.round = B.round; out.phase = B.phase; out.chp = c.hp;
  return out;
});
await step(0.4); await shot('c-shield');
const r2 = await pg.evaluate(() => {
  const B = __game.battle, [p, c] = B.fighters; p.invuln = 0; p.setState('idle'); const sc0 = p.scarab, sh0 = B.items.shields.map((s) => s.f === p ? 'p' : 'c').join(''); const hp0 = p.hp;
  const ok = B.applyHit(c, p, { dmg: 60, kb: 3, type: 'normal' });
  return { sc0, sh0, applied: ok, hpLost: hp0 - p.hp, scarabAfter: p.scarab, shieldsAfter: B.items.shields.length };
});
await step(0.15); await shot('d-shattered');
await pg.evaluate(() => { __game.paused = false; __sim(3); });
const r3 = await pg.evaluate(() => ({ shields: __game.battle.items.shields.length }));
console.log(JSON.stringify({ ...info, ...r, ...r2, ...r3 }));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
