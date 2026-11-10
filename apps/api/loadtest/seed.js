// Seeds the LOCAL load-test database (refuses anything but localhost) and writes JWTs for k6.
//   DATABASE_URL=postgresql://load:loadpass@localhost:6433/adhocx_load JWT_ACCESS_SECRET=... node seed.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const API = path.resolve(__dirname, '..');
const { PrismaClient } = require(require.resolve('@prisma/client', { paths: [API] }));
const jwt = require(require.resolve('jsonwebtoken', { paths: [API, path.join(API, 'node_modules/@nestjs/jwt')] }));

const DRIVERS = Number(process.env.SEED_DRIVERS || 5000);
const VENDORS = Number(process.env.SEED_VENDORS || 300);
const CENTER = { lat: 28.6315, lng: 77.2167 }; // Connaught Place
const RADIUS_KM = 25;

const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1):6433\//.test(url)) {
  console.error('Refusing to seed: DATABASE_URL must point at the local load-test container (localhost:6433).');
  process.exit(1);
}
const secret = process.env.JWT_ACCESS_SECRET;
if (!secret || secret.length < 32) {
  console.error('JWT_ACCESS_SECRET (>= 32 chars) required');
  process.exit(1);
}

function randomPoint() {
  const r = RADIUS_KM * Math.sqrt(Math.random());
  const t = Math.random() * 2 * Math.PI;
  return {
    lat: CENTER.lat + (r / 111.32) * Math.cos(t),
    lng: CENTER.lng + (r / (111.32 * Math.cos((CENTER.lat * Math.PI) / 180))) * Math.sin(t),
  };
}

(async () => {
  const db = new PrismaClient();
  const now = new Date();
  const sign = (u) => jwt.sign({ id: u.id, phone: u.phone, email: null, role: u.role }, secret, { expiresIn: '12h' });

  const driverUsers = [];
  const drivers = [];
  const vehicles = [];
  for (let i = 0; i < DRIVERS; i++) {
    const userId = crypto.randomUUID();
    const driverId = crypto.randomUUID();
    const p = randomPoint();
    driverUsers.push({ id: userId, phone: `+9170${String(i).padStart(8, '0')}`, fullName: `Load Driver ${i}`, role: 'DRIVER', status: 'ACTIVE' });
    drivers.push({
      id: driverId,
      userId,
      fullName: `Load Driver ${i}`,
      verificationStatus: 'VERIFIED',
      availabilityStatus: 'AVAILABLE',
      vehicleType: 'SEDAN',
      currentLat: p.lat.toFixed(7),
      currentLng: p.lng.toFixed(7),
      lastLocationAt: now,
    });
    vehicles.push({ driverId, vehicleType: 'SEDAN', model: 'Dzire', registrationNumber: `LD${String(i).padStart(6, '0')}` });
  }
  const vendorUsers = [];
  const vendors = [];
  for (let i = 0; i < VENDORS; i++) {
    const userId = crypto.randomUUID();
    vendorUsers.push({ id: userId, phone: `+9180${String(i).padStart(8, '0')}`, fullName: `Load Vendor ${i}`, role: 'VENDOR', status: 'ACTIVE' });
    vendors.push({ userId, organizationName: `Load Org ${i}`, fullName: `Load Vendor ${i}`, verificationStatus: 'VERIFIED' });
  }

  const chunk = async (model, rows) => {
    for (let i = 0; i < rows.length; i += 1000) await db[model].createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
  };
  const t0 = Date.now();
  await chunk('user', [...driverUsers, ...vendorUsers]);
  await chunk('driver', drivers);
  await chunk('vehicle', vehicles);
  await chunk('vendor', vendors);
  console.log(`seeded ${DRIVERS} drivers, ${VENDORS} vendors in ${Date.now() - t0} ms`);

  const out = path.join(__dirname, 'data');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, 'drivers.json'),
    JSON.stringify(drivers.map((d, i) => ({ token: sign(driverUsers[i]), driverId: d.id, lat: Number(d.currentLat), lng: Number(d.currentLng) }))),
  );
  fs.writeFileSync(path.join(out, 'vendors.json'), JSON.stringify(vendorUsers.map((u) => ({ token: sign(u) }))));
  console.log(`tokens written to ${out}`);
  await db.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
