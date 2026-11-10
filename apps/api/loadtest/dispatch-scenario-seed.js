// Seeds the dispatch-correctness scenario into the LOCAL load DB and writes the k6 inputs + oracle.
//   DATABASE_URL=postgresql://load:loadpass@localhost:6433/adhocx_load JWT_ACCESS_SECRET=... node dispatch-scenario-seed.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const API = path.resolve(__dirname, '..');
const { PrismaClient } = require(require.resolve('@prisma/client', { paths: [API] }));
const jwt = require(require.resolve('jsonwebtoken', { paths: [API, path.join(API, 'node_modules/@nestjs/jwt')] }));

const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1):6433\//.test(url)) {
  console.error('Refusing: DATABASE_URL must be the local load-test container (localhost:6433).');
  process.exit(1);
}
const secret = process.env.JWT_ACCESS_SECRET;
if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET (>= 32 chars) required');

// Cities more than 100 km apart: zones never interfere.
const CITIES = [
  ['Delhi', 28.6315, 77.2167], ['Mumbai', 19.076, 72.8777], ['Bengaluru', 12.9716, 77.5946], ['Hyderabad', 17.385, 78.4867],
  ['Chennai', 13.0827, 80.2707], ['Kolkata', 22.5726, 88.3639], ['Pune', 18.5204, 73.8567], ['Ahmedabad', 23.0225, 72.5714],
  ['Jaipur', 26.9124, 75.7873], ['Lucknow', 26.8467, 80.9462], ['Bhopal', 23.2599, 77.4126], ['Nagpur', 21.1458, 79.0882],
  ['Patna', 25.5941, 85.1376], ['Bhubaneswar', 20.2961, 85.8245], ['Chandigarh', 30.7333, 76.7794], ['Indore', 22.7196, 75.8577],
  ['Kochi', 9.9312, 76.2673], ['Guwahati', 26.1445, 91.7362], ['Ranchi', 23.3441, 85.3096], ['Visakhapatnam', 17.6868, 83.2185],
  ['Coimbatore', 11.0168, 76.9558],
];
const ZONE_TYPES = ['A_TRUST', 'A2_TRUST_BAND', 'B_ROOKIE', 'C_VEHICLE', 'D_RADIUS_EDGE', 'E_INELIGIBLE', 'F_OUT_OF_RADIUS', 'G_WAVES', 'H_HATCHBACK'];

/** Point `km` from (lat,lng) at bearing `deg`. */
function offset(lat, lng, km, deg) {
  const R = 6371;
  const br = (deg * Math.PI) / 180;
  const la1 = (lat * Math.PI) / 180;
  const lo1 = (lng * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(km / R) + Math.cos(la1) * Math.sin(km / R) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(km / R) * Math.cos(la1), Math.cos(km / R) - Math.sin(la1) * Math.sin(la2));
  return { lat: (la2 * 180) / Math.PI, lng: (lo2 * 180) / Math.PI };
}

const now = Date.now();
const drivers = []; // oracle records
function addDriver(o) {
  const d = {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    label: o.label,
    zone: o.zone || null,
    lat: o.pos.lat,
    lng: o.pos.lng,
    vehicleType: o.vehicleType || 'SEDAN',
    trustScore: o.trust ?? 90,
    averageRating: o.rating ?? 4.7,
    totalTrips: o.rookie ? 5 : 120,
    verificationStatus: o.unverified ? 'PENDING' : 'VERIFIED',
    availabilityStatus: o.offline ? 'OFFLINE' : 'AVAILABLE',
    cooldownUntil: o.cooldown ? new Date(now + 3600_000).toISOString() : null,
    stale: Boolean(o.stale), // never heartbeats; DB position 60 min old
  };
  drivers.push(d);
  return d;
}

