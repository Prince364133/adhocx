// Seeds one load-test tenant: office, employees, PLANNED login routes (4 pickups + office drop),
// verified drivers placed near each route's first pickup, and their live positions in Redis.
//   node apps/api/load-test/seed.mjs --label=storm --routes=1000 --due-in-min=30
import { randomUUID } from 'node:crypto';
import prismaPkg from '@prisma/client';
import Redis from 'ioredis';
import * as h3 from 'h3-js';
import { CFG, arg, assertLocalTargets, writeOut } from './lib.mjs';

assertLocalTargets();

const label = arg('label', 'storm');
const routeCount = Number(arg('routes', '1000'));
const driversPerRoute = Number(arg('drivers-per-route', '2'));
const dueInMin = Number(arg('due-in-min', '30'));

// Deterministic geography so runs are comparable (mulberry32).
let seed = [...label].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// Offset a point by up to `km` in a random direction (1 deg lat ~ 111 km).
const near = ([lat, lng], km) => {
  const r = km * Math.sqrt(rand());
  const a = rand() * 2 * Math.PI;
  return [lat + (r * Math.cos(a)) / 111, lng + (r * Math.sin(a)) / (111 * Math.cos((lat * Math.PI) / 180))];
};

const OFFICE = [17.4474, 78.3762]; // HITEC City, Hyderabad
const CITY = [17.4, 78.46];

const prisma = new prismaPkg.PrismaClient({ datasourceUrl: CFG.dbUrl });
const redis = new Redis({ host: CFG.redisHost, port: CFG.redisPort, lazyConnect: true });

