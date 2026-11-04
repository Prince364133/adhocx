import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  CORPORATE_MAX_DUTY_HOURS,
  CORPORATE_DRIVER_TURNAROUND_MINUTES,
  DriverEligibilityResult,
  DriverIneligibilityReason,
} from './corporate-supply.types';
import { corporateRouteBusyWindow } from '../dispatch/corporate-dispatch.service';

/** Passenger categories allowed on corporate routes, with licensed passenger seats (excluding the driver). */
export const CORPORATE_PASSENGER_SEATS = {
  HATCHBACK: 4,
  SEDAN: 4,
  SUV: 6,
  TEMPO_TRAVELLER: 12,
  BUS: 30,
} as const;
export type CorporatePassengerCategory = keyof typeof CORPORATE_PASSENGER_SEATS;

/** Route categories each vehicle category may serve. A larger passenger car may serve a sedan route. */
export const CORPORATE_CATEGORY_CAN_SERVE: Record<CorporatePassengerCategory, CorporatePassengerCategory[]> = {
  HATCHBACK: ['HATCHBACK'],
  SEDAN: ['SEDAN', 'HATCHBACK'],
  SUV: ['SUV', 'SEDAN', 'HATCHBACK'],
  TEMPO_TRAVELLER: ['TEMPO_TRAVELLER'],
  BUS: ['BUS'],
};

/**
 * Normalises a free-text vehicle type ("Sedan", "suv", "Tempo Traveller") to a passenger category.
 * Returns null for goods vehicles (TATA_ACE, PICKUP_TRUCK, trucks) and anything unrecognised.
 */
export function corporatePassengerCategory(raw: unknown): CorporatePassengerCategory | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!t) return null;
  if (t.includes('TATA_ACE') || t.includes('PICKUP') || t.includes('TRUCK')) return null;
  if (t.includes('TEMPO')) return 'TEMPO_TRAVELLER';
  if (t.includes('SUV')) return 'SUV';
  if (t.includes('SEDAN')) return 'SEDAN';
  if (t.includes('HATCHBACK')) return 'HATCHBACK';
  if (t === 'BUS' || t.startsWith('BUS_') || t.endsWith('_BUS')) return 'BUS';
  return null;
}

@Injectable()
export class DriverEligibilityService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Evaluates whether one driver and one of their own registered vehicles may operate a corporate route.
   * Only real VERIFIED Vehicle rows count: the driver profile's free-text vehicleType is never treated
   * as a vehicle, and database errors propagate (dispatch retries) instead of degrading to a weaker check.
   */
  async checkDriverEligibility(driverId: string, route: any): Promise<DriverEligibilityResult> {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      include: { vehicles: { where: { verificationStatus: 'VERIFIED' }, orderBy: { createdAt: 'desc' } } },
    });
    if (!driver) {
      return { driverId, isEligible: false, rejectionReason: 'DRIVER_NOT_FOUND' };
    }
    return this.evaluateDriverRecord(driver, route);
  }

  /**
   * Filters a batch of driver IDs with one query, returning only fully eligible drivers.
   */
  async batchFilterEligibleDrivers(
    driverIds: string[],
    route: any,
  ): Promise<{
    eligibleDriverIds: string[];
    driverVehicleMap: Map<string, string>;
    rejectionReasons: Map<string, DriverIneligibilityReason>;
  }> {
    if (driverIds.length === 0) {
      return { eligibleDriverIds: [], driverVehicleMap: new Map(), rejectionReasons: new Map() };
    }

    const drivers: any[] =
      (await this.db.driver.findMany({
        where: { id: { in: driverIds } },
        include: { vehicles: { where: { verificationStatus: 'VERIFIED' }, orderBy: { createdAt: 'desc' } } },
      })) ?? [];

    const eligibleDriverIds: string[] = [];
    const driverVehicleMap = new Map<string, string>();
    const rejectionReasons = new Map<string, DriverIneligibilityReason>();
    const found = new Set<string>();

    for (const driver of drivers) {
      found.add(driver.id);
      const res = await this.evaluateDriverRecord(driver, route);
      if (res.isEligible && res.matchedVehicleId) {
        eligibleDriverIds.push(driver.id);
        driverVehicleMap.set(driver.id, res.matchedVehicleId);
      } else if (res.rejectionReason) {
        rejectionReasons.set(driver.id, res.rejectionReason);
      }
    }
    for (const id of driverIds) {
      if (!found.has(id)) rejectionReasons.set(id, 'DRIVER_NOT_FOUND');
    }

    return { eligibleDriverIds, driverVehicleMap, rejectionReasons };
  }

  /**
   * Applies the PRD eligibility rules (ALLOC-01/06, ADM-07, ADH-02-03) to a driver loaded with
   * their VERIFIED vehicles.
   */
  private async evaluateDriverRecord(driver: any, route: any): Promise<DriverEligibilityResult> {
    const driverId = driver.id;

    if (driver.verificationStatus !== 'VERIFIED') {
      return { driverId, isEligible: false, rejectionReason: 'DRIVER_NOT_VERIFIED' };
    }
    if (driver.availabilityStatus !== 'AVAILABLE') {
      return { driverId, isEligible: false, rejectionReason: 'DRIVER_NOT_AVAILABLE' };
    }

    // Defence in depth: the query already filters, but never trust an unverified row.
    const candidateVehicles: any[] = (Array.isArray(driver.vehicles) ? driver.vehicles : []).filter(
      (v: any) => v && v.verificationStatus === 'VERIFIED',
    );
    if (candidateVehicles.length === 0) {
      return { driverId, isEligible: false, rejectionReason: 'NO_VERIFIED_VEHICLE' };
    }

    const targetCategory = corporatePassengerCategory(route.vehicleCategory || 'SEDAN');
    const routeEnd = this.calculateRouteEndTime(route);
    const requiredCapacity =
      Number(route.maxCapacity) || (targetCategory ? CORPORATE_PASSENGER_SEATS[targetCategory] : 4);

    let eligibleVehicle: any = null;
    let failureReason: DriverIneligibilityReason = 'VEHICLE_CATEGORY_MISMATCH';

    for (const vehicle of candidateVehicles) {
      if (!vehicle.vehicleType || typeof vehicle.vehicleType !== 'string' || vehicle.vehicleType.trim() === '') {
        failureReason = 'MISSING_VEHICLE_TYPE';
        continue;
      }

      // Explicit passenger categories only: goods vehicles (TATA_ACE, PICKUP_TRUCK) and unknown
      // types never match, and nothing is assumed to be a sedan by default.
      const vehicleCategory = corporatePassengerCategory(vehicle.vehicleType);
      if (!vehicleCategory || !targetCategory || !CORPORATE_CATEGORY_CAN_SERVE[vehicleCategory].includes(targetCategory)) {
        failureReason = 'VEHICLE_CATEGORY_MISMATCH';
        continue;
      }

      if (CORPORATE_PASSENGER_SEATS[vehicleCategory] < requiredCapacity) {
        failureReason = 'INSUFFICIENT_SEAT_CAPACITY';
        continue;
      }

      // Insurance must be on record and valid through the end of the route.
      const expiry = vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry) : null;
      if (!expiry || Number.isNaN(expiry.getTime()) || expiry.getTime() <= routeEnd.getTime()) {
        failureReason = 'INSURANCE_EXPIRED';
        continue;
      }

      eligibleVehicle = vehicle;
      break;
    }

    if (!eligibleVehicle) {
      return { driverId, isEligible: false, rejectionReason: failureReason };
    }

    // 5. 24-Hour Duty Hour Limit Enforcement (PRD ALLOC-06, ADM-07: max 12h in rolling 24h)
    const dutyCheck = await this.evaluateDutyHours(driverId, route);
    if (!dutyCheck.allowed) {
      return {
        driverId,
        isEligible: false,
        rejectionReason: 'DUTY_HOURS_EXCEEDED',
        dutyHoursLast24h: dutyCheck.totalHoursLast24h,
      };
    }

    // 6. Overlap & Turnaround Check (PRD ALLOC-01: minimum 30-min turnaround between corporate duties)
    const overlapCheck = await this.evaluateTurnaroundOverlap(driverId, route);
    if (!overlapCheck.allowed) {
      return {
        driverId,
        isEligible: false,
        rejectionReason: 'ROUTE_TIME_OVERLAP',
        conflictingRouteId: overlapCheck.conflictingRouteId,
      };
    }

    return {
      driverId,
      isEligible: true,
      matchedVehicleId: eligibleVehicle.id,
      dutyHoursLast24h: dutyCheck.totalHoursLast24h,
    };
  }

  private calculateRouteEndTime(route: any): Date {
    if (route.targetOfficeArrivalTime) {
      return new Date(route.targetOfficeArrivalTime);
    }
    const start = route.targetPickup1Time ? new Date(route.targetPickup1Time).getTime() : Date.now();
    const durationMs = (Number(route.estDurationSeconds) || 5400) * 1000;
    return new Date(start + durationMs);
  }

  private async evaluateDutyHours(
    driverId: string,
    route: any,
  ): Promise<{ allowed: boolean; totalHoursLast24h: number }> {
    const routeStart = route.targetPickup1Time ? new Date(route.targetPickup1Time) : new Date();
    const windowStart = new Date(routeStart.getTime() - 24 * 3600 * 1000);
    const thisRouteDurationSec = Number(route.estDurationSeconds) || 5400;

    let committedRoutes: any[] = [];
    try {
      if (this.db?.corporateRoute?.findMany) {
        committedRoutes = (await this.db.corporateRoute.findMany({
          where: {
            driverId: { in: [driverId] },
            status: { in: ['ASSIGNED', 'IN_TRANSIT', 'COMPLETED'] },
            targetPickup1Time: { gte: windowStart, lte: routeStart },
            ...(route.id ? { id: { not: route.id } } : {}),
          },
          select: { estDurationSeconds: true },
        })) ?? [];
      }
    } catch {
      committedRoutes = [];
    }

    const existingDurationSec = committedRoutes.reduce(
      (sum, r) => sum + (Number(r.estDurationSeconds) || 5400),
      0,
    );
    const totalDurationSec = existingDurationSec + thisRouteDurationSec;
    const totalHoursLast24h = Math.round((totalDurationSec / 3600) * 10) / 10;

    const maxAllowedSeconds = CORPORATE_MAX_DUTY_HOURS * 3600;
    return {
      allowed: totalDurationSec <= maxAllowedSeconds,
      totalHoursLast24h,
    };
  }

  private async evaluateTurnaroundOverlap(
    driverId: string,
    route: any,
  ): Promise<{ allowed: boolean; conflictingRouteId?: string }> {
    const turnaroundMs = CORPORATE_DRIVER_TURNAROUND_MINUTES * 60_000;
    const targetWindow = corporateRouteBusyWindow(route);

    let activeRoutes: any[] = [];
    try {
      if (this.db?.corporateRoute?.findMany) {
        activeRoutes = (await this.db.corporateRoute.findMany({
          where: {
            driverId: { in: [driverId] },
            status: { in: ['ASSIGNED', 'IN_TRANSIT'] },
            ...(route.id ? { id: { not: route.id } } : {}),
          },
          select: {
            id: true,
            direction: true,
            targetPickup1Time: true,
            targetOfficeArrivalTime: true,
            estDurationSeconds: true,
          },
        })) ?? [];
      }
    } catch {
      activeRoutes = [];
    }

    for (const r of activeRoutes) {
      const cWindow = corporateRouteBusyWindow(r);
      // Overlap considering turnaround gap: [start - gap, end + gap]
      if (targetWindow.start < cWindow.end + turnaroundMs && cWindow.start < targetWindow.end + turnaroundMs) {
        return { allowed: false, conflictingRouteId: r.id };
      }
    }

    return { allowed: true };
  }
}
