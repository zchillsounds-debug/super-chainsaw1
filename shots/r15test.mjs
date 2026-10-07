// node shots/r15test.mjs <region>   smoke test of the Round 15 systems in one region (headless)
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 640, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !m.text().includes('CERT') && errs.push(m.text()));
await pg.goto(`http://localhost:5173/?play&noadapt&q=low&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
const out = await pg.evaluate(async () => {
  const g = window.__game, r = {}, sim = (s) => window.__sim(s);
  r.act = g.act; r.quests = g.quests.map((q) => q.id).join(',');
  r.enemies = g.enemies.length; r.types = [...new Set(g.enemies.map((e) => e.type))].join(',');
  r.holdDoors = Object.keys(g.storyDoor || {}).join(',');
  r.programs0 = window.__renderer.info.programs.length;
  // a net and a sling stone at the hero
  const e = g.enemies.find((x) => !x.boss) ; const P = g.player.pos;
  e.pos.set(P.x + 6, P.y, P.z); g.throwNet(e, P.clone().sub(e.pos).setY(0).normalize()); sim(0.8); r.netT = +(g.player.netT || 0).toFixed(2);
  const hp0 = g.player.hp; g.lobStone(e.pos.clone().setY(2), P.clone(), 5, 0.6); sim(1.0); r.stoneHit = hp0 > g.player.hp;
  // the boss: spawn, skip his intro, take him through his phases
  g.player.hp = 1e6; g.player.stats.maxHp = 1e6; g.spawnBoss(); window.__director.skip?.(); sim(1); while (g.cinematic) { window.__director.skip?.(); sim(0.5); }
  const B = g.boss; r.boss = B.name + ' L' + B.level; B.rise = 1; g.player.pos.set(B.pos.x + 4, 0, B.pos.z + 4);
  B.hp = B.maxHp * 0.55; for (let i = 0; i < 8 && B.phase < 2; i++) sim(1); r.dbg = [B.st.action, B.rise, B.dead, B.pos.distanceTo(g.player.pos).toFixed(1), g.cinematic].join('/'); while (g.cinematic) { window.__director.skip?.(); sim(0.5); } r.phase = B.phase;
  B.hp = B.maxHp * 0.3; for (let i = 0; i < 8 && !B.duel; i++) sim(1); while (g.cinematic) { window.__director.skip?.(); sim(0.5); } r.duel = !!B.duel;
  B.meteorCd = 0; B.volleyCd = 0; for (let i = 0; i < 6; i++) sim(1);
  r.programs1 = window.__renderer.info.programs.length;
  return r;
});
console.log(JSON.stringify(out));
console.log('errors:', errs.slice(0, 6).join(' | ') || 'none');
await b.close();