async function chunked(rows, size, fn) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function main() {
  await redis.connect();
  const t0 = Date.now();
  const now = new Date();
  const shiftDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const tenantId = randomUUID();
  const officeId = randomUUID();
  const adminUserId = randomUUID();
  const corpAdminUserId = randomUUID();

  await prisma.corporateTenant.create({
    data: { id: tenantId, code: `LT-${label}-${Date.now() % 1e6}`.slice(0, 32), name: `Load Test ${label}`, legalEntityName: `Load Test ${label} Pvt Ltd` },
  });
  await prisma.corporateOffice.create({
    data: {
      id: officeId,
      tenantId,
      code: 'HQ',
      name: 'HITEC City HQ',
      addressText: 'HITEC City, Hyderabad',
      latitude: OFFICE[0],
      longitude: OFFICE[1],
      h3Res8Index: h3.latLngToCell(OFFICE[0], OFFICE[1], 8),
    },
  });
  await prisma.user.createMany({
    data: [
      { id: adminUserId, email: `lt-admin-${label}-${tenantId.slice(0, 8)}@loadtest.local`, fullName: 'LT Admin', role: 'ADMIN' },
      {
        id: corpAdminUserId,
        email: `lt-corp-${label}-${tenantId.slice(0, 8)}@loadtest.local`,
        fullName: 'LT Corporate Admin',
        role: 'CORPORATE_ADMIN',
        corporateTenantId: tenantId,
      },
    ],
  });

  const users = [];
  const drivers = [];
  const vehicles = [];
  const employees = [];
  const routes = [];
  const stops = [];
  const geo = [];

  const pickup1At = new Date(Date.now() + dueInMin * 60_000);
  for (let i = 0; i < routeCount; i++) {
    const routeId = randomUUID();
    const p1 = near(CITY, 15);
    const pickups = [p1, near(p1, 1.5), near(p1, 1.5), near(p1, 1.5)];
    routes.push({
      id: routeId,
      tenantId,
      officeId,
      shiftDate,
      shiftTime: '08:00',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      maxCapacity: 4,
      assignedPassengerCount: 4,
      targetPickup1Time: pickup1At,
      targetOfficeArrivalTime: new Date(pickup1At.getTime() + 110 * 60_000),
      estDistanceMeters: 22_000,
      estDurationSeconds: 5_400,
      status: 'PLANNED',
    });
    pickups.forEach(([lat, lng], k) => {
      const employeeId = randomUUID();
      employees.push({
        id: employeeId,
        tenantId,
        officeId,
        employeeCode: `E${i}-${k}`,
        fullName: `Employee ${i}-${k}`,
        email: `e${i}-${k}@${label}.loadtest.local`,
        phoneNumber: `+9170${String(i * 4 + k).padStart(8, '0')}`,
      });
      stops.push({
        id: randomUUID(),
        routeId,
        stopSequence: k + 1,
        stopType: 'PICKUP',
        employeeId,
        latitude: lat,
        longitude: lng,
        plannedEta: new Date(pickup1At.getTime() + k * 10 * 60_000),
        boardingOtp: String(1000 + Math.floor(rand() * 9000)),
      });
    });
    stops.push({
      id: randomUUID(),
      routeId,
      stopSequence: 5,
      stopType: 'DROPOFF',
      latitude: OFFICE[0],
      longitude: OFFICE[1],
      plannedEta: new Date(pickup1At.getTime() + 110 * 60_000),
      boardingOtp: '0000',
    });
    for (let d = 0; d < driversPerRoute; d++) {
      const n = i * driversPerRoute + d;
      const userId = randomUUID();
      const driverId = randomUUID();
      const [lat, lng] = near(p1, 3);
      users.push({ id: userId, email: `lt-d-${label}-${n}-${tenantId.slice(0, 8)}@loadtest.local`, fullName: `Driver ${n}`, role: 'DRIVER' });
      drivers.push({
        id: driverId,
        userId,
        fullName: `Driver ${n}`,
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicleType: 'SEDAN',
        currentLat: lat,
        currentLng: lng,
        lastLocationAt: now,
      });
      vehicles.push({
        driverId,
        vehicleType: 'SEDAN',
        model: 'Dzire',
        registrationNumber: `LT${label}${tenantId.slice(0, 4)}${n}`.toUpperCase(),
        verificationStatus: 'VERIFIED',
      });
      geo.push({ driverId, lat, lng });
    }
  }

  await chunked(users, 1000, (rows) => prisma.user.createMany({ data: rows }));
  await chunked(drivers, 1000, (rows) => prisma.driver.createMany({ data: rows }));
  await chunked(vehicles, 1000, (rows) => prisma.vehicle.createMany({ data: rows }));
  await chunked(employees, 1000, (rows) => prisma.corporateEmployee.createMany({ data: rows }));
  await chunked(routes, 1000, (rows) => prisma.corporateRoute.createMany({ data: rows }));
  await chunked(stops, 2000, (rows) => prisma.corporateRouteStop.createMany({ data: rows }));

  // Same Redis layout LocationsService.indexDriverLocation writes (GEO + H3 cell + metadata).
  await chunked(geo, 2000, async (rows) => {
    const p = redis.pipeline();
    for (const { driverId, lat, lng } of rows) {
      const cell = h3.latLngToCell(lat, lng, 8);
      p.geoadd('drivers:geo:available', lng, lat, driverId);
      p.sadd(`drivers:h3:res8:${cell}`, driverId);
      p.expire(`drivers:h3:res8:${cell}`, 6 * 3600);
      p.set(`drivers:meta:${driverId}`, JSON.stringify({ lat, lng, h3Cell: cell, vehicleType: 'SEDAN', updatedAt: Date.now() }), 'EX', 6 * 3600);
    }
    await p.exec();
  });

  const out = {
    label,
    tenantId,
    officeId,
    adminUserId,
    corpAdminUserId,
    routeIds: routes.map((r) => r.id),
    drivers: drivers.map((d) => ({ id: d.id, userId: d.userId })),
    pickup1At: pickup1At.toISOString(),
  };
  writeOut(`seed-${label}.json`, out);
  console.log(
    `Seeded "${label}": ${routes.length} routes, ${stops.length} stops, ${employees.length} employees, ${drivers.length} drivers in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });
