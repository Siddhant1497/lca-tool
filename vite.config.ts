import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // relative asset paths, so the built app works from any folder or host
  server: { port: 3000 },
});
