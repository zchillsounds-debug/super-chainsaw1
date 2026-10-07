// node shots/r29quests.mjs <region> [out]: plays the Round 29 side quest of a region through, shooting the meeting scene,
// the escort and the return, and checks where the people and bands land (on open ground, not in water).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out] = process.argv.slice(2);
const ID = process.env.QID || { sawad: 'seed', marsh: 'mashuf', karkh: 'copper', docks: 'pilot', hamrin: 'flock' }[region];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); pg.on('console', (m) => m.type() === 'error' && !m.text().includes('CERT') && errs.push(m.text()));
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const shot = async (n) => { if (!out) return; await pg.evaluate(() => document.querySelectorAll('.hint, #hint').forEach((h) => h.remove())); await pg.screenshot({ path: `${out}/${region}-q-${n}.png`, timeout: 180000 }); };
await pg.evaluate((ID) => {
  const g = __game; g.briefed = true; g.tutorialOn = false; const p = g.player; p.stats.maxHp = 1e7; p.hp = 1e7;
  window.Q29 = g.__side.Q.find((q) => q.id === ID);
  window.killTag = (tag) => { for (const e of g.enemies) if (e.sideTag === tag && !e.dead) { e.hidden = false; e.riseT = 1; g.killEnemy(e, e.pos); } };
  window.skip = () => { let n = 0; while (__director.def && n++ < 80) { __director.skip(); __sim(0.4); } };
}, ID);
const giver = await pg.evaluate(() => { const q = Q29, n = q.npc; return { at: [n.pos.x.toFixed(1), n.pos.z.toFixed(1)] }; });
console.log('quest', ID, 'giver at', JSON.stringify(giver));
await pg.evaluate(() => { const g = __game, n = Q29.npc; g.player.pos.set(n.pos.x + 1.6, 0, n.pos.z + 1.2); __sim(0.3); n.talk(); __sim(0.2); });
await shot('offer');
await pg.evaluate(() => { document.querySelector('#dialog .dchoice')?.click(); __sim(0.2); });
const log = [];
for (let guard = 0; guard < 8; guard++) {
  const st = await pg.evaluate(() => { const g = __game, s = g.player.side[Q29.id], st = Q29.steps[s]; return st ? { s, kind: st.kind || null } : null; });
  if (!st || !st.kind) break;
  const info = await pg.evaluate(async (k) => {
    const g = __game, p = g.player, S = g.__side, L = S.live.get(Q29.id), { heightAt, waterDepth, hamrinOpen } = await import('/src/terrain.js');
    const where = (v) => v && ({ x: +v.x.toFixed(1), z: +v.z.toFixed(1), water: +waterDepth(v.x, v.z).toFixed(2), open: hamrinOpen ? +hamrinOpen(v.x, v.z).toFixed(2) : null });
    const band = g.enemies.filter((e) => e.sideTag === Q29.id && !e.dead);
    const r = { kind: k, band: band.map((e) => e.type).join(','), bandAt: where(band[0]?.pos), target: where(L?.target) };
    if (k === 'meet') { const n = L.meetNpc; p.pos.set(n.pos.x + 1.5, 0, n.pos.z + 1.5); p.pos.y = heightAt(p.pos.x, p.pos.z); r.meetAt = where(n.pos); }
    if (k === 'escort') { r.follow = where(L.follow[0].pos); r.dest = where(L.dest); }
    return r;
  }, st.kind);
  log.push(info);
  if (st.kind === 'kill' || st.kind === 'take') {
    await pg.evaluate(() => { const g = __game, b = g.enemies.find((e) => e.sideTag === Q29.id && !e.dead); if (b) { g.player.pos.copy(b.pos).add(new (b.pos.constructor)(4, 0, 4)); for (const e of g.enemies) if (e.sideTag === Q29.id) { e.hidden = false; e.riseT = 1; e.alerted = true; } __sim(1.2); } });
    await shot(`step${st.s}-${st.kind}`);
    await pg.evaluate((k) => { killTag(Q29.id); __sim(0.3); if (k === 'take') { const st = Q29.steps[__game.player.side[Q29.id]]; __game.interactables.find((i) => i.label === st.label)?.act(); } __sim(0.3); }, st.kind);
  } else if (st.kind === 'meet') {
    const dbg = await pg.evaluate(() => { killTag(Q29.id); const n = __game.__side.live.get(Q29.id).meetNpc; n.talk(); __sim(2.6); const h = n.rig.userData.parts?.head?.getWorldPosition(new (n.pos.constructor)()); let vis = true, o = n.rig; while (o) { if (!o.visible) vis = false; o = o.parent; } const c = __game.camera.position; return { rigVisible: vis, inScene: !!n.rig.parent, pos: [n.pos.x, n.pos.y, n.pos.z].map((v) => +v.toFixed(1)), head: h && [h.x, h.y, h.z].map((v) => +v.toFixed(1)), cam: [c.x, c.y, c.z].map((v) => +v.toFixed(1)) }; });
    console.log('meet scene:', JSON.stringify(dbg));
    await shot(`step${st.s}-meet-a`);
    await pg.evaluate(() => { __director.skip(); __sim(1.6); }); await shot(`step${st.s}-meet-b`);
    await pg.evaluate(async () => { skip(); await new Promise((r) => setTimeout(r, 60)); __sim(0.3); });
  } else if (st.kind === 'escort') {
    await pg.evaluate(() => { const g = __game, L = g.__side.live.get(Q29.id); g.player.pos.copy(L.follow[0].pos).add(new (L.dest.constructor)(2, 0, 2)); __sim(1.0); });
    await shot(`step${st.s}-escort`);
    await pg.evaluate(() => { const g = __game, L = g.__side.live.get(Q29.id); killTag(Q29.id); for (const f of L.follow) f.pos.copy(L.dest); g.player.pos.copy(L.dest); __sim(0.4); });
  } else if (st.kind === 'return') {
    await pg.evaluate(() => { const g = __game, n = Q29.npc; g.player.pos.set(n.pos.x + 1.6, 0, n.pos.z + 1.2); n.talk(); __sim(3.2); });
    await shot(`step${st.s}-return`);
    await pg.evaluate(async () => { skip(); await new Promise((r) => setTimeout(r, 60)); __sim(0.3); });
  }
  await pg.waitForTimeout(50);
}
for (const l of log) console.log(JSON.stringify(l));
const end = await pg.evaluate(() => ({ state: __game.player.side[Q29.id], of: Q29.steps.length - 1, renown: __game.player.renown }));
console.log('done:', JSON.stringify(end), end.state === end.of ? 'QUEST OK' : 'QUEST INCOMPLETE');
console.log('errors:', errs.join('\n') || 'none'); await b.close();
