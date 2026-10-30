// esbuild stand-in for `vite build` when the npm registry can't be reached: node tools/nonpm/ebuild.mjs <games/critter-clash> <outDir> [version]
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'fs'; import path from 'path';
const [root, out, ver = 'v1.0-dev'] = process.argv.slice(2);
const V = process.env.VENDOR || '/tmp/s/vendor'; // filled by tools/nonpm/setup.sh
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out + '/assets', { recursive: true });
fs.cpSync(root + '/public', out, { recursive: true });
const alias = {
  name: 'alias', setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: V + '/three/build/three.module.js' }));
    b.onResolve({ filter: /^three\/examples\// }, a => ({ path: V + '/three/' + a.path.slice(6) }));
    b.onResolve({ filter: /^@capacitor\// }, () => ({ path: new URL('./capacitor-stub.js', import.meta.url).pathname }));
    b.onResolve({ filter: /^@fontsource\/lilita/ }, () => ({ path: V + '/stubs/lilita.css' }));
    b.onResolve({ filter: /^@fontsource\/nunito\/latin-800/ }, () => ({ path: V + '/stubs/n800.css' }));
    b.onResolve({ filter: /^@fontsource\/nunito\/latin-900/ }, () => ({ path: V + '/stubs/n900.css' }));
  } };
await build({ entryPoints: [root + '/src/main.js'], bundle: true, format: 'esm', minify: true, outdir: out + '/assets', entryNames: 'index', assetNames: '[name]-[hash]',
  loader: { '.woff2': 'file', '.woff': 'file', '.png': 'file' }, define: { __VERSION__: JSON.stringify(ver) }, plugins: [alias], logLevel: 'error', target: 'es2020' });
let html = fs.readFileSync(root + '/index.html', 'utf8');
html = html.replace(/<script type="module" src="\/src\/main.js"><\/script>/, '<script type="module" src="./assets/index.js"></script>');
if (fs.existsSync(out + '/assets/index.css')) html = html.replace('</head>', '<link rel="stylesheet" href="./assets/index.css">\n</head>');
fs.writeFileSync(out + '/index.html', html);
console.log('ebuild ok', out);
