// a dev server for headless tests that never reloads the page when a source file changes mid-run
import base from '../vite.config.js';
export default { ...base, root: new URL('..', import.meta.url).pathname, server: { hmr: false, watch: { ignored: ['**/*'] } } };
