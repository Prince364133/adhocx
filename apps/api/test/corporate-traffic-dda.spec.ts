import { CorporateDispatchService } from '../src/domains/corporate/dispatch/corporate-dispatch.service';
import { GoogleTrafficEstimatorAdapter } from '../src/domains/corporate/dispatch/traffic/google-traffic-estimator.adapter';
import {
  ITrafficEstimatorPort,
  TrafficRouteEstimate,
  TrafficWaypoint,
} from '../src/domains/corporate/dispatch/traffic/traffic-estimator.port';
import { GoogleMapsService } from '../src/modules/locations/google-maps.service';

/**
 * Dynamic Dispatch Advancer (DDA) backed by Google Routes traffic forecasts.
 *
 * Worked example used throughout (all UTC):
 *   login / office arrival 08:00, 1.5 h free-flow drive, 4 pickups x 5 min dwell
 *   => pickup-1 = 08:00 - 90m - 20m = 06:10, dispatch = 05:10
 *   with +60 m traffic => pickup-1 05:10, dispatch 04:10 (one hour earlier)
 */

/** IST wall-clock instant (shift times are IST regardless of the server timezone). */
const ist = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi) - 330 * 60_000);

const MIN = 60_000;
const at = (hhmm: string) => new Date(`2026-11-10T${hhmm}:00.000Z`);

const OFFICE = { latitude: 17.4435, longitude: 78.3772 };
const PICKUPS: TrafficWaypoint[] = [
  { latitude: 17.385, longitude: 78.4867 },
  { latitude: 17.401, longitude: 78.4712 },
  { latitude: 17.4126, longitude: 78.4482 },
  { latitude: 17.4239, longitude: 78.4211 },
];

const FREE_FLOW_SEC = 90 * 60;
const DWELL_SEC = PICKUPS.length * 5 * 60;

function buildLoginRoute(overrides: Record<string, any> = {}) {
  const stored = overrides.targetPickup1Time ?? at('06:10');
  const pickupStops = PICKUPS.map((p, i) => ({
    id: `stop-${i + 1}`,
    stopSequence: i + 1,
    stopType: 'PICKUP',
    latitude: p.latitude,
    longitude: p.longitude,
    plannedEta: new Date(stored.getTime() + i * 25 * MIN),
  }));
  return {
    id: 'route-login-1',
    direction: 'LOGIN',
    status: 'PLANNED',
    targetPickup1Time: stored,
    targetOfficeArrivalTime: at('08:00'),
    estDurationSeconds: FREE_FLOW_SEC + DWELL_SEC,
    estDistanceMeters: 32000,
    office: { name: 'HITEC HQ', ...OFFICE },
    stops: [
      ...pickupStops,
      {
        id: 'stop-office',
        stopSequence: 5,
        stopType: 'DROPOFF',
        latitude: OFFICE.latitude,
        longitude: OFFICE.longitude,
        plannedEta: at('08:00'),
      },
    ],
    ...overrides,
  };
}

function googleEstimate(delayMin: number, freeFlowSec = FREE_FLOW_SEC): TrafficRouteEstimate {
  return {
    durationInTrafficSec: freeFlowSec + delayMin * 60,
    staticDurationSec: freeFlowSec,
    distanceMeters: 32000,
    source: 'GOOGLE',
  };
}

function makeFakeRedis() {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    store,
    get: jest.fn(async (k: string) => store.get(k)?.value ?? null),
    set: jest.fn(async (k: string, v: string, ttl?: number) => {
      store.set(k, { value: v, ttl });
    }),
  };
}

