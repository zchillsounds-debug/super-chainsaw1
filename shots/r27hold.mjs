// node shots/r27hold.mjs <dam|kilns|stockade|sunken|quarter|vaults|shipyard|hulks> <mid|boss> [out]: the Round 27 phase-two
// move of a story-hold master: enter the hold, stand by him, drop him below his phase line and let his moves come round until
// the new one runs; prints what it left behind (slowing ground, bands, the log, the net, men called up); a shot in [out]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id = 'dam', key = 'boss', out] = process.argv.slice(2);
const REG = { dam: 'sawad', kilns: 'sawad', stockade: 'marsh', sunken: 'marsh', quarter: 'karkh', vaults: 'karkh', shipyard: 'docks', hulks: 'docks' }[id];
const NEW = { dam: ['sluice', 'bandon'], kilns: ['bellows', 'chainsweep'], stockade: ['causeway', 'reedfire'], sunken: ['hooks', 'polesweep'], quarter: ['roofs', 'testudo'], vaults: ['crossfire', 'embertrail'], shipyard: ['slipway', 'cargonet'], hulks: ['chainpull', 'feintstrike'] }[id][key === 'mid' ? 0 : 1];
const LVL = { sawad: 4, marsh: 9, karkh: 12, docks: 15 }[REG];
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&q=${out ? 'high' : 'low'}&region=${REG}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const r = await pg.evaluate(async ([id, key, NEW, LVL, shoot]) => {
  const g = __game, p = g.player; p.level = LVL; g.recalcStats(); p.hp = p.stats.maxHp; p.invuln = 1e9; g.briefed = true;
  if (g.holds.locked(id)) for (const q of g.quests.slice(0, 1)) g.completeQuest(q.id, true); // the second hold opens once the first is done
  await g.holds.enter(id); __sim(0.3); if (!g.interior) return { err: 'not entered: ' + g.holds.locked(id) };
  for (const e of g.interior.enemies) if (!e.holdBoss) { e.dead = true; e.removed = true; g.scene.remove(e.rig); }
  const B = g.interior.enemies.find((e) => e.holdKey === key); if (!B) return { err: 'no ' + key };
  for (const e of g.interior.enemies) if (e.holdBoss && e !== B) { e.dead = true; e.rig.visible = false; }
  p.pos.set(B.pos.x, 0, B.pos.z + 6); __sim(0.4);
  for (let i = 0; i < 6 && __director.def; i++) { __director.skip(); __sim(0.05); await new Promise((r) => setTimeout(r, 30)); }
  B.engaged || g.holdEngage(B); for (let i = 0; i < 6 && __director.def; i++) { __director.skip(); __sim(0.05); await new Promise((r) => setTimeout(r, 30)); }
  B.hp = Math.round(B.maxHp * 0.4); __sim(0.2);
  const near = ['feintstrike', 'chainpull', 'chainsweep', 'bellows', 'polesweep'].includes(NEW) ? 2.6 : 7;
  const seen = new Set(); let ran = false;
  for (let i = 0; i < 300 && !ran; i++) {
    if (__director.def) { __director.skip(); __sim(0.05); }
    for (const k in B.cds) if (k !== NEW) B.cds[k] = Math.max(B.cds[k], 3);
    if (B.hook) B.hook = null; if (B.smoke) { B.smoke = null; B.ghost = false; B.rig.visible = true; } B.hookCd = B.smokeCd = 9;
    p.pos.set(B.pos.x + 0.5, 0, B.pos.z + near); __sim(0.1); if (B.curMove) seen.add(B.curMove); if (B.curMove === NEW) ran = true;
  }
  const hp0 = p.hp; p.invuln = 0; const st = { maxBands: 0, maxZones: 0, log: false, net: false, fires: 0, slow: 1, knock: 0 };
  for (let f = 0; f < 45; f++) { if (shoot && f === 7) break; p.hp = Math.max(p.hp, p.stats.maxHp * 0.6); __sim(0.1);
    st.maxBands = Math.max(st.maxBands, g.hazards.filter((h) => h.kind === 'm27band').length); st.maxZones = Math.max(st.maxZones, g.m27.zones.filter((z) => z.life > 0).length);
    st.log ||= g.m27.log.on; st.net ||= p.netT > 0; st.fires = Math.max(st.fires, g.fires2.length); st.knock = Math.max(st.knock, p.knock?.length() || 0); }
  const men = g.interior.enemies.filter((e) => !e.dead && e.summoned).map((e) => e.type).join(',');
  return { boss: B.holdBoss.name, p2: !!B.p2, moves: B.moves.join(','), seen: [...seen].join(','), ran, ...st, knock: +st.knock.toFixed(1), men, hit: p.hp < hp0 || st.knock > 0 };
}, [id, key, NEW, LVL, !!out]);
console.log(id, key, NEW, JSON.stringify(r));
if (out) { await pg.screenshot({ path: `${out}/r27-${id}-${key}.png`, timeout: 180000 }); }
console.log('errors:', errs.join('\n') || 'none'); await b.close();
