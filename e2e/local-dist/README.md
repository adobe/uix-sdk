# E2E Local Dist Testing

This directory contains end-to-end tests for the UIX SDK using **locally built packages** from `./packages/*/dist` rather than published npm versions.

## Purpose

This test setup is designed to:
- Test code changes **before publishing**
- Verify that locally built packages work correctly
- Catch integration issues early in development
- Test the actual build artifacts that will be published

## Difference from `all-versions`

| Feature | `all-versions` | `local-dist` |
|---------|---------------|-------------|
| **Package Source** | Published npm packages | Local `./dist` builds |
| **Use Case** | Compatibility testing | Development testing |
| **Versions** | Matrix of published versions | Current development code |
| **Trigger** | Version compatibility validation | Code changes validation |

## Directory Structure

```
local-dist/
├── host-app/          # Host application using local packages
├── guest-app/         # Guest application using local packages  
├── tests/            # TestCafe tests
└── README.md         # This file
```

## Package Dependencies

The applications use `file:` dependencies pointing to local packages:

```json
{
  "dependencies": {
    "@adobe/uix-core": "file:../../packages/uix-core",
    "@adobe/uix-host": "file:../../packages/uix-host",
    "@adobe/uix-host-react": "file:../../packages/uix-host-react",
    "@adobe/uix-guest": "file:../../packages/uix-guest"
  }
}
```

## Prerequisites

Before running these tests, you must build the packages:

```bash
# From repository root
npm run build:packages

# Or build individual packages
cd packages/uix-core && npm run build
cd packages/uix-host && npm run build
cd packages/uix-host-react && npm run build
cd packages/uix-guest && npm run build
```

## Running Tests

### Automated (Recommended)
```bash
# From repository root - builds packages and runs tests
npm run test:e2e:local-dist
```

### Manual Steps
```bash
# 1. Build packages first
npm run build:packages

# 2. Start host app (Terminal 1)
cd e2e/local-dist/host-app
npm install
npm start

# 3. Start guest app (Terminal 2)  
cd e2e/local-dist/guest-app
npm install
npm start

# 4. Run tests (Terminal 3)
cd e2e/local-dist/tests
npm install
npm test
```

### PowerShell Script (Windows)
```powershell
# Build packages and run tests in one command
.\e2e\local-dist\run-local-tests.ps1
```

## GitHub Actions

Tests run automatically on:
- **Push** to `main`/`develop` when packages change
- **Pull requests** that modify packages
- **Manual trigger** via workflow dispatch

The workflow:
1. Builds all packages from source
2. Installs apps with local package dependencies
3. Runs comprehensive E2E tests
4. Reports results with artifacts

## What Gets Tested

### Core Functionality
- ✅ Host-Guest communication with local builds
- ✅ Iframe loading and content rendering
- ✅ API method calls between host and guest
- ✅ Cross-origin handling
- ✅ Version compatibility logic

### Build Verification
- ✅ Package builds are complete and functional
- ✅ Dependencies resolve correctly
- ✅ No runtime errors with local builds
- ✅ Performance characteristics

## Test Artifacts

On test failure, artifacts are saved:
- Screenshots from each test step
- Console logs and error messages
- Build outputs and dependency info
- Test result JSON files

## Debugging

### Common Issues

**1. Build Failures**
```bash
# Check if packages built successfully
ls -la packages/*/dist
```

**2. Dependency Issues**
```bash
# Clean and reinstall
cd e2e/local-dist/host-app
rm -rf node_modules package-lock.json
npm install
```

**3. Port Conflicts**
```bash
# Kill processes on ports 3000, 3002
npx kill-port 3000 3002
```

### Local Development Workflow

1. Make changes to packages
2. Build packages: `npm run build:packages`
3. Test changes: `cd e2e/local-dist && npm run test:quick`
4. Commit when tests pass

## Performance Considerations

Local dist tests are generally:
- **Faster startup** (no package downloads)
- **Slower builds** (compile from source)
- **More accurate** (tests actual build artifacts)
