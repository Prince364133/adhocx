import {
  Money,
  GeoPoint,
  H3Index,
  OtpCode,
  DwellBuffer,
  TimeWindow,
} from '../src';

describe('Domain Core - Value Objects & Invariants', () => {
  describe('Money Value Object', () => {
    it('should create valid money in integer paise', () => {
      const moneyOrError = Money.create(125000); // ₹1,250.00
      expect(moneyOrError.isSuccess).toBe(true);
      const money = moneyOrError.getValue();
      expect(money.amountInPaise).toBe(125000);
      expect(money.amountInRupees).toBe(1250);
      expect(money.formatINR()).toBe('₹1250.00');
    });

    it('should reject non-integer paise', () => {
      const moneyOrError = Money.create(1250.45);
      expect(moneyOrError.isFailure).toBe(true);
      expect(moneyOrError.error).toContain('strict integer minor unit');
    });

    it('should reject negative money', () => {
      const moneyOrError = Money.create(-500);
      expect(moneyOrError.isFailure).toBe(true);
    });

    it('should add two money instances accurately without floating point bugs', () => {
      const m1 = Money.fromRupees(100.1).getValue(); // 10010 paise
      const m2 = Money.fromRupees(200.2).getValue(); // 20020 paise
      const sum = m1.add(m2).getValue();
      expect(sum.amountInPaise).toBe(30030);
      expect(sum.amountInRupees).toBe(300.3);
      expect(sum.formatINR()).toBe('₹300.30');
    });

    it('should subtract money accurately and reject negative balance', () => {
      const m1 = Money.fromRupees(500).getValue();
      const m2 = Money.fromRupees(200).getValue();
      const diff = m1.subtract(m2).getValue();
      expect(diff.amountInRupees).toBe(300);

      const invalidDiff = m2.subtract(m1);
      expect(invalidDiff.isFailure).toBe(true);
    });
  });

  describe('GeoPoint Value Object', () => {
    it('should validate valid coordinates', () => {
      const geoOrError = GeoPoint.create(17.448293, 78.374128); // Hitec City, Hyderabad
      expect(geoOrError.isSuccess).toBe(true);
      const geo = geoOrError.getValue();
      expect(geo.latitude).toBe(17.448293);
      expect(geo.longitude).toBe(78.374128);
      expect(geo.toWkt()).toBe('POINT(78.374128 17.448293)');
    });

    it('should reject out of bounds coordinates', () => {
      expect(GeoPoint.create(95.0, 78.0).isFailure).toBe(true);
      expect(GeoPoint.create(17.0, 190.0).isFailure).toBe(true);
    });

    it('should accurately calculate Haversine distance in meters', () => {
      const p1 = GeoPoint.create(17.448293, 78.374128).getValue(); // Point A
      const p2 = GeoPoint.create(17.449500, 78.375500).getValue(); // Point B nearby
      const distance = p1.distanceToMeters(p2);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(500);
    });
  });

  describe('H3Index Value Object', () => {
    it('should generate valid H3 index at resolution 8 from GeoPoint', () => {
      const geo = GeoPoint.create(17.448293, 78.374128).getValue();
      const h3OrError = H3Index.fromGeoPoint(geo, 8);
      expect(h3OrError.isSuccess).toBe(true);
      const h3Index = h3OrError.getValue();
      expect(h3Index.resolution).toBe(8);
      expect(h3Index.index.length).toBeGreaterThan(10);
    });

    it('should generate 5km (127 cells) and 10km (469 cells) dispatch rings', () => {
      const geo = GeoPoint.create(17.448293, 78.374128).getValue();
      const h3Index = H3Index.fromGeoPoint(geo, 8).getValue();

      const ring5km = h3Index.get5KmDispatchRing(); // k = 6 -> 3*6*7 + 1 = 127
      expect(ring5km.length).toBe(127);

      const ring10km = h3Index.get10KmDispatchRing(); // k = 12 -> 3*12*13 + 1 = 469
      expect(ring10km.length).toBe(469);
    });
  });

  describe('OtpCode Value Object', () => {
    it('should generate and validate 4-digit numeric OTP', () => {
      const otp = OtpCode.generate(4);
      expect(otp.code).toMatch(/^\d{4}$/);
      expect(otp.validate(otp.code)).toBe(true);
      expect(otp.validate('0000')).toBe(otp.code === '0000');
    });

    it('should reject invalid non-numeric OTPs', () => {
      expect(OtpCode.create('ABCD').isFailure).toBe(true);
      expect(OtpCode.create('12').isFailure).toBe(true);
      expect(OtpCode.create('1234567').isFailure).toBe(true);
    });
  });

  describe('DwellBuffer Value Object', () => {
    it('should default to standard 5 minutes (300 seconds)', () => {
      const buffer = DwellBuffer.standardFiveMinutes();
      expect(buffer.bufferSeconds).toBe(300);
      expect(buffer.bufferMinutes).toBe(5);
    });

    it('should verify when dwell buffer has elapsed', () => {
      const buffer = DwellBuffer.standardFiveMinutes();
      expect(buffer.hasElapsed(120)).toBe(false); // 2 mins: not elapsed
      expect(buffer.hasElapsed(300)).toBe(true);  // 5 mins: elapsed!
      expect(buffer.hasElapsed(315)).toBe(true);  // Over 5 mins: elapsed!
      expect(buffer.remainingSeconds(240)).toBe(60);
      expect(buffer.remainingSeconds(310)).toBe(0);
    });
  });

  describe('TimeWindow Value Object', () => {
    it('should validate time window boundaries', () => {
      const start = new Date('2026-11-15T06:00:00Z');
      const end = new Date('2026-11-15T08:00:00Z');
      const windowOrError = TimeWindow.create(start, end);
      expect(windowOrError.isSuccess).toBe(true);
      const window = windowOrError.getValue();
      expect(window.durationMinutes).toBe(120);
    });

    it('should enforce 9-hour cancellation cutoff rule', () => {
      const pickupTime = new Date('2026-11-15T07:00:00Z'); // 07:00 AM
      const window = TimeWindow.create(pickupTime, new Date('2026-11-15T08:30:00Z')).getValue();

      // 10 hours before pickup -> Allowed
      const tenHoursBefore = new Date('2026-11-14T21:00:00Z');
      expect(window.isBeforeCutoff(tenHoursBefore, 9)).toBe(true);

      // 8 hours before pickup -> Past cutoff (Requires manager approval)
      const eightHoursBefore = new Date('2026-11-14T23:00:00Z');
      expect(window.isBeforeCutoff(eightHoursBefore, 9)).toBe(false);
    });
  });
});

