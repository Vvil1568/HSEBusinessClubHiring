import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://backend:8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});