#!/usr/bin/env node
/**
 * Link checker script - runs after build to verify all links work
 * 
 * Uses linkinator programmatically to check all pages.
 * Exit code 1 if any broken links found.
 */

import { LinkChecker } from 'linkinator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import net from 'net';
import fs from 'fs';
import { spawn, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getServeDir(projectRoot = join(__dirname, '..')) {
  const distDir = join(projectRoot, 'dist');
  const cloudflareClientDir = join(distDir, 'client');

  if (
    fs.existsSync(cloudflareClientDir) &&
    fs.existsSync(join(cloudflareClientDir, 'index.html'))
  ) {
    return cloudflareClientDir;
  }

  return distDir;
}

export function getServeCommand(serveDir, port) {
  if (fs.existsSync(join(serveDir, '_worker.js'))) {
    return {
      label: 'Cloudflare Pages worker',
      command: 'npx',
      args: ['wrangler', 'pages', 'dev', serveDir, '--port', String(port)],
    };
  }

  return {
    label: 'static files',
    command: 'npx',
    args: ['serve', serveDir, '-l', String(port)],
  };
}

// Find an available port
function findPort(startPort = 3456) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(findPort(startPort + 1)));
  });
}

function killProcessesOnPort(port) {
  const result = spawnSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0 || !result.stdout?.trim()) {
    return;
  }

  for (const pid of result.stdout.trim().split(/\s+/)) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      // Ignore cleanup errors; the primary process may have exited already.
    }
  }
}

// Wait for server to be ready
async function waitForServer(port, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get({
          hostname: 'localhost',
          port,
          path: '/',
          timeout: 1000,
        }, (response) => {
          response.resume();
          if (response.statusCode && response.statusCode < 500) {
            resolve();
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        });

        request.on('error', reject);
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('HTTP readiness timed out'));
        });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  throw new Error('Server failed to start');
}

async function main() {
  const projectRoot = join(__dirname, '..');
  const serveDir = getServeDir(projectRoot);

  // Check if dist exists
  if (!fs.existsSync(serveDir)) {
    console.error('❌ dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const port = await findPort();
  const serveCommand = getServeCommand(serveDir, port);
  console.log(`🚀 Starting server on port ${port}...`);
  console.log(`📁 Serving ${serveDir} via ${serveCommand.label}`);

  // Start the built site in the background. Cloudflare adapter builds need the
  // Pages worker for dynamic routes; static builds can use serve directly.
  const server = spawn(serveCommand.command, serveCommand.args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  let serverPid = server.pid;
  let spawnError = null;

  // Handle spawn failure
  server.on('error', (err) => {
    spawnError = err;
    console.error('❌ Failed to spawn server:', err);
  });
  server.stdout?.on('data', (chunk) => {
    if (process.env.CHECK_LINKS_DEBUG) process.stdout.write(chunk);
  });
  server.stderr?.on('data', (chunk) => {
    if (process.env.CHECK_LINKS_DEBUG) process.stderr.write(chunk);
  });
  
  try {
    // Check if spawn failed before waiting
    if (spawnError) {
      throw spawnError;
    }
    if (!serverPid || typeof serverPid !== 'number') {
      throw new Error('Server process failed to start (no PID)');
    }
    
    await waitForServer(port);
    console.log(`🔍 Checking links on http://localhost:${port}...`);

    const checker = new LinkChecker();
    const brokenLinks = [];
    
    checker.on('link', (result) => {
      if (result.state === 'BROKEN') {
        brokenLinks.push(result);
        console.log(`[${result.status || 'ERR'}] ${result.url}`);
        console.log(`       └─ from: ${result.parent}`);
      }
    });

    const result = await checker.check({
      path: `http://localhost:${port}`,
      recurse: true,
      linksToSkip: [
        'railway.com',
        'api.pirsch.io', 
        'echodash.com',  // Bot protection returns 403
        'github.com',    // GitHub edit/source links often rate-limit CI
        'automem.ai',    // Canonical/OG URLs point at production before deploy
        'localhost:4321', // Dev server references
        'localhost:4322',
        'localhost:4323',
      ],
      concurrency: 10,
      timeout: 10000,
    });

    console.log(`\n📊 Scanned ${result.links.length} links`);
    console.log(`   ✅ Passed: ${result.passed}`);
    
    if (brokenLinks.length > 0) {
      console.log(`   ❌ Broken: ${brokenLinks.length}`);
      console.log('\nBroken links found:');
      brokenLinks.forEach(link => {
        console.log(`   [${link.status || 'ERR'}] ${link.url}`);
      });
      process.exit(1);
    }

    console.log('\n✅ All links are valid!');
  } finally {
    // Only kill if we have a valid PID
    if (serverPid && typeof serverPid === 'number') {
      try { 
        server.kill('SIGTERM');
      } catch (killErr) {
        // Ignore kill errors in cleanup
      }
    }
    killProcessesOnPort(port);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
}
