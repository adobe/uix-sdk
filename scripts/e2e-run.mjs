#!/usr/bin/env node

/**
 * E2E Test Runner
 *
 * Orchestrates the full local e2e test flow:
 *   1. Set up e2e apps with local builds (via e2e-setup.mjs)
 *   2. Start host-app and guest-app in the background
 *   3. Wait for both servers to respond
 *   4. Run the TestCafe test suite
 *   5. Kill background servers on exit
 *
 * Usage:
 *   node scripts/e2e-run.mjs [--skip-setup]
 *
 *   --skip-setup   Skip the e2e-setup step (use when apps are already set up)
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const HOST_APP_DIR = path.join(ROOT_DIR, 'e2e', 'host-app');
const GUEST_APP_DIR = path.join(ROOT_DIR, 'e2e', 'guest-app');
const TESTS_DIR = path.join(ROOT_DIR, 'e2e', 'tests');

const HOST_PORT = 3000;
const GUEST_PORT = 3002;
const GUEST_PORT_2 = 3003;
const WAIT_TIMEOUT_MS = 120_000;
const WAIT_INTERVAL_MS = 2_000;

const skipSetup = process.argv.includes('--skip-setup');

/**
 * Wait for an HTTP server to respond on the given port.
 */
function waitForServer(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const check = () => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        res.destroy();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for server on port ${port}`));
        } else {
          setTimeout(check, WAIT_INTERVAL_MS);
        }
      });
      req.setTimeout(1000, () => req.destroy());
    };

    check();
  });
}

/**
 * Spawn a background process and return its handle.
 */
function startApp(cwd, env = {}) {
  const proc = spawn('npm', ['start'], {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });

  proc.stdout.on('data', (d) => process.stdout.write(d));
  proc.stderr.on('data', (d) => process.stderr.write(d));

  proc.on('error', (err) => {
    console.error(`Process error in ${cwd}: ${err.message}`);
  });

  return proc;
}

function cleanup(procs) {
  for (const proc of procs) {
    try {
      proc.kill('SIGTERM');
    } catch (_) {
      // ignore
    }
  }
}

/**
 * Kill any process already listening on the given port (macOS/Linux).
 */
function freePort(port) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore' });
  } catch (_) {
    // nothing was listening — ignore
  }
}

async function main() {
  const procs = [];

  // Ensure servers are killed even on unexpected exit
  process.on('exit', () => cleanup(procs));
  process.on('SIGINT', () => { cleanup(procs); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(procs); process.exit(143); });

  // Kill any stale servers from previous runs so the new build is always served
  console.log('\n[e2e] Freeing ports', HOST_PORT, GUEST_PORT, GUEST_PORT_2, '...');
  freePort(HOST_PORT);
  freePort(GUEST_PORT);
  freePort(GUEST_PORT_2);

  // 1. Set up e2e apps
  if (!skipSetup) {
    console.log('\n[e2e] Setting up apps with local builds...');
    execSync('node scripts/e2e-setup.mjs local', { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    console.log('\n[e2e] Skipping setup (--skip-setup)');
  }

  // 2. Start apps
  console.log('\n[e2e] Starting host app on port', HOST_PORT, '...');
  procs.push(startApp(HOST_APP_DIR, { PORT: String(HOST_PORT) }));

  console.log('[e2e] Starting guest app on port', GUEST_PORT, '...');
  procs.push(startApp(GUEST_APP_DIR, { PORT: String(GUEST_PORT) }));

  console.log('[e2e] Starting second guest app on port', GUEST_PORT_2, '...');
  procs.push(startApp(GUEST_APP_DIR, { PORT: String(GUEST_PORT_2) }));

  // 3. Wait for both servers
  console.log('\n[e2e] Waiting for servers...');
  await Promise.all([
    waitForServer(HOST_PORT, WAIT_TIMEOUT_MS),
    waitForServer(GUEST_PORT, WAIT_TIMEOUT_MS),
    waitForServer(GUEST_PORT_2, WAIT_TIMEOUT_MS),
  ]);
  console.log('[e2e] All servers are ready');

  // 4. Run tests
  console.log('\n[e2e] Running tests...\n');
  let testExitCode = 0;
  try {
    execSync('npm test', { cwd: TESTS_DIR, stdio: 'inherit' });
  } catch (err) {
    testExitCode = err.status ?? 1;
  }

  // 5. Tear down
  console.log('\n[e2e] Stopping servers...');
  cleanup(procs);

  process.exit(testExitCode);
}

main().catch((err) => {
  console.error('[e2e] Fatal error:', err.message);
  process.exit(1);
});
