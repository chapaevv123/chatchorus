import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  root: mode === 'showcase' ? resolve('showcase') : undefined,
  publicDir: false,
  build: mode === 'showcase' ? { outDir: resolve('dist-showcase'), emptyOutDir: true } : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
      '/oauth': 'http://127.0.0.1:8787',
      '/ws': { target: 'ws://127.0.0.1:8787', ws: true },
    },
  },
}));
