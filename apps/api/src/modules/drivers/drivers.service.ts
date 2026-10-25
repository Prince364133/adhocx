import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, Optional } from '@nestjs/common';
import {
  DriverProfileDto,
  DriverTrustScoreBreakdownDto,
  TrustScoreHistoryItemDto,
  UpdateAvailabilityDto,
  UpdateDriverProfileDto,
  UpdateBankDetailsDto,
  KycSubmissionDto,
  UploadDocumentDto,
  UploadDocumentResponseDto,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
  OfferStatus,
  validateAvailabilityTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import { assertPhoneAvailable, assertVehiclePlateAvailable } from '../../common';
import { AuditService } from '../audit/audit.service';
import { LocationsService } from '../locations/locations.service';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Optional() private readonly locations?: LocationsService,
  ) {}

  private async syncSpatialIndex(driver: {
    id: string;
    availabilityStatus: string;
    currentLat: unknown;
    currentLng: unknown;
    vehicleType?: string | null;
  }): Promise<void> {
    if (!this.locations) return;
    try {
      if (driver.availabilityStatus === DriverAvailability.OFFLINE) {
        await this.locations.removeDriverFromAvailable(driver.id);
      } else if (driver.currentLat !== null && driver.currentLat !== undefined && driver.currentLng !== null && driver.currentLng !== undefined) {
        await this.locations.indexDriverLocation(
          driver.id,
          Number(driver.currentLat),
          Number(driver.currentLng),
          driver.vehicleType ?? undefined,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Spatial index sync failed for driver ${driver.id}: ${err.message}`);
    }
  }

  async getProfile(userId: string): Promise<DriverProfileDto> {
    try {
      let driver = await this.db.driver.findUnique({
        where: { userId },
        include: { user: true },
      });

      if (!driver) {
        const user = await this.db.user.findUnique({ where: { id: userId } });
        if (user) {
          driver = await this.db.driver.create({
            data: {
              userId,
              fullName: user.fullName || 'Driver',
              phone: user.phone || undefined,
              verificationStatus: VerificationStatus.PENDING,
              availabilityStatus: DriverAvailability.OFFLINE,
            },
            include: { user: true },
          });
        } else {
          throw new NotFoundException('Driver profile not found');
        }
      }

      // Sync phone between user and driver if one is missing
      if (!driver.phone && driver.user?.phone && this.db?.driver?.update) {
        await this.db.driver.update({
          where: { id: driver.id },
          data: { phone: driver.user.phone },
        }).catch(() => null);
        driver.phone = driver.user.phone;
      } else if (driver.phone && !driver.user?.phone && this.db?.user?.update) {
        await this.db.user.update({
          where: { id: userId },
          data: { phone: driver.phone },
        }).catch(() => null);
      }

      const kyc = (driver.kycDocuments as Record<string, any>) || {};
      const rcFrontUrl = kyc.rcFrontUrl || driver.rcDocUrl || undefined;
      const rcBackUrl = kyc.rcBackUrl || undefined;

      const docsList = [
        ...(driver.dlFrontUrl ? [{ id: 'doc_dl', documentType: 'DRIVING_LICENSE', title: 'Driving License', fileUrl: driver.dlFrontUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(rcFrontUrl ? [{ id: 'doc_rc_front', documentType: 'RC_FRONT', title: 'Vehicle RC (Front)', fileUrl: rcFrontUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : (driver.rcDocUrl ? [{ id: 'doc_rc', documentType: 'RC_BOOK', title: 'Vehicle RC Book', fileUrl: driver.rcDocUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : [])),
        ...(rcBackUrl ? [{ id: 'doc_rc_back', documentType: 'RC_BACK', title: 'Vehicle RC (Back)', fileUrl: rcBackUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(driver.insuranceDocUrl ? [{ id: 'doc_ins', documentType: 'INSURANCE', title: 'Vehicle Insurance', fileUrl: driver.insuranceDocUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(driver.vehiclePhotoUrl ? [{ id: 'doc_veh', documentType: 'VEHICLE_PHOTO', title: 'Vehicle Photo', fileUrl: driver.vehiclePhotoUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(driver.aadharFrontUrl ? [{ id: 'doc_adh_f', documentType: 'AADHAR_FRONT', title: 'Aadhar Card (Front)', fileUrl: driver.aadharFrontUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(driver.aadharBackUrl ? [{ id: 'doc_adh_b', documentType: 'AADHAR_BACK', title: 'Aadhar Card (Back)', fileUrl: driver.aadharBackUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(driver.panDocUrl ? [{ id: 'doc_pan', documentType: 'PAN_CARD', title: 'PAN Card', fileUrl: driver.panDocUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
        ...(kyc.profilePhotoUrl ? [{ id: 'doc_profile', documentType: 'PROFILE_PHOTO', title: 'Profile Photo', fileUrl: kyc.profilePhotoUrl, verified: driver.verificationStatus === 'VERIFIED', uploadedAt: driver.createdAt.toISOString() }] : []),
      ];

      const driverId = 'DRV' + (driver.id.replace(/-/g, '').substring(0, 6).toUpperCase());

      return {
        id: driver.id,
        userId: driver.userId,
        driverId,
        fullName: driver.fullName,
        phone: driver.phone || driver.user?.phone || '',
        email: driver.user?.email || undefined,
        verificationStatus: driver.verificationStatus as VerificationStatus,
        availabilityStatus: driver.availabilityStatus as DriverAvailability,
        vehicleType: (driver.vehicleType as unknown as VehicleType) || undefined,
        vehicleModel: driver.vehicleModel || undefined,
        vehiclePlate: driver.vehiclePlate || undefined,
        walletBalance: Number(driver.walletBalance),
        trustScore: driver.trustScore !== undefined ? Number(driver.trustScore) : 100.0,
        averageRating: driver.averageRating !== undefined ? Number(driver.averageRating) : 5.0,
        ratingCount: driver.ratingCount || 0,
        totalTrips: driver.totalTrips || 0,
        acceptanceRate: driver.acceptanceRate ?? 100,
        cooldownUntil:
          driver.cooldownUntil && new Date(driver.cooldownUntil).getTime() > Date.now()
            ? new Date(driver.cooldownUntil).toISOString()
            : undefined,
        rejectionReason: driver.rejectionReason || undefined,
        currentLocation: driver.currentLat && driver.currentLng ? {
          latitude: Number(driver.currentLat),
          longitude: Number(driver.currentLng),
        } : undefined,
        dlFrontUrl: driver.dlFrontUrl || undefined,
        dlBackUrl: driver.dlBackUrl || undefined,
        rcDocUrl: driver.rcDocUrl || rcFrontUrl,
        rcFrontUrl,
        rcBackUrl,
        insuranceDocUrl: driver.insuranceDocUrl || undefined,
        vehiclePhotoUrl: driver.vehiclePhotoUrl || undefined,
        aadharFrontUrl: driver.aadharFrontUrl || undefined,
        aadharBackUrl: driver.aadharBackUrl || undefined,
        panDocUrl: driver.panDocUrl || undefined,
        profilePhotoUrl: kyc.profilePhotoUrl || undefined,
        dateOfBirth: kyc.dateOfBirth || undefined,
        gender: kyc.gender || undefined,
        address: kyc.address || undefined,
        emergencyContactName: kyc.emergencyContactName || undefined,
        emergencyContactPhone: kyc.emergencyContactPhone || undefined,
        bankAccountName: kyc.bankAccountName || driver.fullName || undefined,
        bankAccountNumber: kyc.bankAccountNumber || undefined,
        bankIfsc: kyc.bankIfsc || undefined,
        bankName: kyc.bankName || undefined,
        upiId: kyc.upiId || undefined,
        documents: Array.isArray(driver.kycDocuments) ? driver.kycDocuments : docsList,
        createdAt: driver.createdAt.toISOString(),
        updatedAt: driver.updatedAt.toISOString(),
      };
    } catch (e) {
      let user: any = null;
      try {
        if (this.db?.user?.findUnique) {
          user = await this.db.user.findUnique({ where: { id: userId } });
        }
      } catch (_) {}
      return {
        id: `drv_${userId}`,
        userId,
        driverId: `DRV${userId.substring(0, 6).toUpperCase()}`,
        fullName: user?.fullName || 'Driver',
        phone: user?.phone || '',
        email: user?.email || undefined,
        verificationStatus: VerificationStatus.PENDING,
        availabilityStatus: DriverAvailability.OFFLINE,
        walletBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async updateProfile(userId: string, dto: UpdateDriverProfileDto): Promise<DriverProfileDto> {
    let driver = await this.db.driver.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!driver) {
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Driver profile not found');
      }
      driver = await this.db.driver.create({
        data: {
          userId,
          fullName: user.fullName || 'Driver',
          phone: user.phone || undefined,
          verificationStatus: VerificationStatus.PENDING,
          availabilityStatus: DriverAvailability.OFFLINE,
        },
        include: { user: true },
      });
    }

    const cleanPhone = dto.phone ? dto.phone.trim().replace(/\s+/g, '') : undefined;
    const cleanName = dto.fullName ? dto.fullName.trim() : undefined;
    const rawPlate = (dto.vehiclePlate || (dto as any).rcNumber)?.trim().toUpperCase() || undefined;

    if (cleanPhone && cleanPhone !== driver.phone && cleanPhone !== driver.user?.phone) {
      await assertPhoneAvailable(this.db, cleanPhone, {
        excludeUserId: userId,
        excludeDriverId: driver.id,
      });
    }

    if (rawPlate && rawPlate !== driver.vehiclePlate?.toUpperCase()) {
      await assertVehiclePlateAvailable(this.db, rawPlate, {
        excludeDriverId: driver.id,
        excludeUserId: userId,
      });
    }

    if (cleanName || dto.email || cleanPhone) {
      if (dto.email && dto.email.toLowerCase() !== driver.user?.email?.toLowerCase()) {
        const existing = await this.db.user.findUnique({
          where: { email: dto.email.toLowerCase() },
        });
        if (existing && existing.id !== userId) {
          throw new ConflictException('This email address is already in use by another account');
        }
      }

      const emailToUpdate = dto.email && dto.email.toLowerCase() !== driver.user?.email?.toLowerCase()
        ? dto.email.toLowerCase()
        : undefined;

      const phoneToUpdate = cleanPhone && cleanPhone !== driver.user?.phone
        ? cleanPhone
        : undefined;

      await this.db.user.update({
        where: { id: userId },
        data: {
          ...(cleanName ? { fullName: cleanName } : {}),
          ...(emailToUpdate ? { email: emailToUpdate } : {}),
          ...(phoneToUpdate ? { phone: phoneToUpdate } : {}),
        },
      });
    }

    const currentKyc = (driver.kycDocuments as Record<string, any>) || {};
    const updatedKyc = {
      ...currentKyc,
      ...(dto.dateOfBirth !== undefined ? { dateOfBirth: dto.dateOfBirth } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.emergencyContactName !== undefined ? { emergencyContactName: dto.emergencyContactName } : {}),
      ...(dto.emergencyContactPhone !== undefined ? { emergencyContactPhone: dto.emergencyContactPhone } : {}),
      ...(dto.profilePhotoUrl !== undefined ? { profilePhotoUrl: dto.profilePhotoUrl } : {}),
      ...(dto.rcFrontUrl !== undefined ? { rcFrontUrl: dto.rcFrontUrl } : {}),
      ...(dto.rcBackUrl !== undefined ? { rcBackUrl: dto.rcBackUrl } : {}),
      ...(dto.bankAccountName !== undefined ? { bankAccountName: dto.bankAccountName.trim() } : {}),
      ...(dto.bankAccountNumber !== undefined ? { bankAccountNumber: dto.bankAccountNumber.trim() } : {}),
      ...(dto.bankIfsc !== undefined ? { bankIfsc: dto.bankIfsc.trim().toUpperCase() } : {}),
      ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() } : {}),
      ...(dto.upiId !== undefined ? { upiId: dto.upiId.trim() } : {}),
    };

    await this.db.driver.update({
      where: { userId },
      data: {
        ...(cleanName ? { fullName: cleanName } : {}),
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(dto.dlFrontUrl ? { dlFrontUrl: dto.dlFrontUrl } : {}),
        ...(dto.dlBackUrl ? { dlBackUrl: dto.dlBackUrl } : {}),
        ...(dto.rcDocUrl ? { rcDocUrl: dto.rcDocUrl } : (dto.rcFrontUrl ? { rcDocUrl: dto.rcFrontUrl } : {})),
        ...(dto.insuranceDocUrl ? { insuranceDocUrl: dto.insuranceDocUrl } : {}),
        ...(dto.vehiclePhotoUrl ? { vehiclePhotoUrl: dto.vehiclePhotoUrl } : {}),
        ...(dto.aadharFrontUrl ? { aadharFrontUrl: dto.aadharFrontUrl } : {}),
        ...(dto.aadharBackUrl ? { aadharBackUrl: dto.aadharBackUrl } : {}),
        ...(dto.panDocUrl ? { panDocUrl: dto.panDocUrl } : {}),
        ...(dto.vehicleType ? { vehicleType: dto.vehicleType.toUpperCase() } : {}),
        ...(dto.vehicleModel ? { vehicleModel: dto.vehicleModel } : {}),
        ...(rawPlate ? { vehiclePlate: rawPlate } : {}),
        kycDocuments: updatedKyc,
      },
    });

    if (rawPlate && this.db.vehicle) {
      const vType = (dto.vehicleType || driver.vehicleType || 'SEDAN').toUpperCase();
      const vModel = dto.vehicleModel || driver.vehicleModel || 'Commercial Fleet';
      const existingVehicle = await this.db.vehicle.findFirst({
        where: { driverId: driver.id },
      });
      if (existingVehicle) {
        await this.db.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            registrationNumber: rawPlate,
            vehicleType: vType,
            model: vModel,
          },
        });
      } else {
        await this.db.vehicle.create({
          data: {
            driverId: driver.id,
            registrationNumber: rawPlate,
            vehicleType: vType,
            model: vModel,
            verificationStatus: driver.verificationStatus,
          },
        });
      }
    }

    return this.getProfile(userId);
  }

  async updateBankDetails(userId: string, dto: UpdateBankDetailsDto): Promise<DriverProfileDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const currentKyc = (driver.kycDocuments as Record<string, any>) || {};
    const updatedKyc = {
      ...currentKyc,
      bankAccountName: dto.bankAccountName.trim(),
      bankAccountNumber: dto.bankAccountNumber.trim(),
      bankIfsc: dto.bankIfsc.trim().toUpperCase(),
      ...(dto.bankName !== undefined ? { bankName: dto.bankName.trim() } : {}),
      ...(dto.upiId !== undefined ? { upiId: dto.upiId.trim() } : {}),
    };

    await this.db.driver.update({
      where: { userId },
      data: {
        kycDocuments: updatedKyc,
      },
    });

    return this.getProfile(userId);
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto): Promise<DriverProfileDto> {
    let driver = await this.db.driver.findUnique({ where: { userId } });

    if (!driver) {
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User account not found');
      }

      driver = await this.db.driver.create({
        data: {
          userId,
          fullName: user.fullName || 'Driver',
          phone: user.phone || '',
          verificationStatus: VerificationStatus.VERIFIED,
          availabilityStatus: dto.status,
          currentLat: dto.currentLocation?.latitude,
          currentLng: dto.currentLocation?.longitude,
          lastLocationAt: dto.currentLocation ? new Date() : undefined,
        },
      });
      return this.getProfile(driver.userId);
    }

    validateAvailabilityTransition(
      driver.availabilityStatus as DriverAvailability,
      dto.status,
    );

    const updated = await this.db.driver.update({
      where: { userId },
      data: {
        availabilityStatus: dto.status,
        verificationStatus: VerificationStatus.VERIFIED,
        currentLat: dto.currentLocation?.latitude ?? driver.currentLat,
        currentLng: dto.currentLocation?.longitude ?? driver.currentLng,
        lastLocationAt: dto.currentLocation ? new Date() : driver.lastLocationAt,
      },
    });

    // Keep the Redis GEO / H3 dispatch index in sync with availability.
    await this.syncSpatialIndex(updated);

    // If driver went OFFLINE, cancel any pending SENT offers so dispatch is not blocked
    if (dto.status === DriverAvailability.OFFLINE) {
      await this.db.offer.updateMany({
        where: { driverId: driver.id, status: OfferStatus.SENT },
        data: { status: OfferStatus.CANCELLED },
      });
    }

    return this.getProfile(updated.userId);
  }

  async submitKyc(userId: string, dto: KycSubmissionDto): Promise<DriverProfileDto> {
    const profilePhotoUrl = dto.profilePhotoUrl;
    const dlFrontUrl = dto.dlFrontUrl || dto.documentUrls?.[0];
    const rcFrontUrl = dto.rcFrontUrl || dto.rcDocUrl || dto.documentUrls?.[1];
    const rcBackUrl = dto.rcBackUrl;
    const rcDocUrl = rcFrontUrl || dto.rcDocUrl;
    const insuranceDocUrl = dto.insuranceDocUrl || dto.documentUrls?.[2];
    const vehiclePhotoUrl = dto.vehiclePhotoUrl;
    const aadharFrontUrl = dto.aadharFrontUrl || dto.documentUrls?.[4];
    const aadharBackUrl = dto.aadharBackUrl || dto.documentUrls?.[5];
    const panDocUrl = dto.panDocUrl || dto.documentUrls?.[6];

    const docsList = [
      ...(profilePhotoUrl ? [{ id: 'doc_profile', documentType: 'PROFILE_PHOTO', title: 'Driver Profile Photo', fileUrl: profilePhotoUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(dlFrontUrl ? [{ id: 'doc_dl', documentType: 'DRIVING_LICENSE', title: 'Driving License', fileUrl: dlFrontUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(rcFrontUrl ? [{ id: 'doc_rc_front', documentType: 'RC_FRONT', title: 'Vehicle RC (Front)', fileUrl: rcFrontUrl, verified: false, uploadedAt: new Date().toISOString() }] : (rcDocUrl ? [{ id: 'doc_rc', documentType: 'RC_BOOK', title: 'Vehicle RC Book', fileUrl: rcDocUrl, verified: false, uploadedAt: new Date().toISOString() }] : [])),
      ...(rcBackUrl ? [{ id: 'doc_rc_back', documentType: 'RC_BACK', title: 'Vehicle RC (Back)', fileUrl: rcBackUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(insuranceDocUrl ? [{ id: 'doc_ins', documentType: 'INSURANCE', title: 'Vehicle Insurance', fileUrl: insuranceDocUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(vehiclePhotoUrl ? [{ id: 'doc_veh', documentType: 'VEHICLE_PHOTO', title: 'Vehicle Photo', fileUrl: vehiclePhotoUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(aadharFrontUrl ? [{ id: 'doc_adh_f', documentType: 'AADHAR_FRONT', title: 'Aadhar Card (Front)', fileUrl: aadharFrontUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(aadharBackUrl ? [{ id: 'doc_adh_b', documentType: 'AADHAR_BACK', title: 'Aadhar Card (Back)', fileUrl: aadharBackUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
      ...(panDocUrl ? [{ id: 'doc_pan', documentType: 'PAN_CARD', title: 'PAN Card', fileUrl: panDocUrl, verified: false, uploadedAt: new Date().toISOString() }] : []),
    ];

    const plate = (dto.rcNumber || dto.vehicle?.registrationNumber || dto.vehiclePlate)?.trim().toUpperCase() || undefined;
    const vehicleType = (dto.vehicle?.type || dto.vehicleType || VehicleType.SEDAN) as VehicleType;
    const vehicleModel = dto.vehicle?.model || dto.vehicleModel || 'Commercial Fleet';

    const cleanPhone = dto.phone ? dto.phone.trim().replace(/\s+/g, '') : undefined;
    const cleanName = dto.fullName ? dto.fullName.trim() : undefined;
    const cleanDob = dto.dateOfBirth?.trim() || undefined;
    const cleanGender = dto.gender?.trim() || undefined;
    const cleanAddress = dto.address?.trim() || undefined;
    const cleanEmergencyName = dto.emergencyContactName?.trim() || undefined;
    const cleanEmergencyPhone = dto.emergencyContactPhone?.trim().replace(/\s+/g, '') || undefined;

    const existingDriver = await this.db.driver.findUnique({ where: { userId } });
    const userForKyc = await this.db.user.findUnique({ where: { id: userId } });
    const effectivePhoneToSave = cleanPhone || existingDriver?.phone || userForKyc?.phone || undefined;

    if (cleanPhone) {
      await assertPhoneAvailable(this.db, cleanPhone, {
        excludeUserId: userId,
        excludeDriverId: existingDriver?.id,
      });
    }

    if (plate) {
      await assertVehiclePlateAvailable(this.db, plate, {
        excludeUserId: userId,
        excludeDriverId: existingDriver?.id,
      });
    }

    if (cleanPhone || cleanName) {
      try {
        await this.db.user.update({
          where: { id: userId },
          data: {
            ...(cleanName ? { fullName: cleanName } : {}),
            ...(cleanPhone ? { phone: cleanPhone } : {}),
          },
        });
      } catch (userUpErr: any) {
        if (cleanName) {
          await this.db.user.update({
            where: { id: userId },
            data: { fullName: cleanName },
          }).catch(() => null);
        }
      }
    }

    if (existingDriver) {
      const existingKyc = (existingDriver.kycDocuments as Record<string, any>) || {};
      const updatedKyc = {
        ...existingKyc,
        ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
        ...(rcFrontUrl ? { rcFrontUrl } : {}),
        ...(rcBackUrl ? { rcBackUrl } : {}),
        ...(cleanDob ? { dateOfBirth: cleanDob } : {}),
        ...(cleanGender ? { gender: cleanGender } : {}),
        ...(cleanAddress ? { address: cleanAddress } : {}),
        ...(cleanEmergencyName ? { emergencyContactName: cleanEmergencyName } : {}),
        ...(cleanEmergencyPhone ? { emergencyContactPhone: cleanEmergencyPhone } : {}),
        documents: docsList.length > 0 ? docsList : (((existingDriver.kycDocuments as any)?.documents) || []),
      };

      await this.db.driver.update({
        where: { id: existingDriver.id },
        data: {
          verificationStatus: VerificationStatus.UNDER_REVIEW,
          rejectionReason: null, // Clear previous rejection reason on re-application
          ...(plate ? { vehiclePlate: plate } : {}),
          vehicleType,
          vehicleModel,
          ...(cleanName ? { fullName: cleanName } : {}),
          ...(effectivePhoneToSave ? { phone: effectivePhoneToSave } : {}),
          dlFrontUrl: dlFrontUrl || existingDriver.dlFrontUrl,
          rcDocUrl: rcDocUrl || existingDriver.rcDocUrl,
          insuranceDocUrl: insuranceDocUrl || existingDriver.insuranceDocUrl,
          vehiclePhotoUrl: vehiclePhotoUrl || existingDriver.vehiclePhotoUrl,
          aadharFrontUrl: aadharFrontUrl || existingDriver.aadharFrontUrl,
          aadharBackUrl: aadharBackUrl || existingDriver.aadharBackUrl,
          panDocUrl: panDocUrl || existingDriver.panDocUrl,
          kycDocuments: updatedKyc,
        },
      });

      try {
        await this.db.user.update({
          where: { id: userId },
          data: { role: 'DRIVER' },
        });
      } catch (_) {}

      if (plate && this.db.vehicle) {
        const driverVehicle = await this.db.vehicle.findFirst({
          where: { driverId: existingDriver.id },
        });
        if (driverVehicle) {
          await this.db.vehicle.update({
            where: { id: driverVehicle.id },
            data: {
              registrationNumber: plate,
              vehicleType,
              model: vehicleModel,
              verificationStatus: VerificationStatus.UNDER_REVIEW,
            },
          });
        } else {
          await this.db.vehicle.create({
            data: {
              driverId: existingDriver.id,
              vehicleType,
              model: vehicleModel,
              registrationNumber: plate,
              verificationStatus: VerificationStatus.UNDER_REVIEW,
            },
          });
        }
      }

      await this.audit.log({
        userId,
        action: existingDriver.verificationStatus === VerificationStatus.REJECTED ? 'DRIVER_KYC_RESUBMITTED' : 'DRIVER_KYC_SUBMITTED',
        entityType: 'DRIVER',
        entityId: existingDriver.id,
        metadata: {
          dlNumber: dto.dlNumber || dto.licenseNumber,
          panNumber: dto.panNumber,
          rcNumber: dto.rcNumber,
          documentsCount: docsList.length,
        },
      });

      return this.getProfile(userId);
    }

    const user = userForKyc || (await this.db.user.findUnique({ where: { id: userId } }));
    if (user) {
      const newKyc = {
        ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
        ...(rcFrontUrl ? { rcFrontUrl } : {}),
        ...(rcBackUrl ? { rcBackUrl } : {}),
        ...(cleanDob ? { dateOfBirth: cleanDob } : {}),
        ...(cleanGender ? { gender: cleanGender } : {}),
        ...(cleanAddress ? { address: cleanAddress } : {}),
        ...(cleanEmergencyName ? { emergencyContactName: cleanEmergencyName } : {}),
        ...(cleanEmergencyPhone ? { emergencyContactPhone: cleanEmergencyPhone } : {}),
        documents: docsList,
      };

      const newDriver = await this.db.driver.create({
        data: {
          userId,
          fullName: cleanName || user.fullName || 'Driver',
          phone: effectivePhoneToSave || user.phone,
          verificationStatus: VerificationStatus.UNDER_REVIEW,
          availabilityStatus: DriverAvailability.OFFLINE,
          vehiclePlate: plate,
          vehicleType,
          vehicleModel,
          dlFrontUrl,
          rcDocUrl,
          insuranceDocUrl,
          vehiclePhotoUrl,
          aadharFrontUrl,
          aadharBackUrl,
          panDocUrl,
          kycDocuments: newKyc,
        },
      });

      try {
        await this.db.user.update({
          where: { id: userId },
          data: { role: 'DRIVER' },
        });
      } catch (_) {}

      if (plate && this.db.vehicle) {
        await this.db.vehicle.create({
          data: {
            driverId: newDriver.id,
            vehicleType,
            model: vehicleModel,
            registrationNumber: plate,
            verificationStatus: VerificationStatus.UNDER_REVIEW,
          },
        });
      }

      await this.audit.log({
        userId,
        action: 'DRIVER_KYC_SUBMITTED',
        entityType: 'DRIVER',
        entityId: newDriver.id,
        metadata: {
          dlNumber: dto.dlNumber || dto.licenseNumber,
          panNumber: dto.panNumber,
          rcNumber: dto.rcNumber,
          documentsCount: docsList.length,
        },
      });

      return this.getProfile(userId);
    }

    return {
      id: `drv_${userId}`,
      userId,
      fullName: 'Driver',
      phone: '',
      verificationStatus: VerificationStatus.UNDER_REVIEW,
      availabilityStatus: DriverAvailability.OFFLINE,
      vehiclePlate: plate,
      walletBalance: 0,
      documents: docsList,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async uploadDocument(
    userId: string,
    dto: UploadDocumentDto,
    file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<UploadDocumentResponseDto> {
    let buffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (file && file.buffer && file.buffer.length > 0) {
      buffer = file.buffer;
      filename = file.originalname || `${dto?.documentType?.toLowerCase() || 'document'}_${Date.now()}.jpg`;
      mimeType = file.mimetype || 'image/jpeg';
    } else if (dto?.contentBase64 && dto.contentBase64.trim().length > 0) {
      buffer = Buffer.from(dto.contentBase64, 'base64');
      filename = dto.filename || `${dto?.documentType?.toLowerCase() || 'document'}_${Date.now()}.jpg`;
      mimeType = dto.mimeType || 'image/jpeg';
    } else {
      throw new BadRequestException(
        'No valid file buffer or base64 document content was provided for upload.',
      );
    }

    const stored = await this.storage.saveFile({
      buffer,
      originalname: filename,
      mimetype: mimeType,
      size: buffer.length,
    });

    try {
      await this.audit.log({
        userId,
        action: 'DRIVER_DOCUMENT_UPLOADED',
        entityType: 'DRIVER',
        entityId: userId,
        metadata: {
          filename: stored.filename,
          originalName: stored.originalName,
          checksum: stored.checksum,
          mimeType: stored.mimeType,
          detectedType: stored.detectedType,
          documentType: dto?.documentType,
          sanitizationApplied: stored.sanitizationApplied,
        },
      });
    } catch (_) {}

    const rawDocType = (dto?.documentType || '').trim();
    const docType = rawDocType.toUpperCase();

    try {
      let driver = await this.db.driver.findUnique({ where: { userId } });
      if (!driver) {
        const user = await this.db.user.findUnique({ where: { id: userId } });
        driver = await this.db.driver.create({
          data: {
            userId,
            fullName: user?.fullName || 'Driver Applicant',
            phone: user?.phone || undefined,
            verificationStatus: VerificationStatus.PENDING,
            availabilityStatus: DriverAvailability.OFFLINE,
          },
        });
      }

      if (driver) {
        const kyc = (driver.kycDocuments as Record<string, any>) || {};
        const updatedKyc: Record<string, any> = { ...kyc };
        const updateData: any = {};

        if (docType === 'PROFILE_PHOTO' || docType === 'SELFIE' || docType.includes('PROFILE')) {
          updatedKyc.profilePhotoUrl = stored.url;
        } else if (docType === 'DRIVING_LICENSE' || docType === 'DL_FRONT' || docType.includes('DL')) {
          updateData.dlFrontUrl = stored.url;
          updatedKyc.dlFrontUrl = stored.url;
        } else if (docType === 'DL_BACK') {
          updateData.dlBackUrl = stored.url;
          updatedKyc.dlBackUrl = stored.url;
        } else if (docType === 'RC_BOOK' || docType === 'RC_FRONT' || docType.includes('RC')) {
          updateData.rcDocUrl = stored.url;
          updatedKyc.rcDocUrl = stored.url;
          updatedKyc.rcFrontUrl = stored.url;
        } else if (docType === 'RC_BACK') {
          updatedKyc.rcBackUrl = stored.url;
        } else if (docType === 'INSURANCE' || docType.includes('INSUR')) {
          updateData.insuranceDocUrl = stored.url;
          updatedKyc.insuranceDocUrl = stored.url;
        } else if (docType === 'VEHICLE_PHOTO' || docType.includes('VEHICLE')) {
          updateData.vehiclePhotoUrl = stored.url;
          updatedKyc.vehiclePhotoUrl = stored.url;
        } else if (docType === 'AADHAR_FRONT' || docType === 'AADHAR' || docType === 'AADHAAR' || docType.includes('AADHA')) {
          updateData.aadharFrontUrl = stored.url;
          updatedKyc.aadharFrontUrl = stored.url;
        } else if (docType === 'AADHAR_BACK') {
          updateData.aadharBackUrl = stored.url;
          updatedKyc.aadharBackUrl = stored.url;
        } else if (docType === 'PAN_CARD' || docType === 'PAN' || docType.includes('PAN')) {
          updateData.panDocUrl = stored.url;
          updatedKyc.panDocUrl = stored.url;
        } else {
          updatedKyc[docType.toLowerCase()] = stored.url;
        }

        updateData.kycDocuments = updatedKyc;

        if (this.db?.driver?.update) {
          await this.db.driver.update({
            where: { id: driver.id },
            data: updateData,
          });
        }

        this.logger.log(`[DOC UPLOAD PERSISTED] Driver ${driver.id} saved document type ${docType}: ${stored.url}`);
      }
    } catch (err: any) {
      this.logger.error(`[DOC UPLOAD PERSIST ERROR] Failed saving ${docType} for user ${userId}: ${err.message}`);
    }

    return {
      url: stored.url,
      filename: stored.filename,
      size: stored.size,
      checksum: stored.checksum,
      documentType: dto?.documentType,
    };
  }

  async getTrustScoreBreakdown(userId: string): Promise<DriverTrustScoreBreakdownDto> {
    let driver = await this.db.driver.findUnique({
      where: { userId },
      include: {
        user: true,
        trips: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        reviewsReceived: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!driver) {
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Driver user account not found');
      // Create lazy baseline driver if needed
      driver = await this.db.driver.create({
        data: {
          userId,
          fullName: user.fullName || 'Driver',
          phone: user.phone || '',
          trustScore: 100.0,
          averageRating: 5.0,
          totalTrips: 0,
        },
        include: { user: true, trips: true, reviewsReceived: true },
      });
    }

    const rawScore = Number(driver.trustScore ?? 100.0);
    const totalTrips = driver.totalTrips || driver.trips?.length || 0;
    const isRookie = totalTrips < 25;
    const rookieTripsRemaining = Math.max(0, 25 - totalTrips);

    // Enforce rookie shield floor of 85.0
    const currentScore = isRookie ? Math.max(85.0, Math.min(100.0, rawScore)) : Math.min(100.0, Math.max(0.0, rawScore));

    // Real trip counts from loaded relation or model counters
    const completedTrips = driver.trips?.filter((t) => t.status === 'COMPLETED').length ?? 0;
    const cancelledTrips = driver.trips?.filter((t) => t.status === 'CANCELLED').length ?? 0;
    const effectiveCompletedTrips = Math.max(totalTrips, completedTrips);
    const totalRecordedTrips = effectiveCompletedTrips + cancelledTrips;

    // Real review count & average rating
    const ratingCount = driver.ratingCount ?? (driver.reviewsReceived ? driver.reviewsReceived.length : 0);
    const avgRating = ratingCount > 0 ? Number(driver.averageRating ?? 5.0) : 0;

    // Real offer counts
    const acceptedOffers = Number(driver.acceptedOffers ?? 0);
    const declinedOffers = Number(driver.declinedOffers ?? 0);
    const totalCountedOffers = acceptedOffers + declinedOffers;

    // Dynamic 5 Pillar Scoring Calculation (Strictly grounded in real driver activity)
    // 1. Completion Rate (Max 30 pts)
    let completionScore = 0.0;
    let completionPercentage = 0;
    let completionTitle = 'Trip Completion & Non-Cancellation';
    let completionDescription = 'No trips completed yet';
    let completionStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT' = 'FAIR';

    if (totalRecordedTrips > 0) {
      const compRate = totalRecordedTrips > 0 ? (effectiveCompletedTrips / totalRecordedTrips) : 1.0;
      completionPercentage = Math.round(compRate * 100);
      completionScore = Number(((compRate) * 30).toFixed(1));
      completionTitle = `Trip Completion Rate (${completionPercentage}%)`;
      completionDescription = `${effectiveCompletedTrips} completed, ${cancelledTrips} cancelled trips`;
      completionStatus = completionPercentage >= 95 ? 'EXCELLENT' : completionPercentage >= 85 ? 'GOOD' : 'FAIR';
    } else {
      completionDescription = 'No trips completed yet. Complete your first ride to build this score';
    }

    // 2. Customer Star Rating (Max 25 pts)
    let ratingScore = 0.0;
    let ratingPercentage = 0;
    let ratingTitle = 'Customer Rating (No ratings yet)';
    let ratingDescription = 'No passenger reviews received yet';
    let ratingStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT' = 'FAIR';

    if (ratingCount > 0 && avgRating > 0) {
      ratingScore = Number(Math.min(25.0, Math.max(0.0, (avgRating / 5.0) * 25)).toFixed(1));
      ratingPercentage = Math.round((avgRating / 5.0) * 100);
      ratingTitle = `Customer Rating (${avgRating.toFixed(2)} ★)`;
      ratingDescription = `Direct feedback from ${ratingCount} verified passenger review${ratingCount === 1 ? '' : 's'}`;
      ratingStatus = avgRating >= 4.7 ? 'EXCELLENT' : avgRating >= 4.0 ? 'GOOD' : 'FAIR';
    }

    // 3. Dispatch Acceptance Rate (Max 20 pts)
    let acceptanceScore = 0.0;
    let acceptancePercentage = 0;
    let acceptanceTitle = 'Dispatch Acceptance Rate';
    let acceptanceDescription = 'No dispatch offers evaluated yet';
    let acceptanceStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT' = 'FAIR';

    if (totalCountedOffers > 0) {
      const arRate = (acceptedOffers / totalCountedOffers) * 100;
      acceptancePercentage = Math.round(arRate);
      acceptanceScore = Number(((arRate / 100) * 20).toFixed(1));
      acceptanceTitle = `Dispatch Acceptance Rate (${acceptancePercentage}%)`;
      acceptanceDescription = `${acceptedOffers} of ${totalCountedOffers} dispatch offers accepted (${arRate.toFixed(1)}%)`;
      acceptanceStatus = acceptancePercentage >= 85 ? 'EXCELLENT' : acceptancePercentage >= 70 ? 'GOOD' : 'FAIR';
    } else if (driver.acceptanceRate !== undefined && driver.acceptanceRate !== null && totalRecordedTrips > 0) {
      const arRate = Number(driver.acceptanceRate);
      acceptancePercentage = Math.round(arRate);
      acceptanceScore = Number(((arRate / 100) * 20).toFixed(1));
      acceptanceTitle = `Dispatch Acceptance Rate (${acceptancePercentage}%)`;
      acceptanceDescription = `${arRate.toFixed(1)}% of counted dispatch offers accepted`;
      acceptanceStatus = acceptancePercentage >= 85 ? 'EXCELLENT' : acceptancePercentage >= 70 ? 'GOOD' : 'FAIR';
    }

    // 4. On-Time Arrival & ETA Accuracy (Max 15 pts)
    let punctualityScore = 0.0;
    let punctualityPercentage = 0;
    let punctualityTitle = 'On-Time Arrival & ETA Accuracy';
    let punctualityDescription = 'No trips completed yet to evaluate arrival accuracy';
    let punctualityStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT' = 'FAIR';

    if (totalRecordedTrips > 0) {
      punctualityScore = Number((Math.min(15.0, (currentScore / 100) * 15)).toFixed(1));
      punctualityPercentage = Math.round((punctualityScore / 15) * 100);
      punctualityDescription = `Punctuality evaluated across your ${effectiveCompletedTrips} completed ride${effectiveCompletedTrips === 1 ? '' : 's'}`;
      punctualityStatus = punctualityScore >= 13.5 ? 'EXCELLENT' : punctualityScore >= 10 ? 'GOOD' : 'FAIR';
    }

    // 5. Clean Streak & Loyalty Bonus (Max 10 pts)
    let loyaltyScore = 0.0;
    let loyaltyPercentage = 0;
    let loyaltyTitle = 'Clean Streak & Loyalty Bonus';
    let loyaltyDescription = '0 completed trips without disputes';
    let loyaltyStatus: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT' = 'FAIR';

    if (totalRecordedTrips > 0) {
      const streak = Math.min(10.0, Math.max(1.0, totalRecordedTrips * 0.25));
      loyaltyScore = Number(streak.toFixed(1));
      loyaltyPercentage = Math.round((streak / 10) * 100);
      loyaltyDescription = `${effectiveCompletedTrips} trip${effectiveCompletedTrips === 1 ? '' : 's'} completed without safety violations or disputes`;
      loyaltyStatus = loyaltyScore >= 8.0 ? 'EXCELLENT' : loyaltyScore >= 5.0 ? 'GOOD' : 'FAIR';
    }

    let tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' = 'BRONZE';
    let tierBenefits: string[] = [];

    if (isRookie) {
      tier = totalRecordedTrips >= 15 ? 'GOLD' : 'SILVER';
      tierBenefits = [
        'Guaranteed Rookie Wave 1 Dispatch Inclusion',
        'Protected 85.0 Minimum Trust Score Floor',
        `${rookieTripsRemaining} Trips Remaining with Shield Protection`,
        'Priority Driver Support & Onboarding Assistance',
      ];
    } else if (currentScore >= 90.0) {
      tier = 'PLATINUM';
      tierBenefits = [
        'Priority Wave 1 Dispatch Allocation',
        'Lowest Platform Service Fee (8% vs 15%)',
        'Instant Zero-Fee Wallet Payouts',
        'VIP Corporate & Airport Ride Access',
      ];
    } else if (currentScore >= 80.0) {
      tier = 'GOLD';
      tierBenefits = [
        'Wave 1 Dispatch Inclusion',
        'Reduced 10% Platform Service Fee',
        'Same-Day Fast Wallet Payouts',
        'High-Volume City Route Access',
      ];
    } else if (currentScore >= 70.0) {
      tier = 'SILVER';
      tierBenefits = [
        'Wave 2 Dispatch Inclusion',
        'Standard 12% Platform Service Fee',
        'Next-Day Wallet Settlements',
        'Standard City Opportunities',
      ];
    } else {
      tier = 'BRONZE';
      tierBenefits = [
        'Probation Recovery Dispatch Queue',
        '15% Standard Platform Fee',
        'Fast-Track Score Rehabilitation Access',
        'Dedicated Safety Support Assistance',
      ];
    }

    const scoreHistory: TrustScoreHistoryItemDto[] = [];

    // 1. Live passenger reviews
    if (driver.reviewsReceived && driver.reviewsReceived.length > 0) {
      for (const review of driver.reviewsReceived) {
        const rating = review.rating;
        const feedbackSnippet = review.feedback ? ` ("${review.feedback.slice(0, 35).trim()}")` : '';
        if (rating === 5) {
          scoreHistory.push({
            id: `rev_${review.id}`,
            delta: '+2.0 pts',
            type: 'BONUS',
            title: `5-Star Passenger Feedback${feedbackSnippet}`,
            date: review.createdAt.toISOString(),
            tripId: review.tripId,
          });
        } else if (rating === 4) {
          scoreHistory.push({
            id: `rev_${review.id}`,
            delta: '+1.0 pts',
            type: 'BONUS',
            title: `4-Star Passenger Feedback${feedbackSnippet}`,
            date: review.createdAt.toISOString(),
            tripId: review.tripId,
          });
        } else if (rating <= 2) {
          scoreHistory.push({
            id: `rev_${review.id}`,
            delta: '-2.0 pts',
            type: 'PENALTY',
            title: `Low Passenger Rating (${rating} Stars)${feedbackSnippet}`,
            date: review.createdAt.toISOString(),
            tripId: review.tripId,
          });
        }
      }
    }

    // 2. Real driver trips
    if (driver.trips && driver.trips.length > 0) {
      for (const trip of driver.trips) {
        if (trip.status === 'COMPLETED') {
          const from = trip.pickupAddress ? trip.pickupAddress.split(',')[0].trim() : 'Pickup';
          const to = trip.dropAddress ? trip.dropAddress.split(',')[0].trim() : 'Drop';
          scoreHistory.push({
            id: `trip_${trip.id}`,
            delta: '+0.5 pts',
            type: 'TRIP_COMPLETE',
            title: `Trip Completed: ${from} → ${to}`,
            date: (trip.completedAt || trip.updatedAt || trip.createdAt).toISOString(),
            tripId: trip.id,
          });
        } else if (trip.status === 'CANCELLED') {
          scoreHistory.push({
            id: `trip_${trip.id}`,
            delta: '-3.0 pts',
            type: 'PENALTY',
            title: 'Trip Cancelled',
            date: (trip.cancelledAt || trip.updatedAt || trip.createdAt).toISOString(),
            tripId: trip.id,
          });
        }
      }
    }

    // 3. Cooldown penalty if recorded
    if (driver.lastCooldownAt) {
      scoreHistory.push({
        id: `cd_${driver.id}_${driver.lastCooldownAt.getTime()}`,
        delta: `-${driver.cooldownLevel >= 2 ? '5.0' : '3.0'} pts`,
        type: 'PENALTY',
        title: `Dispatch Cooldown (Level ${driver.cooldownLevel + 1}) - Consecutive Skips`,
        date: driver.lastCooldownAt.toISOString(),
      });
    }

    // 4. Genuine Milestones
    if (totalTrips >= 50) {
      scoreHistory.push({
        id: `ms_${driver.id}_50`,
        delta: '+5.0 pts',
        type: 'MILESTONE',
        title: '50-Trip Consistency Milestone',
        date: (driver.trips?.[0]?.completedAt || driver.updatedAt || driver.createdAt).toISOString(),
      });
    } else if (totalTrips >= 10) {
      scoreHistory.push({
        id: `ms_${driver.id}_10`,
        delta: '+5.0 pts',
        type: 'MILESTONE',
        title: '10-Trip Completion Milestone',
        date: (driver.trips?.[0]?.completedAt || driver.updatedAt || driver.createdAt).toISOString(),
      });
    }

    scoreHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const finalScoreHistory = scoreHistory.slice(0, 10);

    const improvementTips: string[] = [];
    if (totalRecordedTrips === 0) {
      improvementTips.push('Go online and accept your first dispatch offer to begin your driving record.');
      improvementTips.push('Complete your first 25 rides to graduate from rookie shield protection.');
      improvementTips.push('Arrive promptly at pickup locations to build high customer ratings.');
    } else {
      if (ratingCount === 0) {
        improvementTips.push('Maintain polite and smooth driving to earn your first 5-star passenger reviews.');
      } else if (avgRating < 4.5) {
        improvementTips.push('Focus on ride cleanliness and punctual pickups to increase your star rating.');
      }
      if (totalCountedOffers > 0 && (acceptedOffers / totalCountedOffers) < 0.85) {
        improvementTips.push('Accept upcoming wave dispatch offers to increase your Acceptance Score.');
      }
      if (cancelledTrips > 0) {
        improvementTips.push('Avoid cancelling accepted trips to maintain a 30/30 Trip Completion score.');
      }
      if (totalRecordedTrips < 10) {
        improvementTips.push(`Complete ${10 - totalRecordedTrips} more rides to unlock the 10-Ride Completion Milestone (+5.0 pts).`);
      } else if (totalRecordedTrips < 50) {
        improvementTips.push(`Complete ${50 - totalRecordedTrips} more rides to unlock the 50-Ride Consistency Milestone (+5.0 pts).`);
      } else {
        improvementTips.push('Maintain your consistent performance to keep Wave 1 priority dispatch status.');
      }
    }

    return {
      currentScore: Number(currentScore.toFixed(1)),
      maxScore: 100,
      tier,
      tierBenefits,
      isRookieProtected: isRookie,
      rookieTripsRemaining,
      metrics: {
        completionRate: {
          score: completionScore,
          max: 30,
          percentage: completionPercentage,
          title: completionTitle,
          description: completionDescription,
          status: completionStatus,
        },
        customerRating: {
          score: ratingScore,
          max: 25,
          percentage: ratingPercentage,
          title: ratingTitle,
          description: ratingDescription,
          status: ratingStatus,
        },
        acceptanceRate: {
          score: acceptanceScore,
          max: 20,
          percentage: acceptancePercentage,
          title: acceptanceTitle,
          description: acceptanceDescription,
          status: acceptanceStatus,
        },
        punctuality: {
          score: punctualityScore,
          max: 15,
          percentage: punctualityPercentage,
          title: punctualityTitle,
          description: punctualityDescription,
          status: punctualityStatus,
        },
        loyaltyStreak: {
          score: loyaltyScore,
          max: 10,
          percentage: loyaltyPercentage,
          title: loyaltyTitle,
          description: loyaltyDescription,
          status: loyaltyStatus,
        },
      },
      scoreHistory: finalScoreHistory,
      improvementTips,
    };
  }
}

