// node tools/audiocheck.mjs : the C6 audio check. With a live AudioContext, plays every song (day, evening, night) and every
// sound effect (each sfx.arc kind and dialogue babble too) and reports errors; then loads every Adventure map and interior kind
// and prints which tune it plays, by day and at night. Needs window.__music and window.__sfx (main.js).
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
import { endGameSave } from './uisteps.mjs';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.mouse.click(5, 5); // unlocks the AudioContext
await pg.evaluate(endGameSave);
const songs = await pg.evaluate(() => __music.songNames());
for (const s of songs) for (const mood of [false, 'evening', 'night']) {
  await pg.evaluate(([s, mood]) => __music.playMusic(s, mood), [s, mood]); await pg.waitForTimeout(700);
  const now = await pg.evaluate(() => __music.nowPlaying());
  if (!now?.startsWith(s)) console.log('SONG', s, mood, 'did not start:', now);
}
console.log(`${songs.length} songs × 3 moods played`);
const fx = await pg.evaluate(async () => {
  const bad = [], wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const k of Object.keys(__sfx)) {
    if (typeof __sfx[k] !== 'function') continue;
    const args = k === 'arc' ? ['grab', 'gold', 'pearl', 'zap', 'flap', 'hop', 'splash', 'kick', 'air', 'pass', 'tick', 'ready', 'go', 'crash', 'time'].map((a) => [a, 3])
      : k === 'ambient' ? ['bird', 'owl', 'gull', 'rooster', 'cicada', 'cricket', 'surf', 'rain', 'wind', 'hum', 'pop', 'bubble'].map((a) => [a])
        : k === 'talk' ? [['Prof. Pecan', 'e'], ['Old Tutu', 'o'], ['Kid Flo', 'a'], ['', 'x']] : k === 'fanfare' ? [[__critters[0]]] : k === 'ui' ? [['move'], ['ok'], ['back'], ['bounce']] : [[]];
    for (const a of args) { try { __sfx[k](...a); } catch (e) { bad.push(k + '(' + a.map(String).join(',') + '): ' + e.message); } await wait(30); }
  }
  return bad;
});
console.log(fx.length ? 'SFX errors: ' + fx.join(' | ') : 'every sound effect played');
// which tune each place plays
const maps = await pg.evaluate(() => Object.keys(__maps));
const rows = [];
for (const m of maps) {
  const r = await pg.evaluate(async (m) => {
    const out = [];
    for (const clock of [12, 23]) {
      __save.adv.clock = clock; __save.adv.map = m; const M = __maps[m]; __save.adv.x = M.start?.[0] ?? 5; __save.adv.y = M.start?.[1] ?? 5;
      __game.endBattle?.(); __game.screens.leaveWorld?.(); __game.screens.adventure(); __game.step(0.1);
      out.push(__music.nowPlaying());
    }
    return out;
  }, m).catch((e) => ['ERR ' + e.message.split('\n')[0]]);
  rows.push(`${m}: ${r.join(' / ')}`);
}
const ins = await pg.evaluate(async () => {
  const want = { center: 'in:bloom:berry', lobby: 'in:bloom:stadium', tower: 'in:atoll:hideout_a', arcade: 'in:neon:arcade', house: 'in:village:home' }, out = [];
  for (const [k, key] of Object.entries(want)) { try { __game.screens.worldObj.load(key, 4, 5, 'n'); __game.step(0.1); out.push(`${k} (${key}): ${__music.nowPlaying()}`); } catch (e) { out.push(`${k}: ERR ${e.message}`); } }
  return out;
});
console.log('day / night tunes:\n  ' + rows.join('\n  ') + '\n  ' + ins.join('\n  '));
if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 6).join(' | '));
else console.log('no page errors');
await b.close();
