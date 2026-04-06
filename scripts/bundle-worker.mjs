// Bundle the Astro Cloudflare adapter's server output into dist/client/_worker.js
// for Cloudflare Pages advanced mode deployment.

import { existsSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { builtinModules } from 'module';
import { resolve } from 'path';
import { build } from 'esbuild';
import { parse as parseToml } from 'smol-toml';

const serverDir = 'dist/server';
const workerPath = 'dist/client/_worker.js';
const entry = `${serverDir}/entry.mjs`;
const pagesOutputDir = resolve('dist/client');
const usePreviewConfig =
  process.env.ENABLE_EMDASH_CMS === '1' ||
  (!!process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main');

function loadWranglerConfig() {
  return parseToml(readFileSync('wrangler.toml', 'utf-8'));
}

function deleteIfEmptyObject(json, key) {
  if (
    Object.prototype.hasOwnProperty.call(json, key) &&
    json[key] &&
    typeof json[key] === 'object' &&
    !Array.isArray(json[key]) &&
    Object.keys(json[key]).length === 0
  ) {
    delete json[key];
    return true;
  }

  return false;
}

function deleteIfEmptyArray(json, key) {
  if (
    Object.prototype.hasOwnProperty.call(json, key) &&
    Array.isArray(json[key]) &&
    json[key].length === 0
  ) {
    delete json[key];
    return true;
  }

  return false;
}

function patchGeneratedWranglerJson(path) {
  if (!existsSync(path)) return;

  const json = JSON.parse(readFileSync(path, 'utf-8'));
  const wranglerConfig = loadWranglerConfig();
  const previewConfig = wranglerConfig?.env?.preview;
  let changed = false;

  if (!json.pages_build_output_dir) {
    json.pages_build_output_dir = pagesOutputDir;
    changed = true;
  }

  if (usePreviewConfig && previewConfig) {
    if (previewConfig.compatibility_date && json.compatibility_date !== previewConfig.compatibility_date) {
      json.compatibility_date = previewConfig.compatibility_date;
      changed = true;
    }

    if (previewConfig.compatibility_flags) {
      json.compatibility_flags = previewConfig.compatibility_flags;
      changed = true;
    }

    if (previewConfig.d1_databases) {
      json.d1_databases = previewConfig.d1_databases;
      changed = true;
    }

    if (previewConfig.kv_namespaces) {
      json.kv_namespaces = previewConfig.kv_namespaces;
      changed = true;
    }

    if (previewConfig.vars) {
      json.vars = previewConfig.vars;
      changed = true;
    }
  }

  // Pages reserves the ASSETS binding automatically for the static asset bucket.
  // Removing it from the generated worker config keeps `wrangler pages deploy`
  // from rejecting the config while still allowing the runtime to inject ASSETS.
  if (json.assets?.binding === 'ASSETS') {
    delete json.assets;
    changed = true;
  }

  // Astro's generated worker config includes local-dev metadata and several
  // empty worker-only fields that Cloudflare Pages rejects when it switches to
  // the redirected dist/server/wrangler.json during deploy validation.
  for (const key of [
    'configPath',
    'userConfigPath',
    'topLevelName',
    'definedEnvironments',
    'legacy_env',
    'jsx_factory',
    'jsx_fragment',
    'rules',
    'dev',
    'main',
    'images',
    'no_bundle',
    'cloudchamber',
    'python_modules',
  ]) {
    if (Object.prototype.hasOwnProperty.call(json, key)) {
      delete json[key];
      changed = true;
    }
  }

  if (deleteIfEmptyObject(json, 'triggers')) changed = true;
  if (deleteIfEmptyObject(json, 'vars')) changed = true;

  for (const key of [
    'workflows',
    'migrations',
    'send_email',
    'r2_buckets',
    'vectorize',
    'ai_search_namespaces',
    'ai_search',
    'hyperdrive',
    'services',
    'analytics_engine_datasets',
    'dispatch_namespaces',
    'mtls_certificates',
    'pipelines',
    'secrets_store_secrets',
    'unsafe_hello_world',
    'worker_loaders',
    'ratelimits',
    'vpc_services',
  ]) {
    if (deleteIfEmptyArray(json, key)) changed = true;
  }

  if (
    json.durable_objects &&
    Array.isArray(json.durable_objects.bindings) &&
    json.durable_objects.bindings.length === 0
  ) {
    delete json.durable_objects;
    changed = true;
  }

  if (
    json.queues &&
    Array.isArray(json.queues.producers) &&
    json.queues.producers.length === 0 &&
    Array.isArray(json.queues.consumers) &&
    json.queues.consumers.length === 0
  ) {
    delete json.queues;
    changed = true;
  }

  if (
    json.logfwdr &&
    Array.isArray(json.logfwdr.bindings) &&
    json.logfwdr.bindings.length === 0
  ) {
    delete json.logfwdr;
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
if (existsSync(workerPath)) {
  rmSync(workerPath, { recursive: true, force: true });
}

await build({
  entryPoints: [entry],
  outfile: workerPath,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  external: ['cloudflare:workers', 'node:*', ...builtinModules],
  logLevel: 'info',
});

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

console.log(`[bundle-worker] Bundled server → ${workerPath}`);
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
