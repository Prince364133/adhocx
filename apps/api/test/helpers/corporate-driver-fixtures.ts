/**
 * Shared corporate driver/vehicle fixtures.
 *
 * Corporate eligibility only accepts real VERIFIED Vehicle rows (loaded via
 * `include: { vehicles: { where: { verificationStatus: 'VERIFIED' } } }`) with an explicit
 * passenger category and an insuranceExpiry after the route ends. The driver's inline
 * `vehicleType` is never treated as a vehicle. These helpers build fixtures that satisfy that
 * contract, and make fake `driver.findMany` / `driver.findUnique` honour `include.vehicles`.
 */

/** Well after every route date used in the corporate suites (and after "now" for years to come). */
export const FIXTURE_INSURANCE_EXPIRY = new Date('2030-12-31T23:59:59.000Z');

export function verifiedVehicle(driverId: string, vehicleType: string, overrides: Record<string, any> = {}) {
  return {
    id: `veh-${driverId}`,
    driverId,
    vehicleType,
    verificationStatus: 'VERIFIED',
    insuranceExpiry: FIXTURE_INSURANCE_EXPIRY,
    ...overrides,
  };
}

/** Returns the driver with a single verified vehicle of the driver's own category (default SEDAN). */
export function withVerifiedVehicle<T extends { id: string; vehicleType?: string | null }>(
  driver: T,
  overrides: Record<string, any> = {},
): T & { vehicles: any[] } {
  return { ...driver, vehicles: [verifiedVehicle(driver.id, driver.vehicleType || 'SEDAN', overrides)] };
}

/** Applies a Prisma-like `include.vehicles.where` (simple equality fields only) to a vehicle list. */
export function filterIncludedVehicles(vehicles: any[], include: any): any[] {
  const where = include?.vehicles?.where ?? {};
  return vehicles.filter((v) =>
    Object.entries(where).every(([k, cond]) => (typeof cond === 'object' && cond !== null ? true : v?.[k] === cond)),
  );
}

/**
 * Shapes a stored driver for a fake `driver.findUnique` / `findMany` result.
 * With `include.vehicles`, returns `vehicles` filtered by the include's `where`;
 * `vehiclesOf` supplies them (defaults to the driver's own `vehicles` array).
 * Without `include.vehicles`, the driver is returned as stored.
 */
export function shapeDriver(driver: any, args: any, vehiclesOf?: (driverId: string) => any[]) {
  if (!driver) return driver ?? null;
  if (!args?.include?.vehicles) return driver;
  const all = vehiclesOf ? vehiclesOf(driver.id) : Array.isArray(driver.vehicles) ? driver.vehicles : [];
  return { ...driver, vehicles: filterIncludedVehicles(all, args.include) };
}

/** Filters drivers by a Prisma-like `where.id.in`, when present. */
export function filterDriversByIdIn(drivers: any[], where: any): any[] {
  const ids: string[] | undefined = where?.id?.in;
  return ids ? drivers.filter((d) => d && ids.includes(d.id)) : drivers;
}
