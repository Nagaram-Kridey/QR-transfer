import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react(), {
    name: 'development-csp',
    // Vite HMR needs injected scripts; the built artifact always retains its CSP.
    transformIndexHtml(html) {
      return command === 'serve' ? html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*\/>/, '') : html;
    },
  }],
  base: process.env.BASE_PATH || '/',
  server: { host: '127.0.0.1' },
}));
