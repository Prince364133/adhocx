import { GoogleMapsService } from '../src/modules/locations/google-maps.service';

/**
 * Two-phase routing matrix: batching, partial results, fallback and circuit breaker.
 * The HTTP layer is stubbed: no network calls, no billing.
 */
describe('GoogleMapsService.computeDriverEtaMatrix', () => {
  const pickup = { latitude: 28.4595, longitude: 77.0266 };
  const near = { latitude: 28.462, longitude: 77.029 };
  const acrossRiver = { latitude: 28.465, longitude: 77.035 };
  const far = { latitude: 28.52, longitude: 77.08 };

  let service: GoogleMapsService;
  let post: jest.SpyInstance;

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    service = new GoogleMapsService();
    post = jest.spyOn(service as any, 'postJson');
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it('issues ONE batched call for all origins and maps results by originIndex', async () => {
    post.mockResolvedValue([
      { originIndex: 1, destinationIndex: 0, duration: '1500s', distanceMeters: 14000, condition: 'ROUTE_EXISTS' },
      { originIndex: 0, destinationIndex: 0, duration: '180s', distanceMeters: 900, condition: 'ROUTE_EXISTS' },
      { originIndex: 2, destinationIndex: 0, duration: '1320s', distanceMeters: 11000, condition: 'ROUTE_EXISTS' },
    ]);

    const res = await service.computeDriverEtaMatrix([near, acrossRiver, far], pickup);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1]).toBe('/distanceMatrix/v2:computeRouteMatrix');
    expect(post.mock.calls[0][4]).toBe(1500); // hard wall-clock deadline
    expect(res[0]).toEqual({ etaMinutes: 3, distanceKm: 0.9, isRealRoad: true });
    // River crossing: aerially close, but 25 minutes by road -> ranks below the far driver
    expect(res[1].etaMinutes).toBe(25);
    expect(res[2].etaMinutes).toBe(22);
    expect(res[1].etaMinutes).toBeGreaterThan(res[2].etaMinutes);
  });

  it('falls back per-origin when an element has no route', async () => {
    post.mockResolvedValue([
      { originIndex: 0, duration: '240s', distanceMeters: 1200, condition: 'ROUTE_EXISTS' },
      { originIndex: 1, condition: 'ROUTE_NOT_FOUND' },
    ]);
    const res = await service.computeDriverEtaMatrix([near, acrossRiver], pickup);
    expect(res[0].isRealRoad).toBe(true);
    expect(res[1].isRealRoad).toBe(false);
    expect(res[1].etaMinutes).toBeGreaterThanOrEqual(2);
  });

  it('never throws: network failure / quota error returns road-factor estimates', async () => {
    post.mockRejectedValue(new Error('HTTP 429: RESOURCE_EXHAUSTED'));
    const res = await service.computeDriverEtaMatrix([near, far], pickup);
    expect(res).toHaveLength(2);
    expect(res.every((r) => r.isRealRoad === false)).toBe(true);
  });

  it('opens the circuit after 5 failures and stops calling Google', async () => {
    post.mockRejectedValue(new Error('timeout'));
    for (let i = 0; i < 5; i++) {
      // vary origin so cache never short-circuits
      await service.computeDriverEtaMatrix([{ latitude: 28.4 + i * 0.01, longitude: 77 }], pickup);
    }
    expect(service.isCircuitOpen()).toBe(true);
    post.mockClear();
    const res = await service.computeDriverEtaMatrix([far], pickup);
    expect(post).not.toHaveBeenCalled();
    expect(res[0].isRealRoad).toBe(false);
  });

  it('serves repeat lookups from the short-lived cache', async () => {
    post.mockResolvedValue([{ originIndex: 0, duration: '300s', distanceMeters: 2000, condition: 'ROUTE_EXISTS' }]);
    await service.computeDriverEtaMatrix([near], pickup);
    await service.computeDriverEtaMatrix([near], pickup);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('without an API key it never calls the network', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const keyless = new GoogleMapsService();
    const spy = jest.spyOn(keyless as any, 'postJson');
    const res = await keyless.computeDriverEtaMatrix([near], pickup);
    expect(spy).not.toHaveBeenCalled();
    expect(res[0].isRealRoad).toBe(false);
  });
});
