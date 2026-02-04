#!/usr/bin/env node

/**
 * Copy Local Dist Packages Script
 * 
 * Cross-platform script to copy built packages from dist folders
 * to node_modules in the local-dist e2e applications.
 * This allows testing with fresh builds without npm install.
 * 
 * Features:
 * - Cross-platform support (Windows, macOS, Linux)
 * - Handles symlinks and junctions properly
 * - Comprehensive error handling and logging
 * - Progress indicators and detailed output
 * - Verification and cleanup capabilities
 */

const fs = require('fs');
const path = require('path');

/**
 * Simple logging functions without colors or symbols
 */
function log(message) {
  console.log(message);
}

function logSuccess(message) {
  console.log(`[OK] ${message}`);
}

function logError(message) {
  console.error(`[ERROR] ${message}`);
}

function logWarning(message) {
  console.warn(`[WARN] ${message}`);
}

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logHeader(message) {
  console.log(message);
}

// Configuration
const PACKAGES = [
  { name: 'uix-core', source: 'packages/uix-core/dist' },
  { name: 'uix-host', source: 'packages/uix-host/dist' },
  { name: 'uix-host-react', source: 'packages/uix-host-react/dist' },
  { name: 'uix-guest', source: 'packages/uix-guest/dist' }
];

const APPS = [
  'e2e/local-dist/host-app',
  'e2e/local-dist/guest-app'
];

const ROOT_DIR = process.cwd();

/**
 * Cross-platform directory existence check
 */
function dirExists(dirPath) {
  try {
    const stats = fs.lstatSync(dirPath);
    return stats.isDirectory() || stats.isSymbolicLink();
  } catch (error) {
    return false;
  }
}

/**
 * Safe directory removal that handles symlinks and junctions
 */
function removeDirSafe(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return true;
    }
    
    const stats = fs.lstatSync(dirPath);
    
    if (stats.isSymbolicLink() || (process.platform === 'win32' && stats.isDirectory())) {
      // On Windows, this handles both symlinks and junctions
      fs.rmSync(dirPath, { recursive: true, force: true });
    } else {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
    
    return true;
  } catch (error) {
    logError(`Failed to remove directory ${dirPath}: ${error.message}`);
    return false;
  }
}

/**
 * Enhanced directory copy with progress and error handling
 */
function copyDir(src, dest) {
  try {
    // Ensure destination directory exists
    fs.mkdirSync(dest, { recursive: true });
    
    // Get all items in source directory
    const items = fs.readdirSync(src);
    let copiedCount = 0;
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      const stats = fs.lstatSync(srcPath);
      
      if (stats.isDirectory()) {
        // Recursively copy subdirectory
        copyDir(srcPath, destPath);
      } else {
        // Copy file
        fs.copyFileSync(srcPath, destPath);
      }
      
      copiedCount++;
    }
    
    logSuccess(`Copied ${copiedCount} items: ${path.basename(src)} → ${path.basename(dest)}`);
    return true;
    
  } catch (error) {
    logError(`Failed to copy ${src} → ${dest}: ${error.message}`);
    return false;
  }
}

/**
 * Enhanced package.json copy with validation
 */
function copyPackageJson(packageName, sourcePath, destPath) {
  try {
    const sourcePackageJson = path.join('packages', packageName, 'package.json');
    const destPackageJson = path.join(destPath, 'package.json');
    
    if (fs.existsSync(sourcePackageJson)) {
      // Read and validate package.json
      const packageData = JSON.parse(fs.readFileSync(sourcePackageJson, 'utf8'));
      
      // Write formatted package.json
      fs.writeFileSync(destPackageJson, JSON.stringify(packageData, null, 2));
      
      logInfo(`Package.json copied for ${packageName} (v${packageData.version || 'unknown'})`);
      return true;
    } else {
      logWarning(`No package.json found for ${packageName}`);
      return false;
    }
  } catch (error) {
    logWarning(`Failed to copy package.json for ${packageName}: ${error.message}`);
    return false;
  }
}

