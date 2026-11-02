// Starts the throwaway Postgres + Redis, builds the API, and pushes the Prisma schema into the
// local database. Safe to re-run: the containers use tmpfs, so `down` wipes everything.
//   node apps/api/load-test/setup.mjs [--down]
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { API_DIR, CFG, HERE, apiEnv, assertLocalTargets } from './lib.mjs';

assertLocalTargets();

const compose = ['compose', '-p', 'adhocx-loadtest', '-f', join(HERE, 'docker-compose.loadtest.yml')];
const run = (cmd, args, opts = {}) => {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  if (res.status !== 0) throw new Error(`${cmd} exited with ${res.status}`);
};

if (process.argv.includes('--down')) {
  run('docker', [...compose, 'down', '-v']);
  process.exit(0);
}

run('docker', [...compose, 'up', '-d', '--wait']);
run('npx', ['nest', 'build'], { cwd: API_DIR });
// Explicit env: prisma would otherwise read apps/api/.env, which points at a remote database.
run('npx', ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'], {
  cwd: API_DIR,
  env: { ...apiEnv(CFG.basePort, { scheduler: false }) },
});
console.log('Load-test infrastructure ready on 127.0.0.1:55432 (Postgres) and 127.0.0.1:56379 (Redis).');
