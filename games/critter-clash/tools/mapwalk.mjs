// node tools/mapwalk.mjs [WxH] [map,map] : every-map route audit with an end-game save (every story flag set).
// For each map it walks (BFS over solid tiles and visible townsfolk) from the first way in and reports any door, open edge
// or edge landing that can't be reached, plus edges whose landing tile on the next map is blocked. Doors count from the tile in front.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const only = process.argv[3]?.split(',');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const keys = only || await pg.evaluate(() => Object.keys(__maps));
// an end-game save: every flag a townsfolk or edge gate mentions (blockers step aside, gates open), plus the story milestones
const FLAGS = await pg.evaluate(() => { const F = new Set('intro quest rival1 crowned ending isle_arrive sunstone morra skua_b glider lantern'.split(' '));
  for (const M of Object.values(__maps)) { for (const n of M.npcs || []) for (const k of ['hideFlag', 'showFlag']) n[k] && F.add(n[k]); for (const e of Object.values(M.edges || {})) e.need && F.add(e.need); for (const bd of M.buildings || []) bd.stadium && F.add('cup_' + bd.stadium); }
  return [...F]; });
let bad = 0;
const PUZZLE = { grotto: 'edge n → grotto2' }; // behind the boulder puzzle on purpose (boulders count as solid here)
const geo = {}; // map -> { W, H, open: Set } for the edge-landing check
for (const map of keys) {
  await pg.evaluate(([map, FLAGS]) => {
    __save.trainer = { name: 'Sam', partner: 'cindermunch' }; __save.tutorialDone = true;
    __save.adv = { hero: 'cindermunch', map, x: 1, y: 1, dir: 's', flags: Object.fromEntries(FLAGS.map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 }, hats: [], clock: 12, rain: false };
    __game.screens.adventure(); __sim(0.1);
  }, [map, FLAGS]);
  const res = await pg.evaluate((map) => {
    const W = __game.screens.worldObj, M = W.M;
    const flags = __save.adv.flags;
    const npc = new Set((M.npcs || []).filter((n) => !(n.hideFlag && flags[n.hideFlag]) && !(n.showFlag && !flags[n.showFlag])).map((n) => n.x + ',' + n.y));
    const ok = (x, y) => x >= 0 && y >= 0 && x < W.W && y < W.H && !W.solid.has(x + ',' + y) && !npc.has(x + ',' + y);
    const ways = []; // [label, x, y]
    for (const bd of M.buildings || []) if (bd.door != null) ways.push(['door ' + (bd.label || bd.id), bd.x + bd.door, bd.y + bd.h]);
    const E = M.edges || {};
    for (const d of Object.keys(E)) {
      const cells = [];
      for (let i = 0; i < (d === 'n' || d === 's' ? W.W : W.H); i++) { const x = d === 'e' ? W.W - 1 : d === 'w' ? 0 : i, y = d === 's' ? W.H - 1 : d === 'n' ? 0 : i; if (ok(x, y)) cells.push([x, y]); }
      if (!cells.length) ways.push(['edge ' + d + ' → ' + E[d].to + ' (no open tile)', -1, -1]);
      else ways.push(['edge ' + d + ' → ' + E[d].to, cells[0][0], cells[0][1]]);
    }
    const open = []; for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) if (ok(x, y)) open.push(x + ',' + y);
    const start = ways.find((q) => q[1] >= 0 && ok(q[1], q[2]));
    const seen = new Set();
    if (start) { const q = [[start[1], start[2]]]; seen.add(start[1] + ',' + start[2]); for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
    const miss = ways.filter(([, x, y]) => x < 0 || !seen.has(x + ',' + y)).map((q) => q[0] + (q[1] >= 0 ? ` @${q[1]},${q[2]}${ok(q[1], q[2]) ? '' : ' (blocked)'}` : ''));
    return { W: W.W, H: W.H, open, edges: E, miss, ways: ways.length, start: start?.[0] };
  }, map);
  geo[map] = { W: res.W, H: res.H, open: new Set(res.open), edges: res.edges };
  if (PUZZLE[map]) res.miss = res.miss.filter((m) => !m.startsWith(PUZZLE[map]));
  if (res.miss.length) { bad += res.miss.length; console.log('FAIL', map, `(from ${res.start}):`, res.miss.join(' | ')); } else console.log('ok  ', map, `${res.ways} ways in/out`);
}
// edge landings: walking off edge d at (x,y) lands on the next map at the opposite side, shifted by off
for (const [map, G] of Object.entries(geo)) for (const [d, e] of Object.entries(G.edges)) {
  const T = geo[e.to]; if (!T) continue;
  let blocked = 0, n = 0;
  for (const c of G.open) {
    const [x, y] = c.split(',').map(Number);
    if (!((d === 'n' && y === 0) || (d === 's' && y === G.H - 1) || (d === 'w' && x === 0) || (d === 'e' && x === G.W - 1))) continue;
    n++;
    const off = e.off || 0, lx = d === 'e' ? 0 : d === 'w' ? T.W - 1 : x + off, ly = d === 's' ? 0 : d === 'n' ? T.H - 1 : y + off;
    if (!T.open.has(lx + ',' + ly)) blocked++;
  }
  if (blocked) { bad++; console.log('FAIL', `${map} edge ${d} → ${e.to}: ${blocked}/${n} edge tiles land on a blocked tile`); }
}
console.log(bad ? `${bad} problems` : 'all good', '· errors:', errs.join(' | ') || 'none');
await b.close();
