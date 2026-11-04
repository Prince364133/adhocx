/**
 * Safety guard for scripts that write to (or wipe) the database.
 *
 * apps/api/.env may point at a shared or production database, and these scripts read it via dotenv.
 * A script that calls requireConfirmedDatabase() refuses to run unless the operator repeats the
 * target host on the command line:
 *
 *   node scripts/wipe-all-data.js --confirm-host=127.0.0.1
 *
 * Wiping scripts additionally refuse when NODE_ENV=production.
 */
function databaseHost() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return new URL(url).hostname;
}

function requireConfirmedDatabase({ destructive = false } = {}) {
  const host = databaseHost();
  const hit = process.argv.find((a) => a.startsWith('--confirm-host='));
  const confirmed = hit ? hit.slice('--confirm-host='.length) : undefined;
  if (destructive && process.env.NODE_ENV === 'production') {
    console.error('Refusing to run a data-wiping script with NODE_ENV=production.');
    process.exit(1);
  }
  if (confirmed !== host) {
    console.error(
      `This script writes to the database at "${host}".\n` +
        `Re-run with --confirm-host=${host} if that is really the database you mean.`,
    );
    process.exit(1);
  }
  return host;
}

function requireEnv(name, { minLength = 1 } = {}) {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    console.error(`${name} must be set${minLength > 1 ? ` (at least ${minLength} characters)` : ''}.`);
    process.exit(1);
  }
  return value;
}

module.exports = { requireConfirmedDatabase, requireEnv, databaseHost };
