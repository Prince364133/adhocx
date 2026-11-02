// Shared config and helpers for the local Corporate ETS load test.
// Every target is pinned to 127.0.0.1; assertLocalTargets() refuses anything else.
import { createHmac } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const API_DIR = join(HERE, '..');
export const OUT_DIR = join(HERE, '.out');

export const CFG = {
  dbUrl: 'postgresql://lt:lt@127.0.0.1:55432/adhocx_lt?schema=public&connection_limit=40',
  redisHost: '127.0.0.1',
  redisPort: 56379,
  jwtSecret: 'adhocx-loadtest-access-secret-not-for-prod',
  jwtRefreshSecret: 'adhocx-loadtest-refresh-secret-not-for-prod',
  basePort: 7101,
};

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

export function assertLocalTargets() {
  const dbHost = new URL(CFG.dbUrl).hostname;
  if (!LOCAL_HOSTS.has(dbHost)) throw new Error(`Refusing to run: database host ${dbHost} is not local`);
  if (!LOCAL_HOSTS.has(CFG.redisHost)) throw new Error(`Refusing to run: Redis host ${CFG.redisHost} is not local`);
}

export const apiUrl = (port) => `http://127.0.0.1:${port}/api/v1`;

/**
 * Environment for an API instance. Built from scratch (only OS basics inherited) so nothing from
 * apps/api/.env or the shell (remote DATABASE_URL, real Google/Razorpay/SMTP keys) can leak in.
 */
export function apiEnv(port, { scheduler }) {
  const keep = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ComSpec'];
  const env = {};
  for (const k of keep) if (process.env[k] !== undefined) env[k] = process.env[k];
  return {
    ...env,
    NODE_ENV: 'development',
    PORT: String(port),
    API_PREFIX: 'api/v1',
    DATABASE_URL: CFG.dbUrl,
    REDIS_URL: `redis://${CFG.redisHost}:${CFG.redisPort}`,
    REDIS_HOST: CFG.redisHost,
    REDIS_PORT: String(CFG.redisPort),
    REDIS_TLS: 'false',
    JWT_ACCESS_SECRET: CFG.jwtSecret,
    JWT_REFRESH_SECRET: CFG.jwtRefreshSecret,
    // Empty string (not unset) disables the hardcoded Google key fallback: no Maps calls, no billing.
    GOOGLE_MAPS_API_KEY: '',
    CORPORATE_SCHEDULER_ENABLED: scheduler ? 'true' : 'false',
    CORPORATE_SCHEDULER_POLL_MS: '2000',
    CORPORATE_SCHEDULER_RECOVERY_MS: '10000',
    CORPORATE_SCHEDULER_STUCK_AFTER_MS: '30000',
  };
}

/** HS256 JWT accepted by JwtAuthGuard (same secret the API instances are started with). */
export function signJwt(payload, ttlSeconds = 6 * 3600) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ ...payload, iat: now, exp: now + ttlSeconds })}`;
  return `${body}.${createHmac('sha256', CFG.jwtSecret).update(body).digest('base64url')}`;
}

export async function call(method, url, token, body) {
  const t0 = performance.now();
  const out = { status: 0, json: null, ms: 0, error: undefined };
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    out.status = res.status;
    const text = await res.text();
    try {
      out.json = text ? JSON.parse(text) : null;
    } catch {
      out.json = text;
    }
  } catch (err) {
    out.error = err.cause?.code ?? err.message;
  }
  out.ms = performance.now() - t0;
  return out;
}

/** The API wraps responses as { success, data }; return the payload either way. */
export const unwrap = (json) => (json && typeof json === 'object' && 'data' in json ? json.data : json);

export async function runPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

export function summarize(name, results, wallMs) {
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);
  const q = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : 0);
  const byStatus = {};
  for (const r of results) {
    const key = r.error ? `ERR:${r.error}` : String(r.status);
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }
  const ok = results.filter((r) => r.status >= 200 && r.status < 300).length;
  return {
    name,
    requests: results.length,
    ok,
    errorRate: results.length ? +(1 - ok / results.length).toFixed(4) : 0,
    rps: +(results.length / (wallMs / 1000)).toFixed(1),
    p50: +q(0.5).toFixed(1),
    p95: +q(0.95).toFixed(1),
    p99: +q(0.99).toFixed(1),
    max: +(lat.at(-1) ?? 0).toFixed(1),
    byStatus,
  };
}

export function writeOut(file, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2));
}

export const readOut = (file) => JSON.parse(readFileSync(join(OUT_DIR, file), 'utf8'));

export function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
