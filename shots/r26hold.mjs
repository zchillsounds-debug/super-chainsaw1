// node shots/r26hold.mjs <quarry|fort|gorge|rivalhold> [out]: the Round 26 phase-two move of a Hamrin master: enter the hold,
// stand by the master, drop him below his phase line and let his moves come round until the new one runs
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id = 'quarry', out] = process.argv.slice(2);
const NEW = { quarry: 'cartroll', fort: 'testudo', gorge: 'leap', rivalhold: 'snipe' }[id];
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=hamrin`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const r = await pg.evaluate(async ([id, NEW]) => {
  const g = __game, p = g.player; p.level = 26; g.recalcStats(); p.hp = p.stats.maxHp; p.invuln = 1e9;
  await g.holds.enter(id); __sim(0.3);
  for (const e of g.interior.enemies) if (!e.holdBoss) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
  const B = g.interior.enemies.find((e) => e.holdKey === 'boss'); p.pos.set(B.pos.x, 0, B.pos.z + 9); __sim(0.4);
  for (let i = 0; i < 6 && __director.def; i++) { __director.skip(); __sim(0.05); await new Promise((r) => setTimeout(r, 30)); }
  B.engaged || g.holdEngage(B); B.hp = Math.round(B.maxHp * 0.4); __sim(0.2);
  const seen = new Set(); let ran = false, extra = 0, maxLift = 0;
  for (let i = 0; i < 260 && !ran; i++) {
    if (__director.def) { __director.skip(); __sim(0.05); }
    for (const k in B.cds) if (k !== NEW) B.cds[k] = Math.max(B.cds[k], 3); // let the new move come round first
    p.pos.set(B.pos.x + 0.5, 0, B.pos.z + (NEW === 'leap' || NEW === 'snipe' ? 8 : 6));
    __sim(0.1); if (B.curMove) seen.add(B.curMove); if (B.curMove === NEW) ran = true;
  }
  let frames = 0; while (B.curMove === NEW && frames < 40) { __sim(0.1); maxLift = Math.max(maxLift, B.liftY || 0); frames++; }
  extra = g.interior.enemies.filter((e) => !e.dead && e.type === 'wall').length;
  return { boss: B.holdBoss.name, p2: !!B.p2, moves: B.moves.join(','), seen: [...seen].join(','), ran, walls: extra, maxLift: maxLift.toFixed(2), bossY: B.rig.position.y.toFixed(2) };
}, [id, NEW]);
console.log(id, JSON.stringify(r));
if (out) { await pg.evaluate(() => __sim(0.4)); await pg.screenshot({ path: `${out}/hold-${id}.png`, timeout: 180000 }); }
console.log('errors:', errs.join('\n') || 'none'); await b.close();
