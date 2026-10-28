// node tools/qbgrotto.mjs : R842: Match Setup with the Sunwell Grotto unlocked (spring_arrive): is its arena button there and tappable at 740x360, 915x412, 360x640? (port 5182; shots tools/out/qb-grotto-*)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [w, h] of [[740, 360], [915, 412], [360, 640]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto('http://localhost:5182/?q=low' + (w < h ? '&mobile' : ''));
  await pg.waitForFunction(() => window.__ready, null, { timeout: 400000 });
  await pg.evaluate(() => { Object.assign(__save, { tutorialDone: true }); __save.adv = { flags: { cup_mirage: true, cup_canyon: true, cup_sandstorm: true, spring_arrive: true } }; __game.screens.title(); });
  await pg.waitForTimeout(800);
  await pg.evaluate(() => { const S = __game.screens; S.ctx = { kind: 'quick' }; S.select(); S.sel = 0; S.matchSheet(false); });
  await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => { const g = document.querySelector('.tp-ar[data-k="grotto"]'); if (!g) return 'no grotto button; tp-ar: ' + document.querySelectorAll('.tp-ar').length; g.scrollIntoView({ block: 'center' }); const R = g.getBoundingClientRect(); const top = document.elementFromPoint(R.x + R.width / 2, R.y + R.height / 2); return `grotto btn ${Math.round(R.x)},${Math.round(R.y)} ${Math.round(R.width)}x${Math.round(R.height)} hit=${top === g || g.contains(top)} text=${g.textContent}`; });
  console.log(w + 'x' + h, r);
  await pg.screenshot({ path: `tools/out/qb-grotto-${w}x${h}.png` });
  await pg.close();
}
await b.close();
