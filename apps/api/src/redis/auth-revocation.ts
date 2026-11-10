import { createHash } from 'crypto';

/** Pub/Sub channel carrying session revocations, so open live streams can be closed on every pod. */
export const AUTH_REVOCATIONS_CHANNEL = 'auth:revocations';

export interface AuthRevocationEvent {
  /** All sessions of this user (suspension, password change). */
  userId?: string;
  /** One session: sha256 of the access token (logout). */
  tokenHash?: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
