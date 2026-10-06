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

// the camp, changed: built from plain boxes and cylinders beside the man, in every region once his arc is done
function campProp(g, k) {
  const A = ARCS[k], at = HUB[A.at]; if (!at) return;
  const grp = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x4a3622, roughness: 0.95 });
  const box = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; grp.add(o); return o; };
  const cyl = (r, h, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; grp.add(o); return o; };
  if (k === 'yusuf') {
    // crates of Wasit goods, a sack of dates and a bolt of dyed cloth
    const cloth = new THREE.MeshStandardMaterial({ color: 0x2a5a7a, roughness: 0.8 }), sack = new THREE.MeshStandardMaterial({ color: 0xb09a70, roughness: 1 });
    box(0.7, 0.5, 0.6, wood, 0, 0.25, 0, 0.2); box(0.6, 0.45, 0.55, dark, 0.75, 0.22, 0.1, -0.15); box(0.55, 0.4, 0.5, wood, 0.35, 0.7, 0.05, 0.4);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), sack); s.scale.set(1, 1.2, 1); s.position.set(-0.6, 0.34, 0.2); s.castShadow = true; grp.add(s);
    cyl(0.12, 0.9, cloth, 0.2, 0.62, 0.45, 0, Math.PI / 2);
  } else if (k === 'bishr') {
    // a new anvil on a stump, bright on the face
    const iron = new THREE.MeshStandardMaterial({ color: 0x5a5a5e, metalness: 0.8, roughness: 0.35 });
    cyl(0.32, 0.55, dark, 0, 0.27, 0); box(0.62, 0.2, 0.26, iron, 0, 0.66, 0); box(0.34, 0.14, 0.2, iron, 0, 0.5, 0);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 8), iron); horn.rotation.z = Math.PI / 2; horn.position.set(0.46, 0.68, 0); grp.add(horn);
  } else {
    // a straw practice post with a crossbar of rope bundles, and a rack of wooden spears
    const straw = new THREE.MeshStandardMaterial({ color: 0xc8a860, roughness: 1 });
    cyl(0.06, 1.8, wood, 0, 0.9, 0); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.75, 10), straw); b.position.set(0, 1.25, 0); b.castShadow = true; grp.add(b);
    box(0.06, 1.0, 0.06, dark, 1.0, 0.5, -0.3); box(0.06, 1.0, 0.06, dark, 1.8, 0.5, -0.3); box(0.9, 0.06, 0.06, dark, 1.4, 0.85, -0.3);
    for (let i = 0; i < 4; i++) cyl(0.025, 1.9, wood, 1.1 + i * 0.2, 0.95, -0.22, 0.12, 0);
  }
  // beside the man, a step toward the camp's middle
  const I = HUB.ishaq || at, dx = I[0] - at[0], dz = I[1] - at[1], L = Math.hypot(dx, dz) || 1;
  const x = at[0] + (dx / L) * 1.6 + (dz / L) * 1.8, z = at[1] + (dz / L) * 1.6 - (dx / L) * 1.8;
  grp.position.set(x, heightAt(x, z), z); grp.rotation.y = Math.atan2(dx, dz);
  g.scene.add(grp);
}

export function setupCamp26(g) {
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