describe('Corporate DDA: Google traffic estimator adapter', () => {
  let google: { hasApiKey: jest.Mock; computeTrafficAwareRoute: jest.Mock };
  let redis: ReturnType<typeof makeFakeRedis>;
  let adapter: GoogleTrafficEstimatorAdapter;
  const route = [...PICKUPS, OFFICE];

  beforeEach(() => {
    google = {
      hasApiKey: jest.fn().mockReturnValue(true),
      computeTrafficAwareRoute: jest.fn(),
    };
    redis = makeFakeRedis();
    adapter = new GoogleTrafficEstimatorAdapter(google as unknown as GoogleMapsService, redis as any);
    jest.spyOn((adapter as any).logger, 'warn').mockImplementation(() => undefined);
  });

  it('returns a GOOGLE estimate with zero delay when there is no traffic', async () => {
    google.computeTrafficAwareRoute.mockResolvedValue({
      durationSeconds: 5400,
      staticDurationSeconds: 5400,
      distanceMeters: 32000,
    });
    const est = await adapter.estimateRouteDuration(route, at('06:10'));
    expect(est).toEqual({
      durationInTrafficSec: 5400,
      staticDurationSec: 5400,
      distanceMeters: 32000,
      source: 'GOOGLE',
    });
  });

  it('cache miss: calls Google once and stores the result for one 15-minute bucket', async () => {
    google.computeTrafficAwareRoute.mockResolvedValue({
      durationSeconds: 7200,
      staticDurationSeconds: 5400,
      distanceMeters: 32000,
    });
    await adapter.estimateRouteDuration(route, at('06:10'));
    expect(google.computeTrafficAwareRoute).toHaveBeenCalledTimes(1);
    const key = adapter.cacheKey(route, at('06:10'));
    expect(redis.set).toHaveBeenCalledWith(key, expect.any(String), 15 * 60);
  });

  it('cache hit: a second poll in the same bucket does not call Google', async () => {
    google.computeTrafficAwareRoute.mockResolvedValue({
      durationSeconds: 7200,
      staticDurationSeconds: 5400,
      distanceMeters: 32000,
    });
    await adapter.estimateRouteDuration(route, at('06:10'));
    const second = await adapter.estimateRouteDuration(route, at('06:10'));
    expect(google.computeTrafficAwareRoute).toHaveBeenCalledTimes(1);
    expect(second.cached).toBe(true);
    expect(second.durationInTrafficSec).toBe(7200);
  });

  it('buckets departures by 15 minutes: 06:01 and 06:14 share a key, 06:16 does not', () => {
    expect(adapter.cacheKey(route, at('06:01'))).toBe(adapter.cacheKey(route, at('06:14')));
    expect(adapter.cacheKey(route, at('06:16'))).not.toBe(adapter.cacheKey(route, at('06:14')));
  });

  it('different waypoint sequences produce different cache keys', () => {
    const reversed = [...route].reverse();
    expect(adapter.cacheKey(reversed, at('06:10'))).not.toBe(adapter.cacheKey(route, at('06:10')));
  });

  it('de-duplicates concurrent identical requests into a single Google call', async () => {
    google.computeTrafficAwareRoute.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ durationSeconds: 6000, staticDurationSeconds: 5400, distanceMeters: 1 }), 5)),
    );
    const results = await Promise.all([
      adapter.estimateRouteDuration(route, at('06:10')),
      adapter.estimateRouteDuration(route, at('06:10')),
      adapter.estimateRouteDuration(route, at('06:10')),
    ]);
    expect(google.computeTrafficAwareRoute).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.durationInTrafficSec === 6000)).toBe(true);
  });

  it('API failure falls back to the HEURISTIC estimate, logs it, and negative-caches briefly', async () => {
    google.computeTrafficAwareRoute.mockRejectedValue(new Error('HTTP 503'));
    const est = await adapter.estimateRouteDuration(route, at('06:10'), {
      distanceMetersHint: 32000,
      staticDurationSecHint: 5400,
    });
    expect(est.source).toBe('HEURISTIC');
    expect(est.staticDurationSec).toBe(5400);
    expect((adapter as any).logger.warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
    expect(redis.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 120);
  });

  it('missing API key: never calls Google and returns HEURISTIC', async () => {
    google.hasApiKey.mockReturnValue(false);
    const est = await adapter.estimateRouteDuration(route, at('06:10'));
    expect(google.computeTrafficAwareRoute).not.toHaveBeenCalled();
    expect(est.source).toBe('HEURISTIC');
    expect(est.distanceMeters).toBeGreaterThan(0);
  });

  it('passes multi-stop waypoints in order with the departure time and configured timeout', async () => {
    process.env.CORPORATE_DDA_GOOGLE_TIMEOUT_MS = '2500';
    adapter = new GoogleTrafficEstimatorAdapter(google as unknown as GoogleMapsService, redis as any);
    delete process.env.CORPORATE_DDA_GOOGLE_TIMEOUT_MS;
    google.computeTrafficAwareRoute.mockResolvedValue({
      durationSeconds: 5400,
      staticDurationSeconds: 5400,
      distanceMeters: 32000,
    });
    await adapter.estimateRouteDuration(route, at('06:10'));
    expect(google.computeTrafficAwareRoute).toHaveBeenCalledWith(route, at('06:10'), 2500);
  });

  it('GoogleMapsService builds a traffic-aware Routes request with intermediates and departureTime', async () => {
    const prev = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const svc = new GoogleMapsService();
    if (prev === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = prev;

    const postJson = jest.spyOn(svc as any, 'postJson').mockResolvedValue({
      routes: [{ duration: '9000s', staticDuration: '5400s', distanceMeters: 32000 }],
    });
    const departure = new Date(Date.now() + 6 * 60 * MIN);
    const r = await svc.computeTrafficAwareRoute(route, departure, 1234);

    expect(r).toEqual({ durationSeconds: 9000, staticDurationSeconds: 5400, distanceMeters: 32000 });
    const [host, path, payload, headers, timeout] = postJson.mock.calls[0] as any[];
    const body = JSON.parse(payload);
    expect(host).toBe('routes.googleapis.com');
    expect(path).toBe('/directions/v2:computeRoutes');
    expect(body.routingPreference).toBe('TRAFFIC_AWARE_OPTIMAL');
    expect(body.intermediates).toHaveLength(3);
    expect(body.origin.location.latLng.latitude).toBe(PICKUPS[0].latitude);
    expect(body.destination.location.latLng.latitude).toBe(OFFICE.latitude);
    expect(body.departureTime).toBe(departure.toISOString());
    expect(headers['X-Goog-FieldMask']).toContain('routes.staticDuration');
    expect(timeout).toBe(1234);
  });
});

