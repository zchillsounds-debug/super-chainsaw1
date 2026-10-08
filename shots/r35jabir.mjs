// node shots/r35jabir.mjs <region|epilogue> [out] [lang] [port]: Round 35. Jabir on his pallet by Ishaq's camp (or on his
// feet on the quays in the epilogue): a wide shot, the talk played to its end (lines printed), the line after it.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'marsh', out, lang = 'en', port = '5173'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.stack); });
await pg.addInitScript((l) => { try { localStorage.clear(); if (l === 'ar') localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch (e) { /* none */ } }, lang);
const reg = region === 'epilogue' ? 'docks&epilogue' : region;
await pg.goto(`http://localhost:${port}/?play&mobile&q=high&noadapt&region=${reg}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const ev = (f, a) => pg.evaluate(f, a);
const where = await ev(() => { const g = __game, n = g.npcs.find((x) => x.name === 'Jabir'); if (!n) return null; const p = g.player; p.invuln = 1e9;
  for (const e of g.enemies) if (!e.dead && e.pos.distanceTo(n.pos) < 40) { e.dead = true; e.hp = 0; e.rig.visible = false; }
  p.pos.set(n.pos.x + 2.2, 0, n.pos.z + 1.2); __sim(1.0); return { x: +n.pos.x.toFixed(1), z: +n.pos.z.toFixed(1), crouch: n.st.crouch, title: n.title }; });
console.log('jabir', JSON.stringify(where));
if (where) {
  await shot('wide');
  await ev(() => __game.npcs.find((x) => x.name === 'Jabir').talk());
  const lines = []; let last = null, n = 0;
  while (n++ < 300) {
    const r = await ev(() => { const d = __director; if (!d.def) return null; const s = d.shot; __sim(0.3); d.advance(); return s?.line ? s.line.who + ': ' + s.line.text : s?.caption ? '[' + s.caption + ']' : '(shot)'; });
    if (r === null) break;
    if (r !== last) { last = r; lines.push(r); if (lines.length === 3) await shot('talk'); }
  }
  console.log(lines.join('\n'));
  await ev(() => __game.npcs.find((x) => x.name === 'Jabir').talk());
  console.log('again', await ev(() => document.querySelector('#dialog')?.innerText.replace(/\s+/g, ' ').slice(0, 160)));
  await shot('again');
}
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
