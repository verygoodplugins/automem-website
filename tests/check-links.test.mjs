import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { getServeCommand, getServeDir } from '../scripts/check-links.js';

test('getServeDir prefers Cloudflare client output when present', () => {
  const root = mkdtempSync(join(tmpdir(), 'automem-link-check-'));

  try {
    mkdirSync(join(root, 'dist', 'client'), { recursive: true });
    writeFileSync(join(root, 'dist', 'client', 'index.html'), '<!doctype html>');

    assert.equal(getServeDir(root), join(root, 'dist', 'client'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('getServeDir falls back to dist for non-Cloudflare builds', () => {
  const root = mkdtempSync(join(tmpdir(), 'automem-link-check-'));

  try {
    mkdirSync(join(root, 'dist'), { recursive: true });

    assert.equal(getServeDir(root), join(root, 'dist'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('getServeCommand uses wrangler for built Pages workers', () => {
  const root = mkdtempSync(join(tmpdir(), 'automem-link-check-'));

  try {
    const serveDir = join(root, 'dist', 'client');
    mkdirSync(serveDir, { recursive: true });
    writeFileSync(join(serveDir, '_worker.js'), '');

    assert.deepEqual(getServeCommand(serveDir, 3456), {
      label: 'Cloudflare Pages worker',
      command: 'npx',
      args: ['wrangler', 'pages', 'dev', serveDir, '--port', '3456'],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('getServeCommand uses static serve when no worker exists', () => {
  const root = mkdtempSync(join(tmpdir(), 'automem-link-check-'));

  try {
    const serveDir = join(root, 'dist');
    mkdirSync(serveDir, { recursive: true });

    assert.deepEqual(getServeCommand(serveDir, 3456), {
      label: 'static files',
      command: 'npx',
      args: ['serve', serveDir, '-l', '3456'],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
