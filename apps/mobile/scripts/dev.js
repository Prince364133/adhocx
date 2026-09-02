const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Checking Flutter environment for @adhocx/mobile...');

function findFlutterExecutable() {
  const isWindows = process.platform === 'win32';
  const flutterName = isWindows ? 'flutter.bat' : 'flutter';

  // Candidate paths
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    flutterName,
    path.join(userProfile, 'flutter_sdk', 'bin', flutterName),
    path.join(userProfile, 'flutter', 'bin', flutterName),
    path.join('C:', 'Users', 'saavi', 'flutter_sdk', 'bin', flutterName),
    path.join('C:', 'flutter', 'bin', flutterName),
    path.join('C:', 'src', 'flutter', 'bin', flutterName),
  ];

  for (const candidate of candidates) {
    if (candidate === flutterName) continue;
    if (fs.existsSync(candidate)) {
      console.log(`✅ Found Flutter SDK at: ${candidate}`);
      return candidate;
    }
  }

  return flutterName;
}

const flutterCmd = findFlutterExecutable();
const mobileDir = path.resolve(__dirname, '..');

try {
  const child = spawn(
    flutterCmd,
    ['run', '-d', 'web-server', '--web-port', '7003', '--web-hostname', 'localhost'],
    {
      cwd: mobileDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  child.on('error', (err) => {
    console.log('\n📱 [AdhocX Mobile]');
    console.log(`ℹ️  Unable to launch Flutter: ${err.message}`);
    console.log('ℹ️  API (port 7001) & Admin (port 7002) are actively running!');
    console.log('ℹ️  To launch Mobile, verify Flutter installation and run: pnpm dev:mobile\n');

    setInterval(() => {}, 60000);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.log('\n📱 [AdhocX Mobile]');
      console.log(`ℹ️  Flutter process exited (code ${code}).`);
      console.log('ℹ️  Keeping monorepo dev session active for API and Admin.\n');
      setInterval(() => {}, 60000);
    }
  });
} catch (e) {
  console.log(`\n📱 [AdhocX Mobile] Flutter runner waiting: ${e.message}`);
  setInterval(() => {}, 60000);
}
