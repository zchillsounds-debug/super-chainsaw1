export default {
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  esbuild: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } },
};
