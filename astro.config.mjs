import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://automem.ai',
  integrations: [
    tailwind(),
    mdx(),
    sitemap()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: '0.0.0.0',
    port: 5000
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
