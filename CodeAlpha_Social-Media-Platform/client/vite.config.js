import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Development: Vite runs on :5173 and proxies /api + /uploads to the Express
// server on :5000. Production: `npm run build` outputs client/dist which the
// Express server serves on a single origin — no proxy needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
