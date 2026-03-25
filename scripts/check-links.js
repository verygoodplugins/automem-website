#!/usr/bin/env node
/**
 * Link checker script - runs after build to verify all links work
 * 
 * Uses linkinator programmatically to check all pages.
 * Exit code 1 if any broken links found.
 */

import { LinkChecker } from 'linkinator';
import fs from 'fs';
import { createServer } from 'http';
import net from 'net';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');
const distRoot = resolve(distDir);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const IGNORED_BROKEN_PATTERNS = [
  /^https:\/\/github\.com\/verygoodplugins\/automem-website\/edit\/main\//,
];

const LINKS_TO_SKIP = [
  'railway.com',
  'api.pirsch.io',
  'echodash.com',
  'localhost:4321',
  'localhost:4322',
  'localhost:4323',
];

// Check if dist exists
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

// Find an available port
function findPort(startPort = 3456) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(findPort(startPort + 1)));
  });
}

function getSafeResolvedPath(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, '');
  const resolvedPath = resolve(distRoot, relativePath);
  if (!resolvedPath.startsWith(distRoot)) {
    return null;
  }
  return resolvedPath;
}

function findStaticFile(pathname) {
  const resolvedPath = getSafeResolvedPath(pathname);
  if (!resolvedPath) {
    return null;
  }

  const candidates = [];

  if (pathname.endsWith('/')) {
    candidates.push(resolve(resolvedPath, 'index.html'));
  } else {
    candidates.push(resolvedPath);
    if (!extname(resolvedPath)) {
      candidates.push(`${resolvedPath}.html`);
      candidates.push(resolve(resolvedPath, 'index.html'));
    }
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith(distRoot)) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function startStaticServer(port) {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      const method = req.method || 'GET';
      if (method !== 'GET' && method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Method Not Allowed');
        return;
      }

      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      const filePath = findStaticFile(requestUrl.pathname);
      if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }

      const contentType = CONTENT_TYPES[extname(filePath)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      if (method === 'HEAD') {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        res.end('Internal Server Error');
      });
      stream.pipe(res);
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolvePromise(server));
  });
}

function isIgnoredBrokenLink(url) {
  return IGNORED_BROKEN_PATTERNS.some((pattern) => pattern.test(url));
}

function isInternalLocalLink(url) {
  try {
    const parsed = new URL(url);
    return ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

async function main() {
  const port = await findPort();
  console.log(`🚀 Starting local static server on port ${port}...`);

  const server = await startStaticServer(port);

  try {
    console.log(`🔍 Checking links on http://localhost:${port}...`);

    const checker = new LinkChecker();
    const brokenInternalLinks = [];
    const ignoredBrokenLinks = [];
    const externalWarnings = [];
    
    checker.on('link', (result) => {
      if (result.state === 'BROKEN') {
        if (isIgnoredBrokenLink(result.url)) {
          ignoredBrokenLinks.push(result);
          console.log(`[IGNORED ${result.status || 'ERR'}] ${result.url}`);
          console.log(`                └─ from: ${result.parent}`);
          return;
        }

        if (isInternalLocalLink(result.url)) {
          brokenInternalLinks.push(result);
          console.log(`[${result.status || 'ERR'}] ${result.url}`);
          console.log(`       └─ from: ${result.parent}`);
          return;
        }

        externalWarnings.push(result);
        console.log(`[WARN ${result.status || 'ERR'}] ${result.url}`);
        console.log(`             └─ from: ${result.parent}`);
      }
    });

    const result = await checker.check({
      path: `http://localhost:${port}`,
      recurse: true,
      linksToSkip: LINKS_TO_SKIP,
      concurrency: 10,
      timeout: 10000,
    });

    console.log(`\n📊 Scanned ${result.links.length} links`);
    console.log(`   ✅ Passed: ${result.passed}`);
    console.log(`   ℹ️ Ignored broken: ${ignoredBrokenLinks.length}`);
    console.log(`   ⚠️ External warnings: ${externalWarnings.length}`);
    
    if (externalWarnings.length > 0) {
      console.log('\nExternal broken-link warnings (non-fatal):');
      externalWarnings.forEach((link) => {
        console.log(`   [${link.status || 'ERR'}] ${link.url}`);
      });
    }

    if (brokenInternalLinks.length > 0) {
      console.log(`   ❌ Internal broken: ${brokenInternalLinks.length}`);
      console.log('\nBroken internal links found:');
      brokenInternalLinks.forEach((link) => {
        console.log(`   [${link.status || 'ERR'}] ${link.url}`);
      });
      process.exit(1);
    }

    console.log('\n✅ Internal links are valid!');
  } finally {
    await new Promise((resolvePromise) => server.close(() => resolvePromise()));
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