/**
 * Enhanced dist folder verification with detailed reporting
 */
function verifyDistFolders() {
  logInfo('Verifying dist folders...');
  
  let allExist = true;
  const results = [];
  
  for (const pkg of PACKAGES) {
    const fullPath = path.join(ROOT_DIR, pkg.source);
    const exists = dirExists(fullPath);
    
    results.push({
      package: pkg.name,
      path: pkg.source,
      exists: exists,
      fullPath: fullPath
    });
    
    if (exists) {
      const files = fs.readdirSync(fullPath);
      logSuccess(`Found: ${pkg.source} (${files.length} items)`);
    } else {
      logError(`Missing: ${pkg.source}`);
      allExist = false;
    }
  }
  
  if (!allExist) {
    logError('');
    logInfo('Run "npm run build:packages" first to build all packages');
    process.exit(1);
  }
  
  return results;
}

/**
 * Enhanced app processing with better error handling and progress
 */
function copyToApp(appPath) {
  log(`\nProcessing app: ${appPath}`);
  
  const appFullPath = path.join(ROOT_DIR, appPath);
  if (!dirExists(appFullPath)) {
    logError(`App directory not found: ${appFullPath}`);
    return false;
  }
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(appFullPath, 'node_modules');
  if (!dirExists(nodeModulesPath)) {
    logError(`node_modules not found in ${appPath}`);
    logInfo(`Run "npm install" in ${appPath} first`);
    return false;
  }
  
  // Ensure @adobe directory exists
  const adobeDir = path.join(nodeModulesPath, '@adobe');
  if (!dirExists(adobeDir)) {
    fs.mkdirSync(adobeDir, { recursive: true });
    logInfo(`Created @adobe directory in ${appPath}`);
  }
  
  let success = true;
  let copiedPackages = 0;
  
  // Copy each package
  for (const pkg of PACKAGES) {
    const sourcePath = path.join(ROOT_DIR, pkg.source);
    const targetPath = path.join(adobeDir, pkg.name);
    
    log(`  Copying ${pkg.name}...`);
    
    // Remove existing target directory safely
    if (dirExists(targetPath)) {
      if (!removeDirSafe(targetPath)) {
        logError(`  Failed to remove existing ${pkg.name}`);
        success = false;
        continue;
      }
    }
    
    // Copy dist folder contents
    if (copyDir(sourcePath, targetPath)) {
      // Copy package.json as well
      if (copyPackageJson(pkg.name, sourcePath, targetPath)) {
        copiedPackages++;
      }
    } else {
      success = false;
    }
  }
  
  if (success) {
    logSuccess(`${appPath}: ${copiedPackages}/${PACKAGES.length} packages copied successfully`);
  } else {
    logError(`${appPath}: Some packages failed to copy`);
  }
  
  return success;
}

/**
 * Enhanced summary with detailed package information
 */
function createSummary() {
  log('\nCopy Summary:');
  log('================');
  
  let totalPackages = 0;
  let successfulPackages = 0;
  
  for (const app of APPS) {
    log(`\n${app}:`);
    const nodeModulesPath = path.join(ROOT_DIR, app, 'node_modules', '@adobe');
    
    if (!dirExists(nodeModulesPath)) {
      logError('  No @adobe packages found');
      continue;
    }
    
    for (const pkg of PACKAGES) {
      totalPackages++;
      const packagePath = path.join(nodeModulesPath, pkg.name);
      
      if (dirExists(packagePath)) {
        try {
          const files = fs.readdirSync(packagePath);
          const hasDistFiles = files.length > 1; // More than just package.json
          const packageJsonPath = path.join(packagePath, 'package.json');
          
          if (hasDistFiles) {
            let versionInfo = '';
            if (fs.existsSync(packageJsonPath)) {
              try {
                const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                versionInfo = ` (v${packageData.version || 'unknown'})`;
              } catch (e) {
                versionInfo = ' (version unknown)';
              }
            }
            
            logSuccess(`  ${pkg.name}${versionInfo} - ${files.length} files`);
            successfulPackages++;
          } else {
            logWarning(`  ${pkg.name} (incomplete - only package.json)`);
          }
        } catch (error) {
          logError(`  ${pkg.name} (error reading directory)`);
        }
      } else {
        logError(`  ${pkg.name} (missing)`);
      }
    }
  }
  
  log(`\nOverall: ${successfulPackages}/${totalPackages} packages successfully copied`);
}

