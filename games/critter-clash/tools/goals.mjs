// node tools/goals.mjs : the ☰ goal line and the orange story ❗ (storyMark) at every main-story stage, mainland then isles
import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 915, height: 412 } });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
// each stage: [flags added, the map whose ❗ marks to list]
const STAGES = [
  [[], 'village'], [['quest'], 'route1'], [['rival1'], 'bloom'], [['cup_sprout'], 'route2'], [['trial_strength'], 'seashell'], [['rival2'], 'seashell'],
  [['cup_thunder'], 'glowwood'], [['mama_asked'], 'glowwood'], [['pip_saved', 'pip_found'], 'glowwood'], [['trial_friendship', 'dash3'], 'glowcap'], [['cup_grove'], 'cinder'],
  [['trial_wisdom'], 'ember'], [['cup_champion'], 'neon'], [['trial_heart', 'post_heart'], 'neon'], [['cup_midnight'], 'cloudtop'], [['cup_sky'], 'frostpeak'], [['cup_legend'], 'peak'],
  [['dash5'], 'peak'], [['crowned', 'ending'], 'seashell'], [['isle_arrive'], 'coral'], [['cup_coral'], 'bluffs'], [['cup_gale'], 'bluffs'], [['skua_b'], 'ember_isle'],
  [['cup_caldera'], 'atoll'], [['morra', 'sunstone'], 'atoll'],
];
const fl = ['intro'];
for (const [add, map] of STAGES) {
  fl.push(...add);
  const r = await pg.evaluate(([fl, map]) => {
    Object.assign(__save, { trainer: { name: 'Sam', partner: 'cindermunch' }, tutorialDone: true });
    __save.adv = { hero: 'cindermunch', map, x: 2, y: 2, dir: 's', flags: Object.fromEntries(fl.map((k) => [k, true])), spawn: { map: 'village', x: 4, y: 6 }, follow: fl.includes('pip_found') && !fl.includes('trial_friendship') ? 'squeakwing' : null };
    const S = __game.screens; S.adventure(); __sim(0.2);
    const wo = S.worldObj; wo.hx = 2; // the goal line is the same wherever the hero stands
    S.worldMenu(); const g = document.querySelector('.wd-goal')?.firstChild?.textContent || '?';
    document.querySelector('.modal-wrap')?.remove();
    return { g, marks: wo.npcs.filter((a) => a.mark).map((a) => (a.markKind === 'm' ? '🟠' : a.markKind) + a.n.name) };
  }, [fl, map]);
  console.log(`[${add.join('+') || 'start'}] @${map} 📜 ${r.g}\n      marks: ${r.marks.join(', ') || '-'}`);
}
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
