import { defineConfig, sessionDrivers } from 'astro/config';
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
import { fileURLToPath } from 'node:url';

// Cloudflare adapter only for production builds — workerd can't load Node.js DB drivers in dev
const isBuilding = process.argv.includes('build');
const enableEmdash = true;
const resendEmailPlugin = fileURLToPath(new URL('./src/lib/emdash-resend-email.ts', import.meta.url));
const figuresPlugin = fileURLToPath(new URL('./src/lib/emdash-figures/plugin.ts', import.meta.url));
const figuresComponents = fileURLToPath(new URL('./src/lib/emdash-figures/block-components.ts', import.meta.url));

// "Memory Lab" syntax theme — maps the brand palette (already used by the
// marketing ChatDemo/InstallCommand: violet identifiers, green strings/values,
// gold commands/keywords, gray comments) onto code-token scopes so docs syntax
// reads on-brand instead of generic Expressive Code blue/gray. Dark values only:
// docs code is "dark always" (single theme, see expressiveCode below), so these
// fixed hexes apply in both light and dark site themes. Default text stays
// off-white so blocks read as terminal output, not a rainbow.
const memoryLabSyntaxTheme = {
  name: 'memory-lab',
  type: 'dark',
  colors: {
    'editor.background': '#0F161E',           // --lab-panel (dark)
    'editor.foreground': '#EFF4F9',           // --lab-text (dark)
    'editor.selectionBackground': '#AE66FF40',
    'editorLineNumber.foreground': '#465260', // --lab-line (dark)
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
      settings: { foreground: '#9EA9B8', fontStyle: 'italic' }, // --lab-muted
    },
    {
      scope: [
        'string', 'string.quoted', 'string.template',
        'constant.other.symbol', 'meta.attribute-selector',
      ],
      settings: { foreground: '#4FDF69' }, // --lab-success (green)
    },
    {
      scope: [
        'constant.numeric', 'constant.language', 'constant.language.boolean',
        'constant.language.null', 'constant.language.undefined',
        'support.constant',
      ],
      settings: { foreground: '#4FDF69' }, // values read green like strings
    },
    {
      scope: [
        'entity.name.function', 'support.function', 'meta.function-call.generic',
        'variable.function', 'entity.name.tag', 'support.type.property-name.json',
        'meta.object-literal.key', 'entity.name.type', 'support.type',
        'support.class', 'entity.name.class',
      ],
      settings: { foreground: '#AE66FF' }, // --lab-secondary (violet) — named things
    },
    {
      scope: [
        'keyword', 'keyword.control', 'keyword.operator', 'storage',
        'storage.type', 'storage.modifier', 'variable.language',
        'constant.other.option', 'punctuation.definition.parameters',
        'support.type.property-name', 'keyword.other',
      ],
      settings: { foreground: '#F9CF2C' }, // --lab-accent (gold) — commands/keywords/flags
    },
    {
      scope: [
        'variable', 'variable.other', 'variable.parameter',
        'meta.definition.variable', 'entity.name.variable',
      ],
      settings: { foreground: '#EFF4F9' }, // default off-white
    },
    {
      scope: ['punctuation', 'meta.brace', 'meta.delimiter'],
      settings: { foreground: '#C7D0DB' }, // slightly dimmed text for structure
    },
    {
      scope: ['invalid', 'invalid.illegal'],
      settings: { foreground: '#EF4444' }, // --lab-error
    },
  ],
};

export default defineConfig({
  site: 'https://automem.ai',
  adapter: isBuilding ? cloudflare() : undefined,
  output: 'server',
  devToolbar: { enabled: false },
  ...(isBuilding ? {} : { session: { driver: sessionDrivers.fs() } }),
  integrations: [
    mermaid({
      autoTheme: true,
      mermaidConfig: {
        securityLevel: 'loose',
      },
    }),
    starlight({
      title: 'AutoMem Docs',
      // Use our custom branded src/pages/404.astro instead of Starlight's injected 404 route
      disable404Route: true,
      logo: {
        src: './src/assets/robot-icon.svg',
        replacesTitle: false,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/verygoodplugins/automem' },
      ],
      customCss: ['./src/styles/global.css', './src/styles/starlight-custom.css'],
      // "Dark always" code blocks: a single dark theme means Expressive Code
      // applies it in both site themes and emits no theme-switch CSS, so docs
      // code stays on the brand terminal surface in light AND dark mode. All
      // surface values are FIXED hex (not --lab-* tokens, which flip in light
      // mode and would recreate the washout). Owns surface/border/radius/shadow
      // — the old `.expressive-code .frame` !important override was removed.
      expressiveCode: {
        themes: [memoryLabSyntaxTheme],
        useStarlightDarkModeSwitch: false,
        styleOverrides: {
          borderRadius: '8px',
          borderColor: '#2D3744',        // brand --lab-border (dark)
          codeBackground: '#0F161E',     // brand --lab-panel (dark)
          frames: {
            editorBackground: '#0F161E',
            terminalBackground: '#0F161E',
            editorTabBarBackground: '#0B1016',       // brand --lab-surface (dark)
            editorActiveTabBackground: '#0F161E',
            terminalTitlebarBackground: '#0B1016',
            frameBoxShadowCssValue: '4px 4px 0 0 rgba(0, 0, 0, 0.85)', // brand hard shadow
          },
        },
      },
      components: {
        Header: './src/components/starlight/Header.astro',
        ThemeProvider: './src/components/starlight/ThemeProvider.astro',
        Footer: './src/components/starlight/Footer.astro',
      },
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
          label: "What's New",
          slug: 'docs/whats-new',
        },
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'docs/getting-started/introduction' },
            { label: 'Quick Start', slug: 'docs/getting-started/quick-start' },
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
            { label: 'Hermes', slug: 'docs/platforms/hermes' },
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
            { label: 'Guided Cloud Setup', slug: 'docs/cli/guided-cloud-setup' },
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
            { label: 'InstaPods', slug: 'docs/deployment/instapods' },
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
    ...(enableEmdash
      ? [emdash({
          database: isBuilding
            ? d1({ binding: 'EMDASH_DB' })
            : libsql({ url: 'file:./data/emdash.db' }),
          storage: local({
            directory: './uploads',
            baseUrl: '/_emdash/api/media/file',
          }),
          plugins: [{
            id: 'automem-resend-email',
            version: '1.0.0',
            entrypoint: resendEmailPlugin,
          }, {
            id: 'emdash-plugin-figures',
            version: '0.1.0',
            entrypoint: figuresPlugin,
            componentsEntry: figuresComponents,
          }],
        })]
      : []),
    mdx(),
    sitemap(),
  ],
  server: {
    host: '0.0.0.0',
    // Single source of truth for the local dev/preview port. Do NOT use 5000 —
    // it is reserved on this machine (AutoHub's Vite chat UI binds 5000).
    port: 4321,
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
