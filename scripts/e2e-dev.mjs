#!/usr/bin/env node

/**
 * E2E Dev Server
 *
 * Builds the SDK, sets up e2e apps with local builds, and starts all three
 * servers (host + two guest instances) so you can run or debug tests manually.
 *
 * Servers stay running until you press Ctrl-C.
 *
 * Usage:
 *   node scripts/e2e-dev.mjs [--skip-setup]
 *
 *   --skip-setup   Skip build + e2e-setup (use when apps are already set up)
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const HOST_APP_DIR = path.join(ROOT_DIR, 'e2e', 'host-app');
const GUEST_APP_DIR = path.join(ROOT_DIR, 'e2e', 'guest-app');

const HOST_PORT = 3000;
const GUEST_PORT = 3002;
const GUEST_PORT_2 = 3003;
const WAIT_TIMEOUT_MS = 120_000;
const WAIT_INTERVAL_MS = 2_000;

const skipSetup = process.argv.includes('--skip-setup');

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

function startApp(cwd, env = {}) {
  const proc = spawn('npm', ['start'], {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
  proc.stdout.on('data', (d) => process.stdout.write(d));
  proc.stderr.on('data', (d) => process.stderr.write(d));
  proc.on('error', (err) => console.error(`Process error in ${cwd}: ${err.message}`));
  return proc;
}

function cleanup(procs) {
  for (const proc of procs) {
    try { proc.kill('SIGTERM'); } catch (_) {}
  }
}

function freePort(port) {
  if (process.platform === 'win32') return;
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore' });
  } catch (_) {}
}

async function main() {
  const procs = [];

  process.on('exit', () => cleanup(procs));
  process.on('SIGINT', () => { cleanup(procs); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(procs); process.exit(143); });

  console.log('\n[e2e:dev] Freeing ports', HOST_PORT, GUEST_PORT, GUEST_PORT_2, '...');
  freePort(HOST_PORT);
  freePort(GUEST_PORT);
  freePort(GUEST_PORT_2);

  if (!skipSetup) {
    console.log('\n[e2e:dev] Building SDK...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log('\n[e2e:dev] Setting up apps with local builds...');
    execSync('node scripts/e2e-setup.mjs local', { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    console.log('\n[e2e:dev] Skipping build + setup (--skip-setup)');
  }

  console.log('\n[e2e:dev] Starting host app on port', HOST_PORT, '...');
  procs.push(startApp(HOST_APP_DIR, { PORT: String(HOST_PORT) }));

  console.log('[e2e:dev] Starting guest app on port', GUEST_PORT, '...');
  procs.push(startApp(GUEST_APP_DIR, { PORT: String(GUEST_PORT) }));

  console.log('[e2e:dev] Starting second guest app on port', GUEST_PORT_2, '...');
  procs.push(startApp(GUEST_APP_DIR, { PORT: String(GUEST_PORT_2) }));

  console.log('\n[e2e:dev] Waiting for servers...');
  await Promise.all([
    waitForServer(HOST_PORT, WAIT_TIMEOUT_MS),
    waitForServer(GUEST_PORT, WAIT_TIMEOUT_MS),
    waitForServer(GUEST_PORT_2, WAIT_TIMEOUT_MS),
  ]);

  console.log('\n[e2e:dev] All servers ready:');
  console.log(`  Host:   http://localhost:${HOST_PORT}`);
  console.log(`  Guest:  http://localhost:${GUEST_PORT}`);
  console.log(`  Guest2: http://localhost:${GUEST_PORT_2}`);
  console.log('\n[e2e:dev] Press Ctrl-C to stop.\n');

  // Keep process alive until Ctrl-C
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('[e2e:dev] Fatal error:', err.message);
  process.exit(1);
});
