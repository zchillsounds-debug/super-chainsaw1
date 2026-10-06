// Round 25: a thin inverted-hull outline on characters, so figures read from the overhead camera on a phone.
// One shader program for every kind (the colours differ by material only). The width is a constant angle on
// screen (the push grows with view depth), so it stays about 2 px at any zoom. Hidden in cutscenes.
import * as THREE from 'three';

const W = { value: 0.0019 };
function hullMat(color, op = 1) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: op < 1, opacity: op, depthWrite: op >= 1, fog: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uOW = W;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uOW;')
      .replace('#include <project_vertex>', `vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
      #ifdef USE_SKINNING
        vec3 oN = normalize( normalMatrix * objectNormal );
        mvPosition.xyz += oN * uOW * max( 2.0, -mvPosition.z );
      #endif
      gl_Position = projectionMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => 'outline25';
  return m;
}
export const OUTLINE_MATS = {
  hero: hullMat(0x1c1208),
  ally: hullMat(0x0c2420),
  foe: hullMat(0x4a0a06),
  elite: hullMat(0x9a2008),
};
export const OUTLINE_LAYER = 3;
// rig: a humanoid() root. Adds a hull under each skinned body mesh (near and far LOD), sharing geometry and skeleton.
export function addOutline(rig, kind = 'foe') {
  const P = rig?.userData?.parts; if (!P) return;
  const mat = OUTLINE_MATS[kind] || OUTLINE_MATS.foe;
  if (P.outlines) { for (const o of P.outlines) o.material = mat; return; }
  P.outlines = [];
  for (const m of [...(P.meshes || []), ...(P.farMeshes || [])]) {
    const o = new THREE.SkinnedMesh(m.geometry, mat); o.bind(m.skeleton, m.bindMatrix);
    o.boundingSphere = m.boundingSphere; o.frustumCulled = m.frustumCulled;
    o.castShadow = false; o.receiveShadow = false; o.userData.noAO = true; o.userData.outline = true;
    o.layers.set(OUTLINE_LAYER); m.add(o); P.outlines.push(o);
  }
}
// cutscenes and the title screen hide the outlines (close shots read as cel-shading otherwise): a camera layer
export function showOutlines(camera, on) { if (on) camera.layers.enable(OUTLINE_LAYER); else camera.layers.disable(OUTLINE_LAYER); }
