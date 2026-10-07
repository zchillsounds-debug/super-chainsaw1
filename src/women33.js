// Round 33: women in the world. Until now Umayma was the only woman in the game.
//  - the camp: Hind keeps the cooking pot and Su'da carries the water, in every camp, with a line each per region
//  - the villages: one named woman in each region's village, with two lines of her own (Khawla at the Sawad well,
//    Layla weaving reed mats in the marsh, Asma' sorting bricks in al-Karkh, Barra selling bread on the quays,
//    Fakhita with her goats in the Hamrin)
//  - the village crowds: every third villager is a woman (game.js addAmbientLife, womanLook below)
// Dress: a head shawl (human.js `wrap`) over a long robe to the ankle, no weapon; the woman's sculpt (`fem`).
import * as THREE from 'three';
import { REGION, HUB, IS_EPILOGUE } from './region.js';
import { SITES, heightAt } from './terrain.js';
import { npc } from './hub.js';
import { freeSpot } from './sidequests.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { t } from './i18n.js';

const WRAPS = [0xd8ccb0, 0x2a3a5a, 0x7a3a2a, 0x2a2420, 0xb8a68a, 0x4a5a4a];
// robes stand clear of the skin tones (a brown robe read as bare skin from the camera)
const ROBES = [['#5a3a4a', '#2a1a2a'], ['#3a4a6a', '#1a2a3a'], ['#c8bca0', '#5a4a3a'], ['#2a2a2a', '#6a5a3a'], ['#7a2a2a', '#3a1a1a'], ['#4a5a4a', '#2a3a2a']];
const SKINS = [0xa8714a, 0x8a5a3a, 0xb88a60, 0x9a6a44];
// a woman's look: the shawl over a long robe; i picks the colours
export function womanLook(i, extra = {}) {
  const [robe, robe2] = ROBES[i % ROBES.length];
  return { robe, robe2, wrap: WRAPS[(i * 5 + 1) % WRAPS.length], skin: SKINS[i % SKINS.length], weapon: null, sash: 0x6a4a2a, build: 0.82, girth: 0.92, fem: true, hemY: 0.06, hair: 'long', beard: null, ...extra };
}

const CAMP = {
  Hind: { title: 'Keeps the cooking pot', look: womanLook(0, { robe: '#3a4a3a', robe2: '#7a3a2a', wrap: 0xd8ccb0, skin: 0x9a6a44 }), lines: {
    sawad: 'Eat first, then tell me about the road. The men always talk with their mouths full. You will not.',
    marsh: 'Reed-fish again. The marsh women showed me how to bake it in clay. Do not tell Yusuf I paid them in his salt.',
    karkh: 'My mother\'s house was two lanes from here. I have not gone to look. Tomorrow, perhaps. Today there is bread to make.',
    docks: 'Forty mouths in this camp now, and the boatmen come for my lentils too. A camp that feeds strangers is a town, guard.',
    hamrin: 'Cold up here. I keep the pot on all night. If you come back late, it will be waiting. It always is.',
  } },
  'Su\'da': { title: 'Carries the camp\'s water', look: womanLook(1, { robe: '#3a4a6a', robe2: '#1a2a3a', wrap: 0x2a3a5a, skin: 0xa8714a }), jar: true, lines: {
    sawad: 'Three trips to the canal before the sun is high. The well is foul since the soldiers watered their horses in it.',
    marsh: 'Here the water is everywhere and none of it is clean. Boil it, guard. Every cup. I mean it.',
    karkh: 'The cistern by the Harb gate is open again. Women queued from first light, and nobody quarrelled. That is how I knew the war was over.',
    docks: 'The river people sell water from skins on the quay. Two coppers a cup. I carry it for nothing, and they hate me for it.',
    hamrin: 'There is a spring in the rocks above the pass. Shabib\'s wife showed me. She says hill water makes you stubborn. It explains Shabib.',
  } },
};
const VILLAGE = {
  sawad: { name: 'Khawla', title: 'At the village well', jar: true, i: 2, lines: [
    'My husband went to the city with the grain carts in the spring of the siege. The carts came back. He did not.',
    'I keep his share of the date harvest in a jar by the door. My neighbours say it is foolish. It is my jar.'] },
  marsh: { name: 'Layla', title: 'Weaves reed mats', i: 3, lines: [
    'A mat a day. The traders from Wasit take them for floors and roofs. My hands know the work, so my head is free to worry.',
    'The soldiers burned our mats for their fires last winter. We cut more reeds. The marsh does not run out of reeds.'] },
  karkh: { name: 'Asma\'', title: 'Sorts the bricks of her street', i: 4, lines: [
    'Whole bricks to the left, half bricks to the right, dust for the gardens. My father built this street. I am taking it apart to build it again.',
    'The paper-sellers want their lane cleared first. The bakers want theirs. I say the wells first, and I have the most bricks, so.'] },
  docks: { name: 'Barra', title: 'Sells bread to the boats', i: 5, lines: [
    'Bread! Bread for the boats! You, guard: one for you, and one for the man you will have to fight later. He will be kinder fed.',
    'My oven lived through the fire because it is made of the same mud as the river. Everything else burned. The oven kept baking.'] },
  hamrin: { name: 'Fakhita', title: 'Keeps the goats', i: 0, lines: [
    'The soldiers took twenty goats and left us three. The three have become eleven. Goats do not care who rules in Baghdad.',
    'My son wants to go down to Baghdad to be a scribe. I said the hills need scribes too. He said, to write what? The goats? Yes. The goats.'] },
};

