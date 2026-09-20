# ==============================================================================
# AdhocX Local Mobile Build Helper Script (PowerShell)
# Builds APK and AAB locally if Java & Android SDK are installed,
# or triggers the GitHub Actions cloud build workflow.
# ==============================================================================

param(
    [string]$Target = "all", # options: apk, aab, cloud, all
    [string]$VersionTag = "v1.0.0"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$MobileDir = Join-Path $ProjectRoot "apps\mobile"

$flutterCmd = "C:\Users\saavi\flutter_sdk\bin\flutter.bat"
if (-not (Test-Path $flutterCmd)) {
    $flutterCmd = "flutter"
}

Write-Host "📱 AdhocX Mobile Release Builder ($Target)..." -ForegroundColor Cyan

# Check if Java & Android SDK are available locally
$javaInstalled = Get-Command "javac" -ErrorAction SilentlyContinue

if ($Target -eq "cloud" -or -not $javaInstalled) {
    if (-not $javaInstalled) {
        Write-Host "ℹ️  Local Android SDK / Java JDK not found on this Windows machine." -ForegroundColor Yellow
        Write-Host "🚀 Triggering cloud build workflow on GitHub Actions (Ubuntu + macOS runners)..." -ForegroundColor Green
    }

    gh workflow run "mobile-release.yml" --repo "Prince364133/adhocx" -f version_tag="$VersionTag"
    Write-Host "✅ Cloud mobile release workflow triggered!" -ForegroundColor Green
    Write-Host "Monitor with: gh run list --workflow=mobile-release.yml --repo Prince364133/adhocx" -ForegroundColor Cyan
    exit 0
}

Push-Location $MobileDir
try {
    Write-Host "Resolving Flutter dependencies..."
    & $flutterCmd pub get

    if ($Target -eq "apk" -or $Target -eq "all") {
        Write-Host "🔨 Building Android Release APK..." -ForegroundColor Green
        & $flutterCmd build apk --release --no-tree-shake-icons
        Write-Host "✅ APK output: $MobileDir\build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Green
    }

    if ($Target -eq "aab" -or $Target -eq "all") {
        Write-Host "🔨 Building Android App Bundle (AAB)..." -ForegroundColor Green
        & $flutterCmd build appbundle --release --no-tree-shake-icons
        Write-Host "✅ AAB output: $MobileDir\build\app\outputs\bundle\release\app-release.aab" -ForegroundColor Green
    }
} finally {
    Pop-Location
}
