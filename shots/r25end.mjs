// node shots/r25end.mjs <region> <photeinos> <marsh> <arsaber> [out]: play the act's ending scene with the choices set,
// list every line and caption it shows, and shoot the shots that only play for those choices
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'docks', pho = 'free', marsh = 'stay', ars = 'promise', out] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const r = await pg.evaluate(([pho, marsh, ars]) => {
  const g = __game; g.player.s25 = { ch: { photeinos: pho, marsh, arsaber: ars, ishaq: 'heard' }, leaves: {}, mem: {}, said: {} };
  g.player.invuln = 1e9; g.spawnBoss(); const b = g.boss; while (__director.def) __director.skip(); __sim(0.2); b.rise = 1; b.hp = 1; g.damageEnemy(b, 1e9, false, b.pos);
  __sim(3); return { cine: !!__director.def };
}, [pho, marsh, ars]);
for (let i = 0; i < 20 && !(await pg.evaluate(() => !!__director.def)); i++) { await pg.evaluate(() => __sim(0.3)); await pg.waitForTimeout(700); }
console.log('start', JSON.stringify(r), 'cine now', await pg.evaluate(() => !!__director.def));
const seen = []; let shots = 0;
for (let i = 0; i < 400; i++) {
  const s = await pg.evaluate(() => { const d = __director; if (!d.def) return null; const s = d.shot; return { i: d.i, line: s?.line ? s.line.who + ': ' + s.line.text : null, cap: s?.caption || null, when: !!s?.when }; }).catch(() => null);
  if (!s) break;
  const key = s.i + (s.line || s.cap || '');
  if (!seen.includes(key)) { seen.push(key); console.log(s.i, s.line || (s.cap ? '[' + s.cap + ']' : '-')); if (s.when && out && shots < 6) { await pg.evaluate(() => __sim(0.6)); await pg.screenshot({ path: `${out}/${region}-end-${s.i}.png`, timeout: 180000 }); shots++; } }
  await pg.evaluate(() => { __sim(0.4); __director.advance(); }).catch(() => {});
}
await pg.waitForTimeout(3000);
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
