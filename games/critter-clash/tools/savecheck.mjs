// node tools/savecheck.mjs : the C7 save check. Boots the game on damaged and odd saves (not JSON, with and without a last good
// copy, a bare string or array, a very old minimal save, wrong types everywhere, an Adventure save on a map or hero that doesn't
// exist), then opens the title, Quick Battle select and the Adventure, and reports what loaded and any page errors.
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const KEY = 'critter-clash-save-v1';
const good = JSON.stringify({ unlocked: ['cindermunch', 'bubbalotl', 'clovebun', 'pebblit'], critters: { cindermunch: { level: 12, xp: 5, wins: 9 } }, berries: 42, trainer: { name: 'Backup', partner: 'cindermunch' }, tutorialDone: true });
const CASES = [
  ['not JSON, last good copy', { [KEY]: '{"unlocked":["cinder', [KEY + '-bak']: good }],
  ['not JSON, no copy', { [KEY]: '{{{{' }],
  ['a bare string', { [KEY]: '"hello"' }],
  ['an array', { [KEY]: '[1,2,3]' }],
  ['null', { [KEY]: 'null' }],
  ['old minimal save', { [KEY]: JSON.stringify({ unlocked: ['cindermunch'], critters: { cindermunch: { level: 5 } } }) }],
  ['wrong types', { [KEY]: JSON.stringify({ unlocked: 'all', critters: 5, settings: null, stats: [], trainer: 'Sam', cups: 3, shinies: {}, skins: null, berries: 'lots', adv: 7 }) }],
  ['odd critter values', { [KEY]: JSON.stringify({ unlocked: ['cindermunch', 'nosuchmon'], critters: { cindermunch: { level: 999, xp: -5 }, bubbalotl: null }, settings: { music: 7, sfx: 'loud' }, trainer: { name: 5, partner: 'cindermunch' }, tutorialDone: true }) }],
  ['adventure on a missing map', { [KEY]: JSON.stringify({ unlocked: ['cindermunch'], trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, adv: { hero: 'nosuchmon', map: 'atlantis', x: 99, y: -4, flags: null, hats: 'cap' } }) }],
  ['adventure off the map edge', { [KEY]: JSON.stringify({ unlocked: ['cindermunch'], trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, adv: { hero: 'cindermunch', map: 'bloom', x: 500, y: 500, flags: { intro: true }, hats: [] } }) }],
  ['adventure in a missing room', { [KEY]: JSON.stringify({ unlocked: ['cindermunch'], trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true, adv: { hero: 'cindermunch', map: 'in:bloom:nowhere', x: 3, y: 3, flags: { intro: true }, hats: [] } }) }],
];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const [name, store] of CASES) {
  const pg = await b.newPage({ viewport: { width: 740, height: 360 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript((st) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, store);
  await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?mobile&q=low');
  const ok = await pg.waitForFunction(() => window.__ready, null, { timeout: 60000 }).then(() => true, () => false);
  let res = 'did not boot';
  if (ok) {
    res = await pg.evaluate(() => {
      const S = __game.screens, out = [];
      try { S.title(); out.push('title'); } catch (e) { out.push('title ERR ' + e.message); }
      try { S.ctx = { kind: 'quick' }; S.select(); out.push('select'); } catch (e) { out.push('select ERR ' + e.message); }
      try { S.adventure(); __sim(1); out.push('world ' + (S.worldObj?.key || '?') + ' ' + S.worldObj?.hx + ',' + S.worldObj?.hy); } catch (e) { out.push('world ERR ' + e.message); }
      out.push(`unlocked ${__save.unlocked.length}, berries ${__save.berries}, name "${__save.trainer.name}"`);
      return out.join(' · ');
    }).catch((e) => 'ERR ' + e.message.split('\n')[0]);
    const kept = await pg.evaluate((K) => !!localStorage.getItem(K + '-broken'), KEY);
    if (kept) res += ' · broken copy kept';
  }
  if (!ok || errs.length || /ERR/.test(res)) bad++;
  console.log(`${name}: ${res}${errs.length ? ' · PAGE ERRORS ' + [...new Set(errs)].slice(0, 3).join(' | ') : ''}`);
  await pg.close();
}
console.log(bad ? `${bad} cases with problems` : 'all cases boot and play');
await b.close();
