import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://automem.ai',
  integrations: [
    tailwind(),
    mdx(),
    sitemap()
  ],
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'directory'
  }),
  vite: {
    build: {
      minify: 'terser'
    }
  }
});
