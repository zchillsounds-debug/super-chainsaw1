import * as THREE from 'three';
import { canalX, CANAL_W, WORLD, WATER_Y, heightAt } from './terrain.js';
import { REFL, REFL_GLSL } from './reflect.js';

export function createCanal(sunDir, { halfW = CANAL_W * 0.62, river = false } = {}) {
  const segs = 260, half = WORLD / 2;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const z = -half + i / segs * WORLD, x = canalX(z);
    const dx = canalX(z + 0.5) - canalX(z - 0.5);
    const nx = 1, nz = -dx; const l = Math.hypot(nx, nz);
    const w = halfW;
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
      uDeep: { value: new THREE.Color(river ? 0x0c2a26 : 0x0a2526) }, uShallow: { value: new THREE.Color(river ? 0x23463a : 0x2c5248) }, uRiver: { value: river ? 1 : 0 },
      uSky: { value: new THREE.Color(0xf3c999) },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, ...REFL,
    },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying float vFogDepth;
      void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vFogDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime, uRiver; uniform vec3 uSun,uDeep,uShallow,uSky,uSpec,fogColor; uniform float fogDensity; ${REFL_GLSL}
      varying vec2 vUv; varying vec3 vW; varying float vFogDepth;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float wave(vec2 p){ return n(p*0.9+vec2(0.,uTime*0.35))*0.5 + n(p*2.1-vec2(uTime*0.2,uTime*0.5))*0.3 + n(p*5.3+vec2(uTime*0.6,0.))*0.2; }
      void main(){
        vec2 p = vW.xz; float e=0.08;
        float hc=wave(p), hx=wave(p+vec2(e,0.)), hz=wave(p+vec2(0.,e));
        vec2 rg = ripples(p);
        vec3 N = normalize(vec3((hc-hx)*2.5 + rg.x, 1.0, (hc-hz)*2.5 + rg.y));
        vec3 V = normalize(cameraPosition - vW);
        float fres = clamp((0.04 + 0.96*pow(1.0 - max(dot(N,V),0.0), 5.0)) * 2.2, 0.0, 1.0);
        float edge = 1.0 - abs(vUv.x*2.0-1.0);
        vec3 water = mix(uShallow, uDeep, smoothstep(0.0, mix(0.7, 0.12, uRiver), edge));
        // Round 20: the Tigris: silt-green, broad slow eddies drifting south
        if (uRiver > 0.5) water *= 0.85 + 0.3 * n(vec2(p.x * 0.05, p.y * 0.02 + uTime * 0.04));
        vec3 R = reflect(-V,N);
        vec3 refl = reflAt(vW, N, mix(uSky*0.8, uSky*1.15, smoothstep(0.0,0.6,R.y)));
        vec3 col = mix(water, refl, fres);
        vec3 H = normalize(uSun + V);
        col += uSpec * (pow(max(dot(N,H),0.0), 420.0) * 6.0 + pow(max(dot(N,H),0.0), 40.0) * 0.12);
        // slow flow streaks drifting downstream
        float streak = smoothstep(0.62, 0.9, n(vec2(p.x*3.0, p.y*0.35 - uTime*0.6))) * edge;
        col += uSky * streak * 0.08;
        float foam = smoothstep(0.18,0.0,edge) * (0.5+0.5*n(p*4.0+uTime));
        col = mix(col, vec3(0.86,0.82,0.7), foam*0.5);
        float a = mix(mix(0.55, 0.92, smoothstep(0.0,0.4,edge)), 0.97, uRiver);
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

// The marshes' open water (Act IV): one flat sheet at WATER_Y out to the horizon. Dry ground simply occludes it;
// a height texture gives the depth, so shallows show green silt and the shore line gets a little foam.
export function createLagoon(sunDir) {
  const S = 128, half = WORLD / 2, data = new Uint8Array(S * S * 4);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (i + 0.5) / S * WORLD - half, z = (j + 0.5) / S * WORLD - half;
    const d = Math.max(0, Math.min(1, (WATER_Y - heightAt(x, z)) / 1.1)), k = (j * S + i) * 4;
    data[k] = d * 255; data[k + 1] = data[k + 2] = 0; data[k + 3] = 255;
  }
  const depthTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); depthTex.magFilter = THREE.LinearFilter; depthTex.minFilter = THREE.LinearFilter; depthTex.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(1600, 1600, 1, 1).rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uSun: { value: sunDir }, uSpec: { value: new THREE.Color(1.0, 0.85, 0.6) },
      uDeep: { value: new THREE.Color(0x0a1c18) }, uShallow: { value: new THREE.Color(0x2a3e2c) },
      uSky: { value: new THREE.Color(0xf3c999) }, uDepth: { value: depthTex }, uWorld: { value: WORLD },
      fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, ...REFL,
    },
    vertexShader: `varying vec3 vW; varying float vFogDepth;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vFogDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime, uWorld; uniform vec3 uSun,uDeep,uShallow,uSky,uSpec,fogColor; uniform float fogDensity; uniform sampler2D uDepth; ${REFL_GLSL}
      varying vec3 vW; varying float vFogDepth;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float wave(vec2 p){ return n(p*0.7+vec2(0.,uTime*0.18))*0.55 + n(p*1.9-vec2(uTime*0.12,uTime*0.22))*0.3 + n(p*4.7+vec2(uTime*0.3,0.))*0.15; }
      void main(){
        vec2 p = vW.xz; float e=0.08;
        vec2 uv = p/uWorld + 0.5;
        float inside = step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
        float depth = mix(1.0, texture2D(uDepth, uv).r, inside);
        float hc=wave(p), hx=wave(p+vec2(e,0.)), hz=wave(p+vec2(0.,e));
        vec2 rg = ripples(p);
        vec3 N = normalize(vec3((hc-hx)*1.4 + rg.x, 1.0, (hc-hz)*1.4 + rg.y));
        vec3 V = normalize(cameraPosition - vW);
        float fres = clamp((0.04 + 0.96*pow(1.0 - max(dot(N,V),0.0), 5.0)) * 2.2, 0.0, 1.0);
        vec3 water = mix(uShallow, uDeep, smoothstep(0.05,0.65,depth));
        vec3 R = reflect(-V,N);
        vec3 refl = reflAt(vW, N, mix(uSky*0.75, uSky*1.1, smoothstep(0.0,0.6,R.y)));
        vec3 col = mix(water, refl, fres);
        vec3 H = normalize(uSun + V);
        col += uSpec * (pow(max(dot(N,H),0.0), 420.0) * 6.0 + pow(max(dot(N,H),0.0), 40.0) * 0.12);
        // floating weed and pollen drifting in still water
        float scum = smoothstep(0.7, 0.85, n(p*0.45 + vec2(uTime*0.02,0.))) * (1.0-smoothstep(0.2,0.6,depth));
        col = mix(col, vec3(0.32,0.36,0.18), scum*0.45);
        float foam = smoothstep(0.08,0.0,depth) * (0.5+0.5*n(p*3.0+uTime*0.5));
        col = mix(col, vec3(0.82,0.80,0.68), foam*0.35);
        float a = mix(0.72, 0.97, smoothstep(0.0,0.3,depth));
        float f = 1.0 - exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
        col = mix(col, fogColor, f);
        gl_FragColor = vec4(col, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_Y; mesh.renderOrder = 1; mesh.userData.noOcc = true;
  mesh.update = (t, scene) => { mat.uniforms.uTime.value = t; if (scene.fog) { mat.uniforms.fogColor.value.copy(scene.fog.color); mat.uniforms.fogDensity.value = scene.fog.density; } };
  return mesh;
}
