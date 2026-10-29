// node tools/melonwatch.mjs [WxH] : R883, MELON WATCH on Redrock Mesa. Day: Lina's hint; night: the ask, a bot that steps onto each
// Fennzap as it pops (score), the result, the berries/hat; a shot of the patch by day, mid-watch, and the Melon Rind Helmet. Shots tools/out/mw-*.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high' + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
const shot = async (n) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `tools/out/mw-${n}-${tag}.png`, timeout: 120000 }); };
const start = (hr, hats = []) => pg.evaluate(([hr, hats]) => {
  Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, news: [] });
  const f = {}; for (const k of 'intro,quest,crowned,ending,sunstone,rail_open,sands_arrive,cup_mirage,cup_canyon,dash_canyon,redrock_arrive'.split(',')) f[k] = true;
  const now = new Date(); __save.critters.cindermunch.level = 40;
  __save.adv = { hero: 'cindermunch', map: 'mesa', x: 7, y: 6, dir: 'n', flags: f, hats, hat: hats[0], spawn: { map: 'oasis', x: 14, y: 12 }, sandstorm: false, shift: { day: now.toISOString().slice(0, 10), h: (hr - now.getHours() + 24) % 24 } };
  __game.screens.adventure(); __sim(1); const o = __game.screens.worldObj; const L = o.npcs.find((n) => n.n?.id === 'lina_m'); if (L) { L.x = 7; L.y = 5; o.setPos(L); } return o.phase;
}, [hr, hats]);
const close = async () => { for (let k = 0; k < 12 && await pg.evaluate(() => !!document.querySelector('.wd-box')); k++) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.6); }); await pg.waitForTimeout(60); } };
const text = async () => { await pg.waitForTimeout(900); return pg.evaluate(() => { __sim(1); return document.querySelector('.wd-box')?.textContent.replace('▼', '').slice(0, 140); }); };
console.log('day phase', await start(12));
await shot('day');
await pg.evaluate(() => { __sim(1.5); const o = __game.screens.worldObj; o.hx = 7; o.hy = 6; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.3); });
console.log(' day talk:', await text()); await close();
for (const mode of ['bot', 'idle']) {
  console.log('night phase', await start(22));
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 7; o.hy = 6; o.dir = 'n'; o.placeHero(); o.tapA = true; __sim(0.3); });
  console.log(' ask:', await text());
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.dialog?.next?.(); __sim(0.5); });
  console.log(' started:', await pg.evaluate(() => !!__game.screens.worldObj.mw), await pg.evaluate(() => document.querySelector('.wd-melon')?.textContent));
  if (!(await pg.evaluate(() => !!__game.screens.worldObj.mw))) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.tapA = true; __sim(0.3); }); await pg.waitForTimeout(400); console.log(' dlg:', await pg.evaluate(() => document.querySelector('.wd-box')?.innerHTML.slice(0, 300))); break; }
  await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 3; o.hy = 4; o.placeHero(); });
  let shotDone = false;
  for (let k = 0; k < 400 && await pg.evaluate(() => !!__game.screens.worldObj.mw); k++) {
    await pg.evaluate((mode) => { // the bot: reacts 0.45 s after a pop, then walks 0.22 s a tile (Manhattan), like a quick thumb on a phone
      const o = __game.screens.worldObj, U = o.mw; __sim(0.1); if (!U || mode !== 'bot' || U.go > 0) return;
      const B = (window.__bot ||= { busy: 0 }); if (B.busy > 0) { B.busy -= 0.1; if (B.busy <= 0 && B.to) { o.hx = B.to[0]; o.hy = B.to[1]; o.placeHero(); B.to = null; } return; }
      const f = U.foxes.filter((q) => q.life > 0 && q.t >= 0.45).sort((a, c) => (Math.abs(a.x - o.hx) + Math.abs(a.y - o.hy)) - (Math.abs(c.x - o.hx) + Math.abs(c.y - o.hy)))[0];
      if (f) { const d = Math.abs(f.x - o.hx) + Math.abs(f.y - o.hy); if (d * 0.22 < f.life) { B.busy = d * 0.22; B.to = [f.x, f.y]; } }
    }, mode);
    if (!shotDone && k > 60 && await pg.evaluate(() => __game.screens.worldObj.mw?.foxes.some((q) => q.life > 0.5))) { await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 4; o.hy = 5; o.placeHero(); __sim(0.05); }); await shot('watch-' + mode); shotDone = true; }
  }
  console.log(' result:', await text());
  await close();
  console.log(' best', await pg.evaluate(() => [__save.adv.melonBest, __save.adv.melonDay, (__save.adv.hats || []).join(',')]));
}
await start(12, ['melonhelm']); await pg.evaluate(() => { const o = __game.screens.worldObj; o.hx = 9; o.hy = 7; o.dir = 's'; o.placeHero(); __sim(1); }); await shot('helm');
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
