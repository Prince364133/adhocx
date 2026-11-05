import { ValueObject } from '../../common/value-object';
import { Result } from '../../common/result';

export interface PhoneNumberProps {
  countryCode: string; // e.g. "+91"
  nationalNumber: string; // e.g. "9876543210"
  e164: string; // e.g. "+919876543210"
  msg91Format: string; // e.g. "919876543210"
}

/**
 * PhoneNumber Value Object.
 * Encapsulates country code, national phone number, and standard E.164 formatting.
 */
export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  get countryCode(): string {
    return this.props.countryCode;
  }

  get nationalNumber(): string {
    return this.props.nationalNumber;
  }

  get e164(): string {
    return this.props.e164;
  }

  get msg91Format(): string {
    return this.props.msg91Format;
  }

  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  /**
   * Factory method to create and validate a PhoneNumber value object.
   * @param rawPhone The raw phone number input (e.g. "9876543210", "+91 98765-43210")
   * @param countryCode Optional country code (e.g. "+91", "91", "+1"). Defaults to "+91" for 10-digit Indian numbers.
   */
  public static create(rawPhone: string, countryCode?: string): Result<PhoneNumber> {
    if (!rawPhone || typeof rawPhone !== 'string') {
      return Result.fail<PhoneNumber>('Phone number must be a non-empty string');
    }

    const trimmed = rawPhone.trim();
    const digitsOnly = trimmed.replace(/\D/g, '');

    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return Result.fail<PhoneNumber>(
        `Invalid phone number length (${digitsOnly.length} digits). Standard phone numbers have between 7 and 15 digits.`,
      );
    }

    // Determine normalized country code
    let normCountryCode = '+91';
    let nationalNumber = digitsOnly;

    if (countryCode) {
      const codeCleaned = countryCode.trim().replace(/[^\d+]/g, '');
      normCountryCode = codeCleaned.startsWith('+') ? codeCleaned : `+${codeCleaned}`;
      // If rawPhone already started with this country code digits, strip it from national number
      const codeDigits = normCountryCode.replace('+', '');
      if (digitsOnly.startsWith(codeDigits) && digitsOnly.length > codeDigits.length) {
        nationalNumber = digitsOnly.substring(codeDigits.length);
      } else {
        nationalNumber = digitsOnly;
      }
    } else if (trimmed.startsWith('+')) {
      // Extract country code from leading plus in raw phone
      if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        normCountryCode = '+91';
        nationalNumber = digitsOnly.substring(2);
      } else if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
        normCountryCode = '+1';
        nationalNumber = digitsOnly.substring(1);
      } else if (digitsOnly.startsWith('44') && digitsOnly.length >= 11) {
        normCountryCode = '+44';
        nationalNumber = digitsOnly.substring(2);
      } else {
        // Fallback: use first 2-3 digits or treat as standard
        normCountryCode = `+${digitsOnly.substring(0, digitsOnly.length - 10 || 2)}`;
        nationalNumber = digitsOnly.substring(normCountryCode.length - 1);
      }
    } else if (digitsOnly.length === 10) {
      // Default standard 10-digit Indian mobile
      normCountryCode = '+91';
      nationalNumber = digitsOnly;
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      normCountryCode = '+91';
      nationalNumber = digitsOnly.substring(2);
    }

    const codeDigitsOnly = normCountryCode.replace('+', '');
    const e164 = `${normCountryCode}${nationalNumber}`;
    const msg91Format = `${codeDigitsOnly}${nationalNumber}`;

    return Result.ok<PhoneNumber>(
      new PhoneNumber({
        countryCode: normCountryCode,
        nationalNumber,
        e164,
        msg91Format,
      }),
    );
  }

  public override toString(): string {
    return this.e164;
  }
}
