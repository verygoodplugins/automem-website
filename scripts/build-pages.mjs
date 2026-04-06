import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const wranglerPath = 'wrangler.toml';
const pagesBuildOutputPattern = /^pages_build_output_dir\s*=\s*".*"\n/m;

const originalToml = readFileSync(wranglerPath, 'utf-8');
const sanitizedToml = originalToml.replace(pagesBuildOutputPattern, '');
const strippedPagesOutputDir = sanitizedToml !== originalToml;

try {
  if (strippedPagesOutputDir) {
    writeFileSync(wranglerPath, sanitizedToml);
    console.log('[build-pages] Temporarily removed pages_build_output_dir from wrangler.toml');
  }

  execFileSync('astro', ['build'], {
    stdio: 'inherit',
    env: process.env,
  });

  execFileSync('node', ['scripts/bundle-worker.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });
} finally {
  if (strippedPagesOutputDir) {
    writeFileSync(wranglerPath, originalToml);
    console.log('[build-pages] Restored pages_build_output_dir in wrangler.toml');
  }
}
