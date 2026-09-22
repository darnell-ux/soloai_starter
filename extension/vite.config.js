import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

// Builds ONLY the Svelte popup. Everything in public/ (manifest.json,
// service-worker.js, content/amazon-collector.js, icons/) is copied verbatim
// into dist/ — those files are deliberately not bundled so the content script
// is never a module and the service worker stays self-contained.
//
// Load target after `npm run build`: extension/dist/  (Load unpacked → dist).
export default defineConfig({
  root: resolve(import.meta.dirname, 'src/popup'),
  base: './', // relative asset URLs so chrome-extension:// resolves correctly
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [svelte({ compilerOptions: { runes: true } })],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    // Vite otherwise injects a modulepreload polyfill containing a fetch() call.
    // It is dead code here (this build emits no modulepreload links) and would
    // only ever request the popup's own local assets — but "no fetch anywhere in
    // the popup" is a claim we make in the README and in the store listing's
    // permission justifications, and reviewers grep bundles for exactly that.
    // Keep it literally true.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src/popup/index.html')
    }
  }
});
