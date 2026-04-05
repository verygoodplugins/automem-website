import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const wranglerPath = 'wrangler.toml';
const liveConfigPath = 'src/live.config.ts';
const emdashLiveConfigPath = 'src/live.config.emdash.ts';
const pagesBuildOutputPattern = /^pages_build_output_dir\s*=\s*".*"\n/m;
const enableEmdash =
  process.env.ENABLE_EMDASH_CMS === '1' ||
  (!!process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main');

const originalToml = readFileSync(wranglerPath, 'utf-8');
const sanitizedToml = originalToml.replace(pagesBuildOutputPattern, '');
const strippedPagesOutputDir = sanitizedToml !== originalToml;
const originalLiveConfig = readFileSync(liveConfigPath, 'utf-8');
let swappedLiveConfig = false;

try {
  if (strippedPagesOutputDir) {
    writeFileSync(wranglerPath, sanitizedToml);
    console.log('[build-pages] Temporarily removed pages_build_output_dir from wrangler.toml');
  }

  if (enableEmdash) {
    const emdashLiveConfig = readFileSync(emdashLiveConfigPath, 'utf-8');
    if (emdashLiveConfig !== originalLiveConfig) {
      writeFileSync(liveConfigPath, emdashLiveConfig);
      swappedLiveConfig = true;
      console.log('[build-pages] Swapped in emdash live config');
    }
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
  if (swappedLiveConfig) {
    writeFileSync(liveConfigPath, originalLiveConfig);
    console.log('[build-pages] Restored default live config');
  }

  if (strippedPagesOutputDir) {
    writeFileSync(wranglerPath, originalToml);
    console.log('[build-pages] Restored pages_build_output_dir in wrangler.toml');
  }
}
