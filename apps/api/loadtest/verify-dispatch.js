// Checks every offer created during the k6 dispatch run against the scenario oracle.
//   DATABASE_URL=postgresql://load:loadpass@localhost:6433/adhocx_load node verify-dispatch.js
const path = require('path');
const fs = require('fs');
const API = path.resolve(__dirname, '..');
const { PrismaClient } = require(require.resolve('@prisma/client', { paths: [API] }));
const h3 = require(require.resolve('h3-js', { paths: [API] }));

const RADIUS_KM = Number(process.env.DISPATCH_MAX_PICKUP_RADIUS_KM || 10);
const MAX_WAVES = Number(process.env.DISPATCH_MAX_WAVES || 5);
const waveRadius = (w) => Math.min(RADIUS_KM, (RADIUS_KM * Math.min(Math.max(1, w), MAX_WAVES)) / MAX_WAVES);
const kRingFor = (km) => Math.max(1, Math.ceil((km * 1.3) / (Math.sqrt(3) * h3.getHexagonEdgeLengthAvg(8, h3.UNITS.km))));
// Same deterministic exploration rule as apps/api/src/modules/dispatch/dispatch-ranking.ts.
const ROOKIE_SHARE = Number(process.env.DISPATCH_ROOKIE_SHARE ?? 0.15);
const fnv1a = (input) => { let h = 0x811c9dc5; for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const rookieHit = (reqId, wave) => ROOKIE_SHARE > 0 && fnv1a(`${reqId}:${wave}`) % 10000 < Math.round(ROOKIE_SHARE * 10000);
const hav = (a, b) => {
  const R = 6371, r = (x) => (x * Math.PI) / 180;
  const dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const norm = (v) => {
  const s = String(v || '').toUpperCase();
  if (s.includes('SEDAN')) return 'SEDAN';
  if (s.includes('SUV')) return 'SUV';
  if (s.includes('HATCH')) return 'HATCHBACK';
  return s;
};

(async () => {
  const oracle = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'scenario-oracle.json'), 'utf8'));
  const drv = new Map(oracle.drivers.map((d) => [d.id, d]));
  const db = new PrismaClient();
  const reqs = await db.requirement.findMany({ select: { id: true, pickupLat: true, pickupLng: true, vehicleType: true, status: true, dispatchWaves: true, createdAt: true } });
  const offers = await db.offer.findMany({ select: { id: true, requirementId: true, driverId: true, waveNumber: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
  await db.$disconnect();

  const key = (lat, lng, vt) => `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)},${vt}`;
  const bookingByKey = new Map(oracle.bookings.map((b) => [key(b.lat, b.lng, b.vehicleType), b]));
  const reqInfo = new Map(reqs.map((r) => [r.id, { ...r, booking: bookingByKey.get(key(r.pickupLat, r.pickupLng, r.vehicleType)) }]));

  const violations = { radius: [], waveRadius: [], h3: [], vehicle: [], ineligible: [], duplicate: [], unknownDriver: [] };
  const distStats = [];
  const seenPair = new Set();
  for (const o of offers) {
    const r = reqInfo.get(o.requirementId);
    const d = drv.get(o.driverId);
    if (!r) continue;
    if (!d) { violations.unknownDriver.push(o.id); continue; }
    const pickup = { lat: Number(r.pickupLat), lng: Number(r.pickupLng) };
    const km = hav(pickup, d);
    const wave = o.waveNumber || 1;
    const grid = h3.gridDistance(h3.latLngToCell(pickup.lat, pickup.lng, 8), h3.latLngToCell(d.lat, d.lng, 8));
    distStats.push(km);
    const ctx = { offer: o.id, req: r.id, zone: r.booking?.zone || 'background', driver: d.label, km: +km.toFixed(2), wave, grid };
    if (km > RADIUS_KM) violations.radius.push(ctx);
    if (km > waveRadius(wave) + 1e-6) violations.waveRadius.push({ ...ctx, waveRadiusKm: waveRadius(wave) });
    if (grid > kRingFor(waveRadius(wave))) violations.h3.push({ ...ctx, maxGrid: kRingFor(waveRadius(wave)) });
    if (norm(d.vehicleType) !== norm(r.vehicleType)) violations.vehicle.push({ ...ctx, driverVehicle: d.vehicleType, bookingVehicle: r.vehicleType });
    const reasons = [];
    if (d.verificationStatus !== 'VERIFIED') reasons.push('unverified');
    if (d.availabilityStatus !== 'AVAILABLE') reasons.push('offline');
    if (d.stale) reasons.push('stale-gps');
    if (d.cooldownUntil && new Date(d.cooldownUntil).getTime() > new Date(o.createdAt).getTime()) reasons.push('cooldown');
    if (reasons.length) violations.ineligible.push({ ...ctx, reasons });
    const pair = `${o.requirementId}|${o.driverId}`;
    if (seenPair.has(pair)) violations.duplicate.push(ctx);
    seenPair.add(pair);
  }

  // Zone expectations
  const offersByReq = new Map();
  for (const o of offers) {
    if (!offersByReq.has(o.requirementId)) offersByReq.set(o.requirementId, []);
    offersByReq.get(o.requirementId).push({ ...o, label: drv.get(o.driverId)?.label });
  }
  const zoneResults = [];
  for (const r of reqInfo.values()) {
    const b = r.booking;
    if (!b || !b.zone) continue;
    const list = (offersByReq.get(r.id) || []).sort((x, y) => x.waveNumber - y.waveNumber || x.createdAt - y.createdAt);
    const seq = list.map((o) => `w${o.waveNumber}:${o.label}`);
    const labels = list.map((o) => o.label);
    const first = labels[0];
    let expected, pass, note = '';
    switch (b.type) {
      case 'A_TRUST': expected = 'wave 1 → trust95'; pass = first === 'trust95' && list[0].waveNumber === 1; break;
      case 'A2_TRUST_BAND': expected = 'wave 1 → trust82 (higher trust)'; pass = first === 'trust82'; if (first === 'trust72') note = 'low-trust +5 boost outranked the more trusted driver'; break;
      case 'B_ROOKIE': {
        const explore = rookieHit(r.id, 1);
        expected = explore ? 'wave 1 → rookie60 (this booking drew the 15 % exploration slot)' : 'wave 1 → veteran98 (trust 98, 0.8 km)';
        pass = first === (explore ? 'rookie60' : 'veteran98');
        if (!explore && first === 'rookie60') note = 'rookie quota overrode trust, rating and distance';
        break;
      }
      case 'C_VEHICLE':
        if (b.label === 'sedan-booking') { expected = 'only sedan3 (never an SUV)'; pass = labels.length > 0 && labels.every((l) => l === 'sedan3'); }
        else { expected = 'wave 1 → suv0.5, never sedan3'; pass = first === 'suv0.5' && !labels.includes('sedan3'); }
        break;
      case 'D_RADIUS_EDGE': expected = 'in9.7 offered; out10.4 never'; pass = labels.includes('in9.7') && !labels.includes('out10.4'); break;
      case 'E_INELIGIBLE': expected = 'only eligible1.5'; pass = labels.length > 0 && labels.every((l) => l === 'eligible1.5'); break;
      case 'F_OUT_OF_RADIUS': expected = 'no offers, NO_DRIVER_AVAILABLE'; pass = labels.length === 0 && r.status === 'NO_DRIVER_AVAILABLE'; break;
      case 'G_WAVES': {
        expected = 'w1 band1.5 → w2 band3.5 → w3 band5.5 → w4 band7.5 → w5 band9.5';
        const want = ['band1.5', 'band3.5', 'band5.5', 'band7.5', 'band9.5'];
        pass = want.every((l, i) => list[i] && list[i].label === l && list[i].waveNumber === i + 1);
        break;
      }
      case 'H_HATCHBACK': expected = 'only hatch2.5 (never a sedan)'; pass = labels.length > 0 && labels.every((l) => l === 'hatch2.5'); break;
    }
    if (!pass && !note && labels.length === 0 && b.type !== 'F_OUT_OF_RADIUS') note = `no offer at all (status ${r.status}, waves ${r.dispatchWaves})`;
    zoneResults.push({ zone: b.zone, booking: b.label, expected, actual: seq.join(' → ') || '(none)', status: r.status, pass, note });
  }
  zoneResults.sort((a, b) => a.zone.localeCompare(b.zone));

  const bgReqs = [...reqInfo.values()].filter((r) => r.booking && !r.booking.zone);
  const statusCount = {};
  for (const r of reqInfo.values()) statusCount[r.status] = (statusCount[r.status] || 0) + 1;
  distStats.sort((a, b) => a - b);
  const pct = (q) => (distStats.length ? distStats[Math.min(distStats.length - 1, Math.floor(q * distStats.length))].toFixed(2) : '-');
  const summary = {
    requirements: reqInfo.size,
    backgroundRequirements: bgReqs.length,
    backgroundWithOffer: bgReqs.filter((r) => (offersByReq.get(r.id) || []).length > 0).length,
    offers: offers.length,
    requirementStatus: statusCount,
    offerDistanceKm: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: distStats.length ? distStats[distStats.length - 1].toFixed(2) : '-' },
    violations: Object.fromEntries(Object.entries(violations).map(([k, v]) => [k, v.length])),
    zonesPassed: `${zoneResults.filter((z) => z.pass).length}/${zoneResults.length}`,
  };
  fs.writeFileSync(path.join(__dirname, 'dispatch-verify.json'), JSON.stringify({ summary, violations, zoneResults }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log('\nZONES');
  for (const z of zoneResults) console.log(`${z.pass ? 'PASS' : 'FAIL'}  ${z.zone} [${z.booking}]  expected: ${z.expected} | actual: ${z.actual} | ${z.status}${z.note ? ' | ' + z.note : ''}`);
  for (const [k, v] of Object.entries(violations)) if (v.length) console.log(`\n${k} violations (first 5):`, JSON.stringify(v.slice(0, 5)));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
