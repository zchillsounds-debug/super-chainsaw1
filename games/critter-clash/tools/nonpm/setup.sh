#!/bin/bash
# When `npm install` can't reach registry.npmjs.org (session 3 of the completion run: ENOTFOUND / proxy 403), build without npm:
# esbuild from /opt/npm-tools, three r170 from GitHub, the fonts out of the last APK, Capacitor stubbed (all native-only paths).
# Usage: bash tools/nonpm/setup.sh  (fills $VENDOR, default /tmp/s/vendor), then
#   VENDOR=/tmp/s/vendor node tools/nonpm/ebuild.mjs . /tmp/s/dist5181 && node tools/nonpm/serve.mjs /tmp/s/dist5181 5181 &
# The tools then run as usual with PORT=5181. CI (critter-apk.yml) still does a real npm install + vite build.
set -e
V=${VENDOR:-/tmp/s/vendor}; G=$(cd "$(dirname "$0")/../.." && pwd); mkdir -p $V/stubs $V/fonts
[ -f $V/three/build/three.module.js ] || { timeout 300 git clone -q --depth 1 --branch r170 --filter=blob:none --sparse https://github.com/mrdoob/three.js $V/three; git -C $V/three sparse-checkout set build examples/jsm/postprocessing examples/jsm/utils examples/jsm/shaders; }
if ! ls $V/fonts/*.woff2 >/dev/null 2>&1; then
  git -C $G fetch -q --depth 1 origin apk-critter-clash; git -C $G show FETCH_HEAD:critter-clash.apk > $V/apk.zip
  (cd $V && rm -rf apkx && mkdir apkx && cd apkx && unzip -q ../apk.zip 'assets/public/assets/*.woff2' && cp assets/public/assets/*.woff2 $V/fonts/)
fi
F=$V/fonts
echo "@font-face{font-family:'Lilita One';font-style:normal;font-display:swap;font-weight:400;src:url($F/$(cd $F; ls lilita*.woff2)) format('woff2')}" > $V/stubs/lilita.css
echo "@font-face{font-family:'Nunito';font-style:normal;font-display:swap;font-weight:800;src:url($F/$(cd $F; ls nunito-latin-800*.woff2)) format('woff2')}" > $V/stubs/n800.css
echo "@font-face{font-family:'Nunito';font-style:normal;font-display:swap;font-weight:900;src:url($F/$(cd $F; ls nunito-latin-900*.woff2)) format('woff2')}" > $V/stubs/n900.css
echo "vendor ready in $V"
