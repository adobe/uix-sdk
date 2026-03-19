# Run E2E Tests

Build the SDK and run the full e2e test suite against real browser instances.

## What this does

1. Rebuilds all SDK packages from source (`npm run build`)
2. Sets up the e2e apps with the fresh local build, clearing bundler caches
3. Kills any stale dev servers on ports 3000/3002/3003
4. Starts host and guest app dev servers
5. Runs TestCafe tests in Chrome
6. Tears down servers

## Command

```bash
npm run build && npm run test:e2e
```

Run this command now and report the results. If any tests fail, show the full error output including the failing assertion and the file/line number.
