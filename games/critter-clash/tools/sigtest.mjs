// node tools/sigtest.mjs <arena> <outprefix> : forces the arena's signature hazard and screenshots it
import { execFileSync } from 'child_process';
const [arena, out, wide] = process.argv.slice(2);
const cam = wide ? "const g=__game; g.battle.updateCamera=()=>{g.camera.position.set(0,17,13);g.camera.lookAt(0,0,0);}; document.getElementById('ui').style.display='none';" : '';
const steps = [
  [cam + "__sim(9); __game.battle.hazards.timer=99; __game.battle.hazards.signature(); 'ok'", '_go', 100],
  ['__sim(0.9); __game.battle.hazards.sig?.t', 'warn', 300],
  ['__sim(0.9); __game.battle.hazards.sig?.t', 'live', 300],
  ['__sim(1.0); __game.battle.hazards.sig?.t', 'live2', 300],
  ['__sim(6); JSON.stringify({sig: !!__game.battle.hazards.sig, hp: __game.battle.fighters.map(f=>f.hp|0), seen: __game.battle.stats.hazardsSeen, hits: __game.battle.stats.hazardHits})', 'after', 300],
];
execFileSync('node', ['tools/multi.mjs', '915', '412', `play&auto&p=cindermunch&c=bubbalotl&arena=${arena}`, out, JSON.stringify(steps)], { stdio: 'inherit' });
