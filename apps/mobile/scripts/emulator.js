const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\saavi';
const androidHome = process.env.ANDROID_HOME || path.join(userProfile, 'AppData', 'Local', 'Android', 'Sdk');
const emulatorExe = path.join(androidHome, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
const adbExe = path.join(androidHome, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');

function isEmulatorRunning() {
  try {
    const output = execSync(`"${adbExe}" devices`, { encoding: 'utf-8' });
    return output.includes('emulator-');
  } catch (e) {
    return false;
  }
}

function launchEmulator(avdName = 'Pixel_7_API_34') {
  if (isEmulatorRunning()) {
    console.log('📱 Android emulator is already running.');
    return true;
  }

  if (!fs.existsSync(emulatorExe)) {
    console.error(`❌ Emulator executable not found at: ${emulatorExe}`);
    return false;
  }

  console.log(`🚀 Starting Android Emulator (${avdName})...`);
  const child = spawn(emulatorExe, ['-avd', avdName, '-gpu', 'host'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  console.log('⏳ Waiting for emulator to boot up...');
  return true;
}

if (require.main === module) {
  launchEmulator();
}

module.exports = { launchEmulator, isEmulatorRunning, adbExe, emulatorExe, androidHome };
