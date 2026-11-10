import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RedisService } from './redis.service';
import { hashToken } from './auth-revocation';

export { AUTH_REVOCATIONS_CHANNEL, hashToken } from './auth-revocation';
export type { AuthRevocationEvent } from './auth-revocation';

export const STREAM_TICKET_TTL_SEC = 30;

export interface StreamTicketClaims {
  /** Verified JWT payload of the caller that asked for the ticket. */
  [claim: string]: unknown;
  /** sha256 of the access token that obtained the ticket (matches logout revocations). */
  tokenHash: string;
}

/**
 * Single-use, short-lived tickets for browser EventSource connections, which cannot send an
 * Authorization header. The client exchanges its access token for a ticket over an authenticated
 * POST and opens the stream with `?ticket=`; the access token itself never appears in a URL (and
 * so never in proxy or access logs). A ticket is valid for 30 s and for exactly one connection.
 */
@Injectable()
export class StreamTicketService {
  constructor(private readonly redis: RedisService) {}

  async issue(claims: Record<string, unknown>, accessToken: string): Promise<{ ticket: string; expiresAt: string }> {
    const ticket = randomBytes(32).toString('base64url');
    const stored: StreamTicketClaims = { ...claims, tokenHash: hashToken(accessToken) };
    await this.redis.set(this.key(ticket), JSON.stringify(stored), STREAM_TICKET_TTL_SEC);
    return { ticket, expiresAt: new Date(Date.now() + STREAM_TICKET_TTL_SEC * 1000).toISOString() };
  }

  /** Returns the claims and deletes the ticket (atomically on Redis >= 6.2); null if unknown/used/expired. */
  async consume(ticket: string): Promise<StreamTicketClaims | null> {
    if (!ticket || ticket.length > 128) return null;
    const key = this.key(ticket);
    let raw: string | null;
    const client: any = this.redis.getClient();
    if (client && typeof client.getdel === 'function') {
      raw = await client.getdel(key);
    } else {
      raw = await this.redis.get(key);
      if (raw !== null) await this.redis.del(key);
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && typeof parsed.tokenHash === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private key(ticket: string): string {
    // Only the hash is stored, so a Redis dump does not hand out usable tickets.
    return `sse:ticket:${hashToken(ticket)}`;
  }
}
