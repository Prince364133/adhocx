import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateVendorProfileDto, VendorProfileDto, VerificationStatus } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { assertPhoneAvailable, getPhoneVariants } from '../../common';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class VendorsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

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

    const userPhoneVariants = getPhoneVariants(user?.phone);
    const vendorPhoneVariants = getPhoneVariants(existingVendor?.phone);
    const isOwnedPhone =
      userPhoneVariants.includes(effectivePhone) ||
      vendorPhoneVariants.includes(effectivePhone);

    if (effectivePhone && !isOwnedPhone) {
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
      try {
        await this.db.user.update({
          where: { id: userId },
          data: { fullName: cleanName },
        });
      } catch (_) {}
    }

    const effectiveEmail = (dto.email || (dto as any).billingEmail)?.trim();
    if (effectiveEmail && effectiveEmail !== user?.email) {
      try {
        await this.db.user.update({
          where: { id: userId },
          data: { email: effectiveEmail },
        });
      } catch (_) {}
    }

    // Extract extra company and contact metadata
    const anyDto = dto as any;
    const extraDetails: Record<string, any> = {};
    const extraKeys = [
      'brandName', 'panNumber', 'businessType', 'website', 'city', 'state', 'pincode',
      'billingAddress', 'isBillingAddressSame', 'billingEmail', 'email', 'monthlyTrips',
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

  async uploadProfilePhoto(
    userId: string,
    dto: { contentBase64?: string; filename?: string; mimeType?: string },
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{ url: string; photoUrl: string }> {
    let buffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (file && file.buffer && file.buffer.length > 0) {
      buffer = file.buffer;
      filename = file.originalname || `vendor_profile_${Date.now()}.jpg`;
      mimeType = file.mimetype || 'image/jpeg';
    } else if (dto?.contentBase64 && dto.contentBase64.trim().length > 0) {
      const cleanedBase64 = dto.contentBase64.includes(',')
        ? dto.contentBase64.split(',').pop()!.trim()
        : dto.contentBase64.trim();
      buffer = Buffer.from(cleanedBase64, 'base64');
      filename = dto.filename || `vendor_profile_${Date.now()}.jpg`;
      mimeType = dto.mimeType || 'image/jpeg';
    } else {
      throw new BadRequestException('No valid profile image buffer or base64 content was provided.');
    }

    const stored = await this.storage.saveFile({
      buffer,
      originalname: filename,
      mimetype: mimeType,
      size: buffer.length,
    });

    const user = await this.db.user.findUnique({ where: { id: userId } });
    const existingVendor = await this.db.vendor.findUnique({ where: { userId } });
    const existingKyc =
      existingVendor?.kycDocuments && typeof existingVendor.kycDocuments === 'object'
        ? (existingVendor.kycDocuments as Record<string, any>)
        : {};

    const updatedKyc = {
      ...existingKyc,
      logoUrl: stored.url,
      profilePhotoUrl: stored.url,
      companyDetails: {
        ...(existingKyc.companyDetails || {}),
        logoUrl: stored.url,
      },
    };

    if (existingVendor) {
      await this.db.vendor.update({
        where: { userId },
        data: { kycDocuments: updatedKyc },
      });
    } else {
      await this.db.vendor.create({
        data: {
          userId,
          organizationName: user?.fullName || 'Business Booker',
          fullName: user?.fullName || 'Business Booker',
          phone: user?.phone || '',
          kycDocuments: updatedKyc,
          verificationStatus: VerificationStatus.PENDING,
        },
      });
    }

    return {
      url: stored.url,
      photoUrl: stored.url,
    };
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

    const kycDoc = (vendor.kycDocuments as any) || {};
    const savedCompanyDetails = kycDoc.companyDetails || {};
    const photoUrl = kycDoc.logoUrl || kycDoc.profilePhotoUrl || savedCompanyDetails.logoUrl || undefined;

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
      logoUrl: photoUrl,
      photoUrl,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
      ...savedCompanyDetails,
    } as any;
  }
}
