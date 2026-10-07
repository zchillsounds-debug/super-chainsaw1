// node shots/r16test.mjs <region>   plays every side quest, bounty and world event through (headless)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !m.text().includes('CERT') && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?play&noadapt&q=low&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const out = await pg.evaluate(async () => {
  const g = __game, S = g.__side, p = g.player, r = [];
  p.stats.maxHp = 1e7; p.hp = 1e7; g.briefed = true;
  const skip = () => { let n = 0; while (__director.def && n++ < 60) { __director.skip(); __sim(0.4); } };
  const killTag = (tag) => { for (const e of g.enemies) if (e.sideTag === tag && !e.dead) { e.hidden = false; e.riseT = 1; g.killEnemy(e, e.pos); } };
  for (const q of S.Q) {
    const log = [q.id];
    q.npc.talk(); // offer dialog
    document.querySelector('#dialog .dchoice')?.click(); __sim(0.2);
    for (let guard = 0; guard < 8; guard++) {
      const s = p.side[q.id], st = q.steps[s]; if (!st || !st.kind) break;
      log.push(st.kind);
      if (st.kind === 'kill') { killTag(q.id); __sim(0.3); }
      else if (st.kind === 'take') { killTag(q.id); const it = g.interactables.find((i) => i.label === st.label); it?.act(); __sim(0.2); }
      else if (st.kind === 'visit') { g.interactables.find((i) => i.label === st.label)?.act(); __sim(0.5); skip(); await new Promise((r) => setTimeout(r, 50)); __sim(0.3); }
      else if (st.kind === 'meet') { killTag(q.id); S.live.get(q.id)?.meetNpc?.talk(); __sim(0.5); skip(); await new Promise((r) => setTimeout(r, 50)); __sim(0.3); } // Round 29
      else if (st.kind === 'escort') { const L = S.live.get(q.id); killTag(q.id); for (const f of L.follow) f.pos.copy(L.dest); p.pos.copy(L.dest); __sim(0.3); }
      else if (st.kind === 'return') { q.npc.talk(); __sim(0.5); skip(); await new Promise((r) => setTimeout(r, 50)); __sim(0.3); }
      await new Promise((r) => setTimeout(r, 30));
    }
    log.push('=' + p.side[q.id] + '/' + (q.steps.length - 1));
    r.push(log.join('>'));
  }
  // bounties
  const bl = [];
  for (const bt of S.bounties) {
    S.startBounty(bt); __sim(0.2); const L = S.blive.get(bt.i);
    if (bt.kind === 'hunt') { killTag('b' + bt.i); if (L.boss && !L.boss.dead) g.killEnemy(L.boss, L.boss.pos); __sim(0.3); }
    else if (bt.kind === 'recover') { killTag('b' + bt.i); g.interactables.find((i) => i.label === 'Take back the stolen goods')?.act(); }
    else if (bt.kind === 'escort') { killTag('b' + bt.i); L.follow[0].pos.copy(L.dest); p.pos.copy(L.dest); __sim(0.3); }
    else S.finishBounty(bt);
    bl.push(bt.kind + ':' + JSON.parse(JSON.stringify(p.bounty))[Object.keys(p.bounty)[0]].done[bt.i]);
  }
  r.push('bounties ' + bl.join(','));
  // a world event
  p.pos.set(0, 0, 0); S.ev.next = 0; let tries = 0; while (!S.ev.cur && tries++ < 10) { S.ev.next = 0; __sim(0.2); p.pos.set(p.pos.x + 30, 0, p.pos.z + 30); }
  const evId = S.ev.cur?.E.id; killTag('ev'); __sim(0.5);
  r.push('event ' + evId + ' done=' + !S.ev.cur);
  r.push('renown ' + p.renown + ' gold ' + p.gold);
  return r.join('\n');
});
console.log(out);
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none');
await b.close();
