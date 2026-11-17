import { isLocalTestOtpEnabled } from '../src/modules/auth/test-otp.policy';

describe('local test OTP policy', () => {
  const localDevelopment = {
    ALLOW_TEST_OTP: 'true',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/adhocx_test',
  };

  it('enables test OTP only for an explicitly enabled local development database', () => {
    expect(isLocalTestOtpEnabled(localDevelopment)).toBe(true);
    expect(
      isLocalTestOtpEnabled({
        ...localDevelopment,
        DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/adhocx_test',
      }),
    ).toBe(true);
  });

  it.each([
    ['remote database', { DATABASE_URL: 'postgresql://db.example.test/adhocx' }],
    ['production mode', { NODE_ENV: 'production' }],
    ['missing opt-in', { ALLOW_TEST_OTP: undefined }],
    ['invalid database URL', { DATABASE_URL: 'not-a-database-url' }],
  ])('rejects test OTP for %s', (_case, overrides) => {
    expect(isLocalTestOtpEnabled({ ...localDevelopment, ...overrides })).toBe(
      false,
    );
  });
});
