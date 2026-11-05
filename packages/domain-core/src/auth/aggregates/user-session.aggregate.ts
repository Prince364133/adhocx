import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { PhoneNumber } from '../value-objects/phone-number.vo';
import { UserSessionCreatedEvent, UserSessionRevokedEvent } from '../events/auth.events';

export type AuthChannel = 'SMS' | 'EMAIL' | 'PASSWORD' | 'SSO';
export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface UserSessionProps {
  userId: string;
  role: string;
  authChannel: AuthChannel;
  sessionToken: string;
  refreshToken?: string;
  phone?: PhoneNumber;
  email?: string;
  status: SessionStatus;
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UserSession Aggregate Root.
 * Represents an active authenticated session for any AdhocX client (Admin, Corporate, Ops, Driver Mobile, Employee App).
 */
export class UserSession extends AggregateRoot<string> {
  private _props: UserSessionProps;

  get userId(): string {
    return this._props.userId;
  }

  get role(): string {
    return this._props.role;
  }

  get authChannel(): AuthChannel {
    return this._props.authChannel;
  }

  get sessionToken(): string {
    return this._props.sessionToken;
  }

  get refreshToken(): string | undefined {
    return this._props.refreshToken;
  }

  get phone(): PhoneNumber | undefined {
    return this._props.phone;
  }

  get email(): string | undefined {
    return this._props.email;
  }

  get status(): SessionStatus {
    return this._props.status;
  }

  get expiresAt(): Date {
    return this._props.expiresAt;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: UserSessionProps) {
    super(id);
    this._props = props;
  }

  public static create(
    id: string,
    props: Omit<UserSessionProps, 'status' | 'createdAt' | 'updatedAt'>,
  ): Result<UserSession> {
    if (!id) {
      return Result.fail<UserSession>('Session ID is required');
    }
    if (!props.userId) {
      return Result.fail<UserSession>('User ID is required');
    }
    if (!props.sessionToken) {
      return Result.fail<UserSession>('Session token is required');
    }
    if (props.expiresAt.getTime() <= Date.now()) {
      return Result.fail<UserSession>('Session expiration must be in the future');
    }

    const session = new UserSession(id, {
      ...props,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    session.addDomainEvent(
      new UserSessionCreatedEvent(
        id,
        props.userId,
        props.role,
        props.authChannel,
        props.ipAddress,
      ),
    );

    return Result.ok<UserSession>(session);
  }

  public isValid(): boolean {
    return this._props.status === 'ACTIVE' && this._props.expiresAt.getTime() > Date.now();
  }

  public refresh(newToken: string, newExpiresAt: Date): Result<void> {
    if (!this.isValid()) {
      return Result.fail<void>('Cannot refresh an inactive or expired session');
    }
    if (newExpiresAt.getTime() <= Date.now()) {
      return Result.fail<void>('New expiration date must be in the future');
    }

    this._props.sessionToken = newToken;
    this._props.expiresAt = newExpiresAt;
    this._props.updatedAt = new Date();

    return Result.ok<void>();
  }

  public revoke(reason = 'User logged out'): Result<void> {
    if (this._props.status === 'REVOKED') {
      return Result.ok<void>();
    }

    this._props.status = 'REVOKED';
    this._props.updatedAt = new Date();

    this.addDomainEvent(new UserSessionRevokedEvent(this.id, this._props.userId, reason));
    return Result.ok<void>();
  }
}

