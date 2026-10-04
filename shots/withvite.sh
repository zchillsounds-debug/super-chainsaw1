#!/bin/sh
# shots/withvite.sh <command...>: start the vite dev server, run the command against it, stop the server
cd "$(dirname "$0")/.." || exit 1
npx vite --port 5173 --strictPort > /tmp/vite-withvite.log 2>&1 &
VP=$!
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost:5173/ && break; sleep 0.5; done
"$@"; RC=$?
kill $VP 2>/dev/null; wait $VP 2>/dev/null
exit $RC
