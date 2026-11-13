import 'reflect-metadata';

/**
 * Tests must never reach live third-party services with real credentials.
 *
 * Any test that boots ConfigModule.forRoot() parses the local .env files, which hold LIVE keys
 * (this once sent real OTP SMS on every test run). ConfigModule never overrides a variable that
 * already exists in process.env, so pre-setting these to '' keeps the .env values out entirely.
 * Tests that need a value set their own fake one (e.g. GOOGLE_MAPS_API_KEY = 'test-key').
 *
 * The only exception is the explicit opt-in MSG91 live smoke test (MSG91_LIVE_SMOKE_PHONE set by
 * the person running it, together with their own MSG91_AUTH_KEY in the shell).
 */
const LIVE_SECRET_VARS = [
  'MSG91_AUTH_KEY',
  'MSG091_AUTH_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'DIGIO_CLIENT_ID',
  'DIGIO_CLIENT_SECRET',
  'DIGIO_WEBHOOK_SECRET',
  'SMTP_USER',
  'SMTP_PASS',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_API_TOKEN',
  'GOOGLE_MAPS_API_KEY',
  'GOOGLE_MAPS_BROWSER_API_KEY',
  'GOOGLE_CLIENT_SECRET',
  'OPEN_AI_API_KEY',
  'GEMINI_API_KEY',
] as const;

const liveSmsSmoke = Boolean(process.env.MSG91_LIVE_SMOKE_PHONE);
for (const name of LIVE_SECRET_VARS) {
  if (liveSmsSmoke && name === 'MSG91_AUTH_KEY') continue;
  process.env[name] = '';
}
