# PowerShell script to build packages and run local dist tests
param(
    [switch]$SkipBuild,
    [switch]$Verbose
)

# Colors for output
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green  
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue

function Write-ColoredText {
    param([string]$Text, [System.ConsoleColor]$Color)
    $oldColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $oldColor
}

Write-ColoredText "🚀 UIX SDK Local Dist E2E Tests" $Blue
Write-ColoredText "Testing with locally built packages from ./dist" $Yellow

# Navigate to repository root
$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $repoRoot
Set-Location $repoRoot

# Function to cleanup processes
function Cleanup {
    Write-ColoredText "🧹 Cleaning up processes..." $Yellow
    Get-Process | Where-Object { $_.ProcessName -eq "node" } | Where-Object { $_.MainWindowTitle -like "*3000*" -or $_.MainWindowTitle -like "*3002*" } | Stop-Process -Force -ErrorAction SilentlyContinue
}

try {
    if (-not $SkipBuild) {
        Write-ColoredText "🔨 Step 1: Building all packages..." $Blue
        npm run build:packages
        if ($LASTEXITCODE -ne 0) {
            throw "Package build failed"
        }
        Write-ColoredText "✅ Packages built successfully" $Green
    } else {
        Write-ColoredText "⏭️ Skipping package build (--SkipBuild)" $Yellow
    }

    Write-ColoredText "📦 Step 2: Installing host app dependencies..." $Blue
    Set-Location "e2e\local-dist\host-app"
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
    if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Host app dependency installation failed"
    }

    Write-ColoredText "📦 Step 3: Installing guest app dependencies..." $Blue
    Set-Location "..\guest-app"
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
    if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Guest app dependency installation failed"
    }

    Write-ColoredText "🚀 Step 4: Starting applications..." $Blue
    
    # Start host app
    Set-Location "..\host-app"
    Write-ColoredText "Starting host app on port 3000..." $Yellow
    $hostProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -WindowStyle Hidden
    
    # Start guest app
    Set-Location "..\guest-app"  
    Write-ColoredText "Starting guest app on port 3002..." $Yellow
    $guestProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -WindowStyle Hidden

    Write-ColoredText "⏳ Step 5: Waiting for servers..." $Blue
    Start-Sleep 15
    
    # Install wait-on globally if not available
    try {
        npx wait-on --version > $null 2>&1
    } catch {
        npm install -g wait-on
    }
    
    npx wait-on http://localhost:3000 http://localhost:3002 --timeout 180000 --interval 3000
    Write-ColoredText "✅ Both servers are ready!" $Green

    Write-ColoredText "🧪 Step 6: Running E2E tests..." $Blue
    Set-Location "..\tests"
    npm install
    
    $env:BUILD_TYPE = "local-dist"
    $testResult = npm test
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColoredText "🎉 All tests passed!" $Green
    } else {
        Write-ColoredText "❌ Some tests failed!" $Red
        exit 1
    }
}
catch {
    Write-ColoredText "💥 Error: $_" $Red
    exit 1
}
finally {
    # Cleanup processes
    if ($hostProcess) { 
        Stop-Process -Id $hostProcess.Id -Force -ErrorAction SilentlyContinue
        Write-ColoredText "Stopped host process" $Yellow
    }
    if ($guestProcess) { 
        Stop-Process -Id $guestProcess.Id -Force -ErrorAction SilentlyContinue  
        Write-ColoredText "Stopped guest process" $Yellow
    }
    Cleanup
}
