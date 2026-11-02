import { ValueObject } from '../common/value-object';
import { Result } from '../common/result';

interface DwellBufferProps {
  bufferSeconds: number;
}

/**
 * DwellBuffer Value Object.
 * Enforces the mandatory pickup stop wait buffer.
 * Standard enterprise default: 300 seconds (5.0 minutes).
 */
export class DwellBuffer extends ValueObject<DwellBufferProps> {
  public static readonly DEFAULT_BUFFER_SECONDS = 300; // 5 minutes

  get bufferSeconds(): number {
    return this.props.bufferSeconds;
  }

  get bufferMinutes(): number {
    return this.props.bufferSeconds / 60;
  }

  private constructor(props: DwellBufferProps) {
    super(props);
  }

  public static standardFiveMinutes(): DwellBuffer {
    return new DwellBuffer({ bufferSeconds: DwellBuffer.DEFAULT_BUFFER_SECONDS });
  }

  public static create(seconds: number): Result<DwellBuffer> {
    if (!Number.isInteger(seconds) || seconds < 60 || seconds > 900) {
      return Result.fail<DwellBuffer>('Dwell buffer seconds must be an integer between 60s (1m) and 900s (15m)');
    }
    return Result.ok<DwellBuffer>(new DwellBuffer({ bufferSeconds: seconds }));
  }

  /**
   * Evaluates if the passenger has exceeded the allowable waiting window.
   */
  public hasElapsed(elapsedSeconds: number): boolean {
    return elapsedSeconds >= this.bufferSeconds;
  }

  /**
   * Returns remaining seconds before driver can mark No-Show.
   */
  public remainingSeconds(elapsedSeconds: number): number {
    return Math.max(0, this.bufferSeconds - elapsedSeconds);
  }
}

