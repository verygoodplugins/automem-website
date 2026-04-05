// Copy the Astro Cloudflare adapter's server output into dist/client/_worker.js/
// for Cloudflare Pages advanced mode (directory-based) deployment.
//
// The @astrojs/cloudflare v13 adapter outputs dist/server/entry.mjs + chunks/
// designed for `wrangler deploy`. Cloudflare Pages Git integration needs a
// _worker.js in the static output directory instead.
//
// Pages supports _worker.js as a directory with index.js as the entry point,
// preserving the modular structure the adapter generates (no_bundle: true).

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

const serverDir = 'dist/server';
const workerDir = 'dist/client/_worker.js';
const entry = `${serverDir}/entry.mjs`;
const pagesOutputDir = resolve('dist/client');

function patchGeneratedWranglerJson(path) {
  if (!existsSync(path)) return;

  const json = JSON.parse(readFileSync(path, 'utf-8'));
  let changed = false;

  if (!json.pages_build_output_dir) {
    json.pages_build_output_dir = pagesOutputDir;
    changed = true;
  }

  // Pages reserves the ASSETS binding automatically for the static asset bucket.
  // Removing it from the generated worker config keeps `wrangler pages deploy`
  // from rejecting the config while still allowing the runtime to inject ASSETS.
  if (json.assets?.binding === 'ASSETS') {
    delete json.assets;
    changed = true;
  }

  if (changed) {
    writeFileSync(path, JSON.stringify(json));
    console.log(`[bundle-worker] Patched ${path} for Pages deployment`);
  }
}

if (!existsSync(entry)) {
  console.error(`[bundle-worker] ${entry} not found — skipping`);
  process.exit(0);
}

// Clean previous output
if (existsSync(workerDir)) {
  rmSync(workerDir, { recursive: true });
}
mkdirSync(workerDir, { recursive: true });

// Copy server chunks and entry
cpSync(`${serverDir}/chunks`, `${workerDir}/chunks`, { recursive: true });

// Copy any _astro directory in server (may contain additional assets)
if (existsSync(`${serverDir}/_astro`)) {
  cpSync(`${serverDir}/_astro`, `${workerDir}/_astro`, { recursive: true });
}

// Copy middleware
if (existsSync(`${serverDir}/virtual_astro_middleware.mjs`)) {
  cpSync(`${serverDir}/virtual_astro_middleware.mjs`, `${workerDir}/virtual_astro_middleware.mjs`);
}

// Create index.js entry that re-exports from the adapter's entry
// (Pages looks for index.js in the _worker.js directory)
const entryContent = readFileSync(entry, 'utf-8');
writeFileSync(`${workerDir}/index.js`, entryContent);

// Add pages_build_output_dir to wrangler.toml post-build.
// This must happen AFTER astro build to avoid the ASSETS binding conflict
// during the Cloudflare vite plugin's prerender step.
const toml = readFileSync('wrangler.toml', 'utf-8');
if (!toml.includes('pages_build_output_dir')) {
  const patched = toml.replace(
    /^(name\s*=\s*"[^"]+"\n)/m,
    `$1pages_build_output_dir = "dist/client"\n`
  );
  writeFileSync('wrangler.toml', patched);
  console.log('[bundle-worker] Added pages_build_output_dir to wrangler.toml');
}

console.log(`[bundle-worker] Copied server → ${workerDir}/`);
patchGeneratedWranglerJson(`${serverDir}/wrangler.json`);

// Generate _routes.json so Cloudflare Pages serves pre-rendered pages as static
// files without invoking the worker. Without this, the _worker.js directory mode
// routes ALL requests through the worker, and the emdash middleware's setup check
// can redirect pre-rendered pages to /_emdash/admin/setup on cold starts.
import { readdirSync } from 'fs';

function findHtmlFiles(dir, base = '') {
  const excludes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.name === '_worker.js' || entry.name === '_astro') continue;
    if (entry.isDirectory()) {
      excludes.push(...findHtmlFiles(`${dir}/${entry.name}`, rel));
    } else if (entry.name === 'index.html') {
      excludes.push(base ? `/${base}` : '/');
    }
  }
  return excludes;
}

const prerendered = findHtmlFiles('dist/client');
const routesJson = JSON.stringify({
  version: 1,
  include: ['/*'],
  exclude: [
    ...prerendered,
    '/_astro/*',
    '/pagefind/*',
    '/favicon.svg',
    '/robots.txt',
    '/sitemap-*.xml',
    '/*.png', '/*.jpg', '/*.jpeg', '/*.svg', '/*.ico',
  ],
}, null, 2);
writeFileSync('dist/client/_routes.json', routesJson);
console.log(`[bundle-worker] Generated _routes.json (${prerendered.length} pre-rendered pages excluded)`);
