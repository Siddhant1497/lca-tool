import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  build: {
    chunkSizeWarningLimit: 650, // Recharts alone is ~590 kB minified (160 kB gzip); it is cached separately.
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app updates don't re-download React or Recharts.
        manualChunks: { react: ['react', 'react-dom'], charts: ['recharts'] },
      },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
} as never);
