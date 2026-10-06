import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split big, rarely-changing libraries into their own chunks so they
        // cache independently and don't bloat the main app chunk.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  // `vite preview` (the production build used to test/install the PWA) needs its
  // own proxy — it does not inherit `server.proxy`. Same target as dev.
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
