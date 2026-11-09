import { DEV_JWT_ACCESS_SECRET, DEV_JWT_REFRESH_SECRET, resolveJwtSecret } from '../src/config/auth.config';

const STRONG = 'x'.repeat(48);

describe('resolveJwtSecret', () => {
  it('falls back to the dev secret outside production', () => {
    expect(resolveJwtSecret('access', { NODE_ENV: 'development' })).toBe(DEV_JWT_ACCESS_SECRET);
    expect(resolveJwtSecret('refresh', { NODE_ENV: 'test' })).toBe(DEV_JWT_REFRESH_SECRET);
  });

  it('uses JWT_SECRET as the access fallback', () => {
    expect(resolveJwtSecret('access', { NODE_ENV: 'production', JWT_SECRET: STRONG })).toBe(STRONG);
  });

  it('refuses to boot production without a secret', () => {
    expect(() => resolveJwtSecret('access', { NODE_ENV: 'production' })).toThrow(/JWT_ACCESS_SECRET must be set/);
    expect(() => resolveJwtSecret('refresh', { NODE_ENV: 'production' })).toThrow(/JWT_REFRESH_SECRET must be set/);
  });

  it('refuses published development secrets and short secrets in production', () => {
    expect(() => resolveJwtSecret('access', { NODE_ENV: 'production', JWT_ACCESS_SECRET: DEV_JWT_ACCESS_SECRET })).toThrow(/published/);
    expect(() =>
      resolveJwtSecret('access', { NODE_ENV: 'production', JWT_ACCESS_SECRET: 'development_super_secret_access_key_change_in_production' }),
    ).toThrow(/published/);
    expect(() => resolveJwtSecret('refresh', { NODE_ENV: 'production', JWT_REFRESH_SECRET: 'short' })).toThrow(/32 characters/);
  });

  it('accepts a strong production secret', () => {
    expect(resolveJwtSecret('refresh', { NODE_ENV: 'production', JWT_REFRESH_SECRET: STRONG })).toBe(STRONG);
  });
});
