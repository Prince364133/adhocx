import { ValueObject } from '../common/value-object';
import { Result } from '../common/result';

interface TimeWindowProps {
  startTime: Date;
  endTime: Date;
}

/**
 * TimeWindow Value Object.
 * Represents an operational time span (e.g. pickup arrival window, shift window).
 */
export class TimeWindow extends ValueObject<TimeWindowProps> {
  get startTime(): Date {
    return new Date(this.props.startTime.getTime());
  }

  get endTime(): Date {
    return new Date(this.props.endTime.getTime());
  }

  get durationMinutes(): number {
    return Math.round((this.props.endTime.getTime() - this.props.startTime.getTime()) / (1000 * 60));
  }

  private constructor(props: TimeWindowProps) {
    super(props);
  }

  public static create(startTime: Date, endTime: Date): Result<TimeWindow> {
    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      return Result.fail<TimeWindow>('Invalid start time Date');
    }
    if (!(endTime instanceof Date) || isNaN(endTime.getTime())) {
      return Result.fail<TimeWindow>('Invalid end time Date');
    }
    if (startTime.getTime() >= endTime.getTime()) {
      return Result.fail<TimeWindow>('Start time must be strictly before end time');
    }

    return Result.ok<TimeWindow>(new TimeWindow({ startTime, endTime }));
  }

  public contains(date: Date): boolean {
    const t = date.getTime();
    return t >= this.props.startTime.getTime() && t <= this.props.endTime.getTime();
  }

  public overlaps(other: TimeWindow): boolean {
    return (
      this.props.startTime.getTime() < other.props.endTime.getTime() &&
      this.props.endTime.getTime() > other.props.startTime.getTime()
    );
  }

  /**
   * Checks if current time is before the cancellation cutoff (e.g., 9 hours before start time).
   */
  public isBeforeCutoff(now: Date, cutoffHours: number = 9): boolean {
    const cutoffTime = this.props.startTime.getTime() - cutoffHours * 60 * 60 * 1000;
    return now.getTime() <= cutoffTime;
  }
}

