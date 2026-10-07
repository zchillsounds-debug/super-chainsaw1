// shots/devserver.mjs: a stand-in for vite when npm is unreachable (Round 32: the session's network blocked registry.npmjs.org).
//   node shots/devserver.mjs [--port 5173]   serve the game unbundled, like `vite` (no hot reload, so editing src/ never kills a test)
//   node shots/devserver.mjs build           bundle into dist/ like `vite build` (shots/inline.mjs reads it the same way)
// three must be in node_modules/three (fetched from GitHub r170: build/ and examples/jsm/). esbuild comes from the
// machine's global tools (/opt/npm-tools) or node_modules.
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const rewrite = (src, prod) => src
  .replace(/(from\s*|import\s*\(?\s*)(['"])three\2/g, '$1$2/node_modules/three/build/three.module.js$2')
  .replace(/(from\s*|import\s*\(?\s*)(['"])three\/(examples\/[^'"]+)\2/g, '$1$2/node_modules/three/$3$2')
  .replace(/import\.meta\.env\.PROD/g, String(prod)).replace(/import\.meta\.env\.DEV/g, String(!prod));

if (args[0] === 'build') {
  let esbuild;
  for (const p of [path.join(ROOT, 'node_modules/esbuild'), '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = createRequire(import.meta.url)(p); break; } catch { /* next */ } }
  if (!esbuild) { console.error('esbuild not found'); process.exit(1); }
  const dist = path.join(ROOT, 'dist'), assets = path.join(dist, 'assets');
  fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(assets, { recursive: true });
  const js = await esbuild.build({ entryPoints: [path.join(ROOT, 'src/main.js')], bundle: true, minify: true, format: 'esm', target: 'es2022', write: false,
    define: { 'import.meta.env.PROD': 'true', 'import.meta.env.DEV': 'false' }, nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'warning' });
  const css = await esbuild.build({ entryPoints: [path.join(ROOT, 'src/style.css')], bundle: true, minify: true, write: false, logLevel: 'warning' });
  const h = (b) => crypto.createHash('sha1').update(b).digest('hex').slice(0, 8);
  const jsT = js.outputFiles[0].text, cssT = css.outputFiles[0].text, jsF = `index-${h(jsT)}.js`, cssF = `index-${h(cssT)}.css`;
  fs.writeFileSync(path.join(assets, jsF), jsT); fs.writeFileSync(path.join(assets, cssF), cssT);
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/<script type="module" src="\/src\/main\.js"><\/script>\n?/, '');
  html = html.replace(/<link rel="stylesheet" href="\/src\/style\.css" \/>/, `<script type="module" crossorigin src="./assets/${jsF}"></script>\n<link rel="stylesheet" crossorigin href="./assets/${cssF}">`);
  fs.cpSync(path.join(ROOT, 'public'), dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  console.log(`dist/assets/${jsF} ${(jsT.length / 1024).toFixed(0)} KB, ${cssF} ${(cssT.length / 1024).toFixed(0)} KB`);
  process.exit(0);
}

const pi = args.indexOf('--port'), PORT = pi >= 0 ? +args[pi + 1] : 5173;
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/' || u === '') u = '/index.html';
  let f = path.join(ROOT, 'public', u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(f);
  let body = fs.readFileSync(f);
  if (ext === '.js') body = rewrite(body.toString('utf8'), false);
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
}).listen(PORT, () => console.log(`devserver on http://localhost:${PORT}`)).on('error', (e) => { console.error(e.message); process.exit(1); });
