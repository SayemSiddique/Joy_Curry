// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  integrations: [react()],

  vite: {
    resolve: {
      dedupe: ['react', 'react-dom', 'react-dom/server'],
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        '@components': new URL('./src/components', import.meta.url).pathname,
        '@stores': new URL('./src/stores', import.meta.url).pathname,
        '@lib': new URL('./src/lib', import.meta.url).pathname,
        '@styles': new URL('./src/styles', import.meta.url).pathname,
        '@layouts': new URL('./src/layouts', import.meta.url).pathname,
      },
    },
  },

  adapter: node({
    mode: 'standalone',
  }),
});