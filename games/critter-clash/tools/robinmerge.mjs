// node tools/robinmerge.mjs [id,id] : adds up tools/out/robin-*.json (robinpart.mjs shards) and prints win rates (focus ids only if given)
import { readdirSync, readFileSync } from 'fs';
const dir = new URL('./out/', import.meta.url), focus = process.argv[2]?.split(','), W = {}, M = {};
let done = 0, of = 0;
for (const f of readdirSync(dir).filter((f) => /^robin-\d+\.json$/.test(f))) {
  const j = JSON.parse(readFileSync(new URL(f, dir))); done += j.done; of += j.of;
  for (const [i, [w, l]] of Object.entries(j.W)) { W[i] = W[i] || [0, 0]; W[i][0] += w; W[i][1] += l; }
  for (const [p, r] of Object.entries(j.M)) { M[p] = M[p] || {}; for (const [i, v] of Object.entries(r)) M[p][i] = (M[p][i] || 0) + v; }
}
console.log(`${done}/${of} matches`);
const rate = ([w, l]) => w / (w + l);
for (const [i, s] of Object.entries(W).filter(([i]) => !focus || focus.includes(i)).sort((x, y) => rate(y[1]) - rate(x[1])))
  console.log(i.padEnd(12), s[0], s[1], (100 * rate(s)).toFixed(0) + '%' + (rate(s) < 0.4 || rate(s) > 0.65 ? '  <-- out of range' : ''));
if (process.env.PAIRS) console.log(JSON.stringify(M));
