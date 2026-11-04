const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('⚡ Initializing AdhocX Mobile Driver & Vendor Application...');

function findFlutterExecutable() {
  const isWindows = process.platform === 'win32';
  const flutterName = isWindows ? 'flutter.bat' : 'flutter';

  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const candidates = [
    path.join(userProfile, 'flutter_sdk', 'bin', flutterName),
    path.join(userProfile, 'flutter', 'bin', flutterName),
    path.join('C:', 'Users', 'vaishali', 'flutter_sdk', 'bin', flutterName),
    path.join('C:', 'Users', 'saavi', 'flutter_sdk', 'bin', flutterName),
    path.join('C:', 'flutter', 'bin', flutterName),
    path.join('C:', 'src', 'flutter', 'bin', flutterName),
    path.join('C:', 'tools', 'flutter', 'bin', flutterName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Check PATH
  try {
    const checkCmd = isWindows ? `where.exe ${flutterName}` : `which ${flutterName}`;
    const res = require('child_process').execSync(checkCmd, { stdio: 'pipe' }).toString().trim();
    if (res) return res.split(/\r?\n/)[0];
  } catch (e) {}

  return null;
}

const flutterCmd = findFlutterExecutable();
const mobileDir = path.resolve(__dirname, '..');
const libDir = path.join(mobileDir, 'lib');
const webDir = path.join(mobileDir, 'web');
const PORT = parseInt(process.env.PORT || '7003', 10);

const userProfile = process.env.USERPROFILE || 'C:\\Users\\vaishali';
const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
const androidHome = process.env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';
const pubCache = process.env.PUB_CACHE || path.join(localAppData, 'Pub', 'Cache');

if (flutterCmd) {
  const flutterBinDir = path.dirname(flutterCmd);
  const dartSdkBinDir = path.join(flutterBinDir, 'cache', 'dart-sdk', 'bin');
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
  const execArgs = isWindows
    ? ['/c', flutterCmd, 'run', '-d', 'web-server', '--web-port', String(PORT), '--web-hostname', 'localhost', '--dart-define=API_URL=http://localhost:7001/api/v1', '--dart-define=API_BASE_URL=http://localhost:7001/api/v1']
    : ['run', '-d', 'web-server', '--web-port', String(PORT), '--web-hostname', 'localhost', '--dart-define=API_URL=http://localhost:7001/api/v1', '--dart-define=API_BASE_URL=http://localhost:7001/api/v1'];

  console.log(`🌐 Starting Flutter Web on http://localhost:${PORT} ...`);

  const child = spawn(execFile, execArgs, {
    cwd: mobileDir,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: false,
    env: childEnv,
  });

  startWatcher((filePath) => {
    try {
      const relPath = path.relative(mobileDir, filePath);
      console.log(`\n🔥 [Instant Reload] Detected change in: ${relPath}`);
      console.log('⚡ Reloading Flutter...');
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write('r\n');
      }
    } catch (e) {}
  });

  child.on('error', (err) => console.log('Driver App Process Notice:', err.message));
} else {
  // Standalone server on port 7003
  startStandaloneServer();
  startWatcher((filePath) => {
    const relPath = path.relative(mobileDir, filePath);
    console.log(`🔥 [Auto-Watcher] Change detected in: ${relPath}`);
  });
}

function startStandaloneServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(webDir, req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(webDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'text/html';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading ' + req.url);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`======================================================`);
    console.log(`🚕 ADHOCX DRIVER & VENDOR CLIENT RUNNING ON PORT ${PORT}`);
    console.log(`🌐 Local URL:     http://localhost:${PORT}`);
    console.log(`📱 Native Android: com.adhocx.app`);
    console.log(`======================================================`);
  });
}

function startWatcher(onReload) {
  if (!fs.existsSync(libDir)) return;
  let reloadTimeout = null;

  try {
    fs.watch(libDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.dart') || filename.endsWith('.json') || filename.endsWith('.yaml'))) {
        if (reloadTimeout) clearTimeout(reloadTimeout);
        reloadTimeout = setTimeout(() => {
          onReload(path.join(libDir, filename));
        }, 250);
      }
    });
    console.log('👀 Real-time file watcher active: saves in lib/ monitored!');
  } catch (err) {
    console.log('ℹ️  File watcher note:', err.message);
  }
}
