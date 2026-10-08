// Round 26: the Hamrin story. The hill camp gets three beats of its own around Tatzates' last stand:
//   - a scout of his, brought in bound, names the frontier road (first time Salim comes near Ishaq in the camp)
//   - after two holds fall, an arrow lands beside Salim in the camp with a message tied to it
//   - the face-off in his ravine (holds.js rivalLast) and his fall (scenes.js lieutenantFalls): Salim chooses chains for
//     Baghdad or a cut bowstring and the road north; lamps on the Diyala for the dead guards close it
// Choices live in p.s25.ch.tatzates ('chains' | 'free'); the beats seen in p.s25.said (h26scout, h26arrow, h26ishaq).
import { REGION, HUB } from './region.js';
import * as SCENES from './scenes.js';
import { S25 } from './story25.js';
import { t } from './i18n.js';

const ISHAQ_AFTER = {
  chains: 'A qadi, not a blade. Jabir will say the same.',
  free: 'You let him walk. Good. We keep the account by remembering, not by killing.',
};

export function setupStory26(g) {
  // what the choice does
  const prevChoice = g.onChoice25;
  g.onChoice25 = (k, v) => {
    prevChoice?.(k, v);
    if (k !== 'tatzates') return;
    const p = g.player; p.rival = { ...(p.rival || {}), final: v };
    const n = v === 'chains' ? 30 : 15; p.renown = (p.renown || 0) + n;
    setTimeout(() => g.ui.toast(t(v === 'chains' ? 'Tatzates will answer before the qadi in Baghdad.' : 'Tatzates walks north with a cut bowstring.') + ` (+${n} ${t('Renown')})`, 'quest'), 4000);
  };
  if (REGION !== 'hamrin') return;
  let wait = 0;
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (g.cinematic || g.interior || g.player.dead || g.ui.dialogOpen || !g.director || !g.started) return;
    const s = S25(g), p = g.player, I = HUB.ishaq; if (!I) return;
    const nearIshaq = Math.hypot(p.pos.x - I[0], p.pos.z - I[1]) < 12;
    const calm = !g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 24);
    if (!calm) { wait = 0; return; }
    wait += dt; if (wait < 2.5) return;
    const st = (id) => g.holds?.state(id) || {};
    const done = ['quarry', 'fort', 'gorge'].filter((id) => st(id).done).length;
    if (!s.said.h26scout && nearIshaq) { s.said.h26scout = true; wait = 0; g.director.play(SCENES.hamrinScout(g)); return; }
    if (!s.said.h26arrow && s.said.h26scout && done >= 2 && !st('rivalhold').done && Math.hypot(p.pos.x - I[0], p.pos.z - I[1]) < 30) { s.said.h26arrow = true; wait = 0; g.director.play(SCENES.hamrinArrow(g)); return; }
    const ch = s.ch?.tatzates;
    if (ch && !s.said.h26ishaq && nearIshaq && g.bark?.('Ishaq', ISHAQ_AFTER[ch], 6000)) s.said.h26ishaq = true;
  };
}
