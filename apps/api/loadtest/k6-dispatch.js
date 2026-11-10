// Live dispatch correctness run: every driver heartbeats its exact seeded position, drivers poll
// offers but never accept (so every booking runs through all its waves), and all bookings are
// posted at once. verify-dispatch.js then checks every offer against the oracle.
//   k6 run -e BASE=http://localhost:7101/api/v1 k6-dispatch.js
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';

const BASE = __ENV.BASE || 'http://localhost:7101/api/v1';
const DURATION = __ENV.DURATION || '4m';
const DRIVERS = new SharedArray('drivers', () => JSON.parse(open('./data/scenario-drivers.json')));
const BOOKINGS = new SharedArray('bookings', () => JSON.parse(open('./data/scenario-bookings.json')));
const booked = new Counter('bookings_created');
const notIndexed = new Counter('heartbeat_not_indexed');

const HB_RATE = Math.ceil(DRIVERS.length / 18); // each driver about every 18 s

export const options = {
  scenarios: {
    heartbeat: {
      executor: 'constant-arrival-rate', exec: 'heartbeat', rate: HB_RATE, timeUnit: '1s',
      duration: DURATION, preAllocatedVUs: 150, maxVUs: 600,
    },
    poll: {
      executor: 'constant-arrival-rate', exec: 'poll', rate: 100, timeUnit: '1s',
      duration: DURATION, preAllocatedVUs: 50, maxVUs: 300, startTime: '20s',
    },
    bookings: {
      executor: 'shared-iterations', exec: 'book', vus: Math.min(200, BOOKINGS.length),
      iterations: BOOKINGS.length, startTime: '40s', maxDuration: '90s',
    },
  },
  thresholds: { checks: ['rate>0.99'] },
};

const auth = (t) => ({ headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, timeout: '30s' });

export function heartbeat() {
  const d = DRIVERS[exec.scenario.iterationInTest % DRIVERS.length];
  const res = http.post(`${BASE}/drivers/location`, JSON.stringify({ latitude: d.lat, longitude: d.lng, accuracyM: 10, source: 'GPS' }), {
    ...auth(d.token), tags: { name: 'POST /drivers/location' },
  });
  check(res, { 'heartbeat 201': (r) => r.status === 201 });
  try {
    if (res.status === 201 && res.json('data.indexed') === false) notIndexed.add(1, { reason: String(res.json('data.reason')) });
  } catch (_) {}
}

export function poll() {
  const d = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
  const res = http.get(`${BASE}/offers`, { ...auth(d.token), tags: { name: 'GET /offers' } });
  check(res, { 'offers 200': (r) => r.status === 200 });
}

export function book() {
  // Global iteration index (__ITER is per-VU: every VU would book BOOKINGS[0]).
  const b = BOOKINGS[exec.scenario.iterationInTest % BOOKINGS.length];
  const res = http.post(`${BASE}/requirements`, JSON.stringify({
    vehicleType: b.vehicleType, quantity: 1, isScheduled: false, fulfillmentMode: 'DIRECT_DISPATCH',
    pickupLocation: { latitude: b.lat, longitude: b.lng, address: `${b.zone || 'bg'} pickup` },
    dropLocation: { latitude: b.lat + 0.08, longitude: b.lng + 0.08, address: 'drop' },
    reportingTime: new Date().toISOString(),
  }), { ...auth(b.token), tags: { name: 'POST /requirements' } });
  if (check(res, { 'booking 201': (r) => r.status === 201 })) booked.add(1);
}
