import { AggregateRoot } from '../common/aggregate-root';
import { Result } from '../common/result';

export type CorporateRosterStatus = 'UPLOADED' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';

export interface CorporateRosterProps {
  tenantId: string;
  rosterMonth: string; // YYYY-MM
  status: CorporateRosterStatus;
  totalEmployeeCount: number;
  totalRequestsCreated: number;
  uploadedByUserId: string;
  createdAt: Date;
}

/**
 * CorporateRosterAggregate.
 * Encapsulates corporate monthly commuter rosters,
 * bulk validation rules, and the 9-hour advance cancellation cutoff window.
 */
export class CorporateRosterAggregate extends AggregateRoot<string> {
  private _props: CorporateRosterProps;

  // Strict 9-hour advance cutoff rule (9 * 3600 = 32,400 seconds)
  public static readonly CUTOFF_WINDOW_HOURS = 9;
  public static readonly CUTOFF_WINDOW_SECONDS = 9 * 3600;

  get tenantId(): string {
    return this._props.tenantId;
  }

  get rosterMonth(): string {
    return this._props.rosterMonth;
  }

  get status(): CorporateRosterStatus {
    return this._props.status;
  }

  get totalEmployeeCount(): number {
    return this._props.totalEmployeeCount;
  }

  get totalRequestsCreated(): number {
    return this._props.totalRequestsCreated;
  }

  get uploadedByUserId(): string {
    return this._props.uploadedByUserId;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: CorporateRosterProps) {
    super(id);
    this._props = props;
  }

  public static create(id: string, props: CorporateRosterProps): Result<CorporateRosterAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Roster ID cannot be empty');
    }
    if (!props.tenantId) {
      return Result.fail('Tenant ID is required');
    }
    if (!props.rosterMonth || !/^\d{4}-\d{2}$/.test(props.rosterMonth)) {
      return Result.fail('rosterMonth must match YYYY-MM format');
    }
    if (props.totalEmployeeCount < 0) {
      return Result.fail('totalEmployeeCount cannot be negative');
    }

    return Result.ok(new CorporateRosterAggregate(id, { ...props }));
  }

  public static reconstitute(id: string, props: CorporateRosterProps): CorporateRosterAggregate {
    return new CorporateRosterAggregate(id, props);
  }

  /**
   * Evaluates if a cancellation or reschedule request is strictly within the 9-hour locked cutoff window.
   * If within 9 hours, returns true (restricted / self-cancellation forbidden).
   */
  public static isWithin9HourCutoff(shiftDateTime: Date, actionTime: Date = new Date()): boolean {
    const shiftEpochSeconds = Math.floor(shiftDateTime.getTime() / 1000);
    const actionEpochSeconds = Math.floor(actionTime.getTime() / 1000);

    const secondsUntilShift = shiftEpochSeconds - actionEpochSeconds;
    return secondsUntilShift < CorporateRosterAggregate.CUTOFF_WINDOW_SECONDS;
  }

  /**
   * Helper that checks whether an action is permitted by cutoff rule using TimeWindow VO.
   */
  public canCancelOrReschedule(shiftDateTime: Date, actionTime: Date = new Date()): Result<void> {
    if (CorporateRosterAggregate.isWithin9HourCutoff(shiftDateTime, actionTime)) {
      return Result.fail(
        `Action rejected: Cancellation or reschedule requires at least ${CorporateRosterAggregate.CUTOFF_WINDOW_HOURS} hours advance notice.`,
      );
    }
    return Result.ok();
  }

  /**
   * Mark roster as validated.
   */
  public markValidated(validCount: number): Result<void> {
    if (this._props.status !== 'UPLOADED') {
      return Result.fail(`Cannot validate roster in status '${this._props.status}'. Must be UPLOADED.`);
    }

    this._props.status = 'VALIDATED';
    this._props.totalEmployeeCount = validCount;
    return Result.ok();
  }

  /**
   * Publish roster to materialize transport requests and routes.
   */
  public publish(requestsCreated: number): Result<void> {
    if (this._props.status !== 'VALIDATED') {
      return Result.fail(`Cannot publish roster in status '${this._props.status}'. Must be VALIDATED.`);
    }

    this._props.status = 'PUBLISHED';
    this._props.totalRequestsCreated = requestsCreated;
    return Result.ok();
  }
}
