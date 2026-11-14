import { DriverAggregate } from '../src/fleet/aggregates/driver.aggregate';
import { VehicleAggregate } from '../src/fleet/aggregates/vehicle.aggregate';
import { GeoPoint } from '../src/value-objects/geo-point.vo';
import { H3Index } from '../src/value-objects/h3-index.vo';

describe('Fleet & Compliance Context - Aggregates & Invariants', () => {
  const hydLoc = GeoPoint.create(17.4474, 78.3762).getValue();
  const hydH3 = H3Index.fromGeoPoint(hydLoc, 8).getValue();

  describe('DriverAggregate', () => {
    it('should create a driver aggregate with compliance attributes', () => {
      const driverResult = DriverAggregate.create('drv-1', {
        userId: 'user-drv-1',
        verificationStatus: 'VERIFIED',
        dutyStatus: 'OFFLINE',
        licenseNumber: 'TS09-2020-001234',
        licenseExpiry: new Date(Date.now() + 365 * 86400000),
        trustScore: 85,
        createdAt: new Date(),
      });

      expect(driverResult.isSuccess).toBe(true);
      const driver = driverResult.getValue();
      expect(driver.dutyStatus).toBe('OFFLINE');
      expect(driver.isLicenseValid()).toBe(true);
    });

    it('should prevent unverified driver from going online', () => {
      const driver = DriverAggregate.create('drv-unverified', {
        userId: 'user-drv-2',
        verificationStatus: 'PENDING',
        dutyStatus: 'OFFLINE',
        licenseNumber: 'TS09-2022-005678',
        licenseExpiry: new Date(Date.now() + 365 * 86400000),
        trustScore: 50,
        createdAt: new Date(),
      }).getValue();

      const onlineResult = driver.goOnline(hydLoc, hydH3);
      expect(onlineResult.isFailure).toBe(true);
      expect(onlineResult.error).toContain('Must be VERIFIED');
      expect(driver.dutyStatus).toBe('OFFLINE');
    });

    it('should prevent driver with expired license from going online', () => {
      const driver = DriverAggregate.create('drv-expired-lic', {
        userId: 'user-drv-3',
        verificationStatus: 'VERIFIED',
        dutyStatus: 'OFFLINE',
        licenseNumber: 'TS09-2015-009999',
        licenseExpiry: new Date(Date.now() - 86400000), // Expired yesterday
        trustScore: 80,
        createdAt: new Date(),
      }).getValue();

      const onlineResult = driver.goOnline(hydLoc, hydH3);
      expect(onlineResult.isFailure).toBe(true);
      expect(onlineResult.error).toContain('commercial license has expired');
    });

    it('should transition verified driver ONLINE and assign to trip', () => {
      const driver = DriverAggregate.create('drv-active', {
        userId: 'user-drv-4',
        verificationStatus: 'VERIFIED',
        dutyStatus: 'OFFLINE',
        licenseNumber: 'TS09-2021-008888',
        licenseExpiry: new Date(Date.now() + 365 * 86400000),
        trustScore: 90,
        createdAt: new Date(),
      }).getValue();

      expect(driver.goOnline(hydLoc, hydH3).isSuccess).toBe(true);
      expect(driver.dutyStatus).toBe('ONLINE');
      expect(driver.canAcceptOffers()).toBe(true);

      // Assign trip
      expect(driver.assignTrip('trip-101').isSuccess).toBe(true);
      expect(driver.dutyStatus).toBe('BUSY');
      expect(driver.activeTripId).toBe('trip-101');
      expect(driver.canAcceptOffers()).toBe(false);

      // Cannot go offline while busy on trip
      expect(driver.goOffline().isFailure).toBe(true);

      // Release trip
      expect(driver.releaseTrip().isSuccess).toBe(true);
      expect(driver.dutyStatus).toBe('ONLINE');
      expect(driver.activeTripId).toBeUndefined();
    });

    it('should suspend driver immediately and force OFFLINE status', () => {
      const driver = DriverAggregate.create('drv-bad', {
        userId: 'user-drv-5',
        verificationStatus: 'VERIFIED',
        dutyStatus: 'ONLINE',
        licenseNumber: 'TS09-2021-007777',
        licenseExpiry: new Date(Date.now() + 365 * 86400000),
        trustScore: 60,
        createdAt: new Date(),
      }).getValue();

      driver.suspend('Reckless driving violation');
      expect(driver.verificationStatus).toBe('SUSPENDED');
      expect(driver.dutyStatus).toBe('OFFLINE');
      expect(driver.suspensionReason).toBe('Reckless driving violation');
      expect(driver.canAcceptOffers()).toBe(false);
    });
  });

  describe('VehicleAggregate', () => {
    it('should enforce the catalogue-provided capacity limit for a category', () => {
      const validSedan = VehicleAggregate.create('veh-sedan-1', {
        driverId: 'drv-1',
        registrationNumber: 'TS09UB1234',
        category: 'SEDAN',
        seatingCapacity: 4,
        categoryCapacityLimit: 4,
        insuranceExpiry: new Date(Date.now() + 180 * 86400000),
        rcExpiry: new Date(Date.now() + 365 * 86400000),
        isVerified: true,
        createdAt: new Date(),
      });
      expect(validSedan.isSuccess).toBe(true);

      const invalidSedan = VehicleAggregate.create('veh-sedan-overload', {
        driverId: 'drv-1',
        registrationNumber: 'TS09UB5678',
        category: 'SEDAN',
        seatingCapacity: 5,
        categoryCapacityLimit: 4,
        insuranceExpiry: new Date(Date.now() + 180 * 86400000),
        rcExpiry: new Date(Date.now() + 365 * 86400000),
        isVerified: true,
        createdAt: new Date(),
      });
      expect(invalidSedan.isFailure).toBe(true);
      expect(invalidSedan.error).toContain('must be between 1 and 4');

      const customCategory = VehicleAggregate.create('veh-custom-category', {
        driverId: 'drv-2',
        registrationNumber: 'TS09UC9999',
        category: 'CUSTOM_VAN',
        seatingCapacity: 8,
        categoryCapacityLimit: 8,
        insuranceExpiry: new Date(Date.now() + 180 * 86400000),
        rcExpiry: new Date(Date.now() + 365 * 86400000),
        isVerified: true,
        createdAt: new Date(),
      });
      expect(customCategory.isSuccess).toBe(true);
    });

    it('should correctly evaluate commercial road legality based on RC and insurance', () => {
      const vehicle = VehicleAggregate.create('veh-legal', {
        driverId: 'drv-1',
        registrationNumber: 'TS09UB1111',
        category: 'SEDAN',
        seatingCapacity: 4,
        categoryCapacityLimit: 4,
        insuranceExpiry: new Date(Date.now() + 30 * 86400000),
        rcExpiry: new Date(Date.now() + 365 * 86400000),
        isVerified: true,
        createdAt: new Date(),
      }).getValue();

      expect(vehicle.isRoadLegal()).toBe(true);

      // Fast forward past insurance expiry
      const expiredDate = new Date(Date.now() + 60 * 86400000);
      expect(vehicle.isRoadLegal(expiredDate)).toBe(false);
    });
  });
});

