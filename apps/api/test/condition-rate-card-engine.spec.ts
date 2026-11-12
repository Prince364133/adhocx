import { BadRequestException } from '@nestjs/common';
import { evaluatePeakTime, validatePeakWindows, parsePickupTime, planPeakWindows } from '../src/modules/pricing/peak-hours';
import { DistancePricingService, slabRates } from '../src/modules/pricing/distance-pricing.service';

/** Instant for an IST wall-clock time; independent of the machine's TZ. */
const ist = (hhmm: string, day = '2026-11-12') => new Date(`${day}T${hhmm}:00+05:30`);

describe('Peak-hour pricing invariants', () => {
  const windows = [
    { start: '08:00', end: '11:00', label: 'Morning Peak' },
    { start: '17:00', end: '21:30', label: 'Evening Peak' },
  ];

  describe('evaluatePeakTime (IST, [start, end))', () => {
    it('is peak inside a window and off-peak outside', () => {
      expect(evaluatePeakTime(ist('09:15'), windows)).toMatchObject({ isPeak: true, activeWindow: { label: 'Morning Peak' } });
      expect(evaluatePeakTime(ist('18:45'), windows)).toMatchObject({ isPeak: true, activeWindow: { label: 'Evening Peak' } });
      expect(evaluatePeakTime(ist('14:00'), windows)).toEqual({ isPeak: false });
    });

    it('treats start as peak and end as non-peak', () => {
      expect(evaluatePeakTime(ist('07:59'), windows).isPeak).toBe(false);
      expect(evaluatePeakTime(ist('08:00'), windows).isPeak).toBe(true);
      expect(evaluatePeakTime(ist('10:59'), windows).isPeak).toBe(true);
      expect(evaluatePeakTime(ist('11:00'), windows).isPeak).toBe(false);
      expect(evaluatePeakTime(ist('21:30'), windows).isPeak).toBe(false);
    });

    it('evaluates in IST regardless of how the instant is written (regression: server-TZ getHours)', () => {
      // 03:45 UTC is 09:15 IST (peak). A UTC server using getHours() saw 03:45 (off-peak).
      expect(evaluatePeakTime(new Date('2026-11-12T03:45:00Z'), windows).isPeak).toBe(true);
      // 09:15 UTC is 14:45 IST (off-peak).
      expect(evaluatePeakTime(new Date('2026-11-12T09:15:00Z'), windows).isPeak).toBe(false);
    });

    it('handles windows that cross midnight', () => {
      const night = [{ start: '22:00', end: '02:00', label: 'Night' }];
      expect(evaluatePeakTime(ist('23:15'), night).isPeak).toBe(true);
      expect(evaluatePeakTime(ist('01:30'), night).isPeak).toBe(true);
      expect(evaluatePeakTime(ist('02:00'), night).isPeak).toBe(false);
      expect(evaluatePeakTime(ist('21:59'), night).isPeak).toBe(false);
    });

    it('is never peak when a plan has no windows (legacy plans keep their exact prices)', () => {
      expect(evaluatePeakTime(ist('09:15'), [])).toEqual({ isPeak: false });
      expect(evaluatePeakTime(ist('09:15'), planPeakWindows(null))).toEqual({ isPeak: false });
    });
  });

  describe('validatePeakWindows', () => {
    it('accepts disjoint windows and an empty list', () => {
      expect(validatePeakWindows(windows)).toHaveLength(2);
      expect(validatePeakWindows([])).toEqual([]);
      expect(validatePeakWindows([{ start: '08:00', end: '11:00' }, { start: '11:00', end: '12:00' }])).toHaveLength(2); // touching is fine
    });

    it('rejects overlaps, including against an overnight window (regression: overnight was never checked)', () => {
      expect(() => validatePeakWindows([{ start: '08:00', end: '11:30' }, { start: '10:00', end: '13:00' }])).toThrow(BadRequestException);
      expect(() => validatePeakWindows([{ start: '22:00', end: '02:00' }, { start: '01:00', end: '03:00' }])).toThrow(/overlaps/);
      expect(() => validatePeakWindows([{ start: '22:00', end: '02:00' }, { start: '23:00', end: '01:00' }])).toThrow(/overlaps/);
    });

    it('rejects bad formats, zero-length and sub-30-minute windows', () => {
      expect(() => validatePeakWindows([{ start: '10:00', end: '10:00' }])).toThrow(BadRequestException);
      expect(() => validatePeakWindows([{ start: '25:00', end: '10:00' }])).toThrow(BadRequestException);
      expect(() => validatePeakWindows([{ start: '8:00', end: '10:00' }])).toThrow(BadRequestException);
      expect(() => validatePeakWindows([{ start: '10:00', end: '10:20' }])).toThrow(/at least 30 minutes/);
      expect(() => validatePeakWindows([{ start: '23:50', end: '00:10' }])).toThrow(/at least 30 minutes/);
    });

    it('caps the number of windows', () => {
      const many = Array.from({ length: 7 }, (_, i) => ({ start: `${String(i * 3).padStart(2, '0')}:00`, end: `${String(i * 3 + 1).padStart(2, '0')}:00` }));
      expect(() => validatePeakWindows(many)).toThrow(/At most/);
    });

    it('is exposed on the service for callers', () => {
      const svc = new DistancePricingService({} as any, {} as any);
      expect(() => svc.validatePeakWindows([{ start: '08:00', end: '11:30' }, { start: '10:00', end: '13:00' }])).toThrow(BadRequestException);
    });
  });

  describe('parsePickupTime', () => {
    it('defaults to now and rejects garbage instead of silently pricing off-peak', () => {
      const now = new Date('2026-11-12T00:00:00Z');
      expect(parsePickupTime(undefined, now)).toBe(now);
      expect(() => parsePickupTime('not-a-date')).toThrow(BadRequestException);
    });
  });

  describe('slabRates', () => {
    const slab = { vendorPricePaise: 50000, driverPayoutPaise: 40000 };
    it('uses the standard rate when no peak rate is set (regression: implicit +20%)', () => {
      expect(slabRates(slab, true)).toEqual({ vendorPricePaise: 50000, driverPayoutPaise: 40000 });
      expect(slabRates({ ...slab, vendorPeakPricePaise: 60000, driverPeakPayoutPaise: 45000 }, true)).toEqual({
        vendorPricePaise: 60000,
        driverPayoutPaise: 45000,
      });
      expect(slabRates({ ...slab, vendorPeakPricePaise: 60000 }, false)).toEqual(slab);
    });
  });
});
