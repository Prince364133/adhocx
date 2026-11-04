/**
 * The data-wiping and seeding scripts read DATABASE_URL from apps/api/.env, which may point at a
 * shared or production database. They must refuse to run unless the operator names that host.
 * (The guard is tested in isolation; no script is executed.)
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireConfirmedDatabase, requireEnv } = require('../scripts/_db-guard');

describe('scripts/_db-guard', () => {
  const savedArgv = process.argv;
  const savedEnv = { ...process.env };
  let exit: jest.SpyInstance;

  beforeEach(() => {
    exit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`);
    }) as any);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.DATABASE_URL = 'postgresql://u:p@3.110.42.191:5432/adhocx';
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    process.argv = savedArgv;
    process.env = { ...savedEnv };
    jest.restoreAllMocks();
  });

  it('refuses without --confirm-host', () => {
    process.argv = ['node', 'wipe.js'];
    expect(() => requireConfirmedDatabase({ destructive: true })).toThrow('exit 1');
  });

  it('refuses when the confirmed host is not the actual target', () => {
    process.argv = ['node', 'wipe.js', '--confirm-host=127.0.0.1'];
    expect(() => requireConfirmedDatabase({ destructive: true })).toThrow('exit 1');
  });

  it('runs when the operator names the real host', () => {
    process.argv = ['node', 'wipe.js', '--confirm-host=3.110.42.191'];
    expect(requireConfirmedDatabase({ destructive: true })).toBe('3.110.42.191');
    expect(exit).not.toHaveBeenCalled();
  });

  it('a wiping script never runs with NODE_ENV=production, even when confirmed', () => {
    process.env.NODE_ENV = 'production';
    process.argv = ['node', 'wipe.js', '--confirm-host=3.110.42.191'];
    expect(() => requireConfirmedDatabase({ destructive: true })).toThrow('exit 1');
    expect(requireConfirmedDatabase({ destructive: false })).toBe('3.110.42.191');
  });

  it('requireEnv rejects a missing or short admin password', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(() => requireEnv('ADMIN_PASSWORD', { minLength: 12 })).toThrow('exit 1');
    process.env.ADMIN_PASSWORD = 'short';
    expect(() => requireEnv('ADMIN_PASSWORD', { minLength: 12 })).toThrow('exit 1');
    process.env.ADMIN_PASSWORD = 'long-enough-passphrase';
    expect(requireEnv('ADMIN_PASSWORD', { minLength: 12 })).toBe('long-enough-passphrase');
  });
});