const clay = () => new THREE.MeshStandardMaterial({ color: 0xb87a50, roughness: 0.9 });
// a water jar balanced on the head, on a cloth ring (rides the head bone)
function headJar(rig) {
  const head = rig.userData.parts?.head; if (!head) return;
  const g = new THREE.Group(), m = clay();
  const pts = [[0, 0], [0.07, 0.01], [0.11, 0.08], [0.1, 0.16], [0.05, 0.22], [0.045, 0.27], [0.06, 0.29]].map(([x, y]) => new THREE.Vector2(x, y));
  const jar = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), m); jar.castShadow = true; g.add(jar);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 })); ring.position.y = -0.005; g.add(ring);
  g.position.set(0, 0.255, -0.01); head.add(g);
}
// Hind's pot: three stones, a round clay pot, embers
function cookPot() {
  const g = new THREE.Group(), stone = new THREE.MeshStandardMaterial({ color: 0x8a7a68, roughness: 1 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), stone); s.position.set(Math.cos(a) * 0.24, 0.08, Math.sin(a) * 0.24); s.scale.y = 0.7; g.add(s); }
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), clay()); pot.position.y = 0.34; pot.rotation.x = Math.PI; g.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 6, 14).rotateX(Math.PI / 2), clay()); rim.position.y = 0.46; g.add(rim);
  const ember = new THREE.Mesh(new THREE.CircleGeometry(0.2, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.25), toneMapped: false })); ember.position.y = 0.02; g.add(ember);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
// Layla's mat frame / Asma's brick stacks / Barra's bread board: one small prop by each village woman
function workProp(reg) {
  const g = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.95 });
  if (reg === 'marsh') { const mat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.8), new THREE.MeshStandardMaterial({ color: 0xc8b070, roughness: 1 })); mat.position.y = 0.02; g.add(mat); const bundle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a9a5a, roughness: 1 })); bundle.position.set(0, 0.1, 0.6); g.add(bundle); }
  else if (reg === 'karkh') { const brick = new THREE.MeshStandardMaterial({ color: 0xa87a58, roughness: 1 }); for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.15), brick); b.position.set((i % 3) * 0.32 - 0.32, 0.04 + Math.floor(i / 3) * 0.085, 0); g.add(b); } }
  else if (reg === 'docks') { const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.5), wood); board.position.y = 0.6; g.add(board); for (const x of [-0.4, 0.4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), wood); l.position.set(x, 0.3, 0); g.add(l); } const bread = new THREE.MeshStandardMaterial({ color: 0xc89a5a, roughness: 0.8 }); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), bread); b.position.set(-0.32 + i * 0.16, 0.645, (i % 2) * 0.12 - 0.06); g.add(b); } }
  else return null;
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function setupWomen33(g) {
  if (IS_EPILOGUE) return;
  const said = (g.player.s25 ||= {}).w33 ||= {};
  const place = (who, look, title, at, face, talk) => {
    const n = npc(g, look, at, face, who, t(title), talk); n.st.action = null; return n;
  };
  // ---- the camp women
  if (HUB?.ishaq) {
    const I = HUB.ishaq, S = HUB.spawn || I;
    const [px, pz] = freeSpot(I[0] - 1.5, I[1] + 4, 1.3);
    const pot = cookPot(); pot.position.set(px, heightAt(px, pz), pz); g.scene.add(pot); colliders.push({ type: 'circle', x: px, z: pz, r: 0.45 });
    g.world?.fires?.push({ pos: pot.position.clone().add(new THREE.Vector3(0, 0.1, 0)), intensity: 0.3 });
    const [hx, hz] = freeSpot(px + 0.9, pz + 0.5, 0.8);
    place('Hind', CAMP.Hind.look, CAMP.Hind.title, [hx, hz], Math.atan2(px - hx, pz - hz), () => g.ui.dialog('Hind', t(CAMP.Hind.lines[REGION] || CAMP.Hind.lines.sawad)));
    // Su'da by the well (hublife.js puts the well at Ishaq - 4, - 4)
    const [sx, sz] = freeSpot(I[0] - 2.4, I[1] - 5.2, 0.8);
    const s = place('Su\'da', CAMP['Su\'da'].look, CAMP['Su\'da'].title, [sx, sz], Math.atan2(S[0] - sx, S[1] - sz), () => g.ui.dialog('Su\'da', t(CAMP['Su\'da'].lines[REGION] || CAMP['Su\'da'].lines.sawad)));
    headJar(s.rig);
  }
  // ---- the village woman
  const W = VILLAGE[REGION], V = SITES.village;
  if (W && V) {
    const [x, z] = freeSpot(V.x + 5, V.z + 4, 1.0);
    const n = place(W.name, womanLook(W.i), W.title, [x, z], Math.random() * 6, () => {
      const k = REGION, i = said[k] = ((said[k] ?? -1) + 1) % W.lines.length;
      g.ui.dialog(W.name, t(W.lines[i]));
    });
    if (W.jar) headJar(n.rig);
    const pr = workProp(REGION);
    if (pr) { const [qx, qz] = freeSpot(x + 1.1, z + 0.4, 0.7); pr.position.set(qx, heightAt(qx, qz), qz); pr.rotation.y = Math.atan2(x - qx, z - qz); g.scene.add(pr); colliders.push({ type: 'circle', x: qx, z: qz, r: 0.6 }); }
  }
  buildGrid();
  g.women33 = { CAMP, VILLAGE }; // for tests
}
export { headJar };
