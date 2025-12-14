import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://automem.ai',
  integrations: [
    tailwind(),
    mdx(),
    sitemap()
  ],
  output: 'static',
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true
  },
  vite: {
    build: {
      minify: 'esbuild'
    },
    server: {
      allowedHosts: true
    }
  }
});
