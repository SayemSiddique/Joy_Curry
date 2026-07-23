/**
 * Ambient declaration so TypeScript accepts side-effect CSS imports
 * (`import './Dialog.css'`). The actual CSS is handled by the consumer's
 * bundler (Vite/Astro in apps/web); here it just needs to type-resolve.
 */
declare module '*.css';
