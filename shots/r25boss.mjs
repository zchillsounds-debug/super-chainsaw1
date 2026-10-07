// node shots/r25boss.mjs <region> [out]: Round 25 boss kit check: combo, parry, break, signature move (with shots)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const ev = (f, a) => pg.evaluate(f, a);
const name = await ev(() => {
  const g = __game; g.player.invuln = 1e9; g.spawnBoss(); const b = g.boss;
  for (let i = 0; i < 5 && __director.def; i++) { __director.skip(); __sim(0.05); }
  b.rise = 1; const p = g.player; p.pos.set(b.pos.x, 0, b.pos.z + 3.6); __sim(0.1);
  const ran = !!b.r25; if (!b.r25) g.bossAI(b, 0.016);
  return b.name + ' ranInSim ' + ran + ' cine ' + !!__director.def + ' kit ' + !!b.r25?.K + ' poise ' + b.maxPoise;
});
console.log('boss', name);
// combo + parry on the finisher
const combo = await ev(() => {
  const g = __game, b = g.boss, p = g.player, R = b.r25; R.sigCd = 99; b.atkCd = 0; b.volleyCd = 99; b.meteorCd = 99;
  let started = false, parried = false, steps = [];
  for (let i = 0; i < 160; i++) {
    p.pos.set(b.pos.x, 0, b.pos.z + 2.4);
    if (R.combo) { started = true; const C = R.combo; steps.push(C.steps[C.i][0]); if (R.parryable && b.st.actionT > C.steps[C.i][2] - 0.08 && !p.rollT) { p.rollDir = p.pos.clone().set(1, 0, 0); p.rollT = 0.42; p.rollAge = 0.02; const pz = b.poise; __sim(0.1); parried = b.poise < pz || b.staggerT > 0; break; } }
    __sim(0.05);
  }
  return { started, parried, steps: [...new Set(steps)].join(','), poise: Math.round(b.poise) + '/' + b.maxPoise, stag: +b.staggerT.toFixed(2) };
});
console.log('combo', JSON.stringify(combo));
await ev(() => { __game.player.rollT = 0; __sim(0.1); });
await shot('parry');
// break
const brk = await ev(() => { const g = __game, b = g.boss; b.staggerT = 0; b.poise = 1; g.damageEnemy(b, 5, false, g.player.pos); __sim(0.3); return { stag: +b.staggerT.toFixed(2), breaks: b.r25.breaks, bar: document.querySelector('.bpoise')?.className }; });
console.log('break', JSON.stringify(brk));
await shot('break');
// signature
const sig = await ev(() => { const g = __game, b = g.boss, R = b.r25; b.staggerT = 0; R.combo = null; R.sigCd = 0; b.st.action = null; const p = g.player; p.pos.set(b.pos.x + 2, 0, b.pos.z + 9); __sim(0.2); return { sig: R.K?.sig, running: !!R.sig || !!R.guard, tele: g.hazards.filter((h) => h.kind === 'telegraph').length }; });
console.log('sig', JSON.stringify(sig));
await ev(() => __sim(0.5)); await shot('sig1');
if (region === 'docks') {
  const rip = await ev(() => { const g = __game, b = g.boss; const had = !!b.r25.guard; g.damageEnemy(b, 20, false, g.player.pos); return { had, riposte: !!b.r25.combo, step: b.r25.combo?.steps[0][0] }; });
  console.log('riposte', JSON.stringify(rip));
}
await ev(() => __sim(1.6)); await shot('sig2');
const end = await ev(() => { const g = __game, b = g.boss; __sim(3); return { hp: Math.round(b.hp), fires: g.fires2.length, action: b.st.action }; });
console.log('after', JSON.stringify(end));
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
