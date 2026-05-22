import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const canonicalRailwayDeployUrl =
  'https://railway.com/deploy/automem-ai-memory-service?referralCode=VuFE6g&utm_medium=integration&utm_source=template&utm_campaign=generic';
const deployUrlPattern = /https:\/\/railway\.com\/deploy\/automem-ai-memory-service[^\s"'<>)]*/g;
const scannedRoots = ['src', 'astro.config.mjs'];

async function collectFiles(entry) {
  const absolutePath = path.join(repoRoot, entry);
  const stats = await stat(absolutePath);

  if (stats.isFile()) {
    return [absolutePath];
  }

  const children = await readdir(absolutePath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    children.map((child) => collectFiles(path.join(entry, child.name))),
  );

  return nestedFiles.flat();
}

test('Railway deploy-template links use the canonical referral URL', async () => {
  const files = (await Promise.all(scannedRoots.map(collectFiles))).flat();
  const mismatches = [];
  let matchCount = 0;

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const matches = content.matchAll(deployUrlPattern);

    for (const match of matches) {
      matchCount += 1;

      if (match[0] !== canonicalRailwayDeployUrl) {
        mismatches.push(`${path.relative(repoRoot, file)}: ${match[0]}`);
      }
    }
  }

  assert.equal(mismatches.length, 0, mismatches.join('\n'));
  assert.ok(matchCount > 0, 'expected at least one Railway deploy-template link');
});
