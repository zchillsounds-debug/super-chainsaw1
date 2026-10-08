// node shots/r35drama.mjs [out] [pick 1|2] [lang] [from] [to] [port]: Round 35 Season One check. Starts a chronicle
// (?play&drama), taps every card, plays every scene (choices take <pick>), kills the episode's foes, walks Salim to each
// objective, enters and clears the holds, from episode <from> (default 1) to the end of episode <to> (default 6).
// Screenshots: one per new shot of a scene (Ep 1 and 2) or per scene (later), plus each card.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, pick = '1', lang = 'en', from = '1', to = '6', port = '5173'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.stack); });
pg.on('console', (m) => { if (m.type() === 'warning' && /drama34/.test(m.text())) console.log('WARN', m.text()); });
await pg.addInitScript((l) => { try { localStorage.clear(); if (l === 'ar') localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: 'ar' })); } catch (e) { /* none */ } }, lang);
await pg.goto(`http://localhost:${port}/?play&drama&mobile&q=high&noadapt&region=sawad&cls=faris`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
let shotN = 0;
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${String(++shotN).padStart(3, '0')}-${n}.png`, timeout: 180000 }); };
const ev = (f, a) => pg.evaluate(f, a);
await ev((f) => { const g = __game; g.player.invuln = 1e9; if (+f > 1) g.drama34.jump(+f); }, from);
const state = () => ev(() => { const g = __game, E = g.player.ep34 || {}, o = document.getElementById('ep34');
  return { n: E.n, b: E.b, card: o && !o.classList.contains('hidden') ? o.className : null, scene: !!__director.def, obj: g.drama34.target()?.text || null, interior: !!g.interior, dialog: !!g.ui.dialogOpen }; });
let last = '', idle = 0, guard = 0, lastShot = null;
const SHOTS = (process.env.SHOTS || '1,2').split(',').map(Number), shotsFor = (n) => SHOTS.includes(n);
while (guard++ < 4000) {
  const s = await state();
  if (s.n > +to) break;
  const key = JSON.stringify([s.n, s.b, s.card, s.scene, s.obj]);
  if (key !== last) { console.log('state', key); last = key; idle = 0; } else idle++;
  if (idle > 400) { console.log('STUCK', key); break; }
  if (s.card) {
    await new Promise((r) => setTimeout(r, 400));
    const txt = await ev(() => document.querySelector('#ep34 .box')?.innerText.replace(/\s+/g, ' ').trim());
    if (txt && txt !== lastShot) { console.log('card', s.card, '|', txt); lastShot = txt; await shot('card'); }
    await ev(() => { dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await new Promise((r) => setTimeout(r, 300));
    continue;
  }
  if (s.scene) {
    // one shot of the scene at a time
    const r = await ev((p) => { const d = __director, sh = d.shot; if (sh?.choice && sh.chosen == null) dispatchEvent(new KeyboardEvent('keydown', { key: String(p) }));
      const before = sh; __sim(0.3); d.advance(); const now = d.shot;
      const txt = (x) => x ? (x.line ? x.line.who + ': ' + x.line.text : x.caption ? '[' + x.caption + ']' : x.choice ? '<choice ' + p + '>' : x.card ? '{' + x.card.en + '}' : '(shot ' + (x.dur | 0) + 's)') : '(end)';
      return { changed: now !== before, txt: txt(now), first: txt(before) }; }, +pick);
    if (r.first !== lastShot) { lastShot = r.first; console.log('  ', r.first); if (shotsFor(s.n)) await shot('ep' + s.n); }
    continue;
  }
  if (s.dialog) { await ev(() => document.querySelector('#dialog .dbtn')?.click()); await ev(() => __sim(0.3)); continue; }
  // no scene: kill the episode's foes, or walk to the objective
  // a hold compiles its materials in the background when it opens (minutes in SwiftShader): no fighting before it is done
  const warm = await ev(() => { const g = __game; if (!g.interior?.hold) { window.__wpFor = null; return true; } if (window.__wpFor !== g.interior) { window.__wpFor = g.interior; window.__wpDone = false; Promise.resolve(g.warmPending).catch(() => {}).then(() => { window.__wpDone = true; }); } return window.__wpDone; });
  if (!warm) { await ev(() => __sim(0.2)); await new Promise((r) => setTimeout(r, 500)); idle = 0; continue; }
  const did = await ev(() => { const g = __game, p = g.player, live = g.enemies.filter((e) => !e.dead && !e.hidden && (e.ep34 || g.interior?.hold || e.pos.distanceTo(p.pos) < 26));
    if (live.length) { for (const e of live.slice(0, 3)) { if (g.interior?.hold) p.pos.set(e.pos.x + 1.2, e.pos.y, e.pos.z + 1.2); g.damageEnemy(e, 1e6, false, p.pos); } __sim(0.5); return 'kill ' + live.length; }
    if (g.interior?.hold) { const B = g.boss && !g.boss.dead ? g.boss : null; if (B) { g.damageEnemy(B, 1e6, false, p.pos); __sim(1); return 'boss'; } __sim(1); return 'in hold'; }
    const T = g.drama34.target(); if (!T?.pos || g.drama34.busy) { __sim(0.5); return 'wait'; }
    p.pos.set(T.pos.x + 1.2, 0, T.pos.z + 1.2); __sim(0.6);
    const it = g.interactables.find((i) => !i.hidden && i.pos && Math.hypot(i.pos.x - p.pos.x, i.pos.z - p.pos.z) < 4 && (i.area || i.npc));
    if (it && (it.area || /Umayma|Doukitzes/.test(it.npc?.name || ''))) { it.act?.(); __sim(1); return 'act ' + (it.area || it.npc.name); }
    if (g.boss && !g.boss.dead && g.boss.pos.distanceTo(p.pos) < 6) { g.damageEnemy(g.boss, 1e6, false, p.pos); __sim(1); return 'boss open'; }
    return 'walk'; });
  if (did !== 'walk' && did !== 'wait') console.log('   ->', did);
}
console.log('final', JSON.stringify(await state()), JSON.stringify(await ev(() => ({ ch: __game.player.s25?.ch, ep: __game.player.ep34 }))));
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
