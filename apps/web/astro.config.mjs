// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  integrations: [react()],

  // The standalone /menu page was removed — the order page is now the single
  // menu + ordering surface. Redirect old links/bookmarks so they don't 404.
  redirects: {
    '/menu': '/order',
  },

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
    // @joy-curry/core and @joy-curry/ui ship raw TypeScript/TSX source; bundle
    // them in SSR (and let Vite process their CSS imports) instead of letting
    // Node try to import .ts/.tsx files at runtime.
    ssr: {
      noExternal: ['@joy-curry/core', '@joy-curry/ui'],
    },
  },

  adapter: vercel(),
});