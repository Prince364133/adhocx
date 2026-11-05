import { UserSession } from '../aggregates/user-session.aggregate';

export interface ISessionStorePort {
  saveSession(session: UserSession): Promise<void>;
  findSessionById(sessionId: string): Promise<UserSession | null>;
  findSessionByToken(token: string): Promise<UserSession | null>;
  revokeSession(sessionId: string, reason?: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  blacklistToken(token: string, ttlSeconds: number): Promise<void>;
  isTokenBlacklisted(token: string): Promise<boolean>;
}

export interface IAuthRepositoryPort {
  findUserById(userId: string): Promise<any | null>;
  findUserByIdentifier(identifier: string): Promise<any | null>;
}

