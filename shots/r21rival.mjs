// node shots/r21rival.mjs <sawad|marsh|karkh|docks> [outdir]: Zubayr's road ambush and escape; Hisham's hooked chain (Sawad); Layth's smoke (al-Karkh)
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await pg.goto(`http://localhost:5173/?play&q=low&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 180000 });
await pg.evaluate(fs.readFileSync(new URL('./close.js', import.meta.url), 'utf8'));
const res = await pg.evaluate(async (region) => {
  const g = __game, p = g.player, R = g.__rivals, log = [];
  const keep = () => { p.hp = p.stats.maxHp; p.dead = false; p.st.dead = false; };
  p.level = 12; g.recalcStats(); keep();
  if (R.RIVAL[region]) {
    g.act = R.RIVAL[region].act; const sp = R.spot(); p.pos.set(sp.x + 10, 0, sp.z + 10); __sim(0.4);
    const z = R.met(); log.push('zubayr spawned ' + !!z + ' cine ' + !!g.cinematic + ' line ' + (__director.shot?.line?.text || ''));
    __director.skip(); await new Promise((r) => setTimeout(r, 60)); __sim(0.3);
    let acts = new Set(); for (let i = 0; i < 40; i++) { keep(); __sim(0.15); if (z.st.action) acts.add(z.st.action); if (z.leap) acts.add('leap'); }
    log.push('zubayr moves ' + [...acts].join(','));
    // wound him past two thirds: the escape
    g.damageEnemy(z, z.hp - z.maxHp * 0.2, false, p.pos); keep(); __sim(0.2);
    log.push('escaping ' + !!z.escaping + ' cine ' + !!g.cinematic + ' line ' + (__director.shot?.line?.text || ''));
    __director.skip(); await new Promise((r) => setTimeout(r, 60)); __sim(0.5);
    log.push('gone ' + !!z.removed + ' rival ' + JSON.stringify(p.rival));
  }
  const L = g.matriarch;
  if (region === 'sawad' || region === 'karkh') {
    for (const e of g.enemies) if (e !== L && !e.dead && e.pos.distanceTo(L.pos) < 20) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
    p.pos.set(L.pos.x + 7, 0, L.pos.z + 3); L.alerted = true; L.pos.y = 0; __sim(0.1);
    const seen = new Set(); let pulled = 0, ghost = 0, hp0 = p.hp;
    for (let i = 0; i < 90; i++) { keep(); const before = p.pos.clone(); __sim(0.1); if (L.hook) seen.add(L.hook.phase); if (L.hook?.phase === 'pull') pulled++; if (L.smoke) seen.add(L.smoke.phase); if (L.ghost) ghost++; }
    log.push(L.name + ' phases ' + [...seen].join(',') + ' pulled-frames ' + pulled + ' ghost-frames ' + ghost + ' maxHp ' + L.maxHp);
  }
  return log.join('\n');
}, region);
console.log(res);
if (out) { await pg.evaluate(() => { const L = __game.matriarch; __look(L, 40, 7, 3, 1.2); __sim(0.05); }); await pg.waitForTimeout(500); await pg.screenshot({ path: `${out}/lieut-${region}.png` }); }
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none'); await b.close();
