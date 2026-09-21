import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVendorProfileDto, VendorProfileDto, VerificationStatus } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class VendorsService {
  constructor(private readonly db: DatabaseService) {}

  async createProfile(userId: string, dto: CreateVendorProfileDto, phone: string): Promise<VendorProfileDto> {
    let user: any = null;
    try {
      if (this.db.user?.findUnique) {
        user = await this.db.user.findUnique({ where: { id: userId } });
      }
    } catch (_) {}
    const effectivePhone = phone || user?.phone || '';

    const vendor = await this.db.vendor.upsert({
      where: { userId },
      create: {
        userId,
        organizationName: dto.organizationName,
        fullName: dto.fullName || user?.fullName || 'Business Booker',
        phone: effectivePhone,
        gstNumber: dto.gstNumber,
        address: dto.address,
        verificationStatus: VerificationStatus.UNDER_REVIEW,
      },
      update: {
        organizationName: dto.organizationName,
        fullName: dto.fullName || user?.fullName || undefined,
        gstNumber: dto.gstNumber,
        address: dto.address,
        verificationStatus: VerificationStatus.UNDER_REVIEW,
        rejectionReason: null,
      },
    });

    if (dto.fullName) {
      try {
        if (this.db.user?.update) {
          await this.db.user.update({
            where: { id: userId },
            data: { fullName: dto.fullName, role: 'VENDOR' },
          });
        }
      } catch (_) {}
    } else {
      try {
        if (this.db.user?.update) {
          await this.db.user.update({
            where: { id: userId },
            data: { role: 'VENDOR' },
          });
        }
      } catch (_) {}
    }

    return {
      id: vendor.id,
      userId: vendor.userId,
      organizationName: vendor.organizationName,
      fullName: vendor.fullName,
      phone: vendor.phone,
      verificationStatus: vendor.verificationStatus as VerificationStatus,
      gstNumber: vendor.gstNumber || undefined,
      address: vendor.address || undefined,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  async getProfile(userId: string): Promise<VendorProfileDto> {
    const vendor = await this.db.vendor.findUnique({
      where: { userId },
    });

    if (!vendor) {
      let user: any = null;
      try {
        if (this.db.user?.findUnique) {
          user = await this.db.user.findUnique({ where: { id: userId } });
        }
      } catch (_) {}

      if (!user) {
        throw new NotFoundException('Vendor profile not found');
      }
      return {
        id: `vnd_${userId}`,
        userId,
        organizationName: user.fullName ? `${user.fullName} Enterprises` : 'Enterprise Partner',
        fullName: user.fullName || 'Business Requester',
        phone: user.phone,
        verificationStatus: VerificationStatus.PENDING,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
    }

    return {
      id: vendor.id,
      userId: vendor.userId,
      organizationName: vendor.organizationName,
      fullName: vendor.fullName,
      phone: vendor.phone,
      verificationStatus: vendor.verificationStatus as VerificationStatus,
      gstNumber: vendor.gstNumber || undefined,
      address: vendor.address || undefined,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }
}
