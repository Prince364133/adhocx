import { registerAs } from '@nestjs/config';

/** Local-development fallbacks only. Refused when NODE_ENV=production. */
export const DEV_JWT_ACCESS_SECRET = 'adhocx_default_jwt_secret_dev_2026';
export const DEV_JWT_REFRESH_SECRET = 'adhocx_default_jwt_refresh_secret_dev_2026';

const KNOWN_WEAK_SECRETS = new Set([
  DEV_JWT_ACCESS_SECRET,
  DEV_JWT_REFRESH_SECRET,
  'development_super_secret_access_key_change_in_production',
  'development_super_secret_refresh_key_change_in_production',
]);

/**
 * Resolves a JWT signing secret. In production a missing, published or short secret stops the API
 * from booting: with a fallback, anyone who has read this repository could sign valid tokens.
 */
export function resolveJwtSecret(kind: 'access' | 'refresh', env: NodeJS.ProcessEnv = process.env): string {
  const value = kind === 'access' ? env.JWT_ACCESS_SECRET || env.JWT_SECRET : env.JWT_REFRESH_SECRET;
  if (env.NODE_ENV === 'production') {
    const name = kind === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';
    if (!value) throw new Error(`${name} must be set in production`);
    if (KNOWN_WEAK_SECRETS.has(value)) throw new Error(`${name} is a published development value; set a real secret`);
    if (value.length < 32) throw new Error(`${name} must be at least 32 characters in production`);
    return value;
  }
  return value || (kind === 'access' ? DEV_JWT_ACCESS_SECRET : DEV_JWT_REFRESH_SECRET);
}

export default registerAs('auth', () => ({
  jwtAccessSecret: resolveJwtSecret('access'),
  jwtRefreshSecret: resolveJwtSecret('refresh'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
  otpResendDelaySeconds: parseInt(process.env.OTP_RESEND_DELAY_SECONDS || '30', 10),
}));
