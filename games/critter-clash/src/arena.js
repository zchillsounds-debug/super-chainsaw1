// Stadium arenas: painted field, cheering crowd stands, toon sky and clouds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, inked, canvasTex, outlineMat } from './toon.js';

export const ARENA_R = 11.5;

export const ARENAS = {
  meadow: {
    name: 'Sunny Meadow Stadium',
    skyTop: 0x2f7fe8, skyHorizon: 0xbfe8ff, sun: 0xfff2d8, sunDir: [-0.5, 0.8, 0.35],
    hemiSky: 0xcfe8ff, hemiGround: 0x6fa860, fieldA: '#6cc84a', fieldB: '#5cb842', line: '#ffffff',
    wallA: 0xff5a6e, wallB: 0xffffff, ground: 0x7ccf5a, fog: 0xbfe8ff,
    accent: 0xffc940, seat: [0x3d7bff, 0xff5a6e, 0xffc940, 0x4fd38a],
  },
};

function skyDome(A) {
  const g = new THREE.SphereGeometry(400, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(A.skyTop) }, hor: { value: new THREE.Color(A.skyHorizon) },
      sunDir: { value: new THREE.Vector3(...A.sunDir).normalize() }, sunCol: { value: new THREE.Color(A.sun) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 top, hor, sunDir, sunCol; varying vec3 vP;
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 c = mix(hor, top, pow(h, 0.55));
        float s = max(dot(vP, sunDir), 0.0);
        c += sunCol * (smoothstep(0.9975, 0.998, s) * 1.6 + pow(s, 24.0) * 0.35);
        // stylised horizon band
        c = mix(c, hor * 1.08, smoothstep(0.08, 0.0, h) * 0.6);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

function cloud(rand) {
  const parts = [];
  const n = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const r = 4 + rand() * 5;
    const s = new THREE.SphereGeometry(r, 16, 12);
    s.translate((i - n / 2) * 4.5 + rand() * 2, rand() * 2.5 + (i % 2) * 1.5, rand() * 3);
    parts.push(s);
  }
  const g = mergeGeometries(parts);
  g.scale(1, 0.62, 0.8);
  return g;
}

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export class Arena {
  constructor(scene, key = 'meadow') {
    this.A = ARENAS[key];
    const A = this.A;
    this.group = new THREE.Group();
    scene.add(this.group);
    const G = this.group;
    const rand = rng(7);

    scene.fog = new THREE.Fog(A.fog, 70, 260);
    G.add(skyDome(A));

    // lights
    this.hemi = new THREE.HemisphereLight(A.hemiSky, A.hemiGround, 1.25);
    G.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight(A.sun, 2.4);
    sun.position.set(...A.sunDir).multiplyScalar(30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -16; sc.right = sc.top = 16; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    G.add(sun, sun.target);

    // outer ground
    const ground = new THREE.Mesh(new THREE.CircleGeometry(300, 48), toon(A.ground, { env: true, rim: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    G.add(ground);

    // field with mowed stripes, rings and a paw emblem
    const fieldTex = canvasTex(1024, 1024, (c, w, h) => {
      for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? A.fieldA : A.fieldB; c.fillRect(i * w / 16, 0, w / 16 + 1, h); }
      // subtle checker
      c.globalAlpha = 0.06; c.fillStyle = '#000';
      for (let i = 0; i < 16; i++) if (i % 2) c.fillRect(0, i * h / 16, w, h / 16);
      c.globalAlpha = 1;
      const cx = w / 2, cy = h / 2;
      c.strokeStyle = A.line; c.lineWidth = 12;
      c.beginPath(); c.arc(cx, cy, w * 0.47, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 8;
      c.beginPath(); c.arc(cx, cy, w * 0.16, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(cx, cy - w * 0.47); c.lineTo(cx, cy + w * 0.47); c.stroke();
      // paw emblem
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.ellipse(cx, cy - 18, 46, 38, 0, 0, Math.PI * 2); c.fill();
      for (const [dx, dy, r] of [[-52, 30, 18], [-20, 62, 19], [20, 62, 19], [52, 30, 18]]) {
        c.beginPath(); c.ellipse(cx + dx, cy + dy, r, r * 1.2, dx * 0.006, 0, Math.PI * 2); c.fill();
      }
      // starting marks
      c.fillStyle = A.line;
      for (const s of [-1, 1]) c.fillRect(cx + s * w * 0.3 - 30, cy - 4, 60, 8);
    });
    const field = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R + 0.5, 72), toon(0xffffff, { env: true, rim: 0, map: fieldTex }));
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    G.add(field);

    // dirt ring between field and wall
    const ring = new THREE.Mesh(new THREE.RingGeometry(ARENA_R + 0.5, ARENA_R + 1.4, 72), toon(0xd9b07a, { env: true, rim: 0 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; ring.receiveShadow = true;
    G.add(ring);

    // padded wall made of alternating colour segments
    const segN = 32;
    const wallGeos = [[], []];
    for (let i = 0; i < segN; i++) {
      const a0 = (i / segN) * Math.PI * 2, a1 = ((i + 1) / segN) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(ARENA_R + 1.7, ARENA_R + 1.7, 0.9, 6, 1, true, a0, a1 - a0);
      g.translate(0, 0.45, 0);
      wallGeos[i % 2].push(g);
      const cap = new THREE.TorusGeometry(ARENA_R + 1.7, 0.16, 8, 6, a1 - a0);
      cap.rotateX(-Math.PI / 2);
      cap.rotateY(a0 - Math.PI / 2);
      cap.translate(0, 0.9, 0);
      wallGeos[(i + 1) % 2].push(cap);
    }
    const wallMats = [toon(A.wallA, { env: true, rim: 0.3, side: THREE.DoubleSide }), toon(A.wallB, { env: true, rim: 0.3, side: THREE.DoubleSide })];
    wallGeos.forEach((gs, k) => {
      const m = new THREE.Mesh(mergeGeometries(gs), wallMats[k]);
      m.castShadow = m.receiveShadow = true;
      G.add(m);
    });

    // stands: stepped tiers with seat colours
    const tiers = 7, r0 = ARENA_R + 3.4;
    // stepped profile lathed around the field (open toward the camera)
    const prof = [new THREE.Vector2(r0 - 0.3, 0)];
    for (let t = 0; t < tiers; t++) {
      const r = r0 + t * 1.25, y = 0.6 + t * 0.75;
      prof.push(new THREE.Vector2(r - 0.3 + (t ? 0 : 0), y), new THREE.Vector2(r + 0.95, y));
    }
    const rOut = r0 + tiers * 1.25 + 0.2;
    prof.push(new THREE.Vector2(rOut, 0.6 + (tiers - 1) * 0.75), new THREE.Vector2(rOut, 0));
    // lathe needs points in order; reverse so faces point outward/up
    const standGeo = new THREE.LatheGeometry(prof.reverse(), 72, Math.PI * 0.17, Math.PI * 1.66);
    const standMat = toon(0x8f7fd0, { env: true, rim: 0, side: THREE.DoubleSide });
    const stands = new THREE.Mesh(standGeo, standMat);
    stands.receiveShadow = true;
    // the gap in the stands (theta ~ 0, +z) is where the camera sits
    G.add(stands);
    // big back wall behind stands
    const back = new THREE.Mesh(new THREE.CylinderGeometry(r0 + tiers * 1.25 + 1.3, r0 + tiers * 1.25 + 1.6, 9, 64, 1, true, Math.PI * 0.17, Math.PI * 1.66), toon(0x5a4c9a, { env: true, rim: 0, side: THREE.DoubleSide }));
    back.position.y = 4.5;
    G.add(back);
    // colour band on the top lip
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(r0 + tiers * 1.25 + 1.65, r0 + tiers * 1.25 + 1.65, 0.8, 64, 1, true, Math.PI * 0.17, Math.PI * 1.66), toon(A.accent, { env: true, rim: 0, side: THREE.DoubleSide }));
    lip.position.y = 9;
    G.add(lip);

    // crowd: instanced blobs (body + head) bouncing in the stands
    const body = new THREE.CapsuleGeometry(0.28, 0.35, 4, 8); body.translate(0, 0.45, 0);
    const head = new THREE.SphereGeometry(0.26, 10, 8); head.translate(0, 1.05, 0);
    const earL = new THREE.SphereGeometry(0.1, 6, 6); earL.translate(-0.17, 1.28, 0);
    const earR = earL.clone(); earR.translate(0.34, 0, 0);
    const crowdGeo = mergeGeometries([body, head, earL, earR]);
    const crowdMat = toon(0xffffff, { env: true, rim: 0.4 });
    const fans = [];
    for (let t = 0; t < tiers; t++) {
      const r = r0 + t * 1.25 + 0.55, y = 0.6 + t * 0.75;
      const n = Math.floor(r * 2.6);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.19 + (i / n) * Math.PI * 1.62 + (rand() - 0.5) * 0.02;
        if (rand() < 0.12) continue;
        fans.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, y, a, ph: rand() * 6.28, sp: 0.8 + rand() * 0.8, s: 0.8 + rand() * 0.35 });
      }
    }
    const crowd = this.crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, fans.length);
    const col = new THREE.Color();
    const palette = [0xff8fa3, 0xffd166, 0x8fd3ff, 0xb39cff, 0x9be59b, 0xffb37a, 0xf4f4f4, 0x6b6b8f];
    fans.forEach((f, i) => { col.setHex(palette[Math.floor(rand() * palette.length)]); crowd.setColorAt(i, col); });
    this.fans = fans;
    crowd.castShadow = false;
    G.add(crowd);
    this.excite = 0.2;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this.updateCrowd(0);

    // floodlight towers
    const towerMat = toon(0xdedbe8, { env: true, rim: 0.2 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbe8 });
    for (const a of [0.25, 0.75, 1.25, 1.75]) {
      const ang = a * Math.PI;
      const R = r0 + tiers * 1.25 + 3;
      const tw = new THREE.Group();
      tw.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R);
      const pole = inked(new THREE.CylinderGeometry(0.35, 0.55, 20, 8), towerMat, 0.05);
      pole.position.y = 10;
      tw.add(pole);
      const panel = inked(new THREE.BoxGeometry(4, 2.4, 0.5), towerMat, 0.05);
      panel.position.y = 20.5;
      tw.add(panel);
      for (let ix = 0; ix < 3; ix++) for (let iy = 0; iy < 2; iy++) {
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), lampMat);
        l.position.set(-1.25 + ix * 1.25, 19.95 + iy * 1.1, 0.26);
        panel.add(l); l.position.y -= 20.5 - 0.0;
      }
      tw.lookAt(0, 0, 0);
      G.add(tw);
    }

    // pennant flags along the lip
    this.flags = [];
    const flagGeo = new THREE.PlaneGeometry(1.4, 0.9, 6, 3);
    flagGeo.translate(0.7, 0, 0);
    const flagMats = A.seat.map((c) => toon(c, { env: true, rim: 0, side: THREE.DoubleSide }));
    const R = r0 + tiers * 1.25 + 1.6;
    for (let i = 0; i < 20; i++) {
      const ang = Math.PI * 0.19 + (i / 19) * Math.PI * 1.62;
      const fl = new THREE.Group();
      fl.position.set(Math.sin(ang) * R, 9.4, Math.cos(ang) * R);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), towerMat);
      pole.position.y = 1.5;
      fl.add(pole);
      const f = new THREE.Mesh(flagGeo.clone(), flagMats[i % flagMats.length]);
      f.position.y = 2.5;
      fl.add(f);
      fl.userData.flag = f; fl.userData.ph = i * 0.7;
      fl.rotation.y = rand() * 6;
      this.flags.push(fl);
      G.add(fl);
    }

    // scenery: rolling hills and puffy toon trees
    const hillMat = toon(0x6fbf55, { env: true, rim: 0 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand() * 0.3;
      const r = 120 + rand() * 60;
      const h = new THREE.Mesh(new THREE.SphereGeometry(30 + rand() * 25, 20, 12), hillMat);
      h.scale.set(1.6, 0.5 + rand() * 0.4, 1.2);
      h.position.set(Math.cos(a) * r, -6, Math.sin(a) * r);
      G.add(h);
    }
    const trunkMat = toon(0x8a5a3a, { env: true, rim: 0 });
    const leafMats = [toon(0x47b04a, { env: true, rim: 0.3 }), toon(0x5cc85a, { env: true, rim: 0.3 }), toon(0x3a9a48, { env: true, rim: 0.3 })];
    const treeTop = mergeGeometries([0, 1, 2].map((k) => { const s = new THREE.SphereGeometry(1.6 - k * 0.3, 12, 10); s.translate((k - 1) * 0.9, 3.2 + (k % 2) * 0.6, 0); return s; }));
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const r = 34 + rand() * 40;
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.6, 6), trunkMat);
      trunk.position.y = 1.3;
      const top = inked(treeTop, leafMats[i % 3], 0.06);
      t.add(trunk, top);
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      t.scale.setScalar(1.2 + rand() * 1.4);
      t.rotation.y = rand() * 6;
      G.add(t);
    }

    // clouds
    this.clouds = [];
    const cloudMat = toon(0xffffff, { env: true, rim: 0, emissive: 0x5a6a90 });
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Mesh(cloud(rand), cloudMat);
      const a = rand() * Math.PI * 2, r = 120 + rand() * 120;
      c.position.set(Math.cos(a) * r, 35 + rand() * 40, Math.sin(a) * r);
      c.rotation.y = rand() * 3;
      c.scale.setScalar(1 + rand());
      c.userData.sp = 0.6 + rand();
      this.clouds.push(c);
      G.add(c);
    }
  }

  updateCrowd(t) {
    const ex = this.excite;
    const m = this._m, q = this._q, e = this._e, p = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < this.fans.length; i++) {
      const f = this.fans[i];
      const hop = Math.max(0, Math.sin(t * (4 + ex * 6) * f.sp + f.ph)) * (0.08 + ex * 0.5);
      p.set(f.x, f.y + hop, f.z);
      e.set(0, Math.atan2(-f.x, -f.z), Math.sin(t * 2 * f.sp + f.ph) * 0.1 * (1 + ex));
      q.setFromEuler(e);
      s.setScalar(f.s);
      m.compose(p, q, s);
      this.crowd.setMatrixAt(i, m);
    }
    this.crowd.instanceMatrix.needsUpdate = true;
  }

  update(dt, t) {
    this.excite = Math.max(0.15, this.excite - dt * 0.25);
    this.updateCrowd(t);
    for (const fl of this.flags) {
      const f = fl.userData.flag, pos = f.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        pos.setZ(i, Math.sin(t * 5 + fl.userData.ph + x * 3) * 0.15 * x);
      }
      pos.needsUpdate = true;
    }
    for (const c of this.clouds) c.position.x += dt * c.userData.sp;
  }

  cheer(amount = 1) { this.excite = Math.min(1, this.excite + amount); }
}
