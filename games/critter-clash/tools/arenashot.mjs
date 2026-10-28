// node tools/arenashot.mjs [WxH] [arena] : a CPU-vs-CPU fight in any arena (OPEN=0 for the stadium; TINTS=day,night); shots tools/out/arena-<key>-<open|std>-<tint>-<WxH>.png
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number), tag = `${w}x${h}`, AK = process.argv[3] || 'grotto', OPEN = process.env.OPEN !== '0';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto&q=' + (process.env.Q || 'high') + (w < h ? '&mobile' : ''));
await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
for (const tint of (process.env.TINTS || 'day').split(',')) {
  console.log(tint, await pg.evaluate(([tint, AK, OPEN, T]) => {
    const g = __game, D = (id) => __grow(__critters.find((x) => x.id === id), 38);
    g.startBattle(D('siroccat'), D('cactortle'), { difficulty: 0.8, playerLevel: 38, cpuLevel: 38, arena: AK, ...(tint === 'day' ? {} : { phase: tint }) });
    g.arena.setOpen(OPEN);
    for (let k = 0; k < 12 && g.battle.phase !== 'fight'; k++) __sim(0.5);
    __sim(T);
    return `arena ${g.arena.key}  hazards ${g.battle.hazards?.list?.length ?? '-'}`;
  }, [tint, AK, OPEN, +(process.env.T || 2.5)]));
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: `tools/out/arena-${AK}-${OPEN ? "open" : "std"}-${tint}-${tag}.png`, timeout: 120000 });
  await pg.evaluate(() => __game.endBattle());
}
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no errors');
await b.close();
