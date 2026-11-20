import * as crypto from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a clean, human-readable 6-character alphanumeric referral code.
 * Uses base-32 characters (excluding 0, 1, I, O to eliminate visual ambiguity).
 * Guaranteed 6 characters, contains letters and digits, never all digits.
 * Example: "ADH8K9", "AX7K2M", "K8P2N9"
 */
export function generateDriverReferralCode(): string {
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = crypto.randomInt(0, ALPHABET.length);
      code += ALPHABET[randomIndex];
    }
    // Must contain at least one letter and not be all digits
    if (/[A-Z]/.test(code) && !/^\d{6}$/.test(code)) {
      return code;
    }
  }
}

/**
 * Clean & normalize a referral code or phone identifier.
 */
export function normalizeReferralIdentifier(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  // If it's a 10-digit or 12-digit Indian phone (e.g. 9876543210 or 919876543210)
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }

  // Otherwise assume it's a referral code (uppercase alphanumeric)
  return trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Mask a phone number for driver privacy: e.g. +91 98765 •••21
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'Hidden';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `+91 ${last10.slice(0, 5)} •••${last10.slice(8)}`;
  }
  return phone;
}
