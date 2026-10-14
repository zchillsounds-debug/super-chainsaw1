#!/bin/sh
# tools/lineup.sh <prefix> id [id...]: base / stage 2 / stage 3 side by side on the title field, cropped close
P=$1; shift
STEPS="[[\"__save.trainer={name:'Sam',partner:'cindermunch'};__save.seenStage={};__game.screens.title();document.getElementById('ui').style.opacity=0\",\"_a\",800]"
for i in "$@"; do STEPS="$STEPS,[\"(()=>{const d=__critters.find(c=>c.id==='$i');__game.setShowcase([__grow(d,1),__grow(d,7),__grow(d,14)]);__game.screens.growing=true;})()\",\"$i\",2500]"; done
timeout 900 node tools/multi.mjs 1600 720 "" tools/out/$P "$STEPS]" 2>&1 | tail -1
for i in "$@"; do python3 -c "from PIL import Image;im=Image.open('tools/out/$P-$i.png');im.crop((420,90,1180,470)).save('tools/out/$P-$i.png')"; done
