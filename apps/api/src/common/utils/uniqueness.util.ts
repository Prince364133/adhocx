import { ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Returns canonical phone number variants for Indian & International formats.
 * e.g. given '+919876543210', '9876543210', '919876543210', '09876543210',
 * generates all standard representations so lookups and collisions never fail.
 */
export function getPhoneVariants(rawPhone?: string | null): string[] {
  if (!rawPhone) return [];
  const trimmed = rawPhone.trim().replace(/\s+/g, '');
  if (!trimmed) return [];

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return [trimmed];

  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const variants = new Set<string>([
    trimmed,
    digits,
    last10,
    `+91${last10}`,
    `91${last10}`,
    `0${last10}`,
  ]);

  return Array.from(variants).filter(Boolean);
}

/**
 * Returns canonical vehicle plate variants.
 * Strips whitespace, hyphens, and periods to catch duplicates like 'TS 09 EA 1234' vs 'TS09EA1234'.
 */
export function getVehiclePlateVariants(rawPlate?: string | null): string[] {
  if (!rawPlate) return [];
  const trimmed = rawPlate.trim().toUpperCase();
  if (!trimmed) return [];

  const stripped = trimmed.replace(/[\s\-_.]+/g, '');
  return Array.from(new Set([trimmed, stripped])).filter(Boolean);
}

/**
 * Asserts that a phone number is not already assigned to another User, Driver, or Vendor account.
 * Throws ConflictException if any collision is found.
 */
export async function assertPhoneAvailable(
  db: DatabaseService,
  phone: string,
  options?: {
    excludeUserId?: string;
    excludeDriverId?: string;
    excludeVendorId?: string;
  },
): Promise<void> {
  const variants = getPhoneVariants(phone);
  if (variants.length === 0) return;

  // 1. Check User table
  if (db?.user?.findFirst) {
    const existingUser = await db.user.findFirst({
      where: {
        phone: { in: variants },
        ...(options?.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
      },
    });
    if (existingUser) {
      throw new ConflictException(
        `This mobile number is already registered to another account. Every account must have a unique mobile number.`,
      );
    }
  }

  // 2. Check Driver table
  if (db?.driver?.findFirst) {
    const existingDriver = await db.driver.findFirst({
      where: {
        phone: { in: variants },
        ...(options?.excludeDriverId ? { id: { not: options.excludeDriverId } } : {}),
        ...(options?.excludeUserId ? { userId: { not: options.excludeUserId } } : {}),
      },
    });
    if (existingDriver) {
      throw new ConflictException(
        `This mobile number is already registered to another driver account.`,
      );
    }
  }

  // 3. Check Vendor table
  if (db?.vendor?.findFirst) {
    const existingVendor = await db.vendor.findFirst({
      where: {
        phone: { in: variants },
        ...(options?.excludeVendorId ? { id: { not: options.excludeVendorId } } : {}),
        ...(options?.excludeUserId ? { userId: { not: options.excludeUserId } } : {}),
      },
    });
    if (existingVendor) {
      throw new ConflictException(
        `This mobile number is already registered to another vendor account.`,
      );
    }
  }
}

/**
 * Asserts that a vehicle plate number is not already assigned to another vehicle or driver account.
 * Throws ConflictException if any collision is found.
 */
export async function assertVehiclePlateAvailable(
  db: DatabaseService,
  plate: string,
  options?: {
    excludeDriverId?: string;
    excludeUserId?: string;
    excludeVehicleId?: string;
  },
): Promise<void> {
  const variants = getVehiclePlateVariants(plate);
  if (variants.length === 0) return;

  // 1. Check Vehicle table
  if (db?.vehicle?.findMany) {
    const existingVehicles = await db.vehicle.findMany({
      where: {
        registrationNumber: { in: variants, mode: 'insensitive' },
        ...(options?.excludeVehicleId ? { id: { not: options.excludeVehicleId } } : {}),
        ...(options?.excludeDriverId ? { driverId: { not: options.excludeDriverId } } : {}),
      },
      include: { driver: true },
    });

    for (const v of existingVehicles) {
      // If the vehicle belongs to the excluded user/driver, allow it
      if (options?.excludeDriverId && v.driverId === options.excludeDriverId) {
        continue;
      }
      if (options?.excludeUserId && v.driver?.userId === options.excludeUserId) {
        continue;
      }
      throw new ConflictException(
        `Vehicle number ${plate.trim().toUpperCase()} is already registered to another driver account. A vehicle number cannot be assigned to two different accounts.`,
      );
    }
  }

  // 2. Check Driver.vehiclePlate
  if (db?.driver?.findFirst) {
    const existingDriver = await db.driver.findFirst({
      where: {
        vehiclePlate: { in: variants, mode: 'insensitive' },
        ...(options?.excludeDriverId ? { id: { not: options.excludeDriverId } } : {}),
        ...(options?.excludeUserId ? { userId: { not: options.excludeUserId } } : {}),
      },
    });
    if (existingDriver) {
      throw new ConflictException(
        `Vehicle number ${plate.trim().toUpperCase()} is already registered to another driver account. A vehicle number cannot be assigned to two different accounts.`,
      );
    }
  }
}
