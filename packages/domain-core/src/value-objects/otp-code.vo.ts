import { ValueObject } from '../common/value-object';
import { Result } from '../common/result';

interface OtpCodeProps {
  code: string;
  length: number;
}

/**
 * OtpCode Value Object.
 * Represents a secure numeric one-time password used for employee boarding authentication.
 * Default length: 4 digits.
 */
export class OtpCode extends ValueObject<OtpCodeProps> {
  get code(): string {
    return this.props.code;
  }

  get length(): number {
    return this.props.length;
  }

  private constructor(props: OtpCodeProps) {
    super(props);
  }

  public static create(code: string): Result<OtpCode> {
    if (!code || typeof code !== 'string') {
      return Result.fail<OtpCode>('OTP code must be a non-empty string');
    }
    const trimmed = code.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      return Result.fail<OtpCode>('OTP code must consist of exactly 4 to 6 numeric digits');
    }
    return Result.ok<OtpCode>(new OtpCode({ code: trimmed, length: trimmed.length }));
  }

  /**
   * Generates a cryptographically randomized numeric OTP.
   */
  public static generate(length: 4 | 6 = 4): OtpCode {
    const min = length === 4 ? 1000 : 100000;
    const max = length === 4 ? 9999 : 999999;
    const randomNum = Math.floor(min + Math.random() * (max - min + 1));
    return new OtpCode({ code: randomNum.toString(), length });
  }

  /**
   * Validates user input against this OTP challenge.
   */
  public validate(inputCode: string): boolean {
    if (!inputCode) return false;
    return this.code === inputCode.trim();
  }
}

