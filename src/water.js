import * as THREE from 'three';
import { canalX, CANAL_W, WORLD } from './terrain.js';

export function createCanal(sunDir) {
  const segs = 260, half = WORLD / 2;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const z = -half + i / segs * WORLD, x = canalX(z);
    const dx = canalX(z + 0.5) - canalX(z - 0.5);
    const nx = 1, nz = -dx; const l = Math.hypot(nx, nz);
    const w = CANAL_W * 0.62;
    pos.push(x - nx / l * w, -0.55, z - nz / l * w, x + nx / l * w, -0.55, z + nz / l * w);
    uv.push(0, z * 0.1, 1, z * 0.1);
    if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uSun: { value: sunDir }, uSpec: { value: new THREE.Color(1.0, 0.85, 0.6) },
      uDeep: { value: new THREE.Color(0x0f3a3a) }, uShallow: { value: new THREE.Color(0x4f8a72) },
      uSky: { value: new THREE.Color(0xf3c999) },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying float vFogDepth;
      void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vFogDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uSun,uDeep,uShallow,uSky,uSpec,fogColor; uniform float fogDensity;
      varying vec2 vUv; varying vec3 vW; varying float vFogDepth;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float wave(vec2 p){ return n(p*0.9+vec2(0.,uTime*0.35))*0.5 + n(p*2.1-vec2(uTime*0.2,uTime*0.5))*0.3 + n(p*5.3+vec2(uTime*0.6,0.))*0.2; }
      void main(){
        vec2 p = vW.xz; float e=0.08;
        float hc=wave(p), hx=wave(p+vec2(e,0.)), hz=wave(p+vec2(0.,e));
        vec3 N = normalize(vec3((hc-hx)*2.5, 1.0, (hc-hz)*2.5));
        vec3 V = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(N,V),0.0), 3.0)*0.85 + 0.15;
        float edge = 1.0 - abs(vUv.x*2.0-1.0);
        vec3 water = mix(uShallow, uDeep, smoothstep(0.0,0.7,edge));
        vec3 R = reflect(-V,N);
        vec3 refl = mix(uSky*0.8, uSky*1.15, smoothstep(0.0,0.6,R.y));
        vec3 col = mix(water, refl, fres*0.55);
        vec3 H = normalize(uSun + V);
        col += uSpec * pow(max(dot(N,H),0.0), 220.0) * 3.0;
        // slow flow streaks drifting downstream
        float streak = smoothstep(0.62, 0.9, n(vec2(p.x*3.0, p.y*0.35 - uTime*0.6))) * edge;
        col += uSky * streak * 0.08;
        float foam = smoothstep(0.18,0.0,edge) * (0.5+0.5*n(p*4.0+uTime));
        col = mix(col, vec3(0.86,0.82,0.7), foam*0.5);
        float a = mix(0.55, 0.92, smoothstep(0.0,0.4,edge));
        float f = 1.0 - exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
        col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  mesh.update = (t, scene) => { mat.uniforms.uTime.value = t; if (scene.fog) { mat.uniforms.fogColor.value.copy(scene.fog.color); mat.uniforms.fogDensity.value = scene.fog.density; } };
  return mesh;
}
