import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FLEET_DIR = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function main() {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(`Chrome binary not found at ${CHROME_PATH}`);
  }

  const nextBin = path.resolve(FLEET_DIR, '../../node_modules/next/dist/bin/next');
  const nextProc = spawn(process.execPath, [nextBin, 'start', '-p', '7098'], {
    cwd: FLEET_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  const userDataDir = fs.mkdtempSync(path.join(FLEET_DIR, '.next-chrome-e2e-'));
  let chromeProc = null;

  try {
    // Wait for Next server on 7098
    let serverReady = false;
    for (let i = 0; i < 40; i++) {
      try {
        const res = await fetch('http://127.0.0.1:7098/login');
        if (res.ok) {
          serverReady = true;
          break;
        }
      } catch {}
      await wait(500);
    }
    if (!serverReady) throw new Error('apps/fleet Next production server failed to listen on 7098');

    const routes = [
      '/login',
      '/dashboard',
      '/drivers',
      '/live-operations',
      '/earnings',
      '/incentives',
      '/support',
      '/notifications',
    ];

    for (const r of routes) {
      const htmlRes = await fetch(`http://127.0.0.1:7098${r}`);
      if (!htmlRes.ok && htmlRes.status !== 307 && htmlRes.status !== 200) {
        throw new Error(`Route ${r} returned unexpected HTTP ${htmlRes.status}`);
      }
    }

    // Launch real headless Chrome with DevTools CDP on 9322
    chromeProc = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        '--disable-gpu',
        '--remote-debugging-port=9322',
        `--user-data-dir=${userDataDir}`,
        'http://127.0.0.1:7098/login',
      ],
      { stdio: 'ignore' },
    );

    let targets = [];
    for (let i = 0; i < 30; i++) {
      try {
        targets = await fetchJson('http://127.0.0.1:9322/json/list');
        if (targets.some((t) => t.type === 'page' && t.webSocketDebuggerUrl)) break;
      } catch {}
      await wait(300);
    }

    const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!pageTarget) throw new Error('Chrome DevTools page target unavailable');

    // Verify rendered DOM and zero uncaught page errors over CDP WebSocket
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    let msgId = 1;
    const pending = new Map();
    const pageErrors = [];

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params?.exceptionDetails?.text || 'Runtime error');
      }
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });

    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });

    const cdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, (resp) => {
          if (resp.error) reject(new Error(resp.error.message));
          else resolve(resp.result);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await cdp('Page.enable');
    await cdp('Runtime.enable');

    for (const vp of [
      { width: 1440, height: 900, mobile: false, theme: 'light' },
      { width: 768, height: 1024, mobile: false, theme: 'light' },
      { width: 375, height: 812, mobile: true, theme: 'dark' },
    ]) {
      await cdp('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await cdp('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-color-scheme', value: vp.theme }],
      });
      await cdp('Page.navigate', { url: 'http://127.0.0.1:7098/login' });
      await wait(1200);
      const evalRes = await cdp('Runtime.evaluate', {
        expression: 'JSON.stringify({ title: document.title, text: document.body.innerText.slice(0, 200), scrollOverflow: document.documentElement.scrollWidth > window.innerWidth })',
        returnByValue: true,
      });
      const parsed = JSON.parse(evalRes.result.value);
      if (!parsed.text.includes('AdhocX Fleet')) {
        throw new Error(`Expected AdhocX Fleet login content at ${vp.width}x${vp.height}, got: ${parsed.text}`);
      }
      if (parsed.scrollOverflow) {
        throw new Error(`Horizontal overflow detected at ${vp.width}x${vp.height}`);
      }
      console.log(`PASS headless Chrome E2E ${vp.width}x${vp.height} (${vp.theme}): rendered cleanly without horizontal overflow`);
    }

    if (pageErrors.length > 0) {
      throw new Error(`Uncaught browser runtime exceptions: ${pageErrors.join('; ')}`);
    }

    ws.close();
  } finally {
    try { chromeProc?.kill(); } catch {}
    try { nextProc.kill(); } catch {}
    await wait(300);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
