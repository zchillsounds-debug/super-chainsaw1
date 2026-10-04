// node shots/r22crit.mjs <hold id> <outdir>: critique shots of a story hold: its door in the region (overhead), the
// way in, the captain's ground halfway, the master's ground (close camera, High quality, phone landscape)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [id = 'dam', out = '.'] = process.argv.slice(2);
const REG = { dam: 'sawad', kilns: 'sawad', stockade: 'marsh', sunken: 'marsh', quarter: 'karkh', vaults: 'karkh', shipyard: 'docks', hulks: 'docks' }[id];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${REG}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (name) => { await pg.waitForTimeout(600); await pg.screenshot({ path: `${out}/${id}-${name}.png`, timeout: 180000 }); };
await pg.evaluate(async (id) => { const g = __game, p = g.player; p.level = 15; g.recalcStats(); g.briefed = true; for (const q of g.quests.slice(0, 1)) if (id.match(/kilns|sunken|vaults|hulks/)) g.completeQuest(q.id, true);
  const door = g.interactables.find((x) => x.area === id); p.pos.copy(door.pos).add(new p.pos.constructor(0, 0, 0)); const f = Math.atan2(door.pos.x - p.pos.x, door.pos.z - p.pos.z);
  for (const e of g.enemies) if (e.pos.distanceTo(p.pos) < 30) { e.rig.visible = false; e.dead = true; }
  // step back from the door toward the hub so it is in view
  const v = g.storyDoor && Object.values(g.storyDoor).find((d) => d === door.pos) ? door.pos : door.pos; p.pos.set(v.x + (p.pos.x - v.x), 0, v.z); __sim(0.5); }, id);
await pg.evaluate(async (id) => { const g = __game, p = g.player, door = g.interactables.find((x) => x.area === id); const S = __game.storyDoor; const d = door.pos;
  // stand 6 m in front of it
  const hub = g.player.pos.clone(); p.pos.set(d.x, d.y, d.z); __sim(0.1); g.camInit = false; __sim(0.4); }, id);
await shot('door');
await pg.evaluate(async (id) => { const g = __game, door = g.interactables.find((x) => x.area === id); await door.act(); for (const e of g.interior.enemies) { e.alerted = false; } __sim(0.6); }, id);
await shot('in');
await pg.evaluate(() => { const g = __game, p = g.player, I = g.interior.I; for (let i = 0; i < 14; i++) { g.joy = { x: 0, y: -1 }; __sim(0.15); } g.joy = null; __sim(0.4); });
await shot('walk');
await pg.evaluate(() => { const g = __game, p = g.player, I = g.interior.I; for (const e of g.interior.enemies) if (!e.holdBoss && e.pos.distanceTo(I.midAt) < 10) { e.dead = true; e.rig.visible = false; } p.pos.set(I.midAt.x, 0, I.midAt.z + 14); p.facing = Math.PI; g.camYaw = Math.PI; g.camInit = false; __sim(0.5); });
await shot('mid');
await pg.evaluate(() => { const g = __game, p = g.player, I = g.interior.I; for (const e of g.interior.enemies) if (e.holdKey === 'mid') { e.dead = true; e.rig.visible = false; } const F = I.fires[I.fires.length - 1]; p.pos.set(F.pos.x, 0, F.pos.z - 2); p.facing = Math.PI; g.camYaw = Math.PI; g.camInit = false; __sim(0.5); });
await shot('boss');
console.log(id, 'errors:', errs.slice(0, 4).join(' | ') || 'none'); await b.close();
