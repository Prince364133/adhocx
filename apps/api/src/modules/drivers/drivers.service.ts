import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DriverProfileDto,
  UpdateAvailabilityDto,
  KycSubmissionDto,
  UploadDocumentDto,
  UploadDocumentResponseDto,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
  validateAvailabilityTransition,
  validateVerificationTransition,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DriversService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async getProfile(userId: string): Promise<DriverProfileDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    return {
      id: driver.id,
      userId: driver.userId,
      fullName: driver.fullName,
      phone: driver.phone,
      verificationStatus: driver.verificationStatus as VerificationStatus,
      availabilityStatus: driver.availabilityStatus as DriverAvailability,
      vehicleType: (driver.vehicleType as unknown as VehicleType) || undefined,
      vehicleModel: driver.vehicleModel || undefined,
      vehiclePlate: driver.vehiclePlate || undefined,
      walletBalance: Number(driver.walletBalance),
      currentLocation: driver.currentLat && driver.currentLng ? {
        latitude: Number(driver.currentLat),
        longitude: Number(driver.currentLng),
      } : undefined,
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto): Promise<DriverProfileDto> {
    const driver = await this.db.driver.findUnique({ where: { userId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Validate state transition per docs/12_STATE_MACHINES.md
    validateAvailabilityTransition(
      driver.availabilityStatus as DriverAvailability,
      dto.status,
    );

    const updated = await this.db.driver.update({
      where: { userId },
      data: {
        availabilityStatus: dto.status,
        currentLat: dto.currentLocation?.latitude,
        currentLng: dto.currentLocation?.longitude,
        lastLocationAt: dto.currentLocation ? new Date() : undefined,
      },
    });

    return this.getProfile(updated.userId);
  }

  async submitKyc(userId: string, dto: KycSubmissionDto): Promise<DriverProfileDto> {
    const existingDriver = await this.db.driver.findUnique({ where: { userId } });

    if (existingDriver) {
      // Validate state transition to UNDER_REVIEW (legal from PENDING or REJECTED)
      validateVerificationTransition(
        existingDriver.verificationStatus as VerificationStatus,
        VerificationStatus.UNDER_REVIEW,
      );

      await this.db.driver.update({
        where: { id: existingDriver.id },
        data: {
          verificationStatus: VerificationStatus.UNDER_REVIEW,
          vehiclePlate: dto.rcNumber,
        },
      });

      await this.audit.log({
        userId,
        action: 'DRIVER_KYC_SUBMITTED',
        entityType: 'DRIVER',
        entityId: existingDriver.id,
        metadata: {
          dlNumber: dto.dlNumber,
          panNumber: dto.panNumber,
          rcNumber: dto.rcNumber,
        },
      });

      return this.getProfile(userId);
    }

    // If driver record does not exist yet, find user to get phone
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newDriver = await this.db.driver.create({
      data: {
        userId,
        fullName: user.fullName || 'Driver ' + dto.dlNumber.slice(-4),
        phone: user.phone,
        verificationStatus: VerificationStatus.UNDER_REVIEW,
        availabilityStatus: DriverAvailability.OFFLINE,
        vehiclePlate: dto.rcNumber,
      },
    });

    await this.audit.log({
      userId,
      action: 'DRIVER_KYC_SUBMITTED',
      entityType: 'DRIVER',
      entityId: newDriver.id,
      metadata: {
        dlNumber: dto.dlNumber,
        panNumber: dto.panNumber,
        rcNumber: dto.rcNumber,
      },
    });

    return this.getProfile(userId);
  }

  async uploadDocument(userId: string, dto: UploadDocumentDto): Promise<UploadDocumentResponseDto> {
    const buffer = Buffer.from(dto.contentBase64, 'base64');
    const stored = await this.storage.saveFile({
      buffer,
      originalname: dto.filename,
      mimetype: dto.mimeType,
      size: buffer.length,
    });

    await this.audit.log({
      userId,
      action: 'DRIVER_DOCUMENT_UPLOADED',
      entityType: 'DRIVER',
      entityId: userId,
      metadata: {
        filename: stored.filename,
        checksum: stored.checksum,
        mimeType: stored.mimeType,
      },
    });

    return {
      url: stored.url,
      filename: stored.filename,
      size: stored.size,
      checksum: stored.checksum,
    };
  }
}