describe('Corporate DDA: assessDynamicTraffic with traffic estimator port', () => {
  let db: any;
  let notifications: any;
  let audit: any;
  let estimator: { estimateRouteDuration: jest.Mock };
  let service: CorporateDispatchService;

  const build = (port?: ITrafficEstimatorPort) =>
    new CorporateDispatchService(db, {} as any, notifications, audit, {} as any, port);

  beforeEach(() => {
    db = {
      corporateRoute: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      corporateRouteStop: { update: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };
    notifications = { emitEvent: jest.fn() };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    estimator = { estimateRouteDuration: jest.fn() };
    service = build(estimator);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  it('worked example, no traffic: driver at pickup-1 06:10, dispatch 05:10, nothing advanced', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(0));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.originalPickup1Time).toEqual(at('06:10'));
    expect(r.adjustedPickup1Time).toEqual(at('06:10'));
    expect(r.standardDispatchTime).toEqual(at('05:10'));
    expect(r.adjustedDispatchTime).toEqual(at('05:10'));
    expect(r.isAdvanced).toBe(false);
    expect(r.congestionLevel).toBe('NORMAL');
    expect(r.trafficSource).toBe('GOOGLE');
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('sends ordered multi-stop waypoints (4 pickups -> office) departing at planned pickup-1', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(0));

    await service.assessDynamicTraffic('route-login-1');

    const [waypoints, departure, hints] = estimator.estimateRouteDuration.mock.calls[0];
    expect(waypoints).toEqual([...PICKUPS, OFFICE]);
    expect(departure).toEqual(at('06:10'));
    expect(hints).toEqual({ distanceMetersHint: 32000, staticDurationSecHint: FREE_FLOW_SEC });
  });

  it('+10 min traffic: MODERATE, below threshold, standard dispatch kept', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(10));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.trafficDelayMinutes).toBe(10);
    expect(r.congestionLevel).toBe('MODERATE');
    expect(r.isAdvanced).toBe(false);
    expect(r.adjustedDispatchTime).toEqual(at('05:10'));
  });

  it('+30 min traffic (exactly at threshold): pickup-1 05:40, dispatch 04:40', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(30));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.isAdvanced).toBe(true);
    expect(r.congestionLevel).toBe('SEVERE');
    expect(r.adjustedPickup1Time).toEqual(at('05:40'));
    expect(r.adjustedDispatchTime).toEqual(at('04:40'));
  });

  it('worked example +60 min traffic: pickup-1 05:10, dispatch 04:10, persisted to route and stops', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(60));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.trafficDelayMinutes).toBe(60);
    expect(r.adjustedPickup1Time).toEqual(at('05:10'));
    expect(r.adjustedDispatchTime).toEqual(at('04:10'));
    expect(r.standardDispatchTime).toEqual(at('05:10'));
    expect(r.persisted).toBe(true);

    expect(db.corporateRoute.update).toHaveBeenCalledWith({
      where: { id: 'route-login-1' },
      data: { targetPickup1Time: at('05:10') },
    });
    // 4 pickup stops shifted 60 min earlier; office DROPOFF ETA (login anchor) untouched
    expect(db.corporateRouteStop.update).toHaveBeenCalledTimes(4);
    expect(db.corporateRouteStop.update).toHaveBeenCalledWith({
      where: { id: 'stop-2' },
      data: { plannedEta: new Date(at('06:35').getTime() - 60 * MIN) },
    });
    expect(db.corporateRouteStop.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'stop-office' } }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CORPORATE_DDA_PICKUP_ADVANCED' }));
  });

  it('is idempotent across polls: an already-advanced route is not advanced twice', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute({ targetPickup1Time: at('05:10') }));
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(60));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.adjustedPickup1Time).toEqual(at('05:10'));
    expect(r.adjustedDispatchTime).toEqual(at('04:10'));
    expect(r.persisted).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('never moves a communicated pickup later when traffic eases after an advance', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute({ targetPickup1Time: at('05:10') }));
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(0));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.isAdvanced).toBe(false);
    expect(r.adjustedPickup1Time).toEqual(at('05:10'));
    expect(r.adjustedDispatchTime).toEqual(at('04:10'));
  });

  it('uses the longer Google in-traffic drive when the planner underestimated free-flow time', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    // Google free-flow 100 min (planner said 90) + 40 min traffic => 140 min drive
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(40, 100 * 60));

    const r = await service.assessDynamicTraffic('route-login-1');

    // 08:00 - 140m drive - 20m dwell = 05:20
    expect(r.adjustedPickup1Time).toEqual(at('05:20'));
    expect(r.adjustedDispatchTime).toEqual(at('04:20'));
  });

  it('advance threshold is configurable via CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES', async () => {
    process.env.CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES = '45';
    service = build(estimator);
    delete process.env.CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES;
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValueOnce(googleEstimate(30));
    expect((await service.assessDynamicTraffic('route-login-1')).isAdvanced).toBe(false);

    estimator.estimateRouteDuration.mockResolvedValueOnce(googleEstimate(50));
    expect((await service.assessDynamicTraffic('route-login-1')).isAdvanced).toBe(true);
  });

  it('HEURISTIC-sourced advances move dispatch earlier but are never persisted', async () => {
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue({ ...googleEstimate(35), source: 'HEURISTIC' });

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.isAdvanced).toBe(true);
    expect(r.trafficSource).toBe('HEURISTIC');
    expect(r.adjustedDispatchTime.getTime()).toBeLessThan(r.standardDispatchTime.getTime());
    expect(r.persisted).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('estimator throwing falls back to the inline peak-hour heuristic', async () => {
    const peakIst = ist(2026, 10, 10, 7, 30);
    db.corporateRoute.findUnique.mockResolvedValue({
      id: 'route-x',
      direction: 'LOGIN',
      targetPickup1Time: peakIst,
      estDistanceMeters: 38000,
      stops: [{ stopSequence: 1, latitude: 17.5, longitude: 78.35 }],
    });
    estimator.estimateRouteDuration.mockRejectedValue(new Error('boom'));

    const r = await service.assessDynamicTraffic('route-x');

    expect(r.trafficSource).toBe('HEURISTIC');
    expect(r.trafficDelayMinutes).toBe(35);
    expect(r.isAdvanced).toBe(true);
  });

  it('no estimator bound (legacy wiring): keeps the original heuristic result shape', async () => {
    service = build(undefined);
    db.corporateRoute.findUnique.mockResolvedValue({
      id: 'route-midday',
      direction: 'LOGIN',
      targetPickup1Time: ist(2026, 10, 10, 12, 0),
      estDistanceMeters: 15000,
      stops: [{ stopSequence: 1, latitude: 17.44, longitude: 78.38 }],
    });

    const r = await service.assessDynamicTraffic('route-midday');

    expect(r).toEqual(
      expect.objectContaining({
        routeId: 'route-midday',
        trafficDelayMinutes: 0,
        isAdvanced: false,
        congestionLevel: 'NORMAL',
        reason: expect.any(String),
      }),
    );
    expect(r.adjustedDispatchTime).toEqual(r.standardDispatchTime);
  });

  it('LOGOUT: office departure stays fixed, dispatch advances by the traffic delay, office-first waypoints', async () => {
    db.corporateRoute.findUnique.mockResolvedValue({
      id: 'route-logout-1',
      direction: 'LOGOUT',
      targetPickup1Time: at('18:00'),
      targetOfficeArrivalTime: at('18:00'),
      estDurationSeconds: 4000,
      estDistanceMeters: 25000,
      office: { name: 'HQ', ...OFFICE },
      stops: [
        { id: 'o', stopSequence: 1, stopType: 'PICKUP', ...OFFICE, plannedEta: at('18:00') },
        { id: 'd1', stopSequence: 2, stopType: 'DROPOFF', ...PICKUPS[3], plannedEta: at('18:30') },
        { id: 'd2', stopSequence: 3, stopType: 'DROPOFF', ...PICKUPS[0], plannedEta: at('19:00') },
      ],
    });
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(40, 3600));

    const r = await service.assessDynamicTraffic('route-logout-1');

    // staging 15m + lead 60m => 16:45, then -40m traffic => 16:05
    expect(r.standardDispatchTime).toEqual(at('16:45'));
    expect(r.adjustedDispatchTime).toEqual(at('16:05'));
    expect(r.adjustedPickup1Time).toEqual(at('18:00'));
    expect(r.persisted).toBe(false);
    expect(estimator.estimateRouteDuration.mock.calls[0][0][0]).toEqual(OFFICE);
  });

  it('persistence failure does not break the assessment', async () => {
    db.$transaction.mockRejectedValue(new Error('db down'));
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    db.corporateRoute.findUnique.mockResolvedValue(buildLoginRoute());
    estimator.estimateRouteDuration.mockResolvedValue(googleEstimate(60));

    const r = await service.assessDynamicTraffic('route-login-1');

    expect(r.adjustedDispatchTime).toEqual(at('04:10'));
    expect(r.persisted).toBe(false);
  });
});

describe('Corporate DDA: live Google Routes smoke test', () => {
  const liveIt = process.env.GOOGLE_MAPS_API_KEY ? it : it.skip;

  liveIt(
    'computes a traffic-aware multi-stop Hyderabad route for tomorrow 08:00 IST',
    async () => {
      const adapter = new GoogleTrafficEstimatorAdapter(new GoogleMapsService());
      const tomorrow = new Date(Date.now() + 24 * 60 * MIN);
      const ist = new Date(`${tomorrow.toISOString().slice(0, 10)}T08:00:00+05:30`);
      const est = await adapter.estimateRouteDuration([...PICKUPS, OFFICE], ist);

      expect(['GOOGLE', 'HEURISTIC']).toContain(est.source);
      expect(est.durationInTrafficSec).toBeGreaterThan(0);
      expect(est.staticDurationSec).toBeGreaterThan(0);
      expect(est.distanceMeters).toBeGreaterThan(5000);
    },
    20_000,
  );
});
