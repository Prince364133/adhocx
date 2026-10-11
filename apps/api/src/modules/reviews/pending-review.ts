import { ForbiddenException } from '@nestjs/common';
import { DisputeStatus } from '@prisma/client';
import { TripStatus } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { DispatchConfig } from '../dispatch/dispatch.config';

export const MANDATORY_REVIEW_PENDING = 'MANDATORY_REVIEW_PENDING';

/**
 * Completed trips the customer still owes a review for, oldest first.
 *
 * Excluded: trips completed before the gate launch cutoff (historical rides never block),
 * and trips with an open/under-review dispute (feedback flows through the dispute instead).
 */
const pendingReviewWhere = (vendorId: string, reviewerUserId: string) => ({
  vendorId,
  status: TripStatus.COMPLETED,
  completedAt: { gte: DispatchConfig.reviewGateStartAt },
  reviews: { none: { reviewerId: reviewerUserId } },
  disputes: { none: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } } },
});

export async function findPendingReviewTrip(db: DatabaseService, vendorId: string, reviewerUserId: string) {
  const where = pendingReviewWhere(vendorId, reviewerUserId);
  const [trip, count] = await Promise.all([
    db.trip.findFirst({
      where,
      include: { driver: { include: { user: true } } },
      orderBy: { completedAt: 'asc' },
    }),
    db.trip.count({ where }),
  ]);
  return { trip, count };
}

/**
 * Throws a structured 403 when the customer must review a previous ride before booking.
 * Wire format: `{ success: false, error: { code: 'MANDATORY_REVIEW_PENDING', message, details: { tripId, ... } } }`;
 * mobile clients key off `error.code` to open the rating sheet for `details.tripId`.
 */
export async function assertNoPendingReview(db: DatabaseService, vendorId: string, reviewerUserId: string): Promise<void> {
  if (!DispatchConfig.reviewGateEnabled) return;
  const { trip, count } = await findPendingReviewTrip(db, vendorId, reviewerUserId);
  if (!trip) return;
  // Domain-error convention: machine code in `error`, context in `details` (forwarded by HttpExceptionFilter)
  throw new ForbiddenException({
    error: MANDATORY_REVIEW_PENDING,
    message: 'Please rate your previous ride before booking a new one.',
    details: {
      tripId: trip.id,
      pendingCount: count,
      driverName: trip.driver?.user?.fullName || trip.driver?.fullName || 'Your Driver',
      vehiclePlate: trip.driver?.vehiclePlate || null,
    },
  });
}
