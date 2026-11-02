// Local Corporate ETS load test against real Postgres + Redis (see setup.mjs). Phases:
//   1. Dispatch storm: every route force-started twice at once on different API instances
//   2. Accept race: offered driver accepts twice at once, a wrong driver tries too
//   3. Telemetry: assigned drivers stream GPS pings
//   4. Reads: corporate admin dashboards
//   5. Scheduler: N instances with the autonomous scheduler race over freshly due routes
// Writes results to load-test/.out/results-<timestamp>.json and exits non-zero on a correctness failure.
//   node apps/api/load-test/run.mjs --routes=1000 --instances=2 --concurrency=200 --seconds=30
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import prismaPkg from '@prisma/client';
import Redis from 'ioredis';
import {
  API_DIR,
  CFG,
  HERE,
  OUT_DIR,
  apiEnv,
  apiUrl,
  arg,
  assertLocalTargets,
  call,
  readOut,
  runPool,
  signJwt,
  sleep,
  summarize,
  unwrap,
  writeOut,
} from './lib.mjs';

assertLocalTargets();

const ROUTES = Number(arg('routes', '1000'));
const INSTANCES = Number(arg('instances', '2'));
const CONCURRENCY = Number(arg('concurrency', '200'));
const SECONDS = Number(arg('seconds', '30'));
const SCHED_ROUTES = Number(arg('scheduler-routes', '500'));

const prisma = new prismaPkg.PrismaClient({ datasourceUrl: CFG.dbUrl });
const redis = new Redis({ host: CFG.redisHost, port: CFG.redisPort });
const results = { startedAt: new Date().toISOString(), config: { ROUTES, INSTANCES, CONCURRENCY, SECONDS, SCHED_ROUTES }, phases: [], checks: [] };
const failures = [];

function check(name, pass, detail) {
  results.checks.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
  if (!pass) failures.push(name);
}

function phase(summary, extra = {}) {
  results.phases.push({ ...summary, ...extra });
  const s = summary;
  console.log(`  ${s.name}: ${s.requests} req, ${s.rps} req/s, p50 ${s.p50} ms, p95 ${s.p95} ms, p99 ${s.p99} ms, errors ${(s.errorRate * 100).toFixed(2)}% ${JSON.stringify(s.byStatus)}`);
}

// ---------- API instances ----------
let procs = [];
async function startInstances(count, scheduler) {
  const cwd = join(OUT_DIR, 'api-cwd'); // empty dir: no .env for Nest or dotenv to pick up
  mkdirSync(cwd, { recursive: true });
  procs = [];
  for (let i = 0; i < count; i++) {
    const port = CFG.basePort + i;
    const log = createWriteStream(join(OUT_DIR, `api-${port}.log`));
    const p = spawn(process.execPath, [join(API_DIR, 'dist', 'apps', 'api', 'src', 'main.js')], { cwd, env: apiEnv(port, { scheduler }) });
    p.stdout.pipe(log);
    p.stderr.pipe(log);
    procs.push({ port, p });
  }
  const deadline = Date.now() + 120_000;
  for (const { port, p } of procs) {
    while (true) {
      if (p.exitCode !== null) throw new Error(`API on ${port} exited early; see .out/api-${port}.log`);
      const r = await call('GET', `${apiUrl(port)}/health`);
      if (r.status === 200) break;
      if (Date.now() > deadline) throw new Error(`API on ${port} not healthy after 120s`);
      await sleep(1000);
    }
  }
  console.log(`  ${count} API instance(s) up on ports ${procs.map((x) => x.port).join(', ')} (scheduler ${scheduler ? 'on' : 'off'})`);
}
async function stopInstances() {
  for (const { p } of procs) p.kill('SIGTERM');
  await sleep(2000);
  for (const { p } of procs) if (p.exitCode === null) p.kill('SIGKILL');
  procs = [];
}
const base = (i) => apiUrl(procs[i % procs.length].port);

function seed(label, routes) {
  const res = spawnSync(process.execPath, [join(HERE, 'seed.mjs'), `--label=${label}`, `--routes=${routes}`], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`seed ${label} failed`);
  return readOut(`seed-${label}.json`);
}

