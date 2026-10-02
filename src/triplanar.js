import * as THREE from 'three';

// World-space triplanar albedo + normal mapping for architecture (no UVs needed).
export function triplanarMaterial({ map, normalMap, scale = 0.25, color = 0xffffff, roughness = 0.9, normalStrength = 1, grime = 0.35 }) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const uniforms = { uTMap: { value: map }, uTNorm: { value: normalMap }, uTScale: { value: scale }, uTNS: { value: normalStrength }, uGrime: { value: grime } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTW; varying vec3 vTN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 twp = vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          twp = instanceMatrix * twp;
        #endif
        vTW = (modelMatrix * twp).xyz;
        #ifdef USE_INSTANCING
          vTN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        #else
          vTN = normalize(mat3(modelMatrix) * objectNormal);
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTW; varying vec3 vTN; uniform sampler2D uTMap, uTNorm; uniform float uTScale, uTNS, uGrime;
        vec3 tW;
        float th(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5); }
        float tn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(th(i),th(i+vec2(1,0)),f.x),mix(th(i+vec2(0,1)),th(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <map_fragment>', `
        tW = pow(abs(normalize(vTN)), vec3(4.0)); tW /= (tW.x+tW.y+tW.z);
        vec3 tp = vTW * uTScale;
        vec4 tc = texture2D(uTMap, tp.zy)*tW.x + texture2D(uTMap, tp.xz)*tW.y + texture2D(uTMap, tp.xy)*tW.z;
        diffuseColor *= tc;
        // grime: darker near the ground, streaks + large-scale tonal variation
        float g = smoothstep(1.6, 0.0, vTW.y - 0.0) ;
        float big = tn(vTW.xz*0.15 + vTW.y*0.05);
        float streak = tn(vec2(vTW.x*2.0 + vTW.z*2.0, vTW.y*0.25));
        diffuseColor.rgb *= mix(1.0, 0.62, g*uGrime*1.6) * (0.86 + big*0.24) * mix(1.0, 0.85 + streak*0.2, uGrime);
      `)
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 tp2 = vTW * uTScale;
          vec3 nx = texture2D(uTNorm, tp2.zy).xyz*2.0-1.0;
          vec3 ny = texture2D(uTNorm, tp2.xz).xyz*2.0-1.0;
          vec3 nz = texture2D(uTNorm, tp2.xy).xyz*2.0-1.0;
          vec3 N = normalize(vTN);
          nx.xy *= uTNS; ny.xy *= uTNS; nz.xy *= uTNS;
          // whiteout blend per axis, swizzled to world
          vec3 wx = vec3(nx.z*sign(N.x), nx.y, nx.x);
          vec3 wy = vec3(ny.x, ny.z*sign(N.y), ny.y);
          vec3 wz = vec3(nz.x, nz.y, nz.z*sign(N.z));
          vec3 wn = normalize(wx*tW.x + wy*tW.y + wz*tW.z + N*0.0);
          // tilt geometric normal by the detail
          vec3 detail = wn - vec3(sign(N.x)*tW.x, sign(N.y)*tW.y, sign(N.z)*tW.z);
          vec3 fw = normalize(N + detail);
          normal = normalize((viewMatrix * vec4(fw, 0.0)).xyz);
        }`);
  };
  return mat;
}
