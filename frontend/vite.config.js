import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to the Vite dev server and /api is proxied
// to the backend, so no CORS concerns and no hard-coded URLs in the app code.
const apiTarget = process.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});
