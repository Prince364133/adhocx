import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, UserStatus as PrismaUserStatus } from '@prisma/client';
import {
  DriverAvailability,
  ReactivateDriverDto,
  SuspendDriverDto,
  UserRole,
  VerificationStatus,
} from '@adhocx/contracts';
import { AdminService } from '../../../modules/admin/admin.service';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';

type DriverDocumentUrlField =
  | 'dlFrontUrl'
  | 'rcDocUrl'
  | 'insuranceDocUrl'
  | 'vehiclePhotoUrl'
  | 'aadharFrontUrl'
  | 'aadharBackUrl'
  | 'panDocUrl';

const DOCUMENT_FIELDS: Array<{ type: string; field?: DriverDocumentUrlField; kycField?: 'profilePhotoUrl' }> = [
  { type: 'DRIVING_LICENSE', field: 'dlFrontUrl' },
  { type: 'RC_FRONT' },
  { type: 'RC_BACK' },
  { type: 'RC_BOOK', field: 'rcDocUrl' },
  { type: 'INSURANCE', field: 'insuranceDocUrl' },
  { type: 'VEHICLE_PHOTO', field: 'vehiclePhotoUrl' },
  { type: 'AADHAR_FRONT', field: 'aadharFrontUrl' },
  { type: 'AADHAR_BACK', field: 'aadharBackUrl' },
  { type: 'PAN_CARD', field: 'panDocUrl' },
  { type: 'PROFILE_PHOTO', kycField: 'profilePhotoUrl' },
];

const VERIFICATION_STATUSES = new Set(Object.values(VerificationStatus));
const AVAILABILITY_STATUSES = new Set(Object.values(DriverAvailability));

const DRIVER_SUMMARY_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  phone: true,
  verificationStatus: true,
  availabilityStatus: true,
  vehicleType: true,
  vehicleModel: true,
  vehiclePlate: true,
  trustScore: true,
  averageRating: true,
  ratingCount: true,
  totalTrips: true,
  createdAt: true,
  user: { select: { phone: true, email: true } },
  dlFrontUrl: true,
  rcDocUrl: true,
  insuranceDocUrl: true,
  vehiclePhotoUrl: true,
  aadharFrontUrl: true,
  aadharBackUrl: true,
  panDocUrl: true,
} satisfies Prisma.DriverSelect;

