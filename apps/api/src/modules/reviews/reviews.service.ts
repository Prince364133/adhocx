import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreateReviewDto,
  ReviewResponseDto,
  ReviewQueryDto,
  TripStatus,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Submit a review for a completed trip.
   * Can be submitted by the requester (evaluating the driver) or the driver (evaluating the customer).
   */
  async createReview(reviewerUserId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars');
    }

    const trip = await this.db.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        vendor: { include: { user: true } },
        driver: { include: { user: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.COMPLETED) {
      throw new BadRequestException('Reviews can only be submitted for COMPLETED trips');
    }

    // Determine roles
    const isVendor = trip.vendor.userId === reviewerUserId;
    const isDriver = trip.driver.userId === reviewerUserId;

    if (!isVendor && !isDriver) {
      throw new ForbiddenException('Only trip participants can submit reviews');
    }

    const revieweeUserId = isVendor ? trip.driver.userId : trip.vendor.userId;
    const targetDriverId = isVendor ? trip.driverId : null;

    // Check if review already submitted by this reviewer
    const existing = await this.db.review.findUnique({
      where: {
        tripId_reviewerId: {
          tripId: trip.id,
          reviewerId: reviewerUserId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already submitted a review for this trip');
    }

    const review = await this.db.$transaction(async (tx) => {
      // 1. Create the review
      const newReview = await tx.review.create({
        data: {
          tripId: trip.id,
          reviewerId: reviewerUserId,
          revieweeId: revieweeUserId,
          driverId: targetDriverId,
          rating: dto.rating,
          feedback: dto.feedback,
        },
        include: {
          reviewer: true,
          reviewee: true,
        },
      });

      // 2. If reviewing driver, recalculate driver average rating and rating count
      if (targetDriverId) {
        const driverReviews = await tx.review.findMany({
          where: { driverId: targetDriverId },
          select: { rating: true },
        });

        const totalStars = driverReviews.reduce((sum, r) => sum + r.rating, 0);
        const count = driverReviews.length;
        const avg = count > 0 ? Number((totalStars / count).toFixed(2)) : 5.0;

        await tx.driver.update({
          where: { id: targetDriverId },
          data: {
            averageRating: avg,
            ratingCount: count,
          },
        });
      }

      return newReview;
    });

    // Notify reviewee
    this.notifications.emitEvent(`user:${revieweeUserId}`, 'REVIEW_RECEIVED', {
      tripId: trip.id,
      rating: dto.rating,
      feedback: dto.feedback,
      reviewerName: review.reviewer.fullName || 'A user',
    });

    await this.audit.log({
      userId: reviewerUserId,
      action: 'REVIEW_SUBMITTED',
      entityType: 'REVIEW',
      entityId: review.id,
      metadata: { tripId: trip.id, rating: dto.rating, revieweeUserId },
    });

    this.logger.log(`Review ${review.id} submitted for trip ${trip.id} by user ${reviewerUserId}`);
    return this.mapToDto(review);
  }

  /**
   * Get all reviews for a driver.
   */
  async getDriverReviews(driverId: string, query?: ReviewQueryDto): Promise<ReviewResponseDto[]> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const reviews = await this.db.review.findMany({
      where: { driverId },
      include: {
        reviewer: true,
        reviewee: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((r) => this.mapToDto(r));
  }

  /**
   * Get reviews for a specific trip.
   */
  async getTripReviews(tripId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.db.review.findMany({
      where: { tripId },
      include: {
        reviewer: true,
        reviewee: true,
      },
    });

    return reviews.map((r) => this.mapToDto(r));
  }

  private mapToDto(r: any): ReviewResponseDto {
    return {
      id: r.id,
      tripId: r.tripId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      driverId: r.driverId || undefined,
      rating: r.rating,
      feedback: r.feedback || undefined,
      createdAt: r.createdAt.toISOString(),
      reviewerName: r.reviewer?.fullName || undefined,
      revieweeName: r.reviewee?.fullName || undefined,
    };
  }
}
