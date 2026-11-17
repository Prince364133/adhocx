export function isLocalTestOtpEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (
    env.ALLOW_TEST_OTP !== 'true' ||
    (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') ||
    !env.DATABASE_URL
  ) {
    return false;
  }

  try {
    const host = new URL(env.DATABASE_URL).hostname.toLowerCase();
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  } catch {
    return false;
  }
}