// ---------- phases ----------
async function dispatchStorm(s, adminToken) {
  console.log('\n[1] Dispatch storm: each route force-started twice at once on different instances');
  const jobs = s.routeIds.flatMap((id) => [id, id]);
  const t0 = performance.now();
  const res = await runPool(jobs, CONCURRENCY, (id, i) => call('POST', `${base(i)}/corporate/dispatch/routes/${id}/start-now`, adminToken, {}));
  phase(summarize('dispatch start-now', res, performance.now() - t0));
  const outcomes = {};
  for (const r of res) {
    const st = unwrap(r.json)?.status ?? `HTTP_${r.status}`;
    outcomes[st] = (outcomes[st] ?? 0) + 1;
  }
  console.log(`  outcomes: ${JSON.stringify(outcomes)}`);
  results.dispatchOutcomes = outcomes;

  const offers = await redis.mget(s.routeIds.map((id) => `corporate:offer_driver:${id}`));
  const offered = offers.filter(Boolean);
  const triggered = await prisma.auditLog.groupBy({
    by: ['entityId'],
    where: { action: { in: ['CORPORATE_DISPATCH_FORCE_START', 'CORPORATE_DISPATCH_TRIGGERED'] }, entityId: { in: s.routeIds } },
    _count: { _all: true },
  });
  const multi = triggered.filter((g) => g._count._all > 1);
  check('no route got two offers from the duplicate start', multi.length === 0, `${multi.length} routes with >1 dispatch audit`);
  check('no driver holds offers for two routes', new Set(offered).size === offered.length, `${offered.length} offers, ${new Set(offered).size} distinct drivers`);
  return s.routeIds.map((id, i) => ({ routeId: id, driverId: offers[i] })).filter((x) => x.driverId);
}

async function acceptRace(s, offered) {
  console.log('\n[2] Accept race: offered driver accepts twice at once; a different driver also tries');
  const userOf = new Map(s.drivers.map((d) => [d.id, d.userId]));
  const others = s.drivers;
  const jobs = offered.flatMap(({ routeId, driverId }, i) => {
    const wrong = others[(i * 7 + 3) % others.length];
    const wrongId = wrong.id === driverId ? others[(i * 7 + 4) % others.length].id : wrong.id;
    return [
      { routeId, driverId, token: signJwt({ sub: userOf.get(driverId), role: 'DRIVER' }), kind: 'own' },
      { routeId, driverId, token: signJwt({ sub: userOf.get(driverId), role: 'DRIVER' }), kind: 'own' },
      { routeId, driverId: wrongId, token: signJwt({ sub: userOf.get(wrongId), role: 'DRIVER' }), kind: 'wrong' },
    ];
  });
  const t0 = performance.now();
  const res = await runPool(jobs, CONCURRENCY, (j, i) =>
    call('POST', `${base(i)}/corporate/dispatch/routes/${j.routeId}/offers/accept`, j.token, { driverId: j.driverId }),
  );
  phase(summarize('offer accept', res, performance.now() - t0));
  const wrongAccepted = res.filter((r, i) => jobs[i].kind === 'wrong' && r.status >= 200 && r.status < 300).length;
  check('a driver who was not offered the route is never accepted', wrongAccepted === 0, `${wrongAccepted} wrong-driver accepts succeeded`);

  const rows = await prisma.corporateRoute.findMany({ where: { id: { in: offered.map((o) => o.routeId) } }, select: { id: true, status: true, driverId: true } });
  const expected = new Map(offered.map((o) => [o.routeId, o.driverId]));
  const assigned = rows.filter((r) => r.status === 'ASSIGNED');
  const mismatched = assigned.filter((r) => r.driverId !== expected.get(r.id));
  const perDriver = new Map();
  for (const r of assigned) perDriver.set(r.driverId, (perDriver.get(r.driverId) ?? 0) + 1);
  const doubleBooked = [...perDriver.values()].filter((n) => n > 1).length;
  check('every offered route ends ASSIGNED', assigned.length === offered.length, `${assigned.length}/${offered.length}`);
  check('each route assigned to the driver it was offered to', mismatched.length === 0, `${mismatched.length} mismatches`);
  check('no driver assigned to two routes', doubleBooked === 0, `${doubleBooked} drivers double-booked`);
  const earnings = await prisma.corporateDriverEarning.count({ where: { routeId: { in: assigned.map((r) => r.id) } } }).catch(() => null);
  if (earnings !== null) check('exactly one driver earning row per assigned route', earnings === assigned.length, `${earnings} earnings for ${assigned.length} routes`);
  return assigned;
}

async function telemetry(s, assigned) {
  console.log(`\n[3] Telemetry: ${assigned.length} drivers stream GPS pings for ${SECONDS}s`);
  const userOf = new Map(s.drivers.map((d) => [d.id, d.userId]));
  const tokens = new Map(assigned.map((r) => [r.id, signJwt({ sub: userOf.get(r.driverId), role: 'DRIVER' })]));
  const deadline = Date.now() + SECONDS * 1000;
  const res = [];
  let n = 0;
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, assigned.length) }, async () => {
      while (Date.now() < deadline) {
        const r = assigned[n++ % assigned.length];
        res.push(
          await call('POST', `${base(n)}/corporate/trips/routes/${r.id}/telemetry`, tokens.get(r.id), {
            latitude: 17.4 + Math.random() * 0.1,
            longitude: 78.4 + Math.random() * 0.1,
            speedMps: 9,
          }),
        );
      }
    }),
  );
  phase(summarize('route telemetry', res, performance.now() - t0));
}

