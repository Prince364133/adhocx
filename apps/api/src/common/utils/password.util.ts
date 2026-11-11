import * as crypto from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(crypto.pbkdf2);

/** OWASP (2023) minimum for PBKDF2-HMAC-SHA512. Old hashes (no iteration suffix) used 10,000. */
export const PBKDF2_ITERATIONS = 210_000;
export const LEGACY_PBKDF2_ITERATIONS = 10_000;

/** Format: `salt:hash:iterations` (async so hashing/verifying never blocks the event loop). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, 64, 'sha512')).toString('hex');
  return `${salt}:${hash}:${PBKDF2_ITERATIONS}`;
}

/** Verifies current `salt:hash:iterations` and legacy `salt:hash` (10,000 iterations). */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key, iterRaw] = storedHash.split(':');
  const iterations = iterRaw ? Number(iterRaw) : LEGACY_PBKDF2_ITERATIONS;
  if (!salt || !key || !Number.isInteger(iterations) || iterations < 1) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = await pbkdf2Async(password, salt, iterations, 64, 'sha512');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** True when storedHash uses an older iteration count below PBKDF2_ITERATIONS. */
export function needsPasswordRehash(storedHash: string): boolean {
  const iterations = Number(storedHash.split(':')[2] ?? LEGACY_PBKDF2_ITERATIONS);
  return iterations < PBKDF2_ITERATIONS;
}
