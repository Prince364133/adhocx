/**
 * Utility functions for checking and sanitizing names across the backend
 * to prevent generic placeholder strings ('Driver', 'User', 'Vendor', etc.)
 * from being persisted or returned as legal names.
 */

export function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    n.length === 0 ||
    n === 'driver' ||
    n === 'driver partner' ||
    n === 'driver applicant' ||
    n === 'assigned driver' ||
    n === 'your driver' ||
    n === 'user' ||
    n === 'vendor' ||
    n === 'vendor partner' ||
    n === 'google user' ||
    n === 'google partner' ||
    n === 'apple user' ||
    n === 'requester' ||
    n === 'requester passenger' ||
    n === 'partner' ||
    n === 'partner name' ||
    n === 'corporate partner' ||
    n === 'corporate booker' ||
    n === 'business booker' ||
    n === 'corporate client' ||
    n === 'passenger' ||
    n === 'adhocx partner' ||
    n === 'adhocx user' ||
    n === 'test driver'
  );
}

export function sanitizeRealName(name?: string | null): string | undefined {
  if (isPlaceholderName(name)) return undefined;
  return name!.trim();
}
