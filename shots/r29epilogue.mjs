// node shots/r29epilogue.mjs [out] [lang]: the Round 29 epilogue on the quays at dusk. No foes, the trail leads to each camp
// man in turn, their farewells (one line shot each), Ishaq's scene (the lamp, the card), the victory screen, and the
// state left behind. Choices are set so the conditional lines show.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, lang = 'en'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && !m.text().includes('CERT') && errs.push(m.text()));
if (lang === 'ar') await pg.addInitScript(() => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch { /* */ } });
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=docks&epilogue`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const shot = async (n) => { if (!out) return; await pg.evaluate(() => document.querySelectorAll('.hint, #hint').forEach((h) => h.remove())); await pg.screenshot({ path: `${out}/ep-${lang}-${n}.png`, timeout: 180000 }); };
const r0 = await pg.evaluate(() => {
  const g = __game, p = g.player; g.briefed = true; g.tutorialOn = false; g.act = 7;
  p.rival = { final: 'free' }; const s = (p.s25 ||= {}); s.ch = { ...(s.ch || {}), photeinos: 'free', marsh: 'stay', arsaber: 'promise', ishaq: 'heard', tatzates: 'free' };
  s.camp = { yusuf: 3, bishr: 1, amr: 3, at: {} }; s.said ||= {};
  __sim(1.5);
  return { foes: g.enemies.filter((e) => !e.dead).length, epi: !!g.epilogue29, track: g.trackTarget?.()?.text };
});
console.log('arrive:', JSON.stringify(r0));
await shot('arrive');
const lines = [];
for (const name of ['Yusuf', 'Bishr', '\'Amr']) {
  const r = await pg.evaluate((name) => { const g = __game, n = g.npcs.find((x) => x.name === name); g.player.pos.set(n.pos.x + 1.6, 0, n.pos.z + 1.2); n.talk(); __sim(2.8); const L = []; return { track: g.trackTarget?.()?.text, playing: !!__director.def }; }, name);
  await shot('farewell-' + name.replace('\'', ''));
  const said = await pg.evaluate(async () => { const seen = []; let n = 0; while (__director.def && n++ < 400) { const t = document.querySelector('#cine .sline')?.textContent; __sim(0.5); const t2 = document.querySelector('#cine .sline')?.textContent; if (t && t2 !== t && seen[seen.length - 1] !== t) seen.push(t); } await new Promise((r) => setTimeout(r, 60)); __sim(0.3); return seen; });
  lines.push(name + ': ' + said.join(' / '));
  console.log('farewell', name, JSON.stringify(r));
}
for (const l of lines) console.log(l);
const r2 = await pg.evaluate(() => { const g = __game, s = g.player.s25.said; return { said: ['yusuf', 'bishr', 'amr'].map((k) => !!s['ep29_' + k]).join(','), track: g.trackTarget?.()?.text }; });
console.log('after farewells:', JSON.stringify(r2));
// Ishaq's scene: step it on, shooting the captions, the lamp and the card
await pg.evaluate(() => { const g = __game, n = g.npcs.find((x) => x.name === 'Ishaq'); g.player.pos.set(n.pos.x + 1.6, 0, n.pos.z + 1.2); n.talk(); __sim(0.2); });
const seen = new Set();
for (let i = 0; i < 200; i++) {
  const st = await pg.evaluate(() => { __sim(0.5); const d = __director; if (!d.def) return null; return { i: d.i, n: d.def.shots.length, cap: document.querySelector('#cine .caption.show')?.textContent || '', line: document.querySelector('#cine .sline')?.textContent || '', card: !!document.querySelector('#cine .card.show'), k: d.t / (d.shot?.dur || 1) }; });
  if (!st) break;
  if (!seen.has(st.i) && st.k > 0.7) { seen.add(st.i); console.log('shot', st.i, '/', st.n, st.card ? '[card]' : '', st.line || st.cap); if (st.cap || st.card || st.i === 1 || st.i === 3) await shot('quay-' + st.i); }
}
await pg.evaluate(async () => { await new Promise((r) => setTimeout(r, 100)); __sim(0.3); });
const r3 = await pg.evaluate(() => { const g = __game; let eg = null; try { eg = localStorage.getItem('sob.endgame'); } catch { /* */ } return { done: !!g.player.s25.said.ep29_done, victory: !document.getElementById('victory').classList.contains('hidden'), endgame: eg }; });
console.log('end:', JSON.stringify(r3));
await shot('victory');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
