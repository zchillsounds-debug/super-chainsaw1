import * as THREE from 'three';

// Round 19: planar water reflections. The scene is drawn once more from a camera mirrored in the water
// plane, at a fraction of the screen resolution, into a texture the water shaders sample in screen space.
// An oblique near plane (as in three's Reflector) clips everything under the water, so no shader variant is
// needed. Only objects on layer 1 are drawn: the terrain, sky, buildings, palms and characters. Grass,
// clutter and particles stay out, which keeps the extra pass to a few dozen draw calls.
export const REFLECT_LAYER = 1;
export const REFL = { tRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 }, uRip: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, -99)) }, uRipT: { value: 0 } };

export class PlanarReflection {
  constructor(renderer, scene, camera, { scale = 0.4, y = -0.55 } = {}) {
    Object.assign(this, { renderer, scene, camera, scale, y });
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.rt = new THREE.WebGLRenderTarget(Math.max(2, s.x * scale | 0), Math.max(2, s.y * scale | 0), { type: THREE.HalfFloatType, samples: 0 });
    this.cam = new THREE.PerspectiveCamera(); this.cam.layers.set(REFLECT_LAYER);
    this.plane = new THREE.Plane(); this.n = new THREE.Vector3(0, 1, 0); this.frame = 0; this.active = true;
    REFL.tRefl.value = this.rt.texture;
    this._v = new THREE.Vector3(); this._t = new THREE.Vector3(); this._q = new THREE.Vector4(); this._c = new THREE.Vector4(); this._p = new THREE.Vector3();
    this.tm = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  }
  resize() { const s = this.renderer.getDrawingBufferSize(new THREE.Vector2()); this.rt.setSize(Math.max(2, s.x * this.scale | 0), Math.max(2, s.y * this.scale | 0)); }
  update(every = 1) {
    REFL.uReflOn.value = this.active ? 1 : 0;
    if (!this.active) return;
    if ((this.frame++ % every) !== 0) return;
    const { camera, cam, plane, n } = this;
    const pp = this._p.set(0, this.y, 0);
    plane.setFromNormalAndCoplanarPoint(n, pp);
    // mirror the camera position and its view target in the plane
    const cw = this._v.setFromMatrixPosition(camera.matrixWorld);
    const view = cw.clone().sub(pp).reflect(n).negate().add(pp);
    const look = this._t.set(0, 0, -1).applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrixWorld)).add(cw);
    const target = pp.clone().sub(look).reflect(n).negate().add(pp);
    cam.position.copy(view); cam.up.set(0, 1, 0).applyMatrix4(new THREE.Matrix4().extractRotation(camera.matrixWorld)).reflect(n);
    cam.lookAt(target); cam.far = camera.far; cam.near = camera.near; cam.fov = camera.fov; cam.aspect = camera.aspect;
    cam.updateMatrixWorld(); cam.projectionMatrix.copy(camera.projectionMatrix);
    // texture matrix: world -> reflection texture uv
    this.tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    REFL.uReflMat.value.copy(this.tm).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    // oblique near plane = the water plane (clips the underwater half)
    const rp = plane.clone().applyMatrix4(cam.matrixWorldInverse);
    const cp = this._c.set(rp.normal.x, rp.normal.y, rp.normal.z, rp.constant);
    const pm = cam.projectionMatrix, q = this._q;
    q.x = (Math.sign(cp.x) + pm.elements[8]) / pm.elements[0];
    q.y = (Math.sign(cp.y) + pm.elements[9]) / pm.elements[5];
    q.z = -1.0; q.w = (1.0 + pm.elements[10]) / pm.elements[14];
    cp.multiplyScalar(2.0 / cp.dot(q));
    pm.elements[2] = cp.x; pm.elements[6] = cp.y; pm.elements[10] = cp.z + 1.0 - 0.003; pm.elements[14] = cp.w;
    const r = this.renderer, prevRT = r.getRenderTarget(), prevShadow = r.shadowMap.autoUpdate, prevNeeds = r.shadowMap.needsUpdate, fog = this.scene.fog;
    r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false;
    r.setRenderTarget(this.rt); r.clear(); r.render(this.scene, cam);
    r.setRenderTarget(prevRT); r.shadowMap.autoUpdate = prevShadow; r.shadowMap.needsUpdate = prevNeeds; this.scene.fog = fog;
  }
}
// tag an object tree for the reflection pass
export function reflects(o) { o.traverse((c) => c.layers.enable(REFLECT_LAYER)); return o; }

// GLSL shared by the water shaders: the reflection colour at a world point, bent by the surface normal,
// and expanding ripple rings from things wading through
export const REFL_GLSL = `
  uniform sampler2D tRefl; uniform mat4 uReflMat; uniform float uReflOn; uniform vec4 uRip[8]; uniform float uRipT;
  vec3 reflAt(vec3 w, vec3 N, vec3 fallback){
    if (uReflOn < 0.5) return fallback;
    vec4 c = uReflMat * vec4(w, 1.0); vec2 uv = c.xy / c.w + N.xz * 0.045;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return fallback;
    vec3 r = texture2D(tRefl, uv).rgb;
    return r;
  }
  // ripples: xyz = source (x, z, strength), w = start time
  vec2 ripples(vec2 p){
    vec2 g = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      float age = uRipT - uRip[i].w; if (age < 0.0 || age > 2.6) continue;
      vec2 d = p - uRip[i].xy; float r = length(d) + 1e-4;
      float front = age * 1.6;
      float ring = exp(-pow((r - front) * 3.0, 2.0)) * sin((r - front) * 18.0);
      g += d / r * ring * uRip[i].z * (1.0 - age / 2.6) * 0.5;
    }
    return g;
  }`;