const bookings = []; // { zone, label, lat, lng, vehicleType }
const zones = [];
CITIES.forEach(([city, lat, lng], i) => {
  const type = i < ZONE_TYPES.length * 2 ? ZONE_TYPES[i % ZONE_TYPES.length] : null;
  if (!type) return;
  const z = `${type}@${city}`;
  zones.push({ zone: z, type, city, lat, lng });
  const at = (km, deg) => offset(lat, lng, km, deg);
  const B = (vehicleType, label = 'main') => bookings.push({ zone: z, type, label, lat, lng, vehicleType });
  switch (type) {
    case 'A_TRUST':
      addDriver({ zone: z, label: 'trust95', pos: at(1.2, 0), trust: 95 });
      addDriver({ zone: z, label: 'trust60', pos: at(1.2, 180), trust: 60 });
      B('SEDAN');
      break;
    case 'A2_TRUST_BAND':
      addDriver({ zone: z, label: 'trust82', pos: at(1.2, 0), trust: 82 });
      addDriver({ zone: z, label: 'trust72', pos: at(1.2, 180), trust: 72 });
      B('SEDAN');
      break;
    case 'B_ROOKIE':
      addDriver({ zone: z, label: 'veteran98', pos: at(0.8, 90), trust: 98, rating: 5.0 });
      addDriver({ zone: z, label: 'rookie60', pos: at(1.8, 270), trust: 60, rating: 4.0, rookie: true });
      B('SEDAN');
      break;
    case 'C_VEHICLE':
      addDriver({ zone: z, label: 'suv0.5', pos: at(0.5, 45), vehicleType: 'SUV', trust: 99 });
      addDriver({ zone: z, label: 'suv0.7', pos: at(0.7, 225), vehicleType: 'SUV', trust: 99 });
      addDriver({ zone: z, label: 'sedan3', pos: at(3.0, 135), trust: 85 });
      B('SEDAN', 'sedan-booking');
      B('SUV', 'suv-booking');
      break;
    case 'D_RADIUS_EDGE':
      addDriver({ zone: z, label: 'in9.7', pos: at(9.7, 10) });
      addDriver({ zone: z, label: 'out10.4', pos: at(10.4, 200) });
      B('SEDAN');
      break;
    case 'E_INELIGIBLE':
      addDriver({ zone: z, label: 'unverified0.3', pos: at(0.3, 0), unverified: true, trust: 99 });
      addDriver({ zone: z, label: 'offline0.4', pos: at(0.4, 90), offline: true, trust: 99 });
      addDriver({ zone: z, label: 'stale0.5', pos: at(0.5, 180), stale: true, trust: 99 });
      addDriver({ zone: z, label: 'cooldown0.6', pos: at(0.6, 270), cooldown: true, trust: 99 });
      addDriver({ zone: z, label: 'eligible1.5', pos: at(1.5, 45), trust: 80 });
      B('SEDAN');
      break;
    case 'F_OUT_OF_RADIUS':
      addDriver({ zone: z, label: 'out11', pos: at(11, 0) });
      addDriver({ zone: z, label: 'out15', pos: at(15, 120) });
      addDriver({ zone: z, label: 'out30', pos: at(30, 240) });
      B('SEDAN');
      break;
    case 'G_WAVES':
      [1.5, 3.5, 5.5, 7.5, 9.5].forEach((km, k) => addDriver({ zone: z, label: `band${km}`, pos: at(km, k * 72) }));
      B('SEDAN');
      break;
    case 'H_HATCHBACK':
      addDriver({ zone: z, label: 'sedan0.5a', pos: at(0.5, 0), trust: 99 });
      addDriver({ zone: z, label: 'sedan0.5b', pos: at(0.5, 180), trust: 99 });
      addDriver({ zone: z, label: 'hatch2.5', pos: at(2.5, 90), vehicleType: 'HATCHBACK' });
      B('HATCHBACK');
      break;
  }
});

