// node tools/mainwalk.mjs [WxH] : Chapter 1 (Clashara mainland) route check. Loads each mainland map with the flags a player would have at that point,
// walks (BFS over solid tiles and visible townsfolk) from where the hero comes in, and checks the next goal can (or, while gated, can't) be reached
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [w, h] = (process.argv[2] || '915x412').split('x').map(Number);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const base = ['intro', 'quest'];
// [map, from, flags, target, expect reachable, what]
const S1 = ['rival1', 'cup_sprout'], S2 = [...S1, 'trial_strength', 'cup_thunder', 'rival2'], S3 = [...S2, 'trial_friendship', 'pip_found', 'pip_saved', 'dash3', 'cup_grove'];
const S4 = [...S3, 'trial_wisdom', 'cup_champion'], S5 = [...S4, 'trial_heart', 'cup_midnight', 'cup_sky', 'cup_legend'];
// [map, from ('n'/'s'/'e'/'w' = the first open tile on that edge), flags, target, expect reachable, what]
const steps = [
  ['village', [11, 10], [], [11, 0], true, 'Sprout Village: home to Route 1 (north edge)'],
  ['route1', 's', [], [8, 7], true, 'Route 1: up to row 6, where Dash steps in for the rival battle (story.js, a trigger, not a blocker)'],
  ['route1', 's', ['rival1'], 'n', true, 'Route 1: open to Bloom Town after the rival battle'],
  ['bloom', 's', ['rival1'], [8, 7], true, 'Bloom Town: Route 1 to the Sprout Stadium door'],
  ['route2', 'w', S1, 'e', false, 'Route 2: Bouldillo blocks the road before the Trial of Strength'],
  ['route2', 'w', [...S1, 'trial_strength'], 'e', true, 'Route 2: open to Seashell Town after the Trial of Strength'],
  ['seashell', 'w', [...S1, 'trial_strength'], [9, 6], true, 'Seashell Town: Route 2 to the Thunder Stadium door'],
  ['glowwood', 's', S2, 'n', false, 'Glowcap Woods: brambles before the Trial of Friendship'],
  ['glowwood', 's', [...S2, 'trial_friendship', 'pip_found', 'pip_saved', 'dash3'], 'n', true, 'Glowcap Woods: open after the Trial of Friendship'],
  ['glowcap', 's', S3, [9, 6], true, 'Glowcap Hollow: woods to the Grove Stadium door'],
  ['cinder', 'w', S3, 'e', false, 'Cinder Road: the Stone Sage holds the bridge before the Trial of Wisdom'],
  ['cinder', 'w', [...S3, 'trial_wisdom'], 'e', true, 'Cinder Road: open after the Trial of Wisdom'],
  ['ember', 'w', [...S3, 'trial_wisdom'], [8, 6], true, 'Cinder Town: road to the Champion Stadium door'],
  ['ember', 'w', S4, 'e', true, 'Cinder Town: east edge to Neon City'],
  ['neon', 'w', S4, [8, 5], true, 'Neon City: west edge to the Midnight Stadium door'],
  ['frostpeak', [8, 8], S5, 'n', true, 'Frostpeak: up to Champion\'s Peak'],
  ['peak', 's', S5, [10, 1], true, 'Champion\'s Peak: the climb to the top'],
];
let bad = 0;
for (const [map, from, fl, to, want, what] of steps) {
  const [fx, fy] = Array.isArray(from) ? from : [from, 0], [tx, ty] = Array.isArray(to) ? to : [to, 0];
  const got = await pg.evaluate(([map, fx, fy, fl, tx, ty]) => {
    const flags = Object.fromEntries(fl.map((k) => [k, true]));
    __save.adv = { hero: 'cindermunch', map, x: typeof fx === 'number' ? fx : 1, y: typeof fy === 'number' ? fy : 1, dir: 's', flags, spawn: { map: 'village', x: 4, y: 6 } };
    __game.screens.adventure(); __sim(0.2);
    const W = __game.screens.worldObj, M = W.M;
    const npc = new Set((M.npcs || []).filter((n) => !(n.hideFlag && flags[n.hideFlag]) && !(n.showFlag && !flags[n.showFlag])).map((n) => n.x + ',' + n.y));
    const ok = (x, y) => x >= 0 && y >= 0 && x < W.W && y < W.H && !W.solid.has(x + ',' + y) && !npc.has(x + ',' + y);
    const edge = (d) => { for (let i = 0; i < (d === 'n' || d === 's' ? W.W : W.H); i++) { const x = d === 'e' ? W.W - 1 : d === 'w' ? 0 : i, y = d === 's' ? W.H - 1 : d === 'n' ? 0 : i; if (ok(x, y) || d === tx) { if (ok(x, y)) return [x, y]; } } return null; };
    if (typeof fx === 'string') { const e = edge(fx); if (!e) return 'no open tile on edge ' + fx; [fx, fy] = e; }
    const seen = new Set([fx + ',' + fy]), q = [[fx, fy]];
    if (typeof tx === 'string') { const d = tx; for (let i = 0; i < (d === 'n' || d === 's' ? W.W : W.H); i++) { const x = d === 'e' ? W.W - 1 : d === 'w' ? 0 : i, y = d === 's' ? W.H - 1 : d === 'n' ? 0 : i; if (ok(x, y)) { tx = x; ty = y; break; } } if (typeof tx === 'string') return false; }
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = q[i][0] + dx, ny = q[i][1] + dy, k = nx + ',' + ny; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } }
    return seen.has(tx + ',' + ty) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((tx + dx) + ',' + (ty + dy)) && npc.has(tx + ',' + ty)); // standing next to a townsfolk target counts
  }, [map, fx, fy, [...base, ...fl], tx, ty]);
  const pass = got === want; if (!pass) bad++;
  console.log(pass ? 'ok  ' : 'FAIL', what);
}
console.log(bad ? `${bad} failed` : 'all good', '· errors:', errs.join(' | ') || 'none');
await b.close();
