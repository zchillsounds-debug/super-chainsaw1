import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { VolumePass } from './volume.js';

const params = new URLSearchParams(location.search);
const storedQ = (() => { try { return JSON.parse(localStorage.getItem('sob.settings.v1') || '{}').quality; } catch { return null; } })();
// sharpness: render scale over CSS pixels (smooth = native up to 2x, the default)
export const SHARP_RATIO = { smooth: 2, balanced: 1.5, fast: 1 };
// Round 19: looks first, High is the default everywhere (the user's call); Low stays one tap away in Settings
export const QUALITY = params.get('q') || storedQ || 'high';

// Golden-hour sky dome, also baked into a PMREM env map for reflections.
// Sky dome with time-of-day colours (driven by lighting.js), also baked into a PMREM env map for reflections.
export const SKY = {
  uSun: { value: null }, uZen: { value: new THREE.Color(0.18, 0.36, 0.66) }, uMid: { value: new THREE.Color(0.78, 0.66, 0.56) },
  uHor: { value: new THREE.Color(1.0, 0.68, 0.40) }, uGnd: { value: new THREE.Color(0.50, 0.36, 0.24) }, uGlow: { value: new THREE.Color(1.0, 0.55, 0.25) },
  uCloud: { value: new THREE.Color(1.0, 0.78, 0.6) }, uStars: { value: 0 }, uDisk: { value: 20 },
};
export function skyDome(sunDir) {
  SKY.uSun.value = sunDir;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: SKY,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSun, uZen, uMid, uHor, uGnd, uGlow, uCloud; uniform float uStars, uDisk; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fb(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.1; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vD); float hgt = d.y;
        vec3 sunD = normalize(uSun);
        float s = max(dot(d, sunD), 0.0);
        vec3 c = hgt > 0.0 ? mix(mix(uHor, uMid, smoothstep(0.0,0.12,hgt)), uZen, smoothstep(0.1,0.6,hgt)) : mix(uHor, uGnd, smoothstep(0.0,-0.15,hgt));
        c += uGlow * pow(s, 6.0) * 0.55 + uGlow * 1.4 * vec3(1.0,0.85,0.65) * pow(s, 64.0) * 0.6;
        if (hgt > 0.0) {
          vec2 uv = d.xz / (hgt + 0.12) * 1.4;
          float cl = fb(uv*vec2(1.0,2.6) + vec2(3.0,0.0));
          cl = smoothstep(0.52, 0.85, cl) * smoothstep(0.0, 0.25, hgt);
          c = mix(c, uCloud * mix(0.85, 1.05, pow(s,4.0)), cl*0.65);
          // stars at night
          vec2 sp = d.xz / (hgt + 0.3) * 160.0; float st = step(0.9985, h(floor(sp) + vec2(17.0, 3.0))) * smoothstep(0.05, 0.4, hgt) * (1.0 - cl);
          c += vec3(0.9,0.92,1.0) * st * uStars * (0.6 + 0.4*h(floor(sp)+1.0));
        }
        c += vec3(1.0,0.9,0.7) * smoothstep(0.9993, 0.9998, s) * uDisk; // sun or moon disk
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
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 1.0 }, uLowHp: { value: 0 }, uAspect: { value: 1 }, uCine: { value: 0 }, uDusk: { value: 0 }, uDuskAct: { value: 0 }, uLut: { value: 0 }, uCVD: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uVignette, uLowHp, uAspect, uCine, uDusk, uDuskAct, uLut, uCVD; varying vec2 vUv;
    // colour-vision assistance (daltonization): simulate the deficiency, then shift the lost contrast into channels that remain
    vec3 daltonize(vec3 c, float t){
      vec3 L = vec3(17.8824*c.r + 43.5161*c.g + 4.11935*c.b, 3.45565*c.r + 27.1554*c.g + 3.86714*c.b, 0.0299566*c.r + 0.184309*c.g + 1.46709*c.b);
      vec3 s = L;
      if (t < 1.5) s = vec3(2.02344*L.g - 2.52581*L.b, L.g, L.b);
      else if (t < 2.5) s = vec3(L.r, 0.494207*L.r + 1.24827*L.b, L.b);
      else s = vec3(L.r, L.g, -0.395913*L.r + 0.801109*L.g);
      vec3 sim = vec3(0.0809444479*s.r - 0.130504409*s.g + 0.116721066*s.b, -0.0102485335*s.r + 0.0540193266*s.g - 0.113614708*s.b, -0.000365296938*s.r - 0.00412161469*s.g + 0.693511405*s.b);
      vec3 err = c - sim;
      return c + vec3(0.0, 0.7*err.r + err.g, 0.7*err.r + err.b);
    }
    // per-act colour grade (a compact stand-in for a 3D LUT): lift / gamma / gain + saturation per preset
    vec3 actGrade(vec3 c, float id){
      vec3 lift = vec3(0.0), gain = vec3(1.0); float sat = 1.0, gam = 1.0;
      if (id < 0.5) { lift = vec3(0.0); gain = vec3(1.02,1.0,0.96); }                         // golden afternoon
      else if (id < 1.5) { lift = vec3(0.0,0.008,0.016); gain = vec3(1.04,0.98,0.93); sat = 0.92; } // dusk: ember highs, teal lows
      else if (id < 2.5) { lift = vec3(0.0,0.006,0.014); gain = vec3(0.98,0.99,1.03); sat = 0.7; gam = 0.97; } // night: cool, desaturated
      else if (id < 3.5) { lift = vec3(0.01,0.005,0.01); gain = vec3(1.04,0.98,0.98); sat = 0.95; } // dawn
      else if (id < 4.5) { lift = vec3(0.008,0.004,0.0); gain = vec3(1.08,0.98,0.86); sat = 0.9; gam = 0.96; }   // underground torchlight
      else if (id < 5.5) { lift = vec3(0.012,0.018,0.016); gain = vec3(0.98,1.01,0.99); sat = 0.9; gam = 1.02; } // marsh morning: soft, misty greens
      else { lift = vec3(0.016,0.008,0.0); gain = vec3(1.06,0.97,0.88); sat = 0.88; gam = 0.98; }   // al-Karkh: amber smoke
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      // desaturate the darks and mids only: fire, lamps and glints keep their colour
      c = mix(vec3(l), c, mix(sat, max(sat, 1.08), smoothstep(0.35, 1.1, l)));
      c = pow(max(c * gain + lift * (1.0 - c), 0.0), vec3(gam));
      return c;
    }
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv;
      // subtle chromatic aberration toward edges
      vec2 c = uv-0.5; float r2 = dot(c,c);
      vec3 col;
      col.r = texture2D(tDiffuse, uv - c*r2*0.002).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + c*r2*0.002).b;
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
      col = actGrade(col, uLut);
      // dusk (prologue): cooler shadows, ember highlights, lower key
      float l2 = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(col, col * mix(vec3(0.6,0.7,0.78), vec3(1.12,0.8,0.58), smoothstep(0.05,0.7,l2)) * 0.95, max(uDusk, uDuskAct));
      // cinematic grade: warmer, slightly richer contrast, heavier vignette
      col = mix(col, pow(col * vec3(1.06,1.0,0.9), vec3(1.08)), uCine);
      col *= mix(1.0, smoothstep(1.15, 0.35, length(vc)), 0.35*uCine);
      // no film grain: on phone screens it read as noise; a sub-LSB dither only, to keep gradients free of banding
      col += (h(uv*vec2(1920.,1080.)) - 0.5) / 255.0;
      if (uCVD > 0.5) col = max(daltonize(col, uCVD), 0.0);
      gl_FragColor = vec4(col,1.0);
    }`,
};

export function createComposer(renderer, scene, camera, sun) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (QUALITY !== 'low') {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.0, distanceExponent: 1.5, thickness: 0.7, scale: 1.0, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    // the G-buffer pass draws only solid surfaces: haze slabs, light shafts, particles, decals and the sky stay out
    // of the depth (they used to write it, which muddied the AO and broke the volumetric light)
    gtao.overrideVisibility = function () {
      const cache = this._visibilityCache;
      this.scene.traverse((o) => {
        cache.set(o, o.visible);
        const m = o.material;
        if (o.isPoints || o.isLine || o.isSprite || o.userData.noAO || (m && !Array.isArray(m) && (m.transparent || m.depthWrite === false || m.blending === THREE.AdditiveBlending))) o.visible = false;
      });
    };
    composer.addPass(gtao);
  }
  // volumetric light (needs the GTAO depth; off on Low)
  let vol = null;
  if (gtao && sun) { vol = new VolumePass(camera, sun, gtao, size.x, size.y); composer.addPass(vol); }
  // depth of field for cinematic close-ups (off unless a scene asks for it)
  let bokeh = null;
  if (QUALITY !== 'low') { bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.00012, maxblur: 0.008 }); bokeh.enabled = false; composer.addPass(bokeh); }
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
  return { composer, bloom, grade, gtao, bokeh, vol, resize };
}

export function envFromSky(renderer, sunDir) {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const dome = skyDome(sunDir);
  s.add(dome);
  const env = pm.fromScene(s, 0, 0.1, 1000).texture;
  pm.dispose();
  return env;
}