async function reads(s) {
  console.log(`\n[4] Reads: corporate admin dashboards for ${Math.min(SECONDS, 20)}s`);
  const token = signJwt({ sub: s.corpAdminUserId, role: 'CORPORATE_ADMIN', corporateTenantId: s.tenantId });
  const deadline = Date.now() + Math.min(SECONDS, 20) * 1000;
  const res = [];
  let n = 0;
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, 100) }, async () => {
      while (Date.now() < deadline) {
        const i = n++;
        const id = s.routeIds[i % s.routeIds.length];
        const url = i % 4 === 0 ? `${base(i)}/corporate/routes?tenantId=${s.tenantId}` : `${base(i)}/corporate/routes/${id}`;
        res.push(await call('GET', url, token));
      }
    }),
  );
  phase(summarize('corporate route reads', res, performance.now() - t0));
  const cross = await call('GET', `${base(0)}/corporate/routes?tenantId=00000000-0000-0000-0000-000000000000`, token);
  check('corporate admin cannot read another tenant', cross.status === 403, `HTTP ${cross.status}`);
}

async function scheduler() {
  console.log(`\n[5] Scheduler: ${INSTANCES} instances with the autonomous scheduler race over ${SCHED_ROUTES} due routes`);
  const s = seed('sched', SCHED_ROUTES);
  const t0 = Date.now();
  await startInstances(INSTANCES, true);
  let left = SCHED_ROUTES;
  while (Date.now() - t0 < 55_000) {
    left = await prisma.corporateRoute.count({ where: { tenantId: s.tenantId, status: 'PLANNED' } });
    if (left === 0) break;
    await sleep(1000);
  }
  const claimSeconds = (Date.now() - t0) / 1000;
  const ports = procs.map((x) => x.port);
  await stopInstances(); // before any 60s offer timeout can legitimately re-dispatch
  // Work sharing: how many dispatches each server performed (from its own log).
  const perInstance = Object.fromEntries(
    ports.map((port) => {
      let text = '';
      try {
        text = readFileSync(join(OUT_DIR, `api-${port}.log`), 'utf8');
      } catch {}
      return [port, (text.match(/\[AUTONOMOUS_DISPATCH\] Triggering dispatch/g) ?? []).length];
    }),
  );
  const triggered = await prisma.auditLog.groupBy({
    by: ['entityId'],
    where: { action: 'CORPORATE_DISPATCH_TRIGGERED', entityId: { in: s.routeIds } },
    _count: { _all: true },
  });
  const multi = triggered.filter((g) => g._count._all > 1).length;
  const statuses = await prisma.corporateRoute.groupBy({ by: ['status'], where: { tenantId: s.tenantId }, _count: { _all: true } });
  results.scheduler = { claimSeconds, plannedLeft: left, statuses: Object.fromEntries(statuses.map((g) => [g.status, g._count._all])), routesDispatched: triggered.length };
  results.scheduler.dispatchesPerInstance = perInstance;
  console.log(`  claimed in ${claimSeconds.toFixed(1)}s (incl. startup); statuses ${JSON.stringify(results.scheduler.statuses)}`);
  console.log(`  dispatches per server: ${JSON.stringify(perInstance)}`);
  check('scheduler picked up every due route', left === 0, `${left} still PLANNED`);
  check('no route dispatched twice by competing instances', multi === 0, `${multi} routes with >1 dispatch`);
  if (INSTANCES > 1) {
    const busy = Object.values(perInstance).filter((n) => n > 0).length;
    check('dispatch work is shared by every server', busy === INSTANCES, `${busy}/${INSTANCES} servers dispatched routes`);
  }
}

async function main() {
  console.log(`Corporate ETS load test: ${ROUTES} routes, ${INSTANCES} instances, concurrency ${CONCURRENCY}`);
  await redis.flushdb();
  const s = seed('storm', ROUTES);
  await startInstances(INSTANCES, false);
  const adminToken = signJwt({ sub: s.adminUserId, role: 'ADMIN' });
  const offered = await dispatchStorm(s, adminToken);
  const assigned = await acceptRace(s, offered);
  if (assigned.length) await telemetry(s, assigned);
  await reads(s);
  await stopInstances();
  await scheduler();
}

main()
  .catch((err) => {
    console.error(err);
    failures.push(`crash: ${err.message}`);
  })
  .finally(async () => {
    await stopInstances();
    results.finishedAt = new Date().toISOString();
    results.failures = failures;
    const file = `results-${Date.now()}.json`;
    writeOut(file, results);
    console.log(`\n${failures.length ? `FAILED: ${failures.join('; ')}` : 'All correctness checks passed.'}  Results: load-test/.out/${file}`);
    await prisma.$disconnect();
    redis.disconnect();
    process.exitCode = failures.length ? 1 : 0;
  });
