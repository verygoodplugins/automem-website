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

const serverDir = 'dist/server';
const workerDir = 'dist/client/_worker.js';
const entry = `${serverDir}/entry.mjs`;

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

console.log(`[bundle-worker] Copied server → ${workerDir}/`);
