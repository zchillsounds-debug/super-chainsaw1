// node tools/saltarena.mjs [WxH] : R821: the Glass Flats' salt-flat arena (wild fights there only, open field). A CPU-vs-CPU fight by day and
// at night (TINTS=day,night,evening); shots tools/out/salt-<tint>-<WxH>.png. Also checks the Glass Flats map now names it.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
for (const tint of (process.env.TINTS || 'day,night').split(',')) {
  console.log(tint, await pg.evaluate((tint) => {
    const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 38);
    g.startBattle(D('siroccat'), D('cactortle'), { difficulty: 0.8, playerLevel: 38, cpuLevel: 38, arena: 'saltflat', ...(tint === 'day' ? {} : { phase: tint }) });
    g.arena.setOpen(true);
    for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
    __sim(2.5);
    return `arena ${g.arena.key} mirage ${!!g.arena.mirage} hazards ${g.battle.hazards?.list?.length ?? '-'}`;
  }, tint));
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: `tools/out/salt-${tint}-${tag}.png`, timeout: 120000 });
  await pg.evaluate(() => __game.endBattle());
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
