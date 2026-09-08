import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forwarded to the C# backend (Module 2 — API key configuration).
      '/api': 'http://localhost:5180',
    },
  },
});
