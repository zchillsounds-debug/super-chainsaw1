#!/bin/sh
# shots/testvite.sh: (re)start the test dev server on :5173 (no reloads mid-run); run it again after editing src/
cd "$(dirname "$0")/.." || exit 1
[ -f /tmp/vite-test.pid ] && kill "$(cat /tmp/vite-test.pid)" 2>/dev/null && sleep 0.5
nohup npx vite --config shots/vite.test.config.js --port 5173 --strictPort > /tmp/vite-test.log 2>&1 &
echo $! > /tmp/vite-test.pid
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:5173/ && break; sleep 0.5; done
echo "test vite up"
