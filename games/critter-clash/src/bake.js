// merging a critter's static parts into few draw calls (the world's townsfolk and hero, and battle fighters)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, outlineMatW } from './toon.js';

// townsfolk and wild critters are built from dozens of little parts (each with its own ink hull): ~40-100 draws per critter.
// Parts that never move on their own (only through their joint: head, arm, leg...) are merged per joint and material,
// so a critter draws in far fewer calls. Anything the rig animates itself (ears, flames, wings, the lantern...) is kept as is,
// as is anything transparent or named. Hulls of scaled parts keep their own mesh (the outline width lives in local space).
const RIM_IDS = new WeakMap();
const rimId = (u) => { if (!u) return 0; if (!RIM_IDS.has(u)) RIM_IDS.set(u, RIM_IDS.size + 1 + Math.random()); return RIM_IDS.get(u); };
// plain toon parts that differ only in colour share a bucket: their colour moves into a vertex colour attribute
const vcKey = (m, geo) => m.type === 'MeshToonMaterial' && m.userData.toon && !m.map && !m.vertexColors && !m.emissive.getHex() && !geo.attributes.color
  ? ['V', m.side, m.userData.toon.env, m.userData.toon.rim, rimId(m.userData.rimU)].join('|') : null;
export function bakeStatic(cr, recv = true) { // recv: merged parts take shadows (the world); a battle fighter's parts don't, as built
  const keep = new Set(), mark = (v) => { if (v?.isObject3D) keep.add(v); };
  for (const v of Object.values(cr)) { mark(v); if (Array.isArray(v)) v.forEach(mark); }
  const groups = [], noBake = (o) => { for (; o; o = o.parent) if (o.userData.noBake) return true; return false; }; // hats and the gear crown come and go
  cr.root.traverse((o) => { if (!o.isMesh && !noBake(o)) groups.push(o); });
  for (const g of groups) {
    const buckets = new Map(), drop = [], add = [];
    const put = (mat, geo, cast) => {
      const vk = vcKey(mat, geo), hull = mat.side === THREE.BackSide;
      if (vk || hull) { // these only need positions and normals (+ colour / width): drop the rest and index everything, so more parts match
        for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'aOW') geo.deleteAttribute(k);
        if (!geo.index) geo.setIndex([...Array(geo.attributes.position.count).keys()]);
      }
      if (vk) { const c = mat.color, n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      const k = (vk || mat.uuid) + (geo.index ? 'i' : 'n') + Object.keys(geo.attributes).sort().join();
      let b = buckets.get(k); if (!b) buckets.set(k, b = { mat, vk, geos: [], cast: false });
      b.geos.push(geo); b.cast ||= cast;
    };
    for (const m of g.children) {
      if (!m.isMesh || keep.has(m) || m.name || Array.isArray(m.material) || m.material.transparent || m.geometry.morphAttributes?.position) continue;
      if (m.children.some((h) => !h.isMesh || !h.userData.hull || h.children.length)) continue;
      m.updateMatrix();
      put(m.material, m.geometry.clone().applyMatrix4(m.matrix), m.castShadow);
      for (const h of m.children) {
        h.updateMatrix();
        const M4 = m.matrix.clone().multiply(h.matrix), sc = new THREE.Vector3().setFromMatrixScale(M4), ow = h.material.userData.ow;
        if (ow != null && !h.geometry.attributes.aOW) { // the outline width rides along per vertex, scaled like the part was
          const geo = h.geometry.clone().applyMatrix4(M4), n = geo.attributes.position.count;
          geo.setAttribute('aOW', new THREE.BufferAttribute(new Float32Array(n).fill(ow * (sc.x + sc.y + sc.z) / 3), 1));
          put(outlineMatW(h.material.userData.oc), geo, false);
        } else if (Math.abs(sc.x - 1) < 0.12 && Math.abs(sc.y - 1) < 0.12 && Math.abs(sc.z - 1) < 0.12) put(h.material, h.geometry.clone().applyMatrix4(M4), false);
        else { const o = new THREE.Mesh(h.geometry, h.material); M4.decompose(o.position, o.quaternion, o.scale); o.userData.hull = true; o.renderOrder = h.renderOrder; add.push(o); }
      }
      drop.push(m);
    }
    const out = [];
    for (const b of buckets.values()) {
      const geo = mergeGeometries(b.geos);
      if (!geo) return; // incompatible attributes: leave the rest of this critter as built
      let mat = b.mat;
      if (b.vk) { // one white toon material tinted per vertex; the hit flash drives it like the critter's own materials
        const T = b.mat.userData.toon; mat = toon(0xffffff, { rim: T.rim, env: T.env, side: T.side, vertexColors: true, uniforms: b.mat.userData.rimU });
        mat.userData.own = true; cr.mats['bake' + Object.keys(cr.mats).length] = mat;
      }
      const o = new THREE.Mesh(geo, mat); o.castShadow = b.cast; o.receiveShadow = recv; if (b.mat.side === THREE.BackSide) o.userData.hull = true;
      o.userData.baked = b.vk || mat.uuid; // skinStatic can fold it in with the other joints' parts
      out.push(o); b.geos.forEach((q) => q.dispose());
    }
    for (const o of drop) g.remove(o);
    for (const o of [...add, ...out]) g.add(o);
  }
}

// a baked critter still draws one or two meshes per joint (head, torso, each arm and leg, tail...): ~30 draws. Fold every
// baked part into one skinned mesh per material, with the joints as its bones, so the rig still moves each part: ~8-12 draws
const _sk = new THREE.Matrix4();
export function skinStatic(cr, recv = true) {
  const root = cr.root; root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), bones = [], idx = new Map(), buckets = new Map(), drop = [];
  root.traverse((m) => {
    if (!m.isMesh || m.isSkinnedMesh || !m.userData.baked || !m.visible) return;
    let bi = idx.get(m.parent); if (bi == null) { idx.set(m.parent, bi = bones.length); bones.push(m.parent); }
    const geo = m.geometry.clone().applyMatrix4(_sk.multiplyMatrices(inv, m.matrixWorld)), n = geo.attributes.position.count;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const k = m.userData.baked + (geo.index ? 'i' : 'n') + Object.keys(geo.attributes).sort().join();
    let b = buckets.get(k); if (!b) buckets.set(k, b = { mat: m.material, geos: [], cast: false, hull: m.userData.hull });
    b.geos.push(geo); b.cast ||= m.castShadow; drop.push(m);
  });
  if (bones.length < 2) return;
  const merged = []; for (const b of buckets.values()) { const g = mergeGeometries(b.geos); b.geos.forEach((q) => q.dispose()); if (!g) return; merged.push([b, g]); } // incompatible: leave it as baked
  for (const m of drop) { m.parent.remove(m); m.geometry.dispose(); }
  const skel = new THREE.Skeleton(bones, bones.map((b) => b.matrixWorld.clone().invert()));
  for (const [b, g] of merged) {
    const o = new THREE.SkinnedMesh(g, b.mat); o.castShadow = b.cast; o.receiveShadow = recv; o.userData.hull = b.hull;
    root.add(o); o.updateMatrixWorld(true); o.bind(skel);
    g.computeBoundingSphere(); o.boundingSphere = g.boundingSphere.clone(); o.boundingSphere.radius *= 1.3; // the rig swings parts a little past their rest pose
  }
}
