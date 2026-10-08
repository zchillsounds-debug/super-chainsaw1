// Round 35: Jabir lives. Taken wounded on the dune, found in the vault under the arch (scenes.js epilogue), he heals
// in Ishaq's camp: a pallet near Ishaq in every region after the Sawad, a short talk per region (said.jab35_<region>),
// then a line to come back to.
import * as THREE from 'three';
import { REGION, HUB, IS_SAWAD, IS_EPILOGUE } from './region.js';
import { heightAt } from './terrain.js';
import { S25, chosen } from './story25.js';
import { npc } from './hub.js';
import { freeSpot } from './sidequests.js';
import { JABIR_LOOK } from './scenes.js';
import * as S32 from './scenes32.js';
import { saveGame } from './save.js';
import { t } from './i18n.js';

const TALK = {
  marsh: [
    { who: 'Jabir', text: 'Boats. You brought me into a marsh, on a boat, with a hole in my side.' },
    { who: 'Salim', text: 'You hate boats. I remember.' },
    { who: 'Jabir', text: 'Water keeps no promises. Go and get the rest of the Pages, and come back dry.' },
  ],
  karkh: [
    { who: 'Jabir', text: 'So this is Baghdad. I thought it would be taller.' },
    { who: 'Salim', text: 'It was, before the siege.' },
    { who: 'Jabir', text: 'Then we will see it again when they build it back. Go on. Ishaq says Krateros means to burn what is left.' },
  ],
  docks: [
    { who: 'Jabir', text: 'I walked to the end of the quay this morning. Ishaq nearly fainted.' },
    { who: 'Salim', text: 'You are supposed to be lying down.' },
    { who: 'Jabir', text: 'I have lain down for a month. Finish it, little brother. Then we both rest.' },
  ],
  // the post-game epilogue on the quays at dusk: on his feet, with his spear
  home: [
    { who: 'Jabir', text: 'Look at me. Standing. Ishaq says I can ride by the new moon.' },
    { who: 'Salim', text: 'Then we ride home together.' },
    { who: 'Jabir', text: 'Two more days to Baghdad, I said. It took a little longer.' },
    { who: 'Salim', text: 'A little.', expr: 'warm' },
  ],
  hamrin: [
    { who: 'Jabir', text: 'They tell me the bowman from the dune is up in these hills.' },
    { who: 'Salim', text: 'Tatzates. He is the last of them.' },
    { who: 'Jabir', when: (g) => !chosen(g, 'tatzates'), text: 'Then do not make it about me. Make it about the road. A road should be safe for the next caravan.' },
    { who: 'Jabir', when: (g) => !!chosen(g, 'tatzates'), text: 'It is done, then. Good. Now the road is safe for the next caravan.' },
  ],
};
const AGAIN = {
  marsh: 'My side itches. Ishaq says that is the healing. I say it is the reeds.',
  karkh: 'Bring me a book from the paper-sellers. I will pretend to read it.',
  docks: 'Count the barges for me. Somebody should argue the tolls.',
  home: 'Go and say your farewells. I will be here. I am not going anywhere without you again.',
  hamrin: 'I will be on my feet by the time you come down from the hills. Then you can give me back my spear.',
};

export function setupStory35(g) {
  const R = IS_EPILOGUE ? 'home' : REGION;
  if (IS_SAWAD || !HUB?.ishaq || !TALK[R]) return;
  const said = () => S25(g).said, sitting = !IS_EPILOGUE;
  const [ix, iz] = HUB.ishaq;
  const [x, z] = freeSpot(ix - 2.6, iz + 1.8, 1.2);
  // a straw pallet and a rolled blanket; he sits up on it, propped on one arm
  const pallet = new THREE.Group();
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.1, 2.0), new THREE.MeshStandardMaterial({ color: 0x9a8a62, roughness: 1 })); mat.position.y = 0.05;
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a3a2a, roughness: 1 })); roll.position.set(0, 0.16, -0.85);
  pallet.add(mat, roll); pallet.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  pallet.position.set(x, heightAt(x, z), z); pallet.rotation.y = Math.atan2(ix - x, iz - z); if (sitting) g.scene.add(pallet);
  const face = Math.atan2(ix - x, iz - z) + 0.6;
  const n = npc(g, { ...JABIR_LOOK, weapon: sitting ? null : 'spear', sash: 0xd8cfb8 }, [x, z], face, 'Jabir', t(sitting ? 'Your brother, healing' : 'Your brother'), () => talk());
  n.st.crouch = sitting ? 0.85 : 0;
  const key = 'jab35_' + R;
  function talk() {
    if (g.cinematic) return;
    if (said()[key]) { g.ui.dialog('Jabir', t(AGAIN[R])); return; }
    const script = TALK[R].map((L) => ({ ...L, when: L.when ? () => L.when(g) : undefined }));
    g.director.play(S32.chat(g, S32.other(n), script, { onEnd: () => { n.st.crouch = sitting ? 0.85 : 0; } })).then(() => { said()[key] = true; saveGame(g); });
  }
  // he stays seated on the pallet whatever the camp animation does
  const prev = g.tickExtra;
  if (sitting) g.tickExtra = (dt) => { prev?.(dt); n.st.crouch = 0.85; n.st.walkBlend = 0; };
}
