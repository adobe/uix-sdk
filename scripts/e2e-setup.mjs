#!/usr/bin/env node

/**
 * E2E Setup Script
 *
 * Sets up e2e app directories by generating package.json from templates
 * and installing dependencies, with optional local SDK package injection.
 *
 * Usage:
 *   node scripts/e2e-setup.mjs [<app>] [<version>]
 *
 *   app:     host | guest | tests | all  (default: all)
 *   version: local | latest | <semver>   (default: local)
 *
 * Examples:
 *   node scripts/e2e-setup.mjs                 # all apps, local builds
 *   node scripts/e2e-setup.mjs local           # same
 *   node scripts/e2e-setup.mjs all 1.1.6       # all apps at 1.1.6
 *   node scripts/e2e-setup.mjs host 1.1.6      # only host-app at 1.1.6
 *   node scripts/e2e-setup.mjs guest 1.0.1     # only guest-app at 1.0.1
 *   node scripts/e2e-setup.mjs tests           # only install test runner
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// SDK package name → source directory mapping
const SDK_PACKAGES = {
  '@adobe/uix-core': 'packages/uix-core',
  '@adobe/uix-host': 'packages/uix-host',
  '@adobe/uix-host-react': 'packages/uix-host-react',
  '@adobe/uix-guest': 'packages/uix-guest',
};

// App name → directory mapping
const APPS = {
  host: 'e2e/host-app',
  guest: 'e2e/guest-app',
  tests: 'e2e/tests',
};

function log(msg) {
  console.log(msg);
}

function run(cmd, cwd) {
  log(`  $ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

/**
 * Copy a directory recursively (sync).
 */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install local SDK builds into an app's node_modules.
 * Reads which @adobe/uix-* packages the app needs from its package.json.dist.
 */
function installLocalPackages(appDir, distJson) {
  const sdkDeps = Object.keys(distJson.dependencies || {})
    .filter((dep) => dep.startsWith('@adobe/uix-'));

  if (sdkDeps.length === 0) return;

  log(`  Injecting local SDK packages: ${sdkDeps.join(', ')}`);

  for (const dep of sdkDeps) {
    const pkgSourceDir = SDK_PACKAGES[dep];
    if (!pkgSourceDir) {
      throw new Error(`Unknown SDK package: ${dep}`);
    }

    const distDir = path.join(ROOT_DIR, pkgSourceDir, 'dist');
    const pkgJsonSrc = path.join(ROOT_DIR, pkgSourceDir, 'package.json');

    if (!fs.existsSync(distDir)) {
      throw new Error(
        `Dist folder not found for ${dep}: ${distDir}\n` +
          `Run "npm run build" first.`
      );
    }

    // e.g. node_modules/@adobe/uix-core
    const [scope, pkgName] = dep.split('/');
    const destDir = path.join(appDir, 'node_modules', scope, pkgName);

    fs.rmSync(destDir, { recursive: true, force: true });
    copyDirSync(distDir, destDir);

    // Also copy package.json so the module can be resolved correctly
    if (fs.existsSync(pkgJsonSrc)) {
      fs.copyFileSync(pkgJsonSrc, path.join(destDir, 'package.json'));
    }

    log(`  [OK] Copied ${dep} → ${path.relative(ROOT_DIR, destDir)}`);
  }
}

/**
 * Set up a single app directory.
 */
function setupApp(appKey, version) {
  const appRelDir = APPS[appKey];
  const appDir = path.join(ROOT_DIR, appRelDir);
  const distTemplatePath = path.join(appDir, 'package.json.dist');
  const packageJsonPath = path.join(appDir, 'package.json');

  log(`\n=== Setting up ${appRelDir} (version: ${version}) ===`);

  if (!fs.existsSync(distTemplatePath)) {
    throw new Error(`Template not found: ${distTemplatePath}`);
  }

  const distJson = JSON.parse(fs.readFileSync(distTemplatePath, 'utf8'));

  if (version === 'local') {
    // Remove SDK deps so npm does not try to download them
    const deps = distJson.dependencies || {};
    for (const dep of Object.keys(deps)) {
      if (dep.startsWith('@adobe/uix-')) {
        delete deps[dep];
      }
    }
  } else {
    // Replace SDK_VERSION placeholder with the requested version
    const deps = distJson.dependencies || {};
    for (const [dep, val] of Object.entries(deps)) {
      if (dep.startsWith('@adobe/uix-') && val === 'SDK_VERSION') {
        deps[dep] = version;
      }
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(distJson, null, 2) + '\n');
  log(`  Generated package.json`);

  run('npm install', appDir);

  if (version === 'local') {
    // Re-read the original template (with SDK deps) to know what to inject
    const originalDist = JSON.parse(fs.readFileSync(distTemplatePath, 'utf8'));
    installLocalPackages(appDir, originalDist);
  }

  log(`  [OK] ${appRelDir} ready`);
}

function parseArgs(argv) {
  const args = argv.slice(2);

  // Detect which arg is the app and which is the version
  const appKeys = ['host', 'guest', 'tests', 'all'];
  const versionLike = (s) =>
    s === 'local' || s === 'latest' || /^\d+\.\d+/.test(s);

  let app = 'all';
  let version = 'local';

  for (const arg of args) {
    if (appKeys.includes(arg)) {
      app = arg;
    } else if (versionLike(arg)) {
      version = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { app, version };
}

function main() {
  const { app, version } = parseArgs(process.argv);

  const appsToSetup = app === 'all' ? Object.keys(APPS) : [app];

  for (const appKey of appsToSetup) {
    if (!APPS[appKey]) {
      throw new Error(`Unknown app: ${appKey}. Valid apps: ${Object.keys(APPS).join(', ')}`);
    }
    // The tests app has no SDK deps, so version doesn't matter
    setupApp(appKey, appKey === 'tests' ? 'local' : version);
  }

  log('\n[OK] E2E setup complete');
}

main();
