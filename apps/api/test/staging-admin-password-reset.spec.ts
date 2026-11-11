const {
  assertStagingDatabaseTarget,
  hashPassword,
  MIN_PASSWORD_LENGTH,
} = require('../scripts/reset-staging-admin-password');
const cryptoModule = require('crypto');

describe('local staging admin password reset guard', () => {
  const stagingUrl =
    'postgresql://adhocx_dev:local-test-password@127.0.0.1:15432/adhocx_staging?schema=public';

  it('accepts only the configured loopback staging database', () => {
    expect(assertStagingDatabaseTarget(stagingUrl, 'development')).toEqual({
      host: '127.0.0.1',
      port: '15432',
      database: 'adhocx_staging',
    });
  });

  it.each([
    ['live host', stagingUrl.replace('127.0.0.1', '3.110.42.191')],
    ['production database', stagingUrl.replace('adhocx_staging', 'adhocx')],
    ['wrong port', stagingUrl.replace('15432', '5432')],
    ['wrong role', stagingUrl.replace('adhocx_dev', 'postgres')],
  ])('refuses %s', (_description, databaseUrl) => {
    expect(() => assertStagingDatabaseTarget(databaseUrl, 'development')).toThrow(
      'Refusing to reset a password',
    );
  });

  it('refuses production mode even for the staging URL', () => {
    expect(() => assertStagingDatabaseTarget(stagingUrl, 'production')).toThrow(
      'Refusing to reset a password',
    );
  });

  it('uses the API password hash format and strong PBKDF2 iteration count', () => {
    const password = 'local-test-passphrase';
    const [salt, hash, iterations] = hashPassword(password).split(':');
    const derived = cryptoModule
      .pbkdf2Sync(password, salt, Number(iterations), 64, 'sha512')
      .toString('hex');

    expect(password.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    expect(Number(iterations)).toBe(210_000);
    expect(derived).toBe(hash);
  });
});
