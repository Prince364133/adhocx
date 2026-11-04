const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = parseInt(process.env.PORT || '7005', 10);
const APP_DIR = path.resolve(__dirname, '..');
const MOCK_DATA_PATH = path.join(APP_DIR, 'assets', 'data', 'mock_data.json');
const LIB_DIR = path.join(APP_DIR, 'lib');

console.log('⚡ Initializing AdhocX Employee Mobile App...');

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

  try {
    const checkCmd = isWindows ? `where.exe ${flutterName}` : `which ${flutterName}`;
    const res = require('child_process').execSync(checkCmd, { stdio: 'pipe' }).toString().trim();
    if (res) return res.split(/\r?\n/)[0];
  } catch (e) {}

  return null;
}

const flutterCmd = findFlutterExecutable();
const args = process.argv.slice(2);
const runOnAndroid = args.includes('--android');

if (flutterCmd) {
  const flutterBinDir = path.dirname(flutterCmd);
  const dartSdkBinDir = path.join(flutterBinDir, 'cache', 'dart-sdk', 'bin');
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  const extraPaths = [flutterBinDir, dartSdkBinDir].filter(Boolean).join(pathSeparator);
  const childPath = extraPaths ? `${extraPaths}${pathSeparator}${process.env.PATH || ''}` : (process.env.PATH || '');

  const userProfile = process.env.USERPROFILE || 'C:\\Users\\vaishali';
  const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
  const androidHome = process.env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
  const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Android\\Android Studio\\jbr';

  const childEnv = {
    ...process.env,
    USERPROFILE: userProfile,
    LOCALAPPDATA: localAppData,
    ANDROID_HOME: androidHome,
    JAVA_HOME: javaHome,
    PATH: childPath,
  };

  const isWindows = process.platform === 'win32';
  const execFile = isWindows ? 'cmd.exe' : flutterCmd;
  const execArgs = runOnAndroid
    ? (isWindows ? ['/c', flutterCmd, 'run', '--dart-define=API_URL=http://10.0.2.2:7001/api/v1'] : ['run', '--dart-define=API_URL=http://10.0.2.2:7001/api/v1'])
    : (isWindows ? ['/c', flutterCmd, 'run', '-d', 'web-server', '--web-port', String(PORT), '--web-hostname', 'localhost'] : ['run', '-d', 'web-server', '--web-port', String(PORT), '--web-hostname', 'localhost']);

  console.log(runOnAndroid ? '📱 Running on Android...' : `🌐 Starting Flutter Web on http://localhost:${PORT}...`);
  spawn(execFile, execArgs, {
    cwd: APP_DIR,
    stdio: 'inherit',
    shell: false,
    env: childEnv,
  });
} else {
  startAppServer();
}

function getMockData() {
  try {
    if (fs.existsSync(MOCK_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_DATA_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading mock_data.json:', e);
  }
  return {};
}

function startAppServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('healthy\n');
      return;
    }

    if (url.pathname === '/api/mock-data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getMockData()));
      return;
    }

    const html = generateAppHtml(getMockData());
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`======================================================`);
    console.log(`🚀 ADHOCX EMPLOYEE MOBILE APP RUNNING ON PORT ${PORT}`);
    console.log(`🌐 Local URL:     http://localhost:${PORT}`);
    console.log(`📱 Native Android: com.adhocx.employee (107 Screens)`);
    console.log(`⚡ Mock Data:     Loaded from assets/data/mock_data.json`);
    console.log(`======================================================`);
  });

  startWatcher();
}

function startWatcher() {
  if (!fs.existsSync(LIB_DIR)) return;
  try {
    fs.watch(LIB_DIR, { recursive: true }, (eventType, filename) => {
      if (filename) {
        console.log(`🔥 [Auto-Watcher] Change detected in: lib/${filename}`);
      }
    });
    console.log('👀 Real-time file watcher active: saves in lib/ monitored!');
  } catch (err) {}
}

