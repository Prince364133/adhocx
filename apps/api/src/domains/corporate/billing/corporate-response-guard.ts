/**
 * Corporate-facing billing responses must never expose what AdhocX pays drivers or its margin.
 * Services build corporate views without these fields; `toCorporateSafe` is the last-line filter
 * applied by the controllers on every corporate-readable billing response.
 */
export const CORPORATE_FORBIDDEN_KEY_PATTERN =
  /(payout|earning|margin|tds|driverRate|basePayout|tollReimbursement|driverId|driverUserId|commission)/i;

export function findForbiddenKeys(value: unknown, path = '$', out: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((v, i) => findForbiddenKeys(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      if (CORPORATE_FORBIDDEN_KEY_PATTERN.test(k)) out.push(`${path}.${k}`);
      findForbiddenKeys(v, `${path}.${k}`, out);
    }
  }
  return out;
}

export function toCorporateSafe<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => toCorporateSafe(v)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (CORPORATE_FORBIDDEN_KEY_PATTERN.test(k)) continue;
      out[k] = toCorporateSafe(v);
    }
    return out as T;
  }
  return value;
}

/** Corporate roles get the filtered view; platform ADMIN gets the full response. */
export function forCaller<T>(req: any, value: T): T {
  const role = String(req?.user?.role ?? '').toUpperCase();
  return role === 'ADMIN' ? value : toCorporateSafe(value);
}
