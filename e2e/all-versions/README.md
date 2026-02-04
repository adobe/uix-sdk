# E2E All Versions Testing

This directory contains comprehensive end-to-end tests for the UIX SDK that run against multiple version combinations of host and guest applications.

## Structure

```
all-versions/
├── host-app/          # Host application for testing
├── guest-app/         # Guest application for testing  
├── tests/            # TestCafe tests
└── README.md         # This file
```

## Version Matrix Testing

The tests run against all combinations of:

**Host App Versions:**
- 0.8.5, 0.9.2, 0.10.3, 0.10.4, 1.0.0, 1.0.5, 1.1.3, 1.1.4, 1.1.5, latest

**Guest App Versions:**  
- 0.8.5, 0.9.2, 0.10.3, 0.10.4, 1.0.0, 1.0.5, 1.1.3, 1.1.4, 1.1.5, latest

This creates a comprehensive compatibility matrix to ensure backward/forward compatibility.

## Running Tests

### Local Development
```bash
# Navigate to the tests directory
cd e2e/all-versions/tests

# Install dependencies
npm install

# Run tests locally (with visible browser)
npm run test:local

# Debug tests (live mode)
npm run test:debug
```

### GitHub Actions
Tests run automatically via GitHub Actions workflow: `.github/workflows/e2e-all-versions.yml`

## Test Features

- **Version-aware testing** - Tests adapt behavior based on host/guest versions
- **Robust iframe loading** - Proper waiting mechanisms for cross-origin content
- **Comprehensive logging** - Version info and detailed test progression
- **Screenshot capture** - Before/after screenshots for each test step
- **Cross-origin handling** - Graceful fallback for cross-origin restrictions
- **Artifact collection** - Test results and screenshots saved on failure

## Key Tests

1. **Guest Load Test** - Verifies iframe creation and guest application loading
2. **Host-Guest Communication** - Tests bidirectional API calls
3. **Cross-Origin Handling** - Ensures proper behavior across different origins

## Version-Specific Behavior

- **Versions >= 1.1.4**: Wait for explicit guest-ready signal
- **Versions < 1.1.4**: Immediate ready state after connection
- **Cross-version compatibility**: Tests ensure new hosts work with old guests and vice versa

## Debugging

Screenshots are automatically captured:
- At test start
- Before major actions  
- After test completion
- On test failure

Files are saved to `artifacts/screenshots/` with version info in filename.
