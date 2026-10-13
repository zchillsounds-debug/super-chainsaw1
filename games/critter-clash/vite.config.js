import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { host: true, port: 5180 }, build: { chunkSizeWarningLimit: 2000 } });