const DRIVER_DETAIL_SELECT = {
  ...DRIVER_SUMMARY_SELECT,
  updatedAt: true,
  user: { select: { phone: true, email: true, status: true } },
  acceptanceRate: true,
  acceptedOffers: true,
  declinedOffers: true,
  trips: {
    take: 50,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      status: true,
      pickupAddress: true,
      dropAddress: true,
      reportingTime: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  },
  corporateRoutes: {
    take: 50,
    orderBy: [{ shiftDate: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      shiftDate: true,
      shiftTime: true,
      direction: true,
      status: true,
      tenant: { select: { id: true, name: true } },
      office: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.DriverSelect;

type DriverSummaryRecord = Prisma.DriverGetPayload<{ select: typeof DRIVER_SUMMARY_SELECT }>;
type DriverDetailRecord = Prisma.DriverGetPayload<{ select: typeof DRIVER_DETAIL_SELECT }>;

interface DriverDocumentProjection {
  documents: Prisma.JsonValue | null;
  profilePhotoUrl: string | null;
}

export interface OpsDriverListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  verificationStatus?: string;
  availabilityStatus?: string;
}

@Injectable()
export class CorporateOpsDriversService {
  private readonly logger = new Logger(CorporateOpsDriversService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly admin: AdminService,
    private readonly redis: RedisService,
  ) {}

  async list(query: OpsDriverListQuery) {
    const page = this.clampInteger(query.page, 1, 1, 10_000, 'page');
    const pageSize = this.clampInteger(query.pageSize, 50, 1, 100, 'pageSize');
    const where: Prisma.DriverWhereInput = {};

    if (query.verificationStatus && query.verificationStatus !== 'ALL') {
      const status = [...VERIFICATION_STATUSES].find((candidate) => candidate === query.verificationStatus);
      if (!status) {
        throw new BadRequestException('Invalid verificationStatus');
      }
      where.verificationStatus = status;
    }
    if (query.availabilityStatus && query.availabilityStatus !== 'ALL') {
      const status = [...AVAILABILITY_STATUSES].find((candidate) => candidate === query.availabilityStatus);
      if (!status) {
        throw new BadRequestException('Invalid availabilityStatus');
      }
      where.availabilityStatus = status;
    }
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { vehiclePlate: { contains: search, mode: 'insensitive' } },
        { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [drivers, total] = await Promise.all([
      this.db.driver.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: DRIVER_SUMMARY_SELECT,
      }),
      this.db.driver.count({ where }),
    ]);
    const documentData = await this.loadDocumentProjections(drivers.map((driver) => driver.id));

    return {
      items: drivers.map((driver) => this.toDriverSummary(driver, documentData.get(driver.id))),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async detail(driverId: string) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      select: DRIVER_DETAIL_SELECT,
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const documentData = (await this.loadDocumentProjections([driver.id])).get(driver.id);
    const summary = this.toDriverSummary(driver, documentData);
    return {
      ...summary,
      profile: {
        ...summary.profile,
        userStatus: driver.user?.status,
        updatedAt: driver.updatedAt,
      },
      trustScore: {
        score: this.optionalMetric(driver.trustScore),
        averageRating: this.optionalMetric(driver.averageRating),
        ratingCount: driver.ratingCount ?? 0,
        totalTrips: driver.totalTrips ?? 0,
        acceptanceRate: this.optionalMetric(driver.acceptanceRate),
        acceptedOffers: driver.acceptedOffers ?? 0,
        declinedOffers: driver.declinedOffers ?? 0,
      },
      history: {
        trips: driver.trips,
        corporateRoutes: driver.corporateRoutes,
      },
    };
  }

  async suspend(
    driverId: string,
    actorUserId: string,
    actorRole: 'ADMIN' | 'OPS',
    dto: SuspendDriverDto,
  ) {
    const updated = await this.admin.suspendDriver(driverId, actorUserId, dto, actorRole, true);
    return { driverId: updated.id, userId: updated.userId, verificationStatus: updated.verificationStatus };
  }

  async reactivate(
    driverId: string,
    actorUserId: string,
    actorRole: 'ADMIN' | 'OPS',
    dto: ReactivateDriverDto,
  ) {
    const updated = await this.admin.reactivateDriver(driverId, actorUserId, dto, actorRole, true);
    return { driverId: updated.id, userId: updated.userId, verificationStatus: updated.verificationStatus };
  }

  async deactivateAccount(driverId: string, actorUserId: string, dto: SuspendDriverDto) {
    const driver = await this.findDriverAccount(driverId);
    if (driver.user.status === PrismaUserStatus.DEACTIVATED) {
      await this.syncUserSessions(driver.id, driver.userId, true);
      return { driverId: driver.id, userId: driver.userId, userStatus: driver.user.status };
    }
    if (driver.user.status !== 'ACTIVE') {
      throw new BadRequestException(`Driver user account must be ACTIVE to deactivate (currently ${driver.user.status})`);
    }
    const user = await this.admin.updateUserStatus(
      driver.userId,
      actorUserId,
      PrismaUserStatus.DEACTIVATED,
      dto.reason,
      UserRole.OPS,
      PrismaUserStatus.ACTIVE,
    );
    await this.syncUserSessions(driver.id, driver.userId, true);
    return { driverId: driver.id, userId: user.id, userStatus: user.status };
  }

  async activateAccount(driverId: string, actorUserId: string, dto: ReactivateDriverDto) {
    const driver = await this.findDriverAccount(driverId);
    if (driver.user.status === PrismaUserStatus.ACTIVE) {
      await this.syncUserSessions(driver.id, driver.userId, false);
      return { driverId: driver.id, userId: driver.userId, userStatus: driver.user.status };
    }
    if (driver.user.status !== 'DEACTIVATED') {
      throw new BadRequestException(`Driver user account must be DEACTIVATED to activate (currently ${driver.user.status})`);
    }
    const user = await this.admin.updateUserStatus(
      driver.userId,
      actorUserId,
      PrismaUserStatus.ACTIVE,
      dto.notes,
      UserRole.OPS,
      PrismaUserStatus.DEACTIVATED,
    );
    await this.syncUserSessions(driver.id, driver.userId, false);
    return { driverId: driver.id, userId: user.id, userStatus: user.status };
  }

  private async syncUserSessions(driverId: string, userId: string, revoke: boolean): Promise<void> {
    try {
      if (revoke) await this.redis.revokeUserSessions(userId, true);
      else await this.redis.unrevokeUser(userId, true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Driver account ${driverId} status changed, but distributed session ${revoke ? 'revocation' : 'restoration'} failed: ${message}`,
      );
      throw new ServiceUnavailableException(
        `Driver account status changed, but distributed session ${revoke ? 'revocation' : 'restoration'} failed. Retry this action to reconcile sessions.`,
      );
    }
  }

  private async findDriverAccount(driverId: string) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      select: { id: true, userId: true, user: { select: { status: true } } },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  private toDriverSummary(
    driver: DriverSummaryRecord | DriverDetailRecord,
    documentData?: DriverDocumentProjection,
  ) {
    return {
      driverId: driver.id,
      userId: driver.userId,
      profile: {
        fullName: driver.fullName,
        phone: driver.phone || driver.user?.phone || null,
        email: driver.user?.email ?? null,
        verificationStatus: driver.verificationStatus,
        availabilityStatus: driver.availabilityStatus,
        vehicleType: driver.vehicleType,
        vehicleModel: driver.vehicleModel,
        vehiclePlate: driver.vehiclePlate,
        createdAt: driver.createdAt,
      },
      verificationDocuments: this.documentStatuses(driver, documentData),
      trustScore: {
        score: this.optionalMetric(driver.trustScore),
        averageRating: this.optionalMetric(driver.averageRating),
        ratingCount: driver.ratingCount,
        totalTrips: driver.totalTrips,
      },
    };
  }

  private documentStatuses(
    driver: DriverSummaryRecord | DriverDetailRecord,
    documentData?: DriverDocumentProjection,
  ) {
    const docs = Array.isArray(documentData?.documents) ? documentData.documents : [];
    const mapped = new Map<string, { status: string }>();
    for (const doc of docs) {
      if (!this.isJsonObject(doc) || typeof doc.documentType !== 'string') continue;
      const status = this.safeDocumentStatus(doc.status ?? doc.verificationStatus, doc.verified);
      mapped.set(this.normalizeDocumentType(doc.documentType), { status });
    }
    return DOCUMENT_FIELDS.map(({ type, field, kycField }) => {
      const persisted = mapped.get(type);
      const uploaded = Boolean((field && driver[field]) || (kycField && documentData?.profilePhotoUrl)) ||
        docs.some((doc) =>
          this.isJsonObject(doc) &&
          typeof doc.documentType === 'string' &&
          this.normalizeDocumentType(doc.documentType) === type,
        );
      return {
        type,
        uploaded,
        status: persisted?.status ?? (uploaded ? 'PENDING' : 'MISSING'),
      };
    });
  }

  private safeDocumentStatus(status: unknown, verified?: unknown): string {
    if (verified === true) return 'VERIFIED';
    const normalized = typeof status === 'string' ? status.toUpperCase() : '';
    return ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'].includes(normalized)
      ? normalized
      : 'PENDING';
  }

  private optionalMetric(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const metric = Number(value);
    return Number.isFinite(metric) ? metric : null;
  }

  private isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async loadDocumentProjections(driverIds: string[]): Promise<Map<string, DriverDocumentProjection>> {
    if (driverIds.length === 0) return new Map();
    const rows = await this.db.$queryRaw<Array<{
      id: string;
      documents: Prisma.JsonValue | null;
      profilePhotoUrl: string | null;
    }>>(Prisma.sql`
      SELECT id,
             kyc_documents -> 'documents' AS documents,
             kyc_documents ->> 'profilePhotoUrl' AS "profilePhotoUrl"
      FROM drivers
      WHERE id IN (${Prisma.join(driverIds.map((id) => Prisma.sql`${id}::uuid`))})
    `);
    return new Map(rows.map(({ id, documents, profilePhotoUrl }) => [id, { documents, profilePhotoUrl }]));
  }

  private normalizeDocumentType(type: string): string {
    switch (type.toUpperCase()) {
      case 'VEHICLE_RC': return 'RC_BOOK';
      case 'AADHAAR':
      case 'AADHAAR_FRONT': return 'AADHAR_FRONT';
      case 'AADHAAR_BACK': return 'AADHAR_BACK';
      case 'PAN': return 'PAN_CARD';
      default: return type.toUpperCase();
    }
  }

  private clampInteger(value: number | undefined, fallback: number, min: number, max: number, field: string) {
    if (value === undefined) return fallback;
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
    }
    return value;
  }
}
