// node shots/r25story.mjs <region> [out]: Round 25 story and pacing check: the choice scene (Photeinos in the Sawad,
// Kallinikos in the marsh, the parley at the docks), an ambush in two waves, the champion, a letter, barks
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out, pick = '1'] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto(`http://localhost:5173/?play&mobile&q=high&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 500000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
const shot = async (n) => { if (out) await pg.screenshot({ path: `${out}/${region}-${n}.png`, timeout: 180000 }); };
const ev = (f, a) => pg.evaluate(f, a);
console.log('setup', JSON.stringify(await ev(() => { const g = __game; return { enc: (g.enc25 || []).map((E) => E.kind + ':' + E.state + '@' + Math.round(E.x) + ',' + Math.round(E.z)), bark: !!g.bark, s25: !!g.player.s25 }; })));
// ---- the choice scene
const scene = { sawad: "__SCENES.lieutenantFalls(g, e, { who: 'Photeinos', text: 'Bardanes paid me in the envoy\\'s gold. Olbianos has the Pages now, at the kilns.', card: { ar: 'الأتون', en: 'Act II · The Kilns', sub: 'test' } })", marsh: '__SCENES.rawhFalls(g, e)', docks: '__SCENES.arrival(g)' }[region];
if (scene) {
  const r = await ev(`(() => { const g = __game; g.player.invuln = 1e9; const p = g.player; const e = g.spawnPack('spearman', p.pos.x + 2, p.pos.z + 1, 1, 3)[0]; e.dead = true; e.st.dead = true; window.__e = e; __director.play(${scene}); let n = 0; while (__director.def && !__director.shot?.choice && n++ < 400) { __sim(0.25); __director.advance(); } return { atChoice: !!__director.shot?.choice, prompt: __director.shot?.choice?.prompt, n }; })()`);
  console.log('choice', JSON.stringify(r));
  await ev(() => __sim(0.3)); await shot('choice');
  if (r.atChoice) {
    await pg.click(`#cine .copt:nth-of-type(${pick})`).catch(async () => { await ev((i) => document.querySelectorAll('#cine .copt')[i - 1]?.click(), +pick); });
    const after = await ev(() => { const lines = []; let n = 0; while (__director.def && n++ < 200) { const s = __director.shot; if (s?.line) lines.push(s.line.who + ': ' + s.line.text); if (s?.caption) lines.push('[' + s.caption + ']'); __sim(0.3); __director.advance(); } return { ch: __game.player.s25?.ch, lines: [...new Set(lines)].slice(0, 8) }; });
    console.log('after', JSON.stringify(after));
  }
  await ev(() => { while (__director.def) __director.skip(); __sim(0.5); });
}
// ---- the ambush
const amb = await ev(() => {
  const g = __game, p = g.player, E = g.enc25.find((x) => x.kind === 'ambush'); if (!E) return 'none';
  for (const e of g.enemies) if (!e.dead && Math.hypot(e.pos.x - E.x, e.pos.z - E.z) < 30 && !e.enc25) { e.hp = 0; e.dead = true; e.rig.visible = false; }
  p.pos.set(E.x, 0, E.z); __sim(7.5);
  const w1 = E.state, n1 = E.foes.length;
  for (const e of E.foes) if (!e.dead) g.damageEnemy(e, 1e6, false, p.pos); __sim(0.5);
  const w2 = E.state, n2 = E.foes.length;
  return { w1, n1, w2, n2 };
});
console.log('ambush', JSON.stringify(amb));
await ev(() => __sim(0.4)); await shot('ambush');
const amb2 = await ev(() => { const g = __game, E = g.enc25.find((x) => x.kind === 'ambush'); for (const e of E.foes) if (!e.dead) g.damageEnemy(e, 1e6, false, g.player.pos); __sim(1); return { state: E.state, bark: document.querySelector('#bark25')?.textContent }; });
console.log('ambush2', JSON.stringify(amb2));
// ---- the champion
const ch = await ev(() => { const g = __game, E = g.enc25.find((x) => x.kind === 'champion'); if (!E) return 'none'; const c = E.champ; g.player.pos.set(c.pos.x + 4, 0, c.pos.z); c.alerted = true; __sim(0.5); const s1 = E.state; for (const e of E.foes) if (!e.dead) g.damageEnemy(e, 1e6, false, g.player.pos); __sim(0.6); return { name: c.name, s1, s2: E.state }; });
console.log('champion', JSON.stringify(ch));
await shot('champion');
// ---- a letter
const lf = await ev(() => { const g = __game; const it = g.scene.children.find((o) => o.isGroup && o.children.length <= 2 && o.children[0]?.geometry?.parameters?.width === 0.34); if (!it) return 'none'; g.player.pos.set(it.position.x, 0, it.position.z); __sim(0.4); return { leaves: Object.keys(g.player.s25.leaves), dialog: document.querySelector('#dialog:not(.hidden) .dtext')?.textContent?.slice(0, 60) }; });
console.log('leaf', JSON.stringify(lf));
await shot('leaf');
console.log('errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
await b.close();
