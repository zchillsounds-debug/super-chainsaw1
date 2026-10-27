// node tools/fightsheet.mjs <out.png> <id,id,...> [lv,lv,...] [shiny] [hat] : each critter as a battle fighter (in a real battle, posed
// facing the camera), one row per critter and one column per level, plus the frame's draw calls. For before/after checks of battle looks.
import { createRequire } from 'module';
import { writeFileSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const [out, ids, lvs = '1,16,32', shiny = '', hat = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const L = lvs.split(',').map(Number);
const pg = await b.newPage({ viewport: { width: 400, height: 400 } });
let I = ids.split(','); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
await pg.goto('http://localhost:' + (process.env.PORT || 5180) + '/?q=high&auto');
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
if (ids === 'all') I = await pg.evaluate(() => __critters.map((c) => c.id));
const res = await pg.evaluate(([I, L, shiny, hat]) => {
  const g = __game, R = g.renderer, imgs = [], calls = [];
  for (const id of I) for (const lv of L) {
    const c = __critters.find((x) => x.id === id), d = __grow(shiny ? __skinned(c, 'shiny') : c, lv);
    g.startBattle(d, d, { arena: 'meadow', playerLevel: lv, cpuLevel: lv, heroHat: hat || null, training: true });
    __sim(0.3);
    const B = g.battle, f = B.fighters[0], o = B.fighters[1];
    o.root.visible = false; f.x = 0; f.z = 0; f.face = 0; f.state = 'idle';
    f.root.position.set(0, 0, 0); f.root.rotation.set(0, 0.35, 0); const C = f.critter; C.resetPose(); for (const k in C.pose) { C.P[k] = C.pose[k]; C.V[k] = 0; } C.t = 0; C.blinkT = 9; C.update(0.016); f.shield.visible = false;
    const Z = d.size || 1, cam = g.camera.clone(); cam.fov = 28; cam.aspect = R.domElement.width / R.domElement.height; cam.position.set(0, 1.4 * Z, 5.2 * Z); cam.lookAt(0, 0.8 * Z, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    B.update = () => {}; g.hud.show(false);
    R.info.autoReset = false; R.info.reset(); R.render(g.scene, cam); calls.push(R.info.render.calls); R.info.autoReset = true;
    imgs.push(R.domElement.toDataURL());
  }
  g.endBattle();
  return { imgs, calls };
}, [I, L, shiny, hat]);
// the sheet is put together off the page (a big page screenshot times out while the game renders)
const tmp = out.replace(/\.png$/, ''), files = res.imgs.map((u, i) => { const f = `${tmp}-${i}.png`; writeFileSync(f, Buffer.from(u.split(',')[1], 'base64')); return f; });
execFileSync('python3', ['-c', `import sys\nfrom PIL import Image, ImageDraw\nn=${L.length}; fs=sys.argv[2:]; c=${JSON.stringify(res.calls)}\nS=Image.new('RGB',(200*n,200*((len(fs)+n-1)//n)),'white')\nfor i,f in enumerate(fs):\n  im=Image.open(f).convert('RGB'); w,h=im.size; m=min(w,h); im=im.crop(((w-m)//2,(h-m)//2,(w-m)//2+m,(h-m)//2+m)).resize((200,200)); ImageDraw.Draw(im).text((4,2),str(c[i]),fill='black'); S.paste(im,(200*(i%n),200*(i//n)))\nS.save(sys.argv[1])`, out, ...files]);
files.forEach((f) => unlinkSync(f));
console.log('draws:', res.calls.join(' '));
console.log('errors:', errs.join(' | ') || 'none');
await b.close();
