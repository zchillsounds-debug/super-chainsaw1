import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// Round 19: volumetric light. A half-resolution ray march through height fog that reads the sun's shadow
// map, so dust in the air glows where the sun reaches it and stays dark in the shadows of palms, walls and
// arches: real god rays, from any camera angle. The scene depth comes from the GTAO pass's G-buffer, so it
// costs no extra scene render. A second pass composites it over the frame at full resolution.
const MARCH = `
  uniform sampler2D tDepth, tShadow; uniform mat4 uProjInv, uViewInv, uShadowM; uniform vec3 uCam, uSun, uSunCol, uAmb, uFogCol;
  uniform float uDebug, uDens, uFall, uGround, uTime, uSteps, uMaxD, uShadowOn, uFrame, uAniso, uSunI;
  varying vec2 vUv;
  #include <packing>
  float h3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
  float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  float sunVis(vec3 p){
    if (uShadowOn < 0.5) return 1.0;
    vec4 sc = uShadowM * vec4(p, 1.0); sc.xyz /= sc.w;
    if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
    float d = unpackRGBAToDepth(texture2D(tShadow, sc.xy));
    return step(sc.z - 0.002, d);
  }
  void main(){
    float z = texture2D(tDepth, vUv).x;
    vec4 ndc = vec4(vUv*2.0-1.0, z*2.0-1.0, 1.0);
    vec4 vp = uProjInv * ndc; vp /= vp.w;
    vec3 wp = (uViewInv * vp).xyz;
    vec3 rd = wp - uCam; float L = length(rd); rd /= L;
    if (z >= 0.9999) L = uMaxD; // sky
    L = min(L, uMaxD);
    if (uDebug > 0.5) { gl_FragColor = vec4(vUv, (1.0-z)*30.0, 0.0); return; }
    float N = uSteps, dt = L / N;
    float j = ign(gl_FragCoord.xy + uFrame * 5.588238);
    float cosT = dot(rd, uSun);
    float g = uAniso; float phase = (1.0 - g*g) / (12.566 * pow(1.0 + g*g - 2.0*g*cosT, 1.5));
    float iso = 0.0796;
    vec3 inS = vec3(0.0); float T = 1.0;
    for (int i = 0; i < 32; i++) {
      if (float(i) >= N) break;
      float t = (float(i) + j) * dt;
      vec3 p = uCam + rd * t;
      float hgt = max(p.y - uGround, 0.0);
      float dens = uDens * exp(-hgt * uFall);
      dens *= 0.55 + 0.9 * n3(p * 0.11 + vec3(uTime*0.35, 0.0, uTime*0.12));
      if (dens < 1e-5) continue;
      float vis = sunVis(p);
      vec3 Ls = uSunCol * uSunI * vis * (phase * 0.75 + iso * 0.6) + uAmb;
      float ext = dens * dt;
      inS += T * Ls * ext;
      T *= exp(-ext);
    }
    gl_FragColor = vec4(inS, T);
  }`;
const COMP = `
  uniform sampler2D tDiffuse, tVol; uniform float uAmt; varying vec2 vUv;
  void main(){
    vec4 s = texture2D(tDiffuse, vUv);
    vec4 v = texture2D(tVol, vUv);
    if (uAmt > 1.5) { gl_FragColor = vec4(v.rgb, 1.0); return; }
    gl_FragColor = vec4(s.rgb * mix(1.0, v.a, uAmt) + v.rgb * uAmt, s.a);
  }`;
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

export class VolumePass extends Pass {
  constructor(camera, sun, gtao, w, h) {
    super();
    this.camera = camera; this.sun = sun; this.gtao = gtao; this.frame = 0; this.amount = 1;
    this.rt = new THREE.WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), { type: THREE.HalfFloatType });
    this.u = {
      tDepth: { value: null }, tShadow: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uViewInv: { value: new THREE.Matrix4() }, uShadowM: { value: new THREE.Matrix4() },
      uCam: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.8, 0.6) }, uAmb: { value: new THREE.Color(0.02, 0.02, 0.025) }, uFogCol: { value: new THREE.Color() },
      uDebug: { value: 0 }, uDens: { value: 0.02 }, uFall: { value: 0.22 }, uGround: { value: 0 }, uTime: { value: 0 }, uSteps: { value: 20 }, uMaxD: { value: 70 }, uShadowOn: { value: 1 }, uFrame: { value: 0 }, uAniso: { value: 0.55 }, uSunI: { value: 1 },
    };
    this.march = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VS, fragmentShader: MARCH, depthTest: false, depthWrite: false }));
    this.comp = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, tVol: { value: this.rt.texture }, uAmt: { value: 1 } }, vertexShader: VS, fragmentShader: COMP, depthTest: false, depthWrite: false }));
  }
  setSize(w, h) { this.rt.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1)); }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.u, cam = this.camera, sh = this.sun.shadow;
    u.tDepth.value = this.gtao.depthTexture;
    u.tShadow.value = sh.map?.texture || null; u.uShadowOn.value = sh.map && this.sun.castShadow ? 1 : 0;
    u.uShadowM.value.copy(sh.matrix);
    u.uProjInv.value.copy(cam.projectionMatrixInverse); u.uViewInv.value.copy(cam.matrixWorld); u.uCam.value.setFromMatrixPosition(cam.matrixWorld);
    u.uFrame.value = (this.frame = (this.frame + 1) % 64);
    renderer.setRenderTarget(this.rt); this.march.render(renderer);
    this.comp.material.uniforms.tDiffuse.value = readBuffer.texture; this.comp.material.uniforms.uAmt.value = this.amount;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.comp.render(renderer);
  }
}
