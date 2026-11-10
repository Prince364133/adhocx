import { readFileSync } from 'fs';
import type { ConnectionOptions } from 'tls';

/**
 * TLS options for Redis connections.
 *
 * The server certificate is verified by default. Managed Redis (ElastiCache, Upstash, Redis Cloud,
 * Memorystore) presents certificates from public CAs, so nothing needs configuring there.
 *  - REDIS_TLS_CA: a PEM file path or inline PEM, for a private CA or self-signed server.
 *  - REDIS_TLS_SERVERNAME: SNI / hostname to verify against (when connecting by IP).
 *  - REDIS_TLS_REJECT_UNAUTHORIZED=false: turns verification off (a warning is logged at startup).
 */
export function redisTlsOptions(enabled: boolean, env: NodeJS.ProcessEnv = process.env, warn?: (msg: string) => void): ConnectionOptions | undefined {
  if (!enabled) return undefined;
  const opts: ConnectionOptions = { rejectUnauthorized: env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false' };
  const ca = env.REDIS_TLS_CA?.trim();
  if (ca) opts.ca = ca.includes('-----BEGIN') ? ca.replace(/\\n/g, '\n') : readFileSync(ca, 'utf8');
  if (env.REDIS_TLS_SERVERNAME) opts.servername = env.REDIS_TLS_SERVERNAME;
  if (!opts.rejectUnauthorized) {
    warn?.('Redis TLS certificate verification is DISABLED (REDIS_TLS_REJECT_UNAUTHORIZED=false): the connection can be intercepted');
  }
  return opts;
}
