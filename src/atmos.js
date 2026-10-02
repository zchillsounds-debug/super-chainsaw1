import * as THREE from 'three';

// Atmosphere around the camera focus: drifting dust haze close to the ground and soft sun shafts
// (thin additive slabs leaning along the sun direction, masked by moving noise). Cheap stand-ins for
// volumetric fog and god rays that hold up on phones; strength follows the time of day.
const NOISE = `
  float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
  float fb(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }`;

export class Atmos {
  constructor(scene, quality) {
    this.u = { uT: { value: 0 }, uCol: { value: new THREE.Color(1, 0.85, 0.6) }, uA: { value: 1 }, uSunCol: { value: new THREE.Color(1, 0.8, 0.5) }, uRays: { value: 1 } };
    this.group = new THREE.Group(); scene.add(this.group);
    // haze: two ground-hugging layers
    const hazeM = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float uT, uA; uniform vec3 uCol; varying vec3 vW; varying vec2 vUv; ${NOISE}
        void main(){
          vec2 p = vW.xz * 0.045 + vec2(uT * 0.03, uT * 0.012);
          float d = fb(p) * 0.7 + fb(p * 2.7 - vec2(uT * 0.05, 0.0)) * 0.3;
          float edge = smoothstep(0.5, 0.25, length(vUv - 0.5));
          float a = smoothstep(0.35, 0.85, d) * edge * uA * 0.16;
          gl_FragColor = vec4(uCol, a);
        }`,
    });
    for (const [y, s] of [[0.6, 110], [2.4, 130]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), hazeM); m.position.y = y; m.renderOrder = 2; m.userData.y = y; this.group.add(m); }
    // sun shafts
    this.rays = [];
    if (quality !== 'low') {
      const rayM = new THREE.ShaderMaterial({
        uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform float uT, uRays; uniform vec3 uSunCol; varying vec2 vUv; varying vec3 vW; ${NOISE}
          void main(){
            float streak = smoothstep(0.45, 0.9, n(vec2(vUv.x * 9.0 + uT * 0.05, 0.5))) * (0.6 + 0.4 * n(vec2(vUv.x * 30.0, uT * 0.2)));
            float fade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
            gl_FragColor = vec4(uSunCol * streak * fade * uRays * 0.05, 1.0);
          }`,
      });
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 26), rayM); m.renderOrder = 3;
        m.userData.off = new THREE.Vector3((i - 2) * 9 + (Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 18); this.group.add(m); this.rays.push(m);
      }
    }
  }
  update(dt, focus, lighting, camera, inside) {
    this.u.uT.value += dt;
    const c = lighting.cur;
    this.u.uCol.value.copy(c.fog).lerp(c.sunCol, 0.25);
    this.u.uSunCol.value.copy(c.sunCol);
    const low = 1 - Math.min(1, Math.max(0, c.sun.y - 0.15) / 0.6); // sun low → more shafts
    this.u.uRays.value = inside ? 0 : (c.sunI / 3.3) * (0.35 + low * 0.9);
    this.u.uA.value = inside ? 0.5 : 0.7 + low * 0.5;
    this.group.visible = true;
    for (const m of this.group.children) if (m.userData.y !== undefined) m.position.set(focus.x, focus.y + m.userData.y, focus.z);
    for (const r of this.rays) {
      r.visible = this.u.uRays.value > 0.02;
      // leaning along the sun direction, standing over the ground near the hero
      const s = c.sun; r.position.set(focus.x + r.userData.off.x + s.x * 8, focus.y + 6 + s.y * 4, focus.z + r.userData.off.z + s.z * 8);
      r.lookAt(r.position.x + camera.position.x - focus.x, r.position.y, r.position.z + camera.position.z - focus.z);
      r.rotateZ(Math.atan2(s.x, s.y) * 0.6);
    }
  }
}