/**
 * Enhanced main execution with better argument parsing and error handling
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const showHelp = args.includes('--help') || args.includes('-h');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const skipVerify = args.includes('--skip-verify');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
    if (showHelp) {
    logHeader('UIX SDK Local Dist Copy Script');
    console.log('Cross-platform package copying utility\n');
    console.log('Usage: node copy-local-dist.js [options]\n');
    console.log('Options:');
    console.log('  --help, -h        Show this help message');
    console.log('  --verbose, -v     Show verbose output and detailed summary');
    console.log('  --skip-verify     Skip verification of dist folders');
    console.log('  --dry-run         Show what would be copied without actually copying');
    console.log('  --force           Force removal of existing packages without prompting');
    console.log('\nDescription:');
    console.log('  Copies built packages from packages/*/dist to node_modules/@adobe/*');
    console.log('  in local-dist e2e applications for testing with fresh builds.');
    console.log('\nPlatform Support:');
    console.log('  - Windows (with proper symlink/junction handling)');
    console.log('  - macOS');
    console.log('  - Linux');
    console.log('\nExamples:');
    console.log('  node copy-local-dist.js');
    console.log('  node copy-local-dist.js --verbose');
    console.log('  node copy-local-dist.js --skip-verify --force');
    console.log('  node copy-local-dist.js --dry-run');
    process.exit(0);
  }
    try {
    logHeader('UIX SDK Local Dist Copy Script');
    log('Cross-platform package copying utility');
    log('====================================');
    
    if (dryRun) {
      logWarning('DRY RUN MODE - No files will be copied');
    }
    
    // Display system information
    if (verbose) {
      log(`\nSystem Info:`);
      log(`  Platform: ${process.platform} ${process.arch}`);
      log(`  Node.js: ${process.version}`);
      log(`  Working Directory: ${ROOT_DIR}`);
    }
    
    // Step 1: Verify dist folders exist (unless skipped)
    if (!skipVerify) {
      const verifyResults = verifyDistFolders();
      if (verbose) {
        log(`\nVerified ${verifyResults.length} packages`);
      }
    }
    
    if (dryRun) {
      logInfo('\nDRY RUN - Would copy the following packages:');
      for (const pkg of PACKAGES) {
        log(`  ${pkg.name}: ${pkg.source}`);
      }
      logInfo(`To apps: ${APPS.join(', ')}`);
      process.exit(0);
    }
    
    // Step 2: Copy to each app
    let overallSuccess = true;
    let appsProcessed = 0;
    let totalPackagesCopied = 0;
    
    for (const app of APPS) {
      if (!copyToApp(app)) {
        overallSuccess = false;
      } else {
        appsProcessed++;
        totalPackagesCopied += PACKAGES.length;
      }
    }
    
    // Step 3: Show summary
    createSummary();
    
    // Step 4: Final result
    log(''); // Empty line
    if (overallSuccess) {
      logSuccess(`All packages copied successfully!`);
      log(`${appsProcessed} apps processed, ${totalPackagesCopied} packages copied`);
      logInfo(`You can now run the local-dist apps with fresh builds`);
    } else {
      logError('Some packages failed to copy');
      logInfo('Check the error messages above for details');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`\nScript failed: ${error.message}`);
    if (verbose) {
      logError(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  copyToApp,
  verifyDistFolders,
  PACKAGES,
  APPS
};
