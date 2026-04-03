import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import emdash, { local } from 'emdash/astro';
import { libsql } from 'emdash/db';
import { d1 } from '@emdash-cms/cloudflare';

// Cloudflare adapter only for production builds — workerd can't load Node.js DB drivers in dev
const isBuilding = process.argv.includes('build');

export default defineConfig({
  site: 'https://automem.ai',
  adapter: isBuilding ? cloudflare() : undefined,
  output: 'server',
  session: !isBuilding ? { driver: 'fs' } : undefined,
  integrations: [
    mermaid({
      autoTheme: true,
      mermaidConfig: {
        securityLevel: 'loose',
      },
    }),
    starlight({
      title: 'AutoMem Docs',
      logo: {
        src: './src/assets/robot-icon.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/verygoodplugins/automem' },
      ],
      customCss: ['./src/styles/starlight-custom.css'],
      editLink: {
        baseUrl: 'https://github.com/verygoodplugins/automem-website/edit/main/',
      },
      head: [
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.googleapis.com',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preconnect',
            href: 'https://fonts.gstatic.com',
            crossorigin: 'true',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
          },
        },
        {
          tag: 'script',
          attrs: {
            src: '/mermaid-fix.js',
            defer: true,
          },
        },
      ],
      sidebar: [
        {
          label: 'Overview',
          slug: 'docs/overview',
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'docs/getting-started/introduction' },
            { label: 'Quick Start (Railway)', slug: 'docs/getting-started/quick-start' },
            { label: 'Docker & Local Dev', slug: 'docs/getting-started/docker' },
            { label: 'Environment Variables', slug: 'docs/getting-started/environment-variables' },
          ],
        },
        {
          label: 'Platform Guides',
          items: [
            { label: 'Claude Desktop', slug: 'docs/platforms/claude-desktop' },
            { label: 'Claude.ai & Mobile', slug: 'docs/platforms/claude-web' },
            { label: 'Claude Code', slug: 'docs/platforms/claude-code' },
            { label: 'Cursor IDE', slug: 'docs/platforms/cursor' },
            { label: 'ChatGPT', slug: 'docs/platforms/chatgpt' },
            { label: 'OpenAI Codex', slug: 'docs/platforms/codex' },

            { label: 'GitHub Copilot', slug: 'docs/platforms/github-copilot' },
            { label: 'ElevenLabs Agents', slug: 'docs/platforms/elevenlabs' },
            { label: 'Alexa', slug: 'docs/platforms/alexa' },
            { label: 'OpenClaw', slug: 'docs/platforms/openclaw' },
            { label: 'Google AntiGravity', slug: 'docs/platforms/antigravity' },
          ],
        },
        {
          label: 'Core Concepts',
          items: [
            { label: 'Memory Model', slug: 'docs/core-concepts/memory-model' },
            { label: 'Relationship Types', slug: 'docs/core-concepts/relationship-types' },
            { label: 'Hybrid Search', slug: 'docs/core-concepts/hybrid-search' },
            { label: 'Consolidation & Decay', slug: 'docs/core-concepts/consolidation' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'System Overview', slug: 'docs/architecture/overview' },
            { label: 'MCP Bridge', slug: 'docs/architecture/mcp-bridge' },
            { label: 'Data Stores', slug: 'docs/architecture/data-stores' },
            { label: 'Enrichment Pipeline', slug: 'docs/architecture/enrichment' },
            { label: 'Embedding Generation', slug: 'docs/architecture/embeddings' },
            { label: 'Background Processing', slug: 'docs/architecture/background-processing' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Memory Operations', slug: 'docs/reference/api/memory-operations' },
            { label: 'Recall Operations', slug: 'docs/reference/api/recall-operations' },
            { label: 'Relationship Operations', slug: 'docs/reference/api/relationships' },
            { label: 'Consolidation Operations', slug: 'docs/reference/api/consolidation' },
            { label: 'Admin Operations', slug: 'docs/reference/api/admin' },
            { label: 'Health & Analytics', slug: 'docs/reference/api/health' },
            { label: 'Direct API vs MCP Tools', slug: 'docs/reference/api/direct-vs-mcp' },
          ],
        },
        {
          label: 'CLI Reference',
          items: [
            { label: 'Setup & Installation', slug: 'docs/cli/setup' },
            { label: 'Platform Installers', slug: 'docs/cli/platform-installers' },
            { label: 'Queue Management', slug: 'docs/cli/queue' },
            { label: 'Configuration Tools', slug: 'docs/cli/config-tools' },
          ],
        },
        {
          label: 'Configuration',
          items: [
            { label: 'Configuration Reference', slug: 'docs/reference/configuration' },
            { label: 'Authentication', slug: 'docs/reference/authentication' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Railway', slug: 'docs/deployment/railway' },
            { label: 'Docker', slug: 'docs/deployment/docker' },
          ],
        },
        {
          label: 'Operations',
          items: [
            { label: 'Health Monitoring', slug: 'docs/operations/health' },
            { label: 'Backup & Recovery', slug: 'docs/operations/backup' },
            { label: 'Performance Tuning', slug: 'docs/operations/performance' },
            { label: 'Troubleshooting', slug: 'docs/operations/troubleshooting' },
          ],
        },
        {
          label: 'Best Practices',
          items: [
            { label: 'Memory Rules & Patterns', slug: 'docs/best-practices/memory-rules' },
            { label: 'Context Engineering', slug: 'docs/best-practices/context-engineering' },
            { label: 'Progressive Disclosure', slug: 'docs/best-practices/progressive-disclosure' },
          ],
        },
        {
          label: 'Graph Viewer',
          items: [
            { label: 'Overview', slug: 'docs/graph-viewer/overview' },
            { label: 'Setup & Configuration', slug: 'docs/graph-viewer/setup' },
            { label: 'Deployment', slug: 'docs/graph-viewer/deployment' },
          ],
        },
        {
          label: 'Development',
          items: [
            { label: 'Project Structure', slug: 'docs/development/structure' },
            { label: 'Local Setup', slug: 'docs/development/local-setup' },
            { label: 'Testing', slug: 'docs/development/testing' },
            { label: 'Changelog', slug: 'docs/development/changelog' },
            { label: 'Release Process', slug: 'docs/development/releases' },
          ],
        },
        {
          label: 'Research & Motivation',
          slug: 'docs/research',
        },
      ],
    }),
    react(),
    emdash({
      database: isBuilding
        ? d1({ binding: 'EMDASH_DB' })
        : libsql({ url: 'file:./data/emdash.db' }),
      storage: local({
        directory: './uploads',
        baseUrl: '/_emdash/api/media/file',
      }),
    }),
    mdx(),
    sitemap(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      minify: 'esbuild',
    },
    server: {
      allowedHosts: true,
    },
  },
});