// Background fleet: 15–45 km from every city centre (never inside a zone's 10 km circle),
// mixed vehicles/trust/rookies, plus background bookings 25–40 km out.
const VT = ['SEDAN', 'SEDAN', 'SEDAN', 'SUV', 'HATCHBACK'];
const BG = Number(process.env.BG_DRIVERS || 4500);
for (let i = 0; i < BG; i++) {
  const [, lat, lng] = CITIES[i % CITIES.length];
  addDriver({
    label: 'bg',
    pos: offset(lat, lng, 15 + Math.random() * 30, Math.random() * 360),
    vehicleType: VT[i % VT.length],
    trust: 55 + Math.round(Math.random() * 45),
    rating: 3.8 + Math.round(Math.random() * 12) / 10,
    rookie: Math.random() < 0.2,
  });
}
const BG_BOOKINGS = Number(process.env.BG_BOOKINGS || 150);
for (let i = 0; i < BG_BOOKINGS; i++) {
  const [city, lat, lng] = CITIES[i % CITIES.length];
  const p = offset(lat, lng, 25 + Math.random() * 15, Math.random() * 360);
  bookings.push({ zone: null, type: 'BACKGROUND', label: city, lat: p.lat, lng: p.lng, vehicleType: VT[i % VT.length] });
}

(async () => {
  const db = new PrismaClient();
  const VENDORS = 200;
  const vendorUsers = Array.from({ length: VENDORS }, (_, i) => ({ id: crypto.randomUUID(), phone: `+9181${String(i).padStart(8, '0')}`, fullName: `Scenario Vendor ${i}`, role: 'VENDOR', status: 'ACTIVE' }));
  const chunk = async (model, rows) => {
    for (let i = 0; i < rows.length; i += 1000) await db[model].createMany({ data: rows.slice(i, i + 1000), skipDuplicates: true });
  };
  await chunk('user', [
    ...drivers.map((d, i) => ({ id: d.userId, phone: `+9171${String(i).padStart(8, '0')}`, fullName: `Sim ${d.label} ${i}`, role: 'DRIVER', status: 'ACTIVE' })),
    ...vendorUsers,
  ]);
  await chunk('driver', drivers.map((d) => ({
    id: d.id,
    userId: d.userId,
    fullName: `Sim ${d.label}`,
    verificationStatus: d.verificationStatus,
    availabilityStatus: d.availabilityStatus,
    vehicleType: d.vehicleType,
    trustScore: d.trustScore,
    averageRating: d.averageRating,
    totalTrips: d.totalTrips,
    cooldownUntil: d.cooldownUntil ? new Date(d.cooldownUntil) : null,
    currentLat: d.lat.toFixed(7),
    currentLng: d.lng.toFixed(7),
    lastLocationAt: new Date(d.stale ? now - 3600_000 : now),
  })));
  await chunk('vehicle', drivers.map((d, i) => ({ driverId: d.id, vehicleType: d.vehicleType, model: d.vehicleType, registrationNumber: `SC${String(i).padStart(6, '0')}` })));
  await chunk('vendor', vendorUsers.map((u, i) => ({ userId: u.id, organizationName: `Scenario Org ${i}`, fullName: u.fullName, verificationStatus: 'VERIFIED' })));

  const sign = (u) => jwt.sign({ id: u.id, phone: u.phone, email: null, role: u.role }, secret, { expiresIn: '12h' });
  const out = path.join(__dirname, 'data');
  fs.mkdirSync(out, { recursive: true });
  const userById = new Map(drivers.map((d, i) => [d.userId, { id: d.userId, phone: `+9171${String(i).padStart(8, '0')}`, role: 'DRIVER' }]));
  fs.writeFileSync(path.join(out, 'scenario-drivers.json'), JSON.stringify(
    drivers.filter((d) => !d.stale).map((d) => ({ token: sign(userById.get(d.userId)), lat: d.lat, lng: d.lng })),
  ));
  fs.writeFileSync(path.join(out, 'scenario-bookings.json'), JSON.stringify(
    bookings.map((b, i) => ({ ...b, token: sign(vendorUsers[i % VENDORS]) })),
  ));
  fs.writeFileSync(path.join(out, 'scenario-oracle.json'), JSON.stringify({ seededAt: now, zones, drivers, bookings: bookings.map(({ token, ...b }) => b) }));
  console.log(`seeded ${drivers.length} drivers (${drivers.length - BG} scenario), ${bookings.length} bookings across ${zones.length} zones`);
  await db.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
