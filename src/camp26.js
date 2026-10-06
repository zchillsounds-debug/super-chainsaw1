// Round 26: the camp's own stories. Yusuf, Bishr and 'Amr each have three beats, one per region after the Sawad
// (one beat per region visit, in order; a player who skips ahead picks them up later). A beat is told when Salim stops
// beside the man, calm, and is shown in the dialog box. The third beat gives a gift and changes the camp in every region:
//   Yusuf: his partner Sulayk, lost in the siege, found alive in Wasit: crates of Wasit goods stacked by his stall
//   Bishr: the soldier who owed him half a sword's price comes back wounded and pays: a new anvil by the forge
//   'Amr: an old soldier of the losing side takes on a boy, Nasim: a straw practice post and a spear rack by his ground
// State: p.s25.camp = { yusuf: n, bishr: n, amr: n, at: { yusuf: region, ... } } (saved with s25).
import * as THREE from 'three';
import { REGION, HUB } from './region.js';
import { heightAt } from './terrain.js';
import { makeItem } from './items.js';
import { S25 } from './story25.js';
import { wasitGoods, anvil, drillGround } from './props27.js';
import { t } from './i18n.js';

const ORDER = ['sawad', 'marsh', 'karkh', 'docks', 'hamrin'];
const ARCS = {
  yusuf: { who: 'Yusuf', at: 'merchant', beats: [
    'My partner Sulayk kept our second stall in al-Karkh. When the siege came I left the city; he stayed to watch the goods. I have heard nothing from him since spring.',
    'I found his stall. Ash, and his scales still hanging. A paper-seller says he took his family to Wasit before the fire. Before, Salim. Do you hear? Before.',
    'A letter from Wasit, by a boatman. Sulayk lives, with a cough, a new stall, and opinions about my prices. He wants dates. Take this. You brought the roads back, and the letters with them.',
  ], gift: ['ring', 'Sulayk\'s Scale-Weight', '"Honest to the grain, in Wasit and in Baghdad."'] },
  bishr: { who: 'Bishr', at: 'smith', beats: [
    'Before the war I made a sword for a young soldier of the Abna\'. He paid half and swore he would pay the rest when he came back. His name is scratched on my anvil.',
    'His name was on a list of the wounded at the Anbar gate. Wounded is not dead, Salim. Wounded is not dead.',
    'He came to the forge this morning. One arm in a sling, and the other half of the price in his good hand. I told him to keep it. He would not. So I made something with it. For you.',
  ], gift: ['amulet', 'The Other Half', '"Paid in full, a year late, and gladly."'] },
  amr: { who: '\'Amr', at: 'trainer', beats: [
    'I fought for al-Amin, if you must know. The losing side. I taught boys to hold a line, and then I watched the line break.',
    'A boy from the camp, Nasim, asked me to teach him the spear. I said no. Then I watched him practise it wrong for an hour, and I could not stand it.',
    'Nasim holds a line now. Not for a caliph. For the camp\'s wells, and the women who draw from them. That is a line I can teach. Here. I will not need it at the dummies.',
  ], gift: ['belt', 'The Drill-Master\'s Sash', '"Hold. Breathe. Hold."'] },
};

// the camp, changed: a prop beside the man, in every region once his arc is done (Round 27: sculpted, props27.js)
function campProp(g, k) {
  const A = ARCS[k], at = HUB[A.at]; if (!at) return;
  if (g.campProps27?.[k]) return;
  const grp = k === 'yusuf' ? wasitGoods() : k === 'bishr' ? anvil() : drillGround();
  (g.campProps27 ||= {})[k] = grp;
  // beside the man, a step toward the camp's middle
  const I = HUB.ishaq || at, dx = I[0] - at[0], dz = I[1] - at[1], L = Math.hypot(dx, dz) || 1;
  const x = at[0] + (dx / L) * 1.6 + (dz / L) * 1.8, z = at[1] + (dz / L) * 1.6 - (dx / L) * 1.8;
  grp.position.set(x, heightAt(x, z), z); grp.rotation.y = Math.atan2(dx, dz);
  g.scene.add(grp);
}

export function setupCamp26(g) {
  g.campProp26 = (k) => campProp(g, k); // for tests and shots
  const ri = ORDER.indexOf(REGION); if (ri < 0) return;
  const C = () => { const s = S25(g); return (s.camp ||= { yusuf: 0, bishr: 0, amr: 0, at: {} }); };
  for (const k in ARCS) if (C()[k] >= 3) campProp(g, k);
  let near = 0;
  const prevTick = g.tickExtra;
  g.tickExtra = (dt) => {
    prevTick?.(dt);
    if (g.cinematic || g.interior || g.player.dead || g.ui.dialogOpen || !g.started) return;
    const c = C(), p = g.player.pos;
    for (const k in ARCS) {
      const A = ARCS[k], at = HUB[A.at], n = c[k]; if (!at || n >= 3) continue;
      // beat n is told from the (n+1)th region on, one beat per region visit
      if (ri < n + 1 || c.at[k] === REGION) continue;
      if (Math.hypot(p.x - at[0], p.z - at[1]) > 3.6) continue;
      if (g.enemies.some((e) => !e.dead && e.alerted && e.pos.distanceTo(p) < 24)) continue;
      if ((near += dt) < 1.2) return; near = 0;
      c[k] = n + 1; c.at[k] = REGION;
      g.ui.dialog(t(A.who), t(A.beats[n]), () => {
        if (n < 2) return;
        const [slot, name, flavor] = A.gift;
        try { const it = makeItem(Math.max(1, g.player.level), 'legendary', slot); it.name = name; it.flavor = flavor; g.dropItem(it, g.player.pos.clone().add(new THREE.Vector3(0.8, 0, 0.6))); } catch (e) { /* none */ }
        g.player.renown = (g.player.renown || 0) + 20; campProp(g, k);
        g.ui.toast(`${t(A.who)}: ${t('a gift, and the camp is changed')} (+20 ${t('Renown')})`, 'quest');
      });
      return;
    }
  };
}
