import { Driver as PrismaDriver } from '@prisma/client';
import {
  DriverAggregate,
  DriverVerificationStatus,
  DriverDutyStatus,
  GeoPoint,
  H3Index,
} from '@adhocx/domain-core';

export class PrismaDriverMapper {
  public static toDomain(raw: PrismaDriver): DriverAggregate {
    let verificationStatus: DriverVerificationStatus = 'PENDING';
    switch (raw.verificationStatus) {
      case 'VERIFIED':
        verificationStatus = 'VERIFIED';
        break;
      case 'REJECTED':
        verificationStatus = 'REJECTED';
        break;
      case 'SUSPENDED':
        verificationStatus = 'SUSPENDED';
        break;
      default:
        verificationStatus = 'PENDING';
        break;
    }

    let dutyStatus: DriverDutyStatus = 'OFFLINE';
    switch (raw.availabilityStatus) {
      case 'AVAILABLE':
        dutyStatus = 'ONLINE';
        break;
      case 'BUSY':
        dutyStatus = 'BUSY';
        break;
      default:
        dutyStatus = 'OFFLINE';
        break;
    }

    let location: GeoPoint | undefined;
    let h3Idx: H3Index | undefined;
    if (raw.currentLat && raw.currentLng) {
      const locResult = GeoPoint.create(Number(raw.currentLat), Number(raw.currentLng));
      if (locResult.isSuccess) {
        location = locResult.getValue();
        const h3Result = H3Index.fromGeoPoint(location, 8);
        if (h3Result.isSuccess) {
          h3Idx = h3Result.getValue();
        }
      }
    }

    // Commercial license default 1 year if not explicitly stored
    const licenseExpiry = new Date(Date.now() + 365 * 86400000);

    return DriverAggregate.reconstitute(raw.id, {
      userId: raw.userId,
      verificationStatus,
      dutyStatus,
      licenseNumber: raw.vehiclePlate || 'TS-COMMERCIAL',
      licenseExpiry,
      currentLocation: location,
      currentH3Index: h3Idx,
      trustScore: Math.round(raw.trustScore),
      suspensionReason: raw.rejectionReason ?? undefined,
      createdAt: new Date(),
    });
  }

  public static toPersistence(aggregate: DriverAggregate): any {
    const availability =
      aggregate.dutyStatus === 'ONLINE'
        ? 'AVAILABLE'
        : aggregate.dutyStatus === 'BUSY'
          ? 'BUSY'
          : 'OFFLINE';

    return {
      id: aggregate.id,
      userId: aggregate.userId,
      verificationStatus: aggregate.verificationStatus,
      availabilityStatus: availability,
      currentLat: aggregate.currentLocation?.latitude,
      currentLng: aggregate.currentLocation?.longitude,
      trustScore: aggregate.trustScore,
      rejectionReason: aggregate.suspensionReason,
    };
  }
}
