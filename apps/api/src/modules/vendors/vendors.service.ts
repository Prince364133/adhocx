import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateVendorProfileDto, VendorProfileDto, VerificationStatus } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { assertPhoneAvailable } from '../../common';

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

    if (user && user.role !== 'VENDOR' && user.role !== 'ADMIN' && (user.role as any) !== 'USER') {
      throw new ForbiddenException(
        `This account is registered as a ${user.role}. Under AdhocX's 1-account-1-role policy, a driver account cannot create or switch to a vendor profile.`
      );
    }

    const rawPhone = dto.phone || phone || user?.phone || '';
    const effectivePhone = rawPhone.trim().replace(/\s+/g, '');
    const cleanName = dto.fullName ? dto.fullName.trim() : undefined;

    // Check existing vendor to exclude self from phone collision check
    let existingVendor: any = null;
    try {
      existingVendor = await this.db.vendor.findUnique({ where: { userId } });
    } catch (_) {}

    if (effectivePhone && (effectivePhone !== user?.phone || effectivePhone !== existingVendor?.phone)) {
      await assertPhoneAvailable(this.db, effectivePhone, {
        excludeUserId: userId,
        excludeVendorId: existingVendor?.id,
      });

      try {
        await this.db.user.update({
          where: { id: userId },
          data: {
            phone: effectivePhone,
            ...(cleanName ? { fullName: cleanName } : {}),
          },
        });
      } catch (_) {}
    } else if (cleanName) {
      try {
        await this.db.user.update({
          where: { id: userId },
          data: { fullName: cleanName },
        });
      } catch (_) {}
    }

    // Extract extra company and contact metadata
    const anyDto = dto as any;
    const extraDetails: Record<string, any> = {};
    const extraKeys = [
      'brandName', 'panNumber', 'businessType', 'website', 'city', 'state', 'pincode',
      'billingAddress', 'isBillingAddressSame', 'billingEmail', 'monthlyTrips',
      'spocDesignation', 'alternatePhone', 'alternateEmail',
      'emergencyContactName', 'emergencyContactPhone', 'operationalCampus',
      'dateOfBirth', 'gender'
    ];
    for (const k of extraKeys) {
      if (anyDto[k] !== undefined) {
        extraDetails[k] = anyDto[k];
      }
    }

    // Preserve existing kycDocuments if any
    let existingKyc: any = {};
    if (existingVendor?.kycDocuments && typeof existingVendor.kycDocuments === 'object') {
      existingKyc = existingVendor.kycDocuments;
    }

    const updatedKyc = {
      ...existingKyc,
      companyDetails: {
        ...(existingKyc.companyDetails || {}),
        ...extraDetails,
      },
    };

    const vendor = await this.db.vendor.upsert({
      where: { userId },
      create: {
        userId,
        organizationName: dto.organizationName || user?.fullName || 'Business Booker',
        fullName: cleanName || user?.fullName || 'Business Booker',
        phone: effectivePhone,
        gstNumber: dto.gstNumber,
        address: dto.address,
        kycDocuments: updatedKyc,
        verificationStatus: VerificationStatus.UNDER_REVIEW,
      },
      update: {
        ...(dto.organizationName ? { organizationName: dto.organizationName } : {}),
        fullName: cleanName || user?.fullName || undefined,
        phone: effectivePhone || undefined,
        gstNumber: dto.gstNumber,
        address: dto.address,
        kycDocuments: updatedKyc,
        verificationStatus: VerificationStatus.UNDER_REVIEW,
        rejectionReason: null,
      },
    });

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
      ...extraDetails,
    } as any;
  }

  async updateProfile(userId: string, dto: any): Promise<VendorProfileDto> {
    return this.createProfile(userId, dto, dto.phone || '');
  }

  async getProfile(userId: string): Promise<VendorProfileDto> {
    const vendor = await this.db.vendor.findUnique({
      where: { userId },
      include: { user: true },
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
        organizationName: user.fullName || 'Corporate Partner',
        fullName: user.fullName || 'Business Requester',
        phone: user.phone,
        email: user.email,
        verificationStatus: VerificationStatus.PENDING,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      } as any;
    }

    const savedCompanyDetails = (vendor.kycDocuments as any)?.companyDetails || {};

    return {
      id: vendor.id,
      userId: vendor.userId,
      organizationName: vendor.organizationName,
      fullName: vendor.fullName || vendor.user?.fullName,
      phone: vendor.phone || vendor.user?.phone,
      email: vendor.user?.email || undefined,
      verificationStatus: vendor.verificationStatus as VerificationStatus,
      gstNumber: vendor.gstNumber || undefined,
      address: vendor.address || undefined,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
      ...savedCompanyDetails,
    } as any;
  }
}