function generateAppHtml(mockData) {
  const emp = mockData.employee || {};
  const trips = mockData.trips || {};
  const up = trips.upcoming_pickup || {};
  const drv = up.driver || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdhocX Employee — Port ${PORT}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1167EE;
      --secondary: #FF5F09;
      --navy: #010D2D;
      --surface: #F8FAFC;
      --card: #FFFFFF;
      --text: #0F172A;
      --muted: #64748B;
      --border: #E2E8F0;
      --success: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #080D1A;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .phone-frame {
      width: 390px;
      height: 780px;
      max-height: 90vh;
      background: var(--surface);
      border-radius: 44px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 0 10px #1E293B;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: var(--text);
      position: relative;
    }
    .status-bar {
      height: 44px;
      padding: 12px 24px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
    }
    .app-bar {
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: #FFFFFF;
    }
    .brand-logo {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }
    .brand-logo span { color: var(--secondary); }
    .content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }
    .card {
      background: var(--card);
      border-radius: 16px;
      padding: 16px;
      border: 1px solid var(--border);
      margin-bottom: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .btn {
      width: 100%;
      background: var(--primary);
      color: #FFFFFF;
      border: none;
      padding: 14px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      text-align: center;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #DBEAFE;
      color: #1E40AF;
    }
    .bottom-nav {
      height: 60px;
      background: #FFFFFF;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-around;
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
    }
    .nav-active { color: var(--primary); }
  </style>
</head>
<body>
  <div style="margin-bottom:16px;text-align:center;">
    <div style="font-size:18px;font-weight:900;">Adhoc<span style="color:#FF5F09;">X</span> Employee Commuter App</div>
    <div style="font-size:12px;color:#94A3B8;margin-top:4px;">Port ${PORT} • Package: <code>com.adhocx.employee</code> • 107 Native Screens</div>
  </div>

  <div class="phone-frame">
    <div class="status-bar">
      <span>9:41</span>
      <span style="font-size:11px;">100% 🔋</span>
    </div>
    <div class="app-bar">
      <div class="brand-logo">Adhoc<span>X</span></div>
      <span class="badge">EMP10294</span>
    </div>

    <div class="content">
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;color:var(--muted);">Good Morning,</div>
        <h2 style="font-size:20px;font-weight:800;">${emp.name || 'Ravi Kumar'}</h2>
        <div style="font-size:12px;color:var(--muted);">${emp.organization || 'Estemporaneo Tech Pvt. Ltd.'}</div>
      </div>

      <div class="card" style="border-left:4px solid var(--primary);">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span class="badge">Upcoming Pickup</span>
          <span style="font-size:12px;font-weight:700;color:var(--primary);">ETA: ~6 MIN</span>
        </div>
        <div style="font-weight:800;font-size:16px;margin-bottom:4px;">${up.type || 'Office Pickup (Login)'}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Scheduled: ${up.time || '8:15 AM'} • Home → HITEC City</div>

        <div style="background:#F1F5F9;padding:12px;border-radius:12px;margin-bottom:14px;">
          <div style="font-weight:700;font-size:14px;">${drv.name || 'Suresh R'} ★ ${drv.rating || '4.8'}</div>
          <div style="font-size:12px;color:var(--muted);">${drv.vehicleModel || 'Maruti Ertiga'} • ${drv.vehicleNumber || 'TS09UB7845'}</div>
        </div>

        <button class="btn" onclick="alert('Viewing live route & assigned cab...')">View Live Route</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="card" style="margin:0;text-align:center;">
          <div style="font-size:22px;margin-bottom:4px;">📅</div>
          <div style="font-weight:700;font-size:13px;">Schedule</div>
          <div style="font-size:11px;color:var(--muted);">5 shifts this week</div>
        </div>
        <div class="card" style="margin:0;text-align:center;">
          <div style="font-size:22px;margin-bottom:4px;">🛡️</div>
          <div style="font-weight:700;font-size:13px;">Safety SOS</div>
          <div style="font-size:11px;color:var(--muted);">24/7 Desk</div>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <span class="nav-active">Home</span>
      <span>Schedule</span>
      <span>Safety</span>
      <span>Profile</span>
    </div>
  </div>
</body>
</html>`;
}
