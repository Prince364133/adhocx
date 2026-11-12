import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';

describe('CorporateRoutingController route optimization validation', () => {
  const routeSolverService = {
    optimizeAndCreateRoutes: jest.fn().mockResolvedValue({ direction: 'LOGIN' }),
  };
  let controller: CorporateRoutingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CorporateRoutingController(routeSolverService as any, {} as any);
  });

  const validLogin = {
    tenantId: 'tenant-1',
    officeId: 'office-1',
    shiftDate: '2026-11-10',
    direction: 'LOGIN' as const,
    loginTime: '08:00',
    logoutTime: '17:00',
  };

  it.each([
    ['LOGIN', { loginTime: '08:00' }],
    ['LOGOUT', { logoutTime: '17:00' }],
    ['BOTH', { loginTime: '08:00', logoutTime: '17:00' }],
  ] as const)('accepts %s when its selected direction times are present', async (direction, times) => {
    await controller.optimizeRoutes({ ...validLogin, direction, ...times });

    expect(routeSolverService.optimizeAndCreateRoutes).toHaveBeenCalledWith(
      expect.objectContaining({ direction, ...times }),
    );
  });

  it.each([
    [{ direction: 'LOGIN', loginTime: undefined }, /loginTime/],
    [{ direction: 'LOGOUT', logoutTime: undefined }, /logoutTime/],
    [{ direction: 'BOTH', loginTime: '08:00', logoutTime: undefined }, /logoutTime/],
    [{ shiftDate: '2026-02-30' }, /calendar date/],
    [{ shiftDate: '11-10-2026' }, /calendar date/],
    [{ direction: 'LOGIN', loginTime: '24:00' }, /loginTime/],
    [{ stopDwellMinutes: 0 }, /stopDwellMinutes/],
    [{ stopDwellMinutes: 11 }, /stopDwellMinutes/],
    [{ sedanCapacity: 0 }, /sedanCapacity/],
    [{ sedanCapacity: 4 }, /sedanCapacity/],
    [{ suvCapacity: 7 }, /suvCapacity/],
    [{ routingPreference: 'SHORTEST' }, /routingPreference/],
  ])('rejects invalid optimization request values %#', async (overrides, message) => {
    await expect(
      controller.optimizeRoutes({ ...validLogin, ...overrides } as any),
    ).rejects.toThrow(message);
  });

  it.each([1, 10])('accepts stop dwell boundary %i', async (stopDwellMinutes) => {
    await controller.optimizeRoutes({ ...validLogin, stopDwellMinutes });
    expect(routeSolverService.optimizeAndCreateRoutes).toHaveBeenCalled();
  });

  it('requires independently dated login and logout fallbacks for roster BOTH streams', async () => {
    const file = { buffer: Buffer.from('unused'), originalname: 'roster.csv' } as any;

    await expect(
      controller.planStream(
        file,
        { direction: 'BOTH', loginTime: '2026-11-10T08:00:00+05:30', logoutTime: '17:00' },
        {} as any,
      ),
    ).rejects.toThrow('LOGOUT roster planning requires a valid logoutTime date and time');

    await expect(
      controller.planStream(
        file,
        { direction: 'BOTH', loginTime: '2026-02-30T08:00:00+05:30', logoutTime: '2026-11-10T17:00:00+05:30' },
        {} as any,
      ),
    ).rejects.toThrow('LOGIN roster planning requires a valid loginTime date and time');
  });

  it('uses the single-upload batch planner and streams its per-direction result for BOTH', async () => {
    const batch = {
      direction: 'BOTH',
      plans: [
        { direction: 'LOGIN', success: true, plan: { employeeCount: 2 } },
        { direction: 'LOGOUT', success: false, error: 'LOGOUT failed' },
      ],
      employeeCount: 2,
      cabCount: 1,
      totalKm: 8,
    };
    const routePlannerService = { planBatchFromFile: jest.fn().mockResolvedValue(batch) };
    const streamController = new CorporateRoutingController(
      routeSolverService as any,
      {} as any,
      routePlannerService as any,
    );
    const response = {
      writableEnded: false,
      destroyed: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
    };

    await streamController.planStream(
      { buffer: Buffer.from('unused'), originalname: 'roster.csv' } as any,
      {
        direction: 'BOTH',
        loginTime: '2026-11-10T08:00:00+05:30',
        logoutTime: '2026-11-10T17:00:00+05:30',
      },
      response as any,
    );

    expect(routePlannerService.planBatchFromFile).toHaveBeenCalledTimes(1);
    expect(response.write).toHaveBeenCalledWith(expect.stringContaining('"batch"'));
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['officeRadiusKm', '0'],
    ['officeRadiusKm', '51'],
    ['maxTripKm', '0'],
    ['maxTripKm', '51'],
    ['pickupWaitMinutes', '0'],
    ['pickupWaitMinutes', '11'],
    ['bufferMinutes', '-1'],
    ['bufferMinutes', '31'],
  ])('rejects invalid roster %s value %s before starting the stream', async (field, value) => {
    const file = { buffer: Buffer.from('unused'), originalname: 'roster.csv' } as any;

    await expect(
      controller.planStream(
        file,
        {
          direction: 'LOGIN',
          loginTime: '2026-11-10T08:00:00+05:30',
          [field]: value,
        },
        {} as any,
      ),
    ).rejects.toThrow(`${field} must be`);
  });
});
