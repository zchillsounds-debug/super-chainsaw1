// node shots/holdcheck.mjs: every hold map is whole and can be finished (pure data, no browser)
import { MAPS22 } from '../src/holdmaps.js';
const BASE = new Set(['.', 'E', 'C', 'm', 'a', 'M', 'B', 'T', 'S', '=', 'K', 'o', 'L']);
let bad = 0;
for (const [id, rows] of Object.entries(MAPS22)) {
  const W = rows[0].length, H = rows.length, errs = [];
  rows.forEach((r, i) => { if (r.length !== W) errs.push(`row ${i} is ${r.length} wide, not ${W}`); });
  const find = (ch) => { const o = []; rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) o.push([x, y]); })); return o; };
  const n = (ch) => find(ch).length;
  for (const [ch, want] of [['E', 1], ['M', 1], ['B', 1], ['T', 1]]) if (n(ch) !== want) errs.push(`${n(ch)} × ${ch}`);
  if (n('C') < 2) errs.push('fewer than 2 fires'); if (n('S') < 1) errs.push('no hidden chest');
  const reach = (open) => { const at = (x, y) => rows[y]?.[x] ?? '#'; const ok = (c) => BASE.has(c) || open.includes(c);
    const [e] = find('E'), seen = new Set([e.join()]), q = [e];
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!seen.has(k) && ok(at(x + dx, y + dy))) { seen.add(k); q.push([x + dx, y + dy]); } } }
    return seen; };
  const has = (set, ch) => find(ch).every((p) => set.has(p.join()));
  const base = reach([]), lever = n('L') ? reach(['D', 'b']) : base, all = reach(['D', 'b', 'x', 'h']);
  if (n('L') && !has(base, 'L')) errs.push('lever not reachable');
  if (n('L') && !n('D') && !n('b')) errs.push('lever opens nothing');
  for (const ch of ['M', 'B', 'T', 'C', 'm', 'a']) if (!has(lever, ch)) errs.push(`${ch} not reachable`);
  if (find('S').some((p) => base.has(p.join()))) errs.push('hidden chest open without a secret');
  if (!has(all, 'S')) errs.push('hidden chest unreachable');
  if ((n('D') || n('b')) && has(base, 'B') && n('D')) errs.push('portcullis gates nothing');
  for (const [x, y] of find('g')) { const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => BASE.has(rows[b]?.[a])); if (!sides.every((s) => all.has(s.join()))) errs.push(`gate ${x},${y} has an unreachable side`); }
  console.log(id.padEnd(11), `${W}x${H}`, errs.length ? 'FAIL ' + errs.join('; ') : 'ok'); bad += errs.length;
}
process.exit(bad ? 1 : 0);
