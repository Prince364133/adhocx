const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { fileURLToPath } = require('url');

console.log('⚡ Initializing AdhocX Mobile Driver & Vendor Application...');

function findFlutterExecutable() {
  const isWindows = process.platform === 'win32';
  const flutterName = isWindows ? 'flutter.bat' : 'flutter';
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');

  // 1. Check environment variables
  if (process.env.FLUTTER_ROOT && fs.existsSync(path.join(process.env.FLUTTER_ROOT, 'bin', flutterName))) {
    return path.join(process.env.FLUTTER_ROOT, 'bin', flutterName);
  }
  if (process.env.FLUTTER_HOME && fs.existsSync(path.join(process.env.FLUTTER_HOME, 'bin', flutterName))) {
    return path.join(process.env.FLUTTER_HOME, 'bin', flutterName);
  }

  // 2. Check PATH
  try {
    const checkCmd = isWindows ? `where.exe ${flutterName}` : `which ${flutterName}`;
    const res = require('child_process').execSync(checkCmd, { stdio: 'pipe' }).toString().trim();
    if (res) {
      const firstLine = res.split(/\r?\n/)[0].trim();
      if (firstLine && fs.existsSync(firstLine)) return firstLine;
    }
  } catch (e) {}

  // 3. Dynamic search across common locations on any machine
  const candidates = [
    path.join(userProfile, 'flutter', 'bin', flutterName),
    path.join(userProfile, 'flutter_sdk', 'bin', flutterName),
    path.join(userProfile, 'AppData', 'Local', 'flutter', 'bin', flutterName),
    path.join(userProfile, 'development', 'flutter', 'bin', flutterName),
    path.join(userProfile, 'Documents', 'flutter', 'bin', flutterName),
    path.join(localAppData, 'Programs', 'flutter', 'bin', flutterName),
    path.join('C:', 'flutter', 'bin', flutterName),
    path.join('C:', 'src', 'flutter', 'bin', flutterName),
    path.join('C:', 'tools', 'flutter', 'bin', flutterName),
    path.join('D:', 'flutter', 'bin', flutterName),
    path.join('D:', 'src', 'flutter', 'bin', flutterName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isPubGetCurrent(projectDir, currentPubCache) {
  try {
    const packageConfigPath = path.join(projectDir, '.dart_tool', 'package_config.json');
    const pluginsDepsPath = path.join(projectDir, '.flutter-plugins-dependencies');
    if (!fs.existsSync(packageConfigPath) || !fs.existsSync(pluginsDepsPath)) {
      return false;
    }

    const configMtimeMs = fs.statSync(packageConfigPath).mtimeMs;
    for (const manifestName of ['pubspec.yaml', 'pubspec.lock']) {
      const manifestPath = path.join(projectDir, manifestName);
      if (fs.existsSync(manifestPath) && fs.statSync(manifestPath).mtimeMs > configMtimeMs) {
        return false;
      }
    }

    const config = JSON.parse(fs.readFileSync(packageConfigPath, 'utf8'));
    if (!Array.isArray(config.packages) || config.packages.length === 0) {
      return false;
    }

    const normalizedCache = process.env.PUB_CACHE ? path.resolve(currentPubCache).toLowerCase() : null;
    for (const pkg of config.packages) {
      if (typeof pkg.rootUri === 'string' && pkg.rootUri.startsWith('file://')) {
        const resolvedDir = fileURLToPath(pkg.rootUri);
        if (!fs.existsSync(resolvedDir)) {
          return false;
        }
        if (normalizedCache && pkg.rootUri.includes('/hosted/') && !path.resolve(resolvedDir).toLowerCase().startsWith(normalizedCache)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

const flutterCmd = findFlutterExecutable();
const mobileDir = path.resolve(__dirname, '..');
const libDir = path.join(mobileDir, 'lib');
const webDir = path.join(mobileDir, 'web');
const buildWebDir = path.join(mobileDir, 'build', 'web');
const PORT = parseInt(process.env.PORT || '7003', 10);

const userProfile = process.env.USERPROFILE || process.env.HOME || '';
const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
const androidHome = process.env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
const javaHome = process.env.JAVA_HOME || '';
const pubCache = process.env.PUB_CACHE || path.join(localAppData, 'Pub', 'Cache');

const args = process.argv.slice(2);
const runOnAndroid = args.includes('--android');
const runInChrome = args.includes('--chrome') || args.includes('--hot');

if (flutterCmd && (runOnAndroid || runInChrome)) {
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
  const flutterRunArgs = [
    'run',
    ...(isPubGetCurrent(mobileDir, pubCache) ? ['--no-pub'] : []),
    '-d',
    'web-server',
    '--web-port',
    String(PORT),
    '--web-hostname',
    'localhost',
    '--dart-define=API_URL=http://localhost:7001/api/v1',
    '--dart-define=API_BASE_URL=http://localhost:7001/api/v1',
  ];
  const execArgs = isWindows ? ['/c', flutterCmd, ...flutterRunArgs] : flutterRunArgs;

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
  if (!flutterCmd) {
    console.warn(`========================================================================`);
    console.warn(`⚠️  NOTICE: FLUTTER SDK WAS NOT DETECTED ON THIS COMPUTER!`);
    console.warn(`Node.js is running the static fallback server on http://localhost:${PORT}`);
    console.warn(`========================================================================\n`);
  }

  // Standalone server on port 7003 (serves build/web or web/)
  startStandaloneServer();
  startWatcher((filePath) => {
    const relPath = path.relative(mobileDir, filePath);
    console.log(`🔥 [Auto-Watcher] Change detected in: ${relPath}`);
  });
}

function startStandaloneServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
  };

  const hasBuild = fs.existsSync(path.join(buildWebDir, 'index.html'));
  const staticRoot = hasBuild ? buildWebDir : webDir;

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('healthy\n');
      return;
    }

    let relativePath = decodeURIComponent(req.url.split('?')[0].replace(/^\/+/, ''));
    if (!relativePath || relativePath === '') relativePath = 'index.html';
    const filePath = path.normalize(path.join(staticRoot, relativePath));

    if (filePath.startsWith(staticRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback
    const indexPath = path.join(staticRoot, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
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
