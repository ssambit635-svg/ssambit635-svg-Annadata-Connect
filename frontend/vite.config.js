import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Browser-facing code uses same-origin /api, including remote live previews.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = process.env.API_PROXY_TARGET || env.API_PROXY_TARGET || 'http://127.0.0.1:5000';
  const proxy = { '/api': { target: apiTarget, changeOrigin: true } };
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' };
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      headers,
      proxy,
    },
    preview: {
      host: true,
      port: 4173,
      allowedHosts: true,
      headers,
      proxy,
    },
  };
});
