/**
 * Normalizes a phone string (strips whitespace) and returns lookup variants
 * matching the Fleet Portal auth login lookup strategy.
 */
export function normalizeFleetPhone(rawPhone: string): string {
  return rawPhone.trim().replace(/\s+/g, '');
}

export function buildFleetPhoneVariants(rawPhone: string): string[] {
  const cleanPhone = normalizeFleetPhone(rawPhone);
  const digits = cleanPhone.replace(/\D/g, '');
  return Array.from(
    new Set([
      cleanPhone,
      ...(digits.length >= 10
        ? [digits.slice(-10), `+91${digits.slice(-10)}`]
        : []),
    ]),
  );
}
