import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponValidationResponseDto,
  CouponResponseDto,
  CouponRedemptionResponseDto,
  CouponMetricsDto,
  CouponDiscountType,
  CouponApplicableContext,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List coupons with optional status, search, and context filters.
   */
  async listCoupons(query?: {
    status?: string;
    search?: string;
    applicableTo?: string;
  }): Promise<CouponResponseDto[]> {
    const now = new Date();
    const where: any = {};

    if (query?.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query?.applicableTo && query.applicableTo !== 'ALL') {
      where.applicableTo = query.applicableTo;
    }

    if (query?.status) {
      switch (query.status.toUpperCase()) {
        case 'ACTIVE':
          where.isActive = true;
          where.validFrom = { lte: now };
          where.validUntil = { gte: now };
          break;
        case 'EXPIRED':
          where.validUntil = { lt: now };
          break;
        case 'INACTIVE':
          where.isActive = false;
          break;
        case 'EXHAUSTED':
          where.usageLimitTotal = { not: null };
          where.usedCount = { gte: where.usageLimitTotal };
          break;
      }
    }

    const coupons = await this.db.coupon.findMany({
      where,
      include: {
        redemptions: {
          select: {
            discountAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return coupons.map((c) => {
      const redemptionsCount = c.redemptions.length;
      const totalDiscountDisbursed = c.redemptions.reduce(
        (sum, r) => sum + Number(r.discountAmount),
        0,
      );

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        discountType: c.discountType as CouponDiscountType,
        discountValue: Number(c.discountValue),
        maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
        minOrderAmount: Number(c.minOrderAmount),
        applicableTo: c.applicableTo as CouponApplicableContext,
        usageLimitTotal: c.usageLimitTotal,
        usageLimitPerUser: c.usageLimitPerUser,
        usedCount: c.usedCount,
        validFrom: c.validFrom.toISOString(),
        validUntil: c.validUntil.toISOString(),
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        redemptionsCount,
        totalDiscountDisbursed,
      };
    });
  }

  /**
   * Get operational metrics for coupons.
   */
  async getCouponMetrics(): Promise<CouponMetricsDto> {
    const now = new Date();
    const [totalCoupons, activeCoupons, redemptions] = await Promise.all([
      this.db.coupon.count(),
      this.db.coupon.count({
        where: {
          isActive: true,
          validFrom: { lte: now },
          validUntil: { gte: now },
        },
      }),
      this.db.couponRedemption.findMany({
        select: { discountAmount: true },
      }),
    ]);

    const totalDiscountDisbursed = redemptions.reduce(
      (sum, r) => sum + Number(r.discountAmount),
      0,
    );

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions: redemptions.length,
      totalDiscountDisbursed: Math.round(totalDiscountDisbursed * 100) / 100,
    };
  }

  /**
   * Get single coupon details by ID.
   */
  async getCouponById(id: string): Promise<CouponResponseDto> {
    const coupon = await this.db.coupon.findUnique({
      where: { id },
      include: {
        redemptions: {
          select: { discountAmount: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    const redemptionsCount = coupon.redemptions.length;
    const totalDiscountDisbursed = coupon.redemptions.reduce(
      (sum, r) => sum + Number(r.discountAmount),
      0,
    );

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType as CouponDiscountType,
      discountValue: Number(coupon.discountValue),
      maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
      minOrderAmount: Number(coupon.minOrderAmount),
      applicableTo: coupon.applicableTo as CouponApplicableContext,
      usageLimitTotal: coupon.usageLimitTotal,
      usageLimitPerUser: coupon.usageLimitPerUser,
      usedCount: coupon.usedCount,
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil.toISOString(),
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
      redemptionsCount,
      totalDiscountDisbursed,
    };
  }

  /**
   * Create a new coupon with strict server-side validation.
   */
  async createCoupon(adminUserId: string, dto: CreateCouponDto): Promise<CouponResponseDto> {
    const code = dto.code.trim().toUpperCase();

    // 1. Check uniqueness
    const existing = await this.db.coupon.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${code}" already exists`);
    }

    // 2. Validate date range
    const validFrom = new Date(dto.validFrom);
    const validUntil = new Date(dto.validUntil);
    if (isNaN(validFrom.getTime()) || isNaN(validUntil.getTime())) {
      throw new BadRequestException('Invalid date format for validFrom or validUntil');
    }
    if (validUntil <= validFrom) {
      throw new BadRequestException('Expiry date (validUntil) must be after start date (validFrom)');
    }

    // 3. Validate discount parameters
    if (dto.discountType === CouponDiscountType.PERCENTAGE) {
      if (dto.discountValue <= 0 || dto.discountValue > 100) {
        throw new BadRequestException('Percentage discount must be between 1% and 100%');
      }
    } else if (dto.discountType === CouponDiscountType.FLAT) {
      if (dto.discountValue <= 0) {
        throw new BadRequestException('Flat discount must be greater than zero');
      }
    }

    // 4. Validate usage limits
    if (dto.usageLimitTotal && dto.usageLimitPerUser && dto.usageLimitPerUser > dto.usageLimitTotal) {
      throw new BadRequestException('Per-user usage limit cannot exceed total usage limit');
    }

    const coupon = await this.db.coupon.create({
      data: {
        code,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        minOrderAmount: dto.minOrderAmount ?? 0,
        applicableTo: dto.applicableTo ?? CouponApplicableContext.ALL,
        usageLimitTotal: dto.usageLimitTotal ?? null,
        usageLimitPerUser: dto.usageLimitPerUser ?? 1,
        usedCount: 0,
        validFrom,
        validUntil,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: 'COUPON_CREATED',
      entityType: 'COUPON',
      entityId: coupon.id,
      metadata: { code, title: coupon.title, discountType: coupon.discountType, discountValue: dto.discountValue },
    });

    this.logger.log(`Admin ${adminUserId} created coupon: ${code}`);

    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType as CouponDiscountType,
      discountValue: Number(coupon.discountValue),
      maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
      minOrderAmount: Number(coupon.minOrderAmount),
      applicableTo: coupon.applicableTo as CouponApplicableContext,
      usageLimitTotal: coupon.usageLimitTotal,
      usageLimitPerUser: coupon.usageLimitPerUser,
      usedCount: coupon.usedCount,
      validFrom: coupon.validFrom.toISOString(),
      validUntil: coupon.validUntil.toISOString(),
      isActive: coupon.isActive,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
      redemptionsCount: 0,
      totalDiscountDisbursed: 0,
    };
  }

  /**
   * Update an existing coupon.
   */
  async updateCoupon(
    adminUserId: string,
    id: string,
    dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    const coupon = await this.db.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) {
      if (dto.discountValue <= 0) throw new BadRequestException('Discount value must be greater than zero');
      data.discountValue = dto.discountValue;
    }
    if (dto.maxDiscountAmount !== undefined) data.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.applicableTo !== undefined) data.applicableTo = dto.applicableTo;
    if (dto.usageLimitTotal !== undefined) data.usageLimitTotal = dto.usageLimitTotal;
    if (dto.usageLimitPerUser !== undefined) data.usageLimitPerUser = dto.usageLimitPerUser;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.validFrom !== undefined) {
      const d = new Date(dto.validFrom);
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid validFrom date');
      data.validFrom = d;
    }
    if (dto.validUntil !== undefined) {
      const d = new Date(dto.validUntil);
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid validUntil date');
      data.validUntil = d;
    }

    if (data.validFrom && data.validUntil && data.validUntil <= data.validFrom) {
      throw new BadRequestException('Expiry date must be after start date');
    }

    const updated = await this.db.coupon.update({
      where: { id },
      data,
      include: {
        redemptions: {
          select: { discountAmount: true },
        },
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: 'COUPON_UPDATED',
      entityType: 'COUPON',
      entityId: updated.id,
      metadata: { code: updated.code, updates: dto },
    });

    const redemptionsCount = updated.redemptions.length;
    const totalDiscountDisbursed = updated.redemptions.reduce(
      (sum, r) => sum + Number(r.discountAmount),
      0,
    );

    return {
      id: updated.id,
      code: updated.code,
      title: updated.title,
      description: updated.description,
      discountType: updated.discountType as CouponDiscountType,
      discountValue: Number(updated.discountValue),
      maxDiscountAmount: updated.maxDiscountAmount ? Number(updated.maxDiscountAmount) : null,
      minOrderAmount: Number(updated.minOrderAmount),
      applicableTo: updated.applicableTo as CouponApplicableContext,
      usageLimitTotal: updated.usageLimitTotal,
      usageLimitPerUser: updated.usageLimitPerUser,
      usedCount: updated.usedCount,
      validFrom: updated.validFrom.toISOString(),
      validUntil: updated.validUntil.toISOString(),
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      redemptionsCount,
      totalDiscountDisbursed,
    };
  }

  /**
   * Delete or deactivate coupon.
   */
  async deleteCoupon(adminUserId: string, id: string): Promise<{ success: boolean; message: string }> {
    const coupon = await this.db.coupon.findUnique({
      where: { id },
      include: { redemptions: { select: { id: true } } },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    if (coupon.redemptions.length > 0) {
      // Has active historical redemptions, soft deactivate to preserve audit & financial integrity
      await this.db.coupon.update({
        where: { id },
        data: { isActive: false },
      });

      await this.audit.log({
        userId: adminUserId,
        action: 'COUPON_DEACTIVATED',
        entityType: 'COUPON',
        entityId: id,
        metadata: { code: coupon.code, reason: 'Deactivated due to existing redemptions' },
      });

      return {
        success: true,
        message: `Coupon "${coupon.code}" has redemptions and was deactivated instead of deleted to preserve transaction history.`,
      };
    }

    await this.db.coupon.delete({ where: { id } });

    await this.audit.log({
      userId: adminUserId,
      action: 'COUPON_DELETED',
      entityType: 'COUPON',
      entityId: id,
      metadata: { code: coupon.code },
    });

    return { success: true, message: `Coupon "${coupon.code}" deleted successfully.` };
  }

  /**
   * Get redemptions audit log for a coupon.
   */
  async getCouponRedemptions(couponId: string): Promise<CouponRedemptionResponseDto[]> {
    const redemptions = await this.db.couponRedemption.findMany({
      where: { couponId },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { redeemedAt: 'desc' },
      take: 100,
    });

    return redemptions.map((r) => ({
      id: r.id,
      couponId: r.couponId,
      userId: r.userId,
      userName: r.user?.fullName || 'User',
      userPhone: r.user?.phone || 'N/A',
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      orderAmount: Number(r.orderAmount),
      discountAmount: Number(r.discountAmount),
      finalAmount: Number(r.finalAmount),
      redeemedAt: r.redeemedAt.toISOString(),
    }));
  }

  /**
   * Strict Server-Side Validation Engine for Coupons.
   * Handles all edge cases:
   * 1. Existence and casing
   * 2. Active status
   * 3. Validity time window
   * 4. Minimum spend threshold
   * 5. Context applicability (WALLET_TOPUP vs REQUIREMENT_BOOKING)
   * 6. Global usage limit
   * 7. Per-user redemption limit
   * 8. Percentage max cap & non-negative final amount
   */
  async validateCoupon(
    userId: string,
    dto: ValidateCouponDto,
  ): Promise<CouponValidationResponseDto> {
    const code = dto.code.trim().toUpperCase();
    const amount = Number(dto.amount);
    const now = new Date();

    if (!code) {
      throw new BadRequestException('Coupon code is required');
    }

    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Valid order amount is required for coupon calculation');
    }

    const coupon = await this.db.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon code "${code}" is invalid or does not exist`);
    }

    // 1. Check Active Status
    if (!coupon.isActive) {
      throw new BadRequestException(`Coupon "${code}" is currently inactive`);
    }

    // 2. Check Validity Window
    if (now < coupon.validFrom) {
      throw new BadRequestException(
        `Coupon "${code}" is not yet active (valid from ${coupon.validFrom.toLocaleDateString()})`,
      );
    }
    if (now > coupon.validUntil) {
      throw new BadRequestException(`Coupon "${code}" has expired on ${coupon.validUntil.toLocaleDateString()}`);
    }

    // 3. Check Minimum Order Amount
    const minSpend = Number(coupon.minOrderAmount);
    if (minSpend > 0 && amount < minSpend) {
      throw new BadRequestException(
        `Minimum order amount of ₹${minSpend.toFixed(0)} required to apply "${code}" (current: ₹${amount.toFixed(0)})`,
      );
    }

    // 4. Check Context Applicability
    const context = dto.context || CouponApplicableContext.ALL;
    if (coupon.applicableTo !== CouponApplicableContext.ALL && coupon.applicableTo !== context) {
      const scopeName =
        coupon.applicableTo === CouponApplicableContext.WALLET_TOPUP
          ? 'Wallet Top-ups'
          : 'Trip Bookings';
      throw new BadRequestException(`Coupon "${code}" is only applicable for ${scopeName}`);
    }

    // 5. Check Global Usage Limit
    if (coupon.usageLimitTotal !== null && coupon.usedCount >= coupon.usageLimitTotal) {
      throw new BadRequestException(`Coupon "${code}" has reached its maximum total usage limit`);
    }

    // 6. Check Per-User Usage Limit
    if (userId) {
      const userRedemptionsCount = await this.db.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (userRedemptionsCount >= coupon.usageLimitPerUser) {
        throw new BadRequestException(
          `You have already redeemed coupon "${code}" the maximum allowed times (${coupon.usageLimitPerUser})`,
        );
      }
    }

    // 7. Calculate Discount Amount
    let discount = 0;
    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      const percent = Number(coupon.discountValue);
      if (percent >= 100) {
        discount = amount;
      } else {
        discount = (amount * percent) / 100;
        if (coupon.maxDiscountAmount) {
          discount = Math.min(discount, Number(coupon.maxDiscountAmount));
        }
      }
    } else {
      discount = Number(coupon.discountValue);
    }

    discount = Math.min(discount, amount);
    discount = Math.round(discount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((amount - discount) * 100) / 100);

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType as CouponDiscountType,
      discountValue: Number(coupon.discountValue),
      discountAmount: discount,
      originalAmount: amount,
      finalAmount,
      message: `Promo code "${coupon.code}" applied! You save ₹${discount.toFixed(0)}.`,
    };
  }

  /**
   * Get available active coupons applicable for current user to choose from.
   */
  async getAvailableCoupons(
    userId: string,
    context?: CouponApplicableContext,
  ): Promise<CouponResponseDto[]> {
    const now = new Date();
    const where: any = {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    };

    if (context && context !== CouponApplicableContext.ALL) {
      where.OR = [
        { applicableTo: context },
        { applicableTo: CouponApplicableContext.ALL },
      ];
    }

    const coupons = await this.db.coupon.findMany({
      where,
      orderBy: { discountValue: 'desc' },
    });

    const result: CouponResponseDto[] = [];

    for (const c of coupons) {
      // Check total limit
      if (c.usageLimitTotal !== null && c.usedCount >= c.usageLimitTotal) {
        continue;
      }

      // Check per-user limit
      if (userId) {
        const userRedemptions = await this.db.couponRedemption.count({
          where: { couponId: c.id, userId },
        });
        if (userRedemptions >= c.usageLimitPerUser) {
          continue;
        }
      }

      result.push({
        id: c.id,
        code: c.code,
        title: c.title,
        description: c.description,
        discountType: c.discountType as CouponDiscountType,
        discountValue: Number(c.discountValue),
        maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
        minOrderAmount: Number(c.minOrderAmount),
        applicableTo: c.applicableTo as CouponApplicableContext,
        usageLimitTotal: c.usageLimitTotal,
        usageLimitPerUser: c.usageLimitPerUser,
        usedCount: c.usedCount,
        validFrom: c.validFrom.toISOString(),
        validUntil: c.validUntil.toISOString(),
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      });
    }

    return result;
  }
}
