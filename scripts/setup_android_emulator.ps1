# Automated Android SDK, Emulator & AVD Setup Script
$ErrorActionPreference = "Continue"

$userProfile = $env:USERPROFILE
$androidHome = "$userProfile\AppData\Local\Android\Sdk"
$cmdlineToolsZip = "$env:TEMP\cmdline-tools.zip"
$javaDir = "C:\Program Files\Android\Android Studio\jbr"

Write-Host "==> 1. Setting up Android SDK root directory at: $androidHome"
if (!(Test-Path $androidHome)) {
    New-Item -ItemType Directory -Force -Path $androidHome | Out-Null
}

$toolsLatestDir = "$androidHome\cmdline-tools\latest"

if (!(Test-Path "$toolsLatestDir\bin\sdkmanager.bat")) {
    Write-Host "==> 2. Fast Downloading Android Command Line Tools via curl..."
    $url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    & curl.exe -L -o $cmdlineToolsZip $url --progress-bar

    Write-Host "==> 3. Extracting Command Line Tools..."
    $tempExtract = "$env:TEMP\cmdline_extracted"
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
    Expand-Archive -Path $cmdlineToolsZip -DestinationPath $tempExtract -Force

    New-Item -ItemType Directory -Force -Path "$androidHome\cmdline-tools" | Out-Null
    if (Test-Path $toolsLatestDir) { Remove-Item -Recurse -Force $toolsLatestDir }
    Move-Item -Path "$tempExtract\cmdline-tools" -Destination $toolsLatestDir -Force
    Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
    Remove-Item -Force $cmdlineToolsZip -ErrorAction SilentlyContinue
}

Write-Host "==> 4. Setting Environment Variables..."
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $androidHome, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $androidHome, 'User')
[Environment]::SetEnvironmentVariable('JAVA_HOME', $javaDir, 'User')

$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:JAVA_HOME = $javaDir
$env:PATH = "$toolsLatestDir\bin;$androidHome\platform-tools;$androidHome\emulator;$javaDir\bin;$env:PATH"

$sdkmanager = "$toolsLatestDir\bin\sdkmanager.bat"
$avdmanager = "$toolsLatestDir\bin\avdmanager.bat"
$flutterBat = "C:\Users\saavi\flutter_sdk\bin\flutter.bat"

Write-Host "==> 5. Accepting Licenses..."
& cmd.exe /c "echo y | `"$sdkmanager`" --licenses"

Write-Host "==> 6. Installing platform-tools, build-tools, emulator, and system-image (Pixel 7 / Android 34)..."
& cmd.exe /c "`"$sdkmanager`" `"platform-tools`" `"platforms;android-34`" `"build-tools;34.0.0`" `"emulator`" `"system-images;android-34;google_apis;x86_64`""

Write-Host "==> 7. Creating optimized Android Virtual Device (AVD): Pixel_7_API_34..."
& cmd.exe /c "echo no | `"$avdmanager`" create avd -n Pixel_7_API_34 -k `"system-images;android-34;google_apis;x86_64`" --device `"pixel_7`" --force"

Write-Host "==> 8. Configuring Flutter SDK..."
& $flutterBat config --android-sdk $androidHome
& $flutterBat config --android-studio-dir "C:\Program Files\Android\Android Studio"
& cmd.exe /c "echo y | `"$flutterBat`" doctor --android-licenses"

Write-Host "==> 9. Verification..."
& $flutterBat devices

Write-Host "========================================="
Write-Host "🎉 ANDROID EMULATOR SETUP COMPLETE! 🎉"
Write-Host "========================================="
