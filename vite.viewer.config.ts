import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Builds the read-only client view as ONE self-contained HTML file (all JS/CSS inlined). */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'build-viewer', emptyOutDir: true, rollupOptions: { input: 'viewer.html' }, chunkSizeWarningLimit: 2000 },
});
