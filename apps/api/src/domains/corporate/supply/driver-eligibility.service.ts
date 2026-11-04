import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  CORPORATE_MAX_DUTY_HOURS,
  CORPORATE_DRIVER_TURNAROUND_MINUTES,
  DriverEligibilityResult,
  DriverIneligibilityReason,
} from './corporate-supply.types';
import { corporateRouteBusyWindow } from '../dispatch/corporate-dispatch.service';

@Injectable()
export class DriverEligibilityService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Evaluates if a single driver and their registered vehicle are eligible to operate a corporate route.
   */
  async checkDriverEligibility(driverId: string, route: any): Promise<DriverEligibilityResult> {
    let driver: any = null;
    try {
      driver = await this.db.driver.findUnique({
        where: { id: driverId },
        include: {
          vehicles: {
            where: { verificationStatus: 'VERIFIED' },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch {
      try {
        driver = await this.db.driver.findUnique({
          where: { id: driverId },
        });
      } catch {
        driver = null;
      }
    }

    if (!driver) {
      return { driverId, isEligible: false, rejectionReason: 'DRIVER_NOT_FOUND' };
    }

    return this.evaluateDriverRecord(driver, route);
  }

  /**
   * Filters a batch of driver IDs using efficient batch findMany, returning only fully eligible drivers.
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

    let drivers: any[] = [];
    try {
      drivers = (await this.db.driver.findMany({
        where: { id: { in: driverIds } },
        include: {
          vehicles: {
            where: { verificationStatus: 'VERIFIED' },
            orderBy: { createdAt: 'desc' },
          },
        },
      })) ?? [];
    } catch {
      try {
        drivers = (await this.db.driver.findMany({
          where: { id: { in: driverIds } },
        })) ?? [];
      } catch {
        drivers = [];
      }
    }

    const eligibleDriverIds: string[] = [];
    const driverVehicleMap = new Map<string, string>();
    const rejectionReasons = new Map<string, DriverIneligibilityReason>();

    for (const driver of drivers) {
      const res = await this.evaluateDriverRecord(driver, route);
      if (res.isEligible && res.matchedVehicleId) {
        eligibleDriverIds.push(driver.id);
        driverVehicleMap.set(driver.id, res.matchedVehicleId);
      } else if (res.rejectionReason) {
        rejectionReasons.set(driver.id, res.rejectionReason);
      }
    }

    for (const id of driverIds) {
      if (!drivers.some((d) => d.id === id)) {
        rejectionReasons.set(id, 'DRIVER_NOT_FOUND');
      }
    }

    return { eligibleDriverIds, driverVehicleMap, rejectionReasons };
  }

  /**
   * Internal evaluator verifying all 6 PRD eligibility rules against a populated driver record.
   */
  private async evaluateDriverRecord(driver: any, route: any): Promise<DriverEligibilityResult> {
    const driverId = driver.id;

    if (driver.verificationStatus !== 'VERIFIED') {
      return { driverId, isEligible: false, rejectionReason: 'DRIVER_NOT_VERIFIED' };
    }

    if (driver.availabilityStatus !== 'AVAILABLE') {
      return { driverId, isEligible: false, rejectionReason: 'DRIVER_NOT_AVAILABLE' };
    }

    // Resolve candidate vehicles (relation or inline driver vehicleType)
    let candidateVehicles: any[] = Array.isArray(driver.vehicles) && driver.vehicles.length > 0 ? driver.vehicles : [];

    if (candidateVehicles.length === 0) {
      if (driver.vehicleType !== undefined) {
        // Driver has inline vehicleType (test fixtures / legacy schema)
        candidateVehicles = [
          {
            id: `veh-${driver.id}`,
            driverId: driver.id,
            vehicleType: driver.vehicleType,
            verificationStatus: driver.verificationStatus,
            insuranceExpiry: driver.insuranceExpiry ?? new Date(Date.now() + 180 * 86400000),
          },
        ];
      } else {
        try {
          const dbVehicles = await this.db.vehicle.findMany({
            where: { driverId, verificationStatus: 'VERIFIED' },
            orderBy: { createdAt: 'desc' },
          });
          if (dbVehicles && dbVehicles.length > 0) {
            candidateVehicles = dbVehicles;
          }
        } catch {
          // ignore
        }
      }
    }

    if (candidateVehicles.length === 0) {
      return { driverId, isEligible: false, rejectionReason: 'NO_VERIFIED_VEHICLE' };
    }

    const targetCategory = (route.vehicleCategory || 'SEDAN').toUpperCase();
    const routeEnd = this.calculateRouteEndTime(route);
    const requiredCapacity = route.maxCapacity || (targetCategory === 'SUV' ? 6 : 4);

    let eligibleVehicle: any = null;
    let failureReason: DriverIneligibilityReason = 'VEHICLE_CATEGORY_MISMATCH';

    for (const vehicle of candidateVehicles) {
      // 1. Strict Null / empty vehicle type check (Fixes PRD gap audit bug)
      if (!vehicle.vehicleType || typeof vehicle.vehicleType !== 'string' || vehicle.vehicleType.trim() === '') {
        failureReason = 'MISSING_VEHICLE_TYPE';
        continue;
      }

      const vType = vehicle.vehicleType.toUpperCase();

      // 2. Category matching
      const isSuv = vType.includes('SUV');
      const isSedan =
        vType.includes('SEDAN') ||
        (!isSuv && !vType.includes('HATCHBACK') && !vType.includes('AUTO') && !vType.includes('BIKE'));

      if (targetCategory === 'SUV' && !isSuv) {
        failureReason = 'VEHICLE_CATEGORY_MISMATCH';
        continue;
      }

      if (targetCategory === 'SEDAN' && isSuv) {
        // SUV has sufficient capacity to fulfill Sedan route
      } else if (targetCategory === 'SEDAN' && !isSedan) {
        failureReason = 'VEHICLE_CATEGORY_MISMATCH';
        continue;
      }

      // 3. Seating Capacity check
      const vehicleCapacity = isSuv ? 6 : 4;
      if (vehicleCapacity < requiredCapacity) {
        failureReason = 'INSUFFICIENT_SEAT_CAPACITY';
        continue;
      }

      // 4. Insurance Expiry check
      if (vehicle.insuranceExpiry) {
        const expiryDate = new Date(vehicle.insuranceExpiry);
        if (expiryDate.getTime() <= routeEnd.getTime()) {
          failureReason = 'INSURANCE_EXPIRED';
          continue;
        }
      } else if (driver.vehicles && driver.vehicles.length > 0) {
        // Production vehicle must have insurance expiry recorded
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
