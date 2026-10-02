import * as THREE from 'three';
import { fabricTex } from './textures.js';

const lathe = (pts, seg = 14) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
// Fresnel rim light so characters read clearly against the bright desert.
export function addRim(mat, color = new THREE.Color(1.0, 0.75, 0.45), power = 3.0, strength = 0.6) {
  if (mat.userData.rim) return mat;
  mat.userData.rim = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev(sh, r);
    sh.uniforms.uRimC = { value: color.clone().multiplyScalar(strength) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRimC;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float rim = 1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0);
          totalEmissiveRadiance += uRimC * pow(rim, ${power.toFixed(1)}); }`);
  };
  mat.customProgramCacheKey = () => 'rim' + (prev ? prev.toString() : '');
  return mat;
}
function mesh(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; }
function limb(len, r0, r1, mat) {
  const g = new THREE.CapsuleGeometry((r0 + r1) / 2, len - (r0 + r1), 4, 8).translate(0, -len / 2, 0);
  const p = g.attributes.position; // taper
  for (let i = 0; i < p.count; i++) { const t = -p.getY(i) / len; const k = THREE.MathUtils.lerp(r0, r1, t) / ((r0 + r1) / 2); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  g.computeVertexNormals();
  return mesh(g, mat);
}
function pivot(parent, x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }

const steel = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 1, roughness: 0.18 });
const goldM = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.3 });
const leather = new THREE.MeshStandardMaterial({ color: 0x4a2e1a, roughness: 0.75 });

export function scimitar() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.09, 0.5, 0.02, 1.0);
  s.quadraticCurveTo(-0.08, 1.15, -0.2, 1.22);
  s.quadraticCurveTo(-0.1, 0.95, -0.09, 0.6);
  s.quadraticCurveTo(-0.08, 0.25, -0.05, 0);
  s.closePath();
  const blade = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 1 });
  const g = new THREE.Group();
  const b = mesh(blade, steel); b.position.set(0.02, 0.12, -0.006); g.add(b);
  g.add(mesh(new THREE.BoxGeometry(0.32, 0.04, 0.06).translate(0, 0.1, 0), goldM));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.24, 8).translate(0, -0.02, 0), leather));
  g.add(mesh(new THREE.SphereGeometry(0.04, 8, 6).translate(0, -0.16, 0), goldM));
  return g;
}
function spear() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6).translate(0, 0.6, 0), leather));
  g.add(mesh(new THREE.ConeGeometry(0.06, 0.35, 4).translate(0, 1.95, 0), steel));
  return g;
}
function bow() {
  const g = new THREE.Group();
  const c = new THREE.TorusGeometry(0.6, 0.02, 5, 20, Math.PI * 0.9);
  const b = mesh(c, leather); b.rotation.z = Math.PI / 2 - Math.PI * 0.45; g.add(b);
  return g;
}
function shield() {
  const g = new THREE.Group();
  const d = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 20).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.6, map: fabricTex('#6b3f1e', '#b08040', false) }));
  g.add(d);
  g.add(mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24), goldM));
  g.add(mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).translate(0, 0, 0.03), steel));
  return g;
}

// Generic humanoid rig. opts: skin, robe, robe2, sash, turban, helmet, weapon, offhand, hunch, scale, eyes
export function humanoid(opts = {}) {
  const o = Object.assign({ skin: 0xa8714a, robe: '#e8dcc0', robe2: '#a03020', sash: 0x8a1c1c, turban: 0xf0ead8, weapon: 'scimitar', offhand: null, hunch: 0, scale: 1, mail: false, eyes: null, cloak: null }, opts);
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  body.scale.setScalar(o.scale);
  const skinM = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.6 });
  const robeM = new THREE.MeshStandardMaterial({ map: fabricTex(o.robe, o.robe2), roughness: 0.85, side: THREE.DoubleSide });
  const mailM = new THREE.MeshStandardMaterial({ color: 0x8a8d90, metalness: 0.85, roughness: 0.45 });
  const sashM = new THREE.MeshStandardMaterial({ color: o.sash, roughness: 0.8 });
  const parts = { mats: [skinM, robeM, mailM, sashM] };

  const hips = pivot(body, 0, 1.0, 0); parts.hips = hips;
  // legs
  const legM = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const th = pivot(hips, s * 0.12, 0, 0); th.add(limb(0.48, 0.09, 0.07, legM));
    const sh = pivot(th, 0, -0.46, 0); sh.add(limb(0.46, 0.07, 0.055, legM));
    const ft = mesh(new THREE.BoxGeometry(0.11, 0.08, 0.24).translate(0, -0.48, 0.05), leather); sh.add(ft);
    parts[s < 0 ? 'thighL' : 'thighR'] = th; parts[s < 0 ? 'shinL' : 'shinR'] = sh;
  }
  // robe skirt (flares from waist)
  const skirt = mesh(lathe([[0.2, 0.05], [0.24, -0.15], [0.3, -0.5], [0.36, -0.82]], 16), robeM);
  hips.add(skirt); parts.skirt = skirt;
  // torso
  const spine = pivot(hips, 0, 0.05, 0); parts.spine = spine;
  spine.rotation.x = o.hunch; spine.userData.baseHunch = o.hunch;
  const torso = mesh(lathe([[0.2, 0], [0.22, 0.15], [0.25, 0.35], [0.24, 0.5], [0.14, 0.6], [0.06, 0.62]], 14), o.mail ? mailM : robeM);
  torso.scale.z = 0.75; spine.add(torso);
  spine.add(mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.1, 14).scale(1, 1, 0.78).translate(0, 0.05, 0), sashM));
  if (o.mail) { // tabard over mail
    const tab = mesh(new THREE.PlaneGeometry(0.3, 0.75).translate(0, -0.1, 0.2), robeM); spine.add(tab);
  }
  if (o.cloak) {
    const cm = new THREE.MeshStandardMaterial({ color: o.cloak, roughness: 0.9, side: THREE.DoubleSide });
    const cg = new THREE.CylinderGeometry(0.26, 0.45, 1.2, 12, 4, true, Math.PI * 0.6, Math.PI * 0.8).translate(0, -0.05, -0.02);
    const cl = mesh(cg, cm); cl.rotation.y = Math.PI; spine.add(cl); parts.cloak = cl;
  }
  // head
  const neck = pivot(spine, 0, 0.62, 0.02); parts.neck = neck;
  const head = mesh(new THREE.SphereGeometry(0.13, 14, 12).scale(0.9, 1.08, 1), skinM); head.position.y = 0.14; neck.add(head);
  parts.head = head;
  if (o.beard) { const b = mesh(new THREE.ConeGeometry(0.09, 0.18, 8).rotateX(Math.PI).translate(0, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: o.beard, roughness: 1 })); neck.add(b); }
  if (o.turban) {
    const tm = new THREE.MeshStandardMaterial({ color: o.turban, roughness: 0.9 });
    const t1 = mesh(new THREE.TorusGeometry(0.12, 0.055, 8, 16).rotateX(Math.PI / 2).translate(0, 0.22, 0), tm); neck.add(t1);
    const t2 = mesh(new THREE.TorusGeometry(0.09, 0.05, 8, 16).rotateX(Math.PI / 2 + 0.2).translate(0, 0.28, -0.01), tm); neck.add(t2);
    neck.add(mesh(new THREE.SphereGeometry(0.1, 10, 8).translate(0, 0.29, 0), tm));
    if (o.helmet) neck.add(mesh(new THREE.ConeGeometry(0.11, 0.28, 12).translate(0, 0.42, 0), steel));
  }
  if (o.mask) neck.add(mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.3).scale(0.95, 1.1, 1.05).translate(0, 0.14, 0), new THREE.MeshStandardMaterial({ color: o.mask, roughness: 0.9, side: THREE.DoubleSide })));
  if (o.eyes) {
    const em = new THREE.MeshBasicMaterial({ color: o.eyes, toneMapped: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), em); e.position.set(s * 0.045, 0.16, 0.11); neck.add(e); }
  }
  // arms
  for (const s of [-1, 1]) {
    const sh = pivot(spine, s * 0.27, 0.5, 0);
    const up = limb(0.34, 0.075, 0.06, o.mail ? mailM : robeM); sh.add(up);
    sh.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), o.mail ? mailM : robeM));
    const el = pivot(sh, 0, -0.32, 0);
    el.add(limb(0.32 * (o.longArms || 1), 0.058, 0.045, skinM));
    const hand = pivot(el, 0, -0.32 * (o.longArms || 1), 0);
    hand.add(mesh(new THREE.SphereGeometry(0.05, 8, 6).scale(1, 1.2, 0.8), skinM));
    if (o.claws) for (let i = 0; i < 3; i++) hand.add(mesh(new THREE.ConeGeometry(0.012, 0.12, 4).rotateX(Math.PI).translate((i - 1) * 0.025, -0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a2a20 })));
    sh.rotation.z = s * 0.12;
    parts[s < 0 ? 'shL' : 'shR'] = sh; parts[s < 0 ? 'elL' : 'elR'] = el; parts[s < 0 ? 'handL' : 'handR'] = hand;
  }
  // weapons
  if (o.weapon === 'scimitar') { const w = scimitar(); w.rotation.x = Math.PI / 2; w.position.z = 0.02; parts.handR.add(w); parts.weapon = w; }
  if (o.weapon === 'spear') { const w = spear(); w.rotation.x = Math.PI / 2; parts.handR.add(w); parts.weapon = w; }
  if (o.weapon === 'bow') { const w = bow(); parts.handL.add(w); parts.weapon = w; }
  if (o.offhand === 'shield') { const sd = shield(); sd.position.set(-0.08, -0.05, 0.05); sd.rotation.y = -Math.PI / 2; parts.handL.add(sd); }

  root.traverse((ob) => { if (ob.isMesh && ob.material.isMeshStandardMaterial) addRim(ob.material); });
  root.userData.parts = parts;
  return root;
}

// Animator for humanoids: state = idle | walk | attack | cast | hit | dead
export function animateHumanoid(rig, st, t, dt) {
  const p = rig.userData.parts;
  const ph = st.phase;
  const walk = st.walkBlend ?? 0;
  const sw = Math.sin(ph) * 0.65 * walk;
  p.thighL.rotation.x = sw; p.thighR.rotation.x = -sw;
  p.shinL.rotation.x = Math.max(0, -Math.sin(ph - 0.8)) * 0.9 * walk;
  p.shinR.rotation.x = Math.max(0, Math.sin(ph - 0.8)) * 0.9 * walk;
  p.hips.position.y = 1.0 + Math.abs(Math.cos(ph)) * 0.05 * walk - 0.02 * walk + Math.sin(t * 2) * 0.008 * (1 - walk);
  p.skirt.rotation.x = -sw * 0.15;
  const breathe = Math.sin(t * 2.2) * 0.02;
  p.spine.rotation.x = p.spine.userData.baseHunch;
  p.spine.rotation.y = -sw * 0.12;
  p.shL.rotation.x = -sw * 0.6 + breathe; p.elL.rotation.x = -0.3 - Math.max(0, sw) * 0.3;
  p.shR.rotation.x = sw * 0.6 - 0.15 - breathe; p.elR.rotation.x = -0.4;
  p.shR.rotation.z = 0.12; p.shR.rotation.y = 0;
  if (p.cloak) p.cloak.rotation.x = -0.1 - walk * 0.25 + Math.sin(t * 3) * 0.03;

  // action overlay
  const a = st.action, k = st.actionT; // k in [0,1]
  if (a === 'attack') {
    // windup -> slash
    const wind = Math.min(1, k / 0.35), strike = Math.max(0, (k - 0.35) / 0.4);
    const e = 1 - Math.pow(1 - Math.min(1, strike), 3);
    p.shR.rotation.x = THREE.MathUtils.lerp(-2.4 * wind, 0.6, e);
    p.shR.rotation.z = THREE.MathUtils.lerp(0.9 * wind, -0.3, e);
    p.shR.rotation.y = THREE.MathUtils.lerp(-0.6 * wind, 0.9, e);
    p.elR.rotation.x = THREE.MathUtils.lerp(-1.2 * wind, -0.15, e);
    p.spine.rotation.y = THREE.MathUtils.lerp(0.5 * wind, -0.55, e);
  } else if (a === 'thrust') {
    const wind = Math.min(1, k / 0.4), strike = Math.max(0, (k - 0.4) / 0.3);
    p.shR.rotation.x = THREE.MathUtils.lerp(-0.6 * wind, -1.5, Math.min(1, strike));
    p.elR.rotation.x = THREE.MathUtils.lerp(-1.4 * wind, 0, Math.min(1, strike));
    p.spine.rotation.y = 0.3 * wind - strike * 0.5;
  } else if (a === 'spin') {
    p.shR.rotation.x = -1.5; p.shR.rotation.z = 1.2; p.elR.rotation.x = -0.1;
    p.shL.rotation.x = -1.2; p.shL.rotation.z = -1.0;
  } else if (a === 'cast') {
    const e = Math.sin(Math.min(1, k) * Math.PI);
    p.shL.rotation.x = -2.2 * e; p.elL.rotation.x = -0.3; p.shR.rotation.x = -0.8 * e;
    p.spine.rotation.x = (p.spine.userData.baseHunch ?? 0) - 0.1 * e;
  } else if (a === 'throw') {
    const wind = Math.min(1, k / 0.45), rel = Math.max(0, (k - 0.45) / 0.3);
    p.shL.rotation.x = THREE.MathUtils.lerp(-2.8 * wind, -0.6, Math.min(1, rel));
    p.elL.rotation.x = -0.6 * wind;
    p.spine.rotation.y = THREE.MathUtils.lerp(-0.5 * wind, 0.4, Math.min(1, rel));
  } else if (a === 'claw') {
    const e = Math.sin(Math.min(1, k) * Math.PI);
    p.shR.rotation.x = -2.0 * e; p.shL.rotation.x = -2.0 * Math.sin(Math.min(1, k * 1.2) * Math.PI);
    p.spine.rotation.x = 0.6 + e * 0.3;
  } else if (a === 'shoot') {
    p.shL.rotation.x = -1.5; p.shL.rotation.y = 0.3; p.shR.rotation.x = -1.5; p.elR.rotation.x = -1.4 * Math.min(1, k * 1.5);
  }
  if (st.hitT > 0) { p.spine.rotation.x -= st.hitT * 0.6; p.neck.rotation.x = -st.hitT * 0.4; } else p.neck.rotation.x = 0;
  if (st.dead) {
    const d = Math.min(1, st.deadT * 2.2);
    const e = d * d;
    rig.children[0].rotation.x = -e * Math.PI / 2 * st.fallDir;
    rig.children[0].position.y = e * 0.25;
    p.shL.rotation.x = -1.5 * e; p.shR.rotation.x = -1.2 * e; p.thighL.rotation.x = 0.3 * e;
  }
}

// --------------------------------------------------------------------- Ifrit boss (fire djinn)
export function ifrit() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const parts = {};
  const timeU = { value: 0 }; parts.fireUniform = timeU;
  // Basalt skin with glowing, pulsing lava cracks (voronoi edges in object space)
  const skin = new THREE.MeshStandardMaterial({ color: 0x1c1310, emissive: 0xff5a10, emissiveIntensity: 2.2, roughness: 0.55, metalness: 0.1 });
  skin.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = timeU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uTime; varying vec3 vOP;
      vec3 hh(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
      float vor(vec3 p){ vec3 i=floor(p), f=fract(p); float d1=8., d2=8.;
        for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec3 g=vec3(x,y,z); vec3 o=hh(i+g); float d=length(g+o-f); if(d<d1){d2=d1;d1=d;} else if(d<d2) d2=d; }
        return d2-d1; }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float e = vor(vOP*3.2);
        float crack = smoothstep(0.12, 0.02, e);
        float pulse = 0.6 + 0.4*sin(uTime*3.0 - vOP.y*4.0);
        totalEmissiveRadiance *= crack * pulse + smoothstep(0.35,0.0,e)*0.08;`);
  };
  // Flame/smoke tail: vertical licking streaks, fading to smoke at the bottom
  const fireMat = new THREE.ShaderMaterial({
    uniforms: { uTime: timeU }, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vOP; void main(){ vUv=uv; vOP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vOP;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p = vec2(vUv.x*10.0, vUv.y*3.0 - uTime*1.8);
        float f = n(p)*0.55 + n(p*2.1 + 3.0)*0.3 + n(p*4.3)*0.15;
        float y = vUv.y;
        float flame = smoothstep(0.35, 0.75, f + y*0.35);
        vec3 col = mix(vec3(0.08,0.05,0.04), vec3(3.2,1.1,0.25), flame);
        col = mix(col, vec3(4.0,2.6,1.0), smoothstep(0.75,0.95,f + y*0.3));
        float a = smoothstep(0.0, 0.35, y) * (0.55 + flame*0.45);
        gl_FragColor = vec4(col, a);
      }`,
  });
  // smoke-vortex lower body
  const tail = mesh(lathe([[0.05, 0], [0.35, 0.5], [0.7, 1.4], [0.95, 2.4], [1.0, 2.9]], 20), fireMat);
  tail.position.y = 0.2; tail.castShadow = false; body.add(tail); parts.tail = tail;
  const chest = new THREE.Group(); chest.position.y = 3.0; body.add(chest); parts.chest = chest;
  const torso = mesh(lathe([[0.9, 0], [1.15, 0.6], [1.3, 1.2], [1.0, 1.7], [0.4, 1.9]], 18), skin);
  torso.scale.z = 0.7; chest.add(torso);
  const head = new THREE.Group(); head.position.y = 2.1; chest.add(head); parts.head = head;
  head.add(mesh(new THREE.SphereGeometry(0.45, 16, 12).scale(0.9, 1.1, 0.95), skin));
  const hornM = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.4, metalness: 0.3 });
  for (const s of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.3, 0.2, 0), new THREE.Vector3(s * 0.7, 0.5, -0.1), new THREE.Vector3(s * 0.85, 1.0, -0.3), new THREE.Vector3(s * 0.6, 1.4, -0.5)]);
    const hg = new THREE.TubeGeometry(curve, 16, 0.09, 8); const hp = hg.attributes.position;
    head.add(mesh(hg, hornM));
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4, 1), toneMapped: false }));
    e.position.set(s * 0.17, 0.05, 0.38); head.add(e);
  }
  // fiery crown / mane
  const mane = mesh(new THREE.ConeGeometry(0.5, 1.6, 16, 1, true).translate(0, 0.8, -0.25), fireMat); mane.castShadow = false; head.add(mane);
  // gold bracers & arms
  for (const s of [-1, 1]) {
    const sh = pivot(chest, s * 1.35, 1.4, 0);
    sh.add(mesh(new THREE.SphereGeometry(0.42, 12, 10), skin));
    sh.add(limb(1.3, 0.32, 0.25, skin));
    const el = pivot(sh, 0, -1.25, 0);
    el.add(limb(1.25, 0.25, 0.2, skin));
    el.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.45, 14).translate(0, -0.7, 0), goldM));
    const hand = pivot(el, 0, -1.3, 0);
    hand.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), skin));
    sh.rotation.z = s * 0.35;
    parts[s < 0 ? 'shL' : 'shR'] = sh; parts[s < 0 ? 'elL' : 'elR'] = el; parts[s < 0 ? 'handL' : 'handR'] = hand;
  }
  // chains (bound by Sulayman's seal, broken)
  const chainM = new THREE.MeshStandardMaterial({ color: 0x6a6460, metalness: 0.9, roughness: 0.5 });
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 10), chainM); l.position.set(0, -0.85 - i * 0.2, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; parts.elL.add(l); }
  root.userData.parts = parts;
  root.userData.mats = [fireMat, skin];
  return root;
}

export function animateIfrit(rig, st, t) {
  const p = rig.userData.parts;
  if (p.fireUniform) p.fireUniform.value = t;
  p.chest.position.y = 3.0 + Math.sin(t * 1.5) * 0.15;
  p.tail.rotation.y = t * 2.0;
  p.tail.scale.set(1 + Math.sin(t * 5) * 0.04, 1, 1 + Math.cos(t * 5) * 0.04);
  p.shL.rotation.x = Math.sin(t * 1.3) * 0.15; p.shR.rotation.x = Math.sin(t * 1.3 + 1) * 0.15;
  p.elL.rotation.x = -0.5; p.elR.rotation.x = -0.5;
  p.head.rotation.y = Math.sin(t * 0.7) * 0.2;
  const a = st.action, k = st.actionT;
  if (a === 'slam') {
    const e = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
    p.shL.rotation.x = p.shR.rotation.x = -2.6 * (k < 0.5 ? e : Math.max(0, 1 - (k - 0.5) * 4) * 1) + (k > 0.5 ? 0.4 : 0);
    p.chest.rotation.x = k < 0.5 ? -0.2 * e : 0.35 * (1 - (k - 0.5) * 2);
  } else if (a === 'cast') {
    const e = Math.sin(k * Math.PI);
    p.shL.rotation.z = -0.35 - e * 1.2; p.shR.rotation.z = 0.35 + e * 1.2; p.shL.rotation.x = p.shR.rotation.x = -0.8 * e;
  } else { p.shL.rotation.z = -0.35; p.shR.rotation.z = 0.35; p.chest.rotation.x *= 0.9; }
  if (st.dead) { const d = Math.min(1, st.deadT * 0.6); rig.children[0].scale.setScalar(0.8 * (1 - d * 0.9)); rig.children[0].position.y = d * 3; }
}
