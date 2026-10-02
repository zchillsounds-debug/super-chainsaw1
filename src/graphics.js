import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

const params = new URLSearchParams(location.search);
export const QUALITY = params.get('q') || 'high';

// Golden-hour sky dome, also baked into a PMREM env map for reflections.
export function skyDome(sunDir) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sunDir } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); float h = d.y;
        vec3 zen = vec3(0.20,0.36,0.62), mid = vec3(0.72,0.66,0.62), hor = vec3(1.0,0.72,0.45), gnd = vec3(0.55,0.42,0.30);
        vec3 c = h > 0.0 ? mix(mix(hor, mid, smoothstep(0.0,0.18,h)), zen, smoothstep(0.15,0.8,h)) : mix(hor, gnd, smoothstep(0.0,-0.2,h));
        float s = max(dot(d, normalize(uSun)), 0.0);
        c += vec3(1.0,0.7,0.4)*pow(s, 8.0)*0.6 + vec3(1.0,0.85,0.6)*pow(s, 700.0)*25.0;
        // high thin clouds
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY === 'low' ? 1 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 1.0 }, uLowHp: { value: 0 }, uAspect: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVignette, uLowHp, uAspect; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv;
      // subtle chromatic aberration toward edges
      vec2 c = uv-0.5; float r2 = dot(c,c);
      vec3 col;
      col.r = texture2D(tDiffuse, uv - c*r2*0.006).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + c*r2*0.006).b;
      // warm split-tone: teal shadows, amber highlights
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      vec3 sh = vec3(0.92,1.0,1.06), hi = vec3(1.08,1.0,0.88);
      col *= mix(sh, hi, smoothstep(0.05,0.8,l));
      col = mix(vec3(l), col, 1.15); // saturation
      col = (col - 0.5*l) * 1.0 + 0.5*l; col = pow(col, vec3(1.06)); // slight contrast
      // vignette
      vec2 vc = c*vec2(uAspect,1.0);
      float v = smoothstep(1.05, 0.25, length(vc)*1.05);
      col *= mix(1.0, v, 0.75*uVignette);
      // low health pulse
      float pulse = (0.6+0.4*sin(uTime*6.0))*uLowHp;
      col = mix(col, col*vec3(1.2,0.3,0.25), smoothstep(0.3,1.2,length(vc))*pulse);
      // film grain
      col += (h(uv*vec2(1920.,1080.)+fract(uTime)*100.)-0.5)*0.025;
      gl_FragColor = vec4(col,1.0);
    }`,
};

export function createComposer(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (QUALITY !== 'low') {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.2, distanceExponent: 1.5, thickness: 2.0, scale: 1.0, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.6, 0.9);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  const smaa = new SMAAPass(size.x, size.y);
  composer.addPass(smaa);
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    composer.setSize(window.innerWidth, window.innerHeight);
    grade.uniforms.uAspect.value = s.x / s.y;
  };
  resize();
  return { composer, bloom, grade, gtao, resize };
}

export function envFromSky(renderer, sunDir) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const dome = skyDome(sunDir); dome.material = dome.material.clone(); dome.material.uniforms.uSun.value = sunDir;
  s.add(dome);
  const env = pm.fromScene(s, 0, 0.1, 1000).texture;
  pm.dispose();
  return env;
}
