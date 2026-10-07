// Round 30: the camp, furnished. Every region's camp gets a cooking fire, two tents and a water stand, placed outward
// from the camp's middle so they never stand between the spawn and a camp man. The props themselves are in props30.js;
// Bishr's forge and old anvil are swapped in hub.js, the rebuilt forge (the camp upgrade) in hublife.js.
import * as THREE from 'three';
import { HUB, IS_DOCKS } from './region.js';
import { heightAt, waterDepth } from './terrain.js';
import { colliders } from './buildings.js';
import { buildGrid } from './collision.js';
import { freeSpot } from './sidequests.js';
import { cookFire, tent, waterJars } from './props30.js';

export function setupCamp30(g) {
  const H = HUB; if (!H?.spawn) return;
  const keys = ['merchant', 'smith', 'stash', 'trainer', 'ishaq'], cx = keys.reduce((s, k) => s + H[k][0], 0) / keys.length, cz = keys.reduce((s, k) => s + H[k][1], 0) / keys.length;
  // a point `out` metres beyond a camp man, turned `turn` radians round the middle
  const beyond = (k, out, turn = 0) => { const dx = H[k][0] - cx, dz = H[k][1] - cz, L = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx) + turn; return [cx + Math.cos(a) * (L + out), cz + Math.sin(a) * (L + out)]; };
  const props = (g.campProps30 = {});
  // a spot for a prop of radius `pad`: off every collider, its whole footprint on dry ground (a tent stood half in a canal)
  const spot = (at, pad) => {
    for (let r = 0; r < 12; r += 0.7) for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, [x, z] = r ? [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r] : at;
      const [fx, fz] = freeSpot(x, z, pad); if (Math.hypot(fx - x, fz - z) > 0.05) continue;
      let dry = true; for (let j = 0; j < 8 && dry; j++) dry = waterDepth(fx + Math.cos(j * 0.785) * (pad + 0.6), fz + Math.sin(j * 0.785) * (pad + 0.6)) < 0.02;
      if (dry && !keysNear(fx, fz, pad)) return [fx, fz];
    }
    return freeSpot(at[0], at[1], pad);
  };
  // and never on a camp man's spot or the spawn
  const keysNear = (x, z, pad) => [...keys, 'spawn'].some((k) => Math.hypot(H[k][0] - x, H[k][1] - z) < pad + 2.2);
  const place = (key, obj, at, r, pad, face = true) => {
    const [x, z] = spot(at, pad);
    obj.position.set(x, heightAt(x, z), z); obj.rotation.y = face ? Math.atan2(cx - x, cz - z) : 0;
    g.scene.add(obj); props[key] = obj;
    for (const [ox, oz, rr] of r) { const c = Math.cos(obj.rotation.y), s = Math.sin(obj.rotation.y); colliders.push({ type: 'circle', x: x + ox * c + oz * s, z: z - ox * s + oz * c, r: rr }); }
    return obj;
  };
  // the cooking fire between Ishaq and 'Amr's yard, pushed out of the walkway
  const cf = place('cook', cookFire(), beyond('ishaq', 5.5, -0.7), [[0, 0, 0.75], [1.55, -0.25, 0.5]], 2.0);
  const fp = cf.position.clone().add(new THREE.Vector3(0, 0.25, 0));
  g.world.fires.push({ pos: fp, intensity: 0.45 });
  g.lightPool?.add({ pos: fp.clone().add(new THREE.Vector3(0, 1.0, 0)), color: 0xff8a40, power: 10, dist: 8 });
  // two tents behind the stash and the yard; on the docks one is goat hair
  place('tentA', tent(3.2, 2.6, false), beyond('stash', 4.5, 0.25), [[-1.2, 0, 1.2], [1.2, 0, 1.2]], 2.6);
  place('tentB', tent(2.8, 2.4, IS_DOCKS || Math.random() < 0.5), beyond('trainer', 4.5, -0.3), [[-1.0, 0, 1.1], [1.0, 0, 1.1]], 2.4);
  // the water stand beside the merchant's goods
  place('water', waterJars(), beyond('merchant', 2.6, 0.5), [[0, 0, 0.75]], 1.4);
  buildGrid();
}
