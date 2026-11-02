import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { Money } from '../../value-objects/money.vo';
import {
  DriverOfferSentEvent,
  DriverOfferAcceptedEvent,
  DriverOfferRejectedEvent,
  DriverOfferExpiredEvent,
} from '../events/dispatch.events';

export enum DriverOfferStatus {
  CREATED = 'CREATED',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface DriverOfferProps {
  driverId: string;
  routeId: string;
  payout: Money;
  status: DriverOfferStatus;
  sentAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  rejectionReason?: string;
  withdrawalReason?: string;
}

/**
 * DriverOfferAggregate.
 * Encapsulates the time-limited atomic route offer sent to an eligible driver.
 * Default lifespan: 60 seconds.
 */
export class DriverOfferAggregate extends AggregateRoot<string> {
  public static readonly DEFAULT_EXPIRY_SECONDS = 60;

  private _props: DriverOfferProps;

  get driverId(): string {
    return this._props.driverId;
  }

  get routeId(): string {
    return this._props.routeId;
  }

  get payout(): Money {
    return this._props.payout;
  }

  get status(): DriverOfferStatus {
    return this._props.status;
  }

  get sentAt(): Date {
    return this._props.sentAt;
  }

  get expiresAt(): Date {
    return this._props.expiresAt;
  }

  get acceptedAt(): Date | undefined {
    return this._props.acceptedAt;
  }

  private constructor(id: string, props: DriverOfferProps) {
    super(id);
    this._props = props;
  }

  public static create(
    id: string,
    driverId: string,
    routeId: string,
    payout: Money,
    sentAt: Date = new Date(),
    lifespanSeconds: number = DriverOfferAggregate.DEFAULT_EXPIRY_SECONDS,
  ): Result<DriverOfferAggregate> {
    if (!id) {
      return Result.fail<DriverOfferAggregate>('Offer id cannot be empty');
    }
    if (!driverId) {
      return Result.fail<DriverOfferAggregate>('Driver id cannot be empty');
    }
    if (!routeId) {
      return Result.fail<DriverOfferAggregate>('Route id cannot be empty');
    }

    const expiresAt = new Date(sentAt.getTime() + lifespanSeconds * 1000);
    const offer = new DriverOfferAggregate(id, {
      driverId,
      routeId,
      payout,
      status: DriverOfferStatus.SENT,
      sentAt,
      expiresAt,
    });

    offer.addDomainEvent(new DriverOfferSentEvent(id, driverId, routeId, payout, expiresAt, sentAt));
    return Result.ok<DriverOfferAggregate>(offer);
  }

  /**
   * Driver accepts the offer.
   * INVARIANT: Cannot accept if status != SENT or if current time > expiresAt!
   */
  public accept(now: Date = new Date()): Result<void> {
    if (this._props.status !== DriverOfferStatus.SENT) {
      return Result.fail<void>(`Cannot accept offer in status ${this._props.status}`);
    }

    if (now.getTime() > this._props.expiresAt.getTime()) {
      this._props.status = DriverOfferStatus.EXPIRED;
      this.addDomainEvent(new DriverOfferExpiredEvent(this.id, this._props.driverId, this._props.routeId, now));
      return Result.fail<void>('Offer has expired');
    }

    this._props.status = DriverOfferStatus.ACCEPTED;
    this._props.acceptedAt = now;

    this.addDomainEvent(new DriverOfferAcceptedEvent(this.id, this._props.driverId, this._props.routeId, now));
    return Result.ok<void>();
  }

  /**
   * Driver rejects the offer.
   */
  public reject(reason?: string, now: Date = new Date()): Result<void> {
    if (this._props.status !== DriverOfferStatus.SENT) {
      return Result.fail<void>(`Cannot reject offer in status ${this._props.status}`);
    }

    this._props.status = DriverOfferStatus.REJECTED;
    this._props.rejectionReason = reason;

    this.addDomainEvent(new DriverOfferRejectedEvent(this.id, this._props.driverId, this._props.routeId, reason, now));
    return Result.ok<void>();
  }

  /**
   * System marks offer as expired.
   */
  public markExpired(now: Date = new Date()): Result<void> {
    if (this._props.status !== DriverOfferStatus.SENT) {
      return Result.fail<void>(`Cannot expire offer in status ${this._props.status}`);
    }

    this._props.status = DriverOfferStatus.EXPIRED;
    this.addDomainEvent(new DriverOfferExpiredEvent(this.id, this._props.driverId, this._props.routeId, now));
    return Result.ok<void>();
  }

  /**
   * System withdraws offer (e.g. another driver was faster, or route re-planned).
   */
  public withdraw(reason: string): Result<void> {
    if (this._props.status !== DriverOfferStatus.SENT) {
      return Result.fail<void>(`Cannot withdraw offer in status ${this._props.status}`);
    }

    this._props.status = DriverOfferStatus.WITHDRAWN;
    this._props.withdrawalReason = reason;
    return Result.ok<void>();
  }

  public isExpired(now: Date = new Date()): boolean {
    return now.getTime() > this._props.expiresAt.getTime();
  }
}

