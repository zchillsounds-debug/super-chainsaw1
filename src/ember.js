import * as THREE from 'three';
import { wind } from './vegetation.js';

// glowing coals: dark crust broken by hot cracks that pulse (shared, made once)
let EMBER = null;
export function emberBed() {
  if (EMBER) return EMBER;
  EMBER = new THREE.ShaderMaterial({
    uniforms: { uT: wind.uTime },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT; varying vec3 vW;
      vec2 hh(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
      void main(){ vec2 p = vW.xz * 7.0; vec2 i = floor(p), f = fract(p); float d1 = 9., d2 = 9.;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y), o = hh(i + g); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        float crack = 1.0 - smoothstep(0.0, 0.18, d2 - d1);
        float pulse = 0.75 + 0.25 * sin(uT * 3.0 + dot(i, vec2(1.7, 2.3)));
        vec3 hot = vec3(2.2, 0.55, 0.08) * pulse, crust = vec3(0.06, 0.03, 0.02);
        gl_FragColor = vec4(mix(crust + hot * 0.08 * (1.0 - d1), hot, crack), 1.0); }`,
  });
  EMBER.toneMapped = false;
  return EMBER;
}
