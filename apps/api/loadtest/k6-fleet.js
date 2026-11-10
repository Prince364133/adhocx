// k6 load test: 5,000 driver apps (request-rate model) + hundreds of concurrent bookings.
//   k6 run -e BASE=http://localhost:7101/api/v1 -e SCALE=1 k6-fleet.js
// SCALE multiplies every rate (0.25 = warm-up run).
import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Trend } from 'k6/metrics';

// BASES: comma-separated API instances (round-robin per VU), e.g. 3 processes behind no LB.
const BASES = (__ENV.BASES || __ENV.BASE || 'http://localhost:7101/api/v1').split(',');
const baseFor = () => BASES[__VU % BASES.length];
const SCALE = Number(__ENV.SCALE || 1);
const HOLD = __ENV.HOLD || '4m';
const DRIVERS = new SharedArray('drivers', () => JSON.parse(open('./data/drivers.json')));
const VENDORS = new SharedArray('vendors', () => JSON.parse(open('./data/vendors.json')));
const CENTER = { lat: 28.6315, lng: 77.2167 };

const offersSeen = new Counter('offers_seen');
const offersAccepted = new Counter('offers_accepted');
const acceptConflicts = new Counter('accept_conflicts');
const bookingsCreated = new Counter('bookings_created');
const bookingLatency = new Trend('booking_latency', true);

const rate = (n) => Math.max(1, Math.round(n * SCALE));

export const options = {
  discardResponseBodies: false,
  scenarios: {
    // 5,000 drivers × 1 heartbeat / 30 s
    driver_heartbeat: {
      executor: 'ramping-arrival-rate',
      exec: 'heartbeat',
      startRate: rate(20),
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 400,
      stages: [
        { target: rate(167), duration: '1m' },
        { target: rate(167), duration: HOLD },
        { target: 0, duration: '20s' },
      ],
    },
    // 5,000 driver apps refreshing every 6 s (GET /offers + GET /trips per iteration)
    driver_poll: {
      executor: 'ramping-arrival-rate',
      exec: 'poll',
      startRate: rate(50),
      timeUnit: '1s',
      preAllocatedVUs: 300,
      maxVUs: 900,
      stages: [
        { target: rate(833), duration: '1m' },
        { target: rate(833), duration: HOLD },
        { target: 0, duration: '20s' },
      ],
    },
    // Hundreds of rides at the same moment: every vendor books once within ~10 s
    booking_burst: {
      executor: 'shared-iterations',
      exec: 'book',
      vus: Math.min(300, rate(300)),
      iterations: rate(300),
      startTime: '75s',
      maxDuration: '60s',
    },
    // Then a steady stream of bookings
    booking_sustained: {
      executor: 'constant-arrival-rate',
      exec: 'book',
      rate: rate(5),
      timeUnit: '1s',
      duration: HOLD,
      startTime: '2m30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    'http_req_failed{scenario:driver_heartbeat}': ['rate<0.01'],
    'http_req_failed{scenario:driver_poll}': ['rate<0.01'],
    'http_req_duration{scenario:driver_poll}': ['p(95)<800'],
    'http_req_duration{scenario:driver_heartbeat}': ['p(95)<800'],
    booking_latency: ['p(95)<3000'],
  },
};

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, timeout: '30s' });
const jitter = (km) => (Math.random() - 0.5) * (km / 111);

export function heartbeat() {
  const d = DRIVERS[(__ITER * 7919 + __VU) % DRIVERS.length];
  const res = http.post(
    `${baseFor()}/drivers/location`,
    JSON.stringify({ latitude: d.lat + jitter(0.3), longitude: d.lng + jitter(0.3), accuracyM: 8 + Math.random() * 20, source: 'GPS' }),
    { ...auth(d.token), tags: { name: 'POST /drivers/location' } },
  );
  check(res, { 'heartbeat 201': (r) => r.status === 201 });
}

export function poll() {
  const d = DRIVERS[(__ITER * 104729 + __VU * 31) % DRIVERS.length];
  const offers = http.get(`${baseFor()}/offers`, { ...auth(d.token), tags: { name: 'GET /offers' } });
  check(offers, { 'offers 200': (r) => r.status === 200 });
  http.get(`${baseFor()}/trips`, { ...auth(d.token), tags: { name: 'GET /trips' } });
  if (offers.status !== 200) return;
  let list = [];
  try {
    list = offers.json('data') || [];
  } catch (_) {
    return;
  }
  const live = list.filter((o) => o && (o.status === 'SENT' || !o.status));
  if (!live.length) return;
  offersSeen.add(1);
  if (Math.random() < 0.7) {
    const res = http.post(`${baseFor()}/offers/${live[0].id}/accept`, '{}', { ...auth(d.token), tags: { name: 'POST /offers/:id/accept' } });
    if (res.status === 201 || res.status === 200) offersAccepted.add(1);
    else if (res.status === 409 || res.status === 400) acceptConflicts.add(1);
  }
}

export function book() {
  const v = VENDORS[(__ITER * 13 + __VU) % VENDORS.length];
  const r = 8 * Math.sqrt(Math.random());
  const t = Math.random() * 2 * Math.PI;
  const pickup = { latitude: CENTER.lat + (r / 111) * Math.cos(t), longitude: CENTER.lng + (r / 97) * Math.sin(t), address: 'Load pickup' };
  const drop = { latitude: 28.5355 + jitter(4), longitude: 77.391 + jitter(4), address: 'Load drop' };
  const res = http.post(
    `${baseFor()}/requirements`,
    JSON.stringify({ vehicleType: 'SEDAN', quantity: 1, pickupLocation: pickup, dropLocation: drop, reportingTime: new Date().toISOString(), isScheduled: false, fulfillmentMode: 'DIRECT_DISPATCH' }),
    { ...auth(v.token), tags: { name: 'POST /requirements' } },
  );
  bookingLatency.add(res.timings.duration);
  if (check(res, { 'booking 201': (x) => x.status === 201 })) bookingsCreated.add(1);
}
