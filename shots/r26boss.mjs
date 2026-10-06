// node shots/r26boss.mjs <region> [out]: Round 26 boss second halves: drop the act boss below his phase line and let the
// signatures come round; prints which moves ran (by their callouts), Bardanes' standard, Arsaber's feint; shots in [out]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const ev = (f, a) => pg.evaluate(f, a);
const name = await ev(() => {
  const g = __game; g.player.invuln = 1e9; g.spawnBoss(); const b = g.boss;
  for (let i = 0; i < 5 && __director.def; i++) { __director.skip(); __sim(0.05); }
  b.rise = 1; const p = g.player; p.pos.set(b.pos.x, 0, b.pos.z + 7); __sim(0.1);
  // the callouts tell us which move ran
  window.calls = []; const dn = g.ui.damageNumber.bind(g.ui); g.ui.damageNumber = (pos, txt, k) => { if (typeof txt === 'string') calls.push(txt); return dn(pos, txt, k); };
  window.toasts = []; const to = g.ui.toast.bind(g.ui); g.ui.toast = (m, k) => { toasts.push(m); return to(m, k); };
  return b.name;
});
console.log('boss', name);
// first half: one signature for comparison
const p1 = await ev(() => { const g = __game, b = g.boss, R = b.r25; R.sigCd = 0; b.atkCd = 99; for (let i = 0; i < 30; i++) __sim(0.1); return calls.splice(0).join(' | '); });
console.log('phase 1 callouts:', p1);
// second half
const p2 = await ev(() => {
  const g = __game, b = g.boss, R = b.r25; b.hp = Math.round(b.maxHp * 0.45); b.staggerT = 0;
  const before = g.enemies.filter((e) => !e.dead).length;
  let feintSeen = false, sigs = [];
  for (let n = 0; n < 4; n++) {
    R.sigCd = 0; b.atkCd = 99; R.combo = null; R.sig = null; b.st.action = null; b.staggerT = 0;
    const p = g.player; p.pos.set(b.pos.x + 0.3, 0, b.pos.z + (b.type === 'ghanim' ? 3.2 : 7));
    for (let i = 0; i < 40; i++) { __sim(0.1); if (R.combo?.steps?.some((s) => s[5] === 'feint')) feintSeen = true; }
  }
  const after = g.enemies.filter((e) => !e.dead);
  return { phase: b.phase, p2: !!R.p2, callouts: calls.splice(0).join(' | '), toasts: toasts.join(' | '), standard: after.filter((e) => e.type === 'standard').length, spawned: after.length - before, feintSeen, fires: g.fires2.length };
});
console.log('phase 2:', JSON.stringify(p2));
// a shot in the middle of the new move
await ev(() => { const g = __game, b = g.boss, R = b.r25; R.alt = false; R.sigCd = 0; b.atkCd = 99; R.combo = null; R.sig = null; b.st.action = null; b.staggerT = 0; g.player.pos.set(b.pos.x + 0.3, 0, b.pos.z + (b.type === 'ghanim' ? 3.2 : 6)); __sim(0.6); });
await shot('p2move');
await ev(() => __sim(1.0));
await shot('p2move2');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
