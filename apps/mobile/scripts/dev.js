const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('⚡ Initializing AdhocX Flutter Web (Instant Hot-Reload Mode)...');

function findFlutterExecutable() {
  const isWindows = process.platform === 'win32';
  const flutterName = isWindows ? 'flutter.bat' : 'flutter';

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
      return candidate;
    }
  }

  return flutterName;
}

const flutterCmd = findFlutterExecutable();
const mobileDir = path.resolve(__dirname, '..');
const libDir = path.join(mobileDir, 'lib');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\saavi';
const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
const androidHome = process.env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';
const pubCache = process.env.PUB_CACHE || path.join(localAppData, 'Pub', 'Cache');

const flutterBinDir = path.isAbsolute(flutterCmd) ? path.dirname(flutterCmd) : '';
const dartSdkBinDir = flutterBinDir ? path.join(flutterBinDir, 'cache', 'dart-sdk', 'bin') : '';

const pathSeparator = process.platform === 'win32' ? ';' : ':';
const extraPaths = [flutterBinDir, dartSdkBinDir].filter(Boolean).join(pathSeparator);
const childPath = extraPaths ? `${extraPaths}${pathSeparator}${process.env.PATH || ''}` : (process.env.PATH || '');

const childEnv = {
  ...process.env,
  USERPROFILE: userProfile,
  LOCALAPPDATA: localAppData,
  APPDATA: process.env.APPDATA || path.join(userProfile, 'AppData', 'Roaming'),
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  JAVA_HOME: javaHome,
  PUB_CACHE: pubCache,
  PATH: childPath,
};

const isWindows = process.platform === 'win32';
const execFile = isWindows ? 'cmd.exe' : flutterCmd;

// Launch Flutter Web on port 7003
const execArgs = isWindows
  ? ['/c', flutterCmd, 'run', '-d', 'web-server', '--web-port', '7003', '--web-hostname', 'localhost', '--dart-define=API_URL=http://localhost:7001/api/v1', '--dart-define=API_BASE_URL=http://localhost:7001/api/v1']
  : ['run', '-d', 'web-server', '--web-port', '7003', '--web-hostname', 'localhost', '--dart-define=API_URL=http://localhost:7001/api/v1', '--dart-define=API_BASE_URL=http://localhost:7001/api/v1'];

console.log('🌐 Starting Flutter Web on http://localhost:7003 ...');

const child = spawn(execFile, execArgs, {
  cwd: mobileDir,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: false,
  env: childEnv,
});

// Auto-Watch lib/ folder for instant Hot Reload on Ctrl+S (File Save)
let reloadTimeout = null;

function triggerHotReload(filePath) {
  if (reloadTimeout) clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    try {
      const relPath = path.relative(mobileDir, filePath);
      console.log(`\n🔥 [Instant Reload] Detected change in: ${relPath}`);
      console.log('⚡ Reloading Flutter Web...');
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write('r\n');
      }
    } catch (e) {}
  }, 250); // 250ms debounce
}

function startFileWatcher() {
  if (!fs.existsSync(libDir)) return;

  try {
    fs.watch(libDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.dart') || filename.endsWith('.json') || filename.endsWith('.yaml'))) {
        triggerHotReload(path.join(libDir, filename));
      }
    });
    console.log('👀 Real-time file watcher active: saves in lib/ will auto-reload the app instantly!');
  } catch (err) {
    console.log('ℹ️  File watcher note:', err.message);
  }
}

startFileWatcher();

child.on('error', (err) => {
  console.log(`\n📱 [AdhocX Mobile] Error: ${err.message}`);
  setInterval(() => {}, 60000);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.log(`\n📱 [AdhocX Mobile] Exited (code ${code}).`);
    setInterval(() => {}, 60000);
  }
});
