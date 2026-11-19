import * as crypto from 'crypto';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a clean, human-readable 8-character referral code.
 * Example: "ADH8K92L"
 */
export function generateDriverReferralCode(): string {
  const prefix = 'ADH';
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = crypto.randomInt(0, ALPHABET.length);
    randomPart += ALPHABET[randomIndex];
  }
  return `${prefix}${randomPart}`;
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
