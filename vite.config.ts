import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API proxy lives in server/index.js and is the single implementation used in
// BOTH development and production. In development Vite forwards /api/proxy/* to
// that Express server; in production the same server serves the built bundle.
// Do not reintroduce a second proxy here — the two copies drifted apart before.
const API_SERVER = process.env.API_SERVER_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: API_SERVER,
        changeOrigin: true,
      },
    },
  },
});
