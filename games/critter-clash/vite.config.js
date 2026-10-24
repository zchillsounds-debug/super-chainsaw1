import { defineConfig } from 'vite';
import { execSync } from 'child_process';
const sha = (() => { try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return ''; } })();
const run = process.env.GITHUB_RUN_NUMBER;
const version = run ? `v1.0.${run}` : `v1.0-dev${sha ? ' · ' + sha : ''}`;
export default defineConfig({ base: './', server: { host: true, port: 5180 }, build: { chunkSizeWarningLimit: 2000 }, define: { __VERSION__: JSON.stringify(version) } });
