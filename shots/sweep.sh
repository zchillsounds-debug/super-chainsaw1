#!/bin/sh
cd /home/user/super-chainsaw1
run(){ echo "=== $*"; timeout 1500 node "$@" 2>&1 | tail -6; echo "rc=$?"; }
for r in sawad marsh karkh docks; do run shots/r15test.mjs $r; done
for r in sawad marsh karkh docks; do run shots/r16test.mjs $r; done
for r in sawad marsh karkh docks; do run shots/r17test.mjs $r; done
for c in faris rami naffat ayyar; do run shots/r18test.mjs $c; done
run shots/ngtest.mjs
run shots/traveltest.mjs
for r in sawad karkh docks; do run shots/finaletest.mjs $r; done
run shots/trialtest.mjs
run shots/crafttest.mjs
run shots/benchtest.mjs
run shots/r21comp.mjs
for r in karkh marsh docks; do run shots/r21rival.mjs $r; done
run shots/r21mount.mjs
for h in quarry fort gorge rivalhold; do run shots/r21holds.mjs $h; done
run shots/r21rift.mjs
node shots/holdcheck.mjs
for h in caravan kilnpits reedisle weir lanes undercroft hulk warehouse; do run shots/r22holds.mjs $h; done
for r in sawad docks; do run shots/r22feel.mjs $r; done
for r in marsh docks; do run shots/r21hub.mjs $r; done
for q in "play&q=high&noadapt" "play&q=low&noadapt" "play&q=high&noadapt&region=hamrin" "play&q=high&noadapt&region=docks"; do echo "=== perf $q"; timeout 600 node shots/perf.mjs "$q" 2>&1 | head -2; done
echo SWEEP_DONE
