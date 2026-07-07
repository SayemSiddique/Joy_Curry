// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  integrations: [react()],

  vite: {
    resolve: {
      dedupe: ['react', 'react-dom', 'react-dom/server', 'nanostores'],
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        '@components': new URL('./src/components', import.meta.url).pathname,
        '@lib': new URL('./src/lib', import.meta.url).pathname,
        '@styles': new URL('./src/styles', import.meta.url).pathname,
        '@layouts': new URL('./src/layouts', import.meta.url).pathname,
      },
    },
    // @joy-curry/core ships raw TypeScript source; bundle it in SSR instead of
    // letting Node try to import .ts files at runtime.
    ssr: {
      noExternal: ['@joy-curry/core'],
    },
  },

  adapter: vercel(),
});