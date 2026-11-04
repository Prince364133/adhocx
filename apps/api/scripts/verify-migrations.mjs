// Proves the hand-written migrations are correct against a real Postgres, without touching any
// shared database:
//   1. starts the throwaway load-test Postgres (127.0.0.1:55432, tmpfs),
//   2. builds a fresh `migtest` database from the schema as it was at BASE_REF (before the
//      migrations being checked),
//   3. applies every migration newer than BASE_MIGRATION in order, each in one transaction,
//   4. fails if `prisma migrate diff` shows ANY drift between the result and schema.prisma.
//
//   node apps/api/scripts/verify-migrations.mjs [--base-ref=<git ref>] [--after=<migration dir>]
//
// Defaults check everything added since the corporate ETS baseline (68c16d8 /
// 20261102000000_corporate_user_tenant_link). Requires Docker Desktop.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? def;
const BASE_REF = arg('base-ref', '68c16d8');
const AFTER = arg('after', '20261102000000_corporate_user_tenant_link');
const CONTAINER = 'adhocx-loadtest-postgres-1';
const URL = 'postgresql://lt:lt@127.0.0.1:55432/migtest';
const env = { ...process.env, DATABASE_URL: URL };

const run = (cmd, args, opts = {}) => {
  // Only npx needs a shell on Windows (it is a .cmd); a shell would split SQL args on spaces.
  const shell = cmd === 'npx' && process.platform === 'win32';
  const res = spawnSync(cmd, args, { encoding: 'utf8', shell, env, ...opts });
  if (res.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} exited ${res.status}\n${res.stdout ?? ''}${res.stderr ?? ''}`);
  }
  return res;
};
const psql = (sqlArgs, input) =>
  run('docker', ['exec', '-i', CONTAINER, 'psql', '-q', '-U', 'lt', '-v', 'ON_ERROR_STOP=1', ...sqlArgs], {
    input,
  });

run('docker', ['compose', '-p', 'adhocx-loadtest', '-f', join(API_DIR, 'load-test', 'docker-compose.loadtest.yml'), 'up', '-d', '--wait'], {
  stdio: 'inherit',
});
psql(['-d', 'adhocx_lt', '-c', 'DROP DATABASE IF EXISTS migtest;', '-c', 'CREATE DATABASE migtest;']);

const work = mkdtempSync(join(tmpdir(), 'adhocx-migtest-'));
const baseSchema = join(work, 'base.prisma');
writeFileSync(baseSchema, run('git', ['show', `${BASE_REF}:apps/api/prisma/schema.prisma`], { cwd: API_DIR }).stdout);
run('npx', ['prisma', 'db', 'push', '--schema', baseSchema, '--skip-generate'], { cwd: API_DIR });
console.log(`baseline: schema.prisma @ ${BASE_REF}`);

const dir = join(API_DIR, 'prisma', 'migrations');
const pending = readdirSync(dir).filter((d) => /^\d{14}_/.test(d) && d > AFTER).sort();
for (const m of pending) {
  psql(['-d', 'migtest', '--single-transaction'], readFileSync(join(dir, m, 'migration.sql'), 'utf8'));
  console.log(`applied  ${m}`);
}

const diff = run(
  'npx',
  ['prisma', 'migrate', 'diff', '--from-url', URL, '--to-schema-datamodel', 'prisma/schema.prisma', '--script'],
  { cwd: API_DIR },
);
const drift = diff.stdout.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('--'));
if (drift.length) {
  console.error(`\nDRIFT: the migrated database differs from schema.prisma:\n${drift.join('\n')}`);
  process.exit(1);
}
console.log(`\nOK: ${pending.length} migrations apply cleanly and match schema.prisma exactly.`);
