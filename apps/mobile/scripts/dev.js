const { spawn } = require('child_process');

console.log('🚀 Checking Flutter environment for @adhocx/mobile...');

const isWindows = process.platform === 'win32';
const flutterCmd = isWindows ? 'flutter.bat' : 'flutter';

try {
  const child = spawn(flutterCmd, ['run', '-d', 'chrome', '--web-port', '7003'], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (_err) => {
    console.log('\n📱 [AdhocX Mobile]');
    console.log('ℹ️  Flutter CLI is not found on system PATH.');
    console.log('ℹ️  API (port 7001) & Admin (port 7002) are actively running!');
    console.log('ℹ️  To launch Mobile on Web/Android, ensure Flutter is installed and run: pnpm dev:mobile\n');
    
    // Keep process alive so Turborepo continues running API and Admin
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
} catch {
  console.log('\n📱 [AdhocX Mobile] Flutter runner waiting...');
  setInterval(() => {}, 60000);
}
