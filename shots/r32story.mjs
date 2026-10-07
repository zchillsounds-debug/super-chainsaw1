// node shots/r32story.mjs <region> [out] [pick 0|1] [lang]: the Round 32 story in one region. Plays every beat by its own
// trigger (prerequisites set, Salim placed), answering choices with option [pick]; walks over every Thing Found; kills an
// elite for a letter of the Rum; checks the Rum shout as they come; walks with a hired guard for his story beats.
// Prints every line and caption; shots of a few beats in [out].
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [region = 'sawad', out, pick = '0', lang] = process.argv.slice(2);
if (out) fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
if (lang) await pg.addInitScript((l) => { try { localStorage.setItem('sob.settings.v1', JSON.stringify({ lang: l })); } catch { /* none */ } }, lang);
await pg.goto(`http://localhost:${process.env.PORT || 5173}/?play&mobile&noadapt&region=${region}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 900000 });
await pg.evaluate("{const s=document.createElement('style');s.textContent='*{animation-duration:0s!important;transition:none!important}';document.head.appendChild(s)}");
let n = 0;
const shot = async (tag) => { if (out) await pg.screenshot({ path: `${out}/${region}-${String(n++).padStart(2, '0')}-${tag}.png`, timeout: 180000 }); };
const clear = () => pg.evaluate(() => { const g = __game; for (const e of g.enemies) { e.dead = true; e.removed = true; g.scene.remove(e.rig); } g.enemies = []; g.player.invuln = 1e9; });
const play = async (tag, wantShots = 2) => {
  const seen = []; let shots = 0;
  for (let i = 0; i < 90; i++) {
    const st = await pg.evaluate(() => { const d = __director; if (!d.def) return null; const s = d.shot || {}; return { i: d.i, line: s.line ? s.line.who + ': ' + s.line.text : null, cap: s.caption || null, card: s.card?.en || null, choice: !!s.choice && document.querySelector('.cchoice .cprompt')?.textContent }; });
    if (!st) break;
    const key = st.i + (st.line || st.cap || st.card || st.choice || '');
    if (!seen.includes(key)) {
      seen.push(key); console.log(`  [${tag} ${st.i}] ${st.line || (st.cap ? 'caption: ' + st.cap : st.card ? 'card: ' + st.card : st.choice ? 'CHOICE: ' + st.choice : '(shot)')}`);
      if ((st.line || st.cap || st.choice) && shots < wantShots && (st.i === 1 || st.choice || st.i === 3)) { await pg.evaluate(() => __sim(0.6)); await shot(tag); shots++; }
    }
    if (st.choice) { await pg.evaluate((k) => { const bs = document.querySelectorAll('.cchoice.show button'); bs[k]?.click(); }, +pick); await pg.evaluate(() => __sim(0.2)); continue; }
    await pg.evaluate(() => { __director.next ? __director.next() : __director.skip(); __sim(0.1); });
  }
};
await clear();
const beats = (await pg.evaluate(() => __game.__r32.beats().map((b) => b.id))).filter((id) => !process.env.ONLY || id === process.env.ONLY);
console.log('beats:', beats.join(', '));
// prerequisites per beat: holds done, earlier beats said, choices made
const PRE = {
  niketasMeet: "g.holds.state('dam').done = true", lubnaRoad: "s.said.r32_caravanBoys = true",
  lubnaMarsh: "s.said.r32_lubnaRoad = true", niketasMarsh: "s.ch.niketas ||= 'hide'", reedsOverheard: "g.holds.state('stockade').done = true",
  lastLesson: "s.said.ishaq = true", lubnaHome: "s.said.r32_lubnaRoad = true", truceInAsh: "g.holds.state('quarter').done = true",
  niketasDocks: "s.ch.niketas ||= 'hide'", lubnaQuays: "s.said.r32_lubnaHome = true", copiesWhere: "g.holds.state('shipyard').done = true",
  envoyLetter: "s.said.h26scout = true",
};
for (const id of beats) {
  const started = await pg.evaluate(([id, pre]) => {
    const g = __game, p = g.player, s = p.s25 ||= { ch: {}, leaves: {}, mem: {}, said: {} }; s.said ||= {}; s.ch ||= {};
    for (const b of g.__r32.beats()) if (b.id !== id && !s.said['r32_' + b.id]) s.said['r32_' + b.id] = 'skip';
    if (pre) eval(pre);
    const B = g.__r32.beats().find((b) => b.id === id);
    const I = g.npc.position;
    if (B.near) { p.pos.set(B.near[0] + 2, 0, B.near[1] + 2); } else { p.pos.set(I.x + 44, 0, I.z + 20); }
    p.pos.y = 0;
    for (let i = 0; i < 60 && !__director.def; i++) __sim(0.1);
    const ok = !!__director.def;
    for (const k in s.said) if (s.said[k] === 'skip') delete s.said[k];
    return ok;
  }, [id, PRE[id]]);
  console.log(`beat ${id}:`, started);
  if (started) await play(id);
}
if (process.env.ONLY) { console.log('errors:', errs.join('\n') || 'none'); await b.close(); process.exit(0); }
await pg.evaluate((region) => { const g = __game, s = g.player.s25; for (const b of g.__r32.beats()) s.said['r32_' + b.id] ||= true; for (const k of ['serai', 'kiln', 'arch']) s.said['r32_lm_' + region + k] = true; s.said['r32_news_' + region] = true; while (__director.def) { __director.skip(); __sim(0.1); } }, region);
console.log('choices:', JSON.stringify(await pg.evaluate(() => __game.player.s25.ch)));
// Things Found: walk over each one
const found = await pg.evaluate(() => {
  const g = __game, p = g.player, log = [];
  for (const it of g.__r32.items) {
    p.pos.set(it.pos.x, 0, it.pos.z); p.pos.y = 0; __sim(0.1);
    while (__director.def) { __director.skip(); __sim(0.1); }
    for (const e of g.enemies) { e.dead = true; e.removed = true; g.scene.remove(e.rig); } g.enemies = []; g.bossActive = false;
    p.pos.set(it.pos.x, 0, it.pos.z); __sim(0.3);
    const t = document.querySelector('#dialog:not(.hidden) .dname')?.textContent; log.push(it.F.id + ' ' + (t || 'NONE'));
    document.querySelector('#dialog .dbtn')?.click(); __sim(0.1);
  }
  return log.join(' | ') + ' · codex: ' + Object.keys(p.codex || {}).filter((k) => k.startsWith('f32_')).length;
});
console.log('found:', found);
// a letter of the Rum on a fallen elite
const letter = await pg.evaluate(() => {
  const g = __game, p = g.player; let got = null; const I = g.npc.position; p.pos.set(I.x + 6, 0, I.z + 6);
  while (__director.def) { __director.skip(); __sim(0.1); }
  for (let k = 0; k < 6 && !got; k++) {
    const x = p.pos.x + 3, z = p.pos.z; g.spawnPack('guard', x, z, 1, Math.max(2, p.level), { elite: true });
    const e = g.enemies[g.enemies.length - 1]; e.elite = true; g.damageEnemy(e, e.hp + 10, false, p.pos, 'normal', { unblockable: true }); __sim(0.5);
    for (const e2 of g.enemies) { e2.dead = true; e2.removed = true; g.scene.remove(e2.rig); } g.enemies = [];
    const D = g.__r32.drops[0];
    if (D) { p.pos.set(D.pos.x, 0, D.pos.z); __sim(0.4); got = document.querySelector('#dialog:not(.hidden) .dtext')?.textContent; document.querySelector('#dialog .dbtn')?.click(); }
  }
  return got;
});
console.log('letter:', letter);
// the Rum shout as they come
const shout = await pg.evaluate(() => {
  const g = __game, p = g.player; const seen = [];
  g.spawnPack('guard', p.pos.x + 10, p.pos.z + 2, 4, Math.max(2, p.level));
  for (const e of g.enemies) e.alerted = true;
  for (let i = 0; i < 30; i++) { __sim(0.2); const b = document.querySelector('#bark25.show'); if (b) { const t = b.textContent; if (!seen.includes(t)) seen.push(t); } }
  for (const e of g.enemies) { e.dead = true; e.removed = true; g.scene.remove(e.rig); } g.enemies = []; __sim(0.5);
  return seen.join(' | ') || 'none';
});
console.log('shout:', shout);
if (out) await shot('after');
// the guard's story, walking out on the land
const guard = await pg.evaluate(() => {
  const g = __game, p = g.player, C = g.__companion, s = p.s25; s.g32 = {}; s.g32at = {};
  p.companion = { kind: 'spear', order: 'follow' }; C.spawn('spear');
  const I = g.npc.position; p.pos.set(I.x + 46, 0, I.z + 16);
  const seen = [];
  const A = [I.x + 46, I.z + 16], Bp = [I.x + 46, I.z - 24]; let leg = 0;
  for (let i = 0; i < 500; i++) { if (!g.walk || !g.walk.path) { leg ^= 1; const T = leg ? Bp : A; g.walkTo(T[0], T[1]); } __sim(0.25); const b = document.querySelector('#bark25.show'); if (b) { const t = b.textContent; if (!seen.includes(t)) seen.push(t); } if (seen.length >= 3 && !document.querySelector('#bark25.show')) break; }
  g.walk = null;
  return JSON.stringify(s.g32) + ' ' + seen.join(' | ');
});
console.log('guard:', guard);
console.log('errors:', errs.join('\n') || 'none'); await b.close();
