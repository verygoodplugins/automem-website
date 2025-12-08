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
import net from 'net';
import fs from 'fs';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');

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

// Wait for server to be ready
async function waitForServer(port, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(500);
        socket.on('connect', () => { socket.destroy(); resolve(); });
        socket.on('error', reject);
        socket.on('timeout', () => { socket.destroy(); reject(); });
        socket.connect(port, 'localhost');
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  throw new Error('Server failed to start');
}

async function main() {
  const port = await findPort();
  console.log(`🚀 Starting server on port ${port}...`);

  // Start serve in the background (no -s flag so 404s are real 404s)
  const server = spawn('npx', ['serve', 'dist', '-l', String(port)], {
    cwd: join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  let serverPid = server.pid;
  let spawnError = null;

  // Handle spawn failure
  server.on('error', (err) => {
    spawnError = err;
    console.error('❌ Failed to spawn server:', err);
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
        process.kill(-serverPid); 
      } catch (killErr) {
        // Ignore kill errors in cleanup
      }
    }
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
