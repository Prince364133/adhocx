import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { hashPassword } from '../../common/utils/password.util';
import { buildFleetPhoneVariants, normalizeFleetPhone } from './fleet-phone.util';
import {
  CreateFleetDto,
  UpdateFleetDto,
  UpdateFleetStatusDto,
  AssignDriverFleetDto,
  TransferDriverFleetDto,
  RemoveDriverFleetDto,
  FleetQueryDto,
  DriverFleetQueryDto,
} from '@adhocx/contracts';

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Generates a cryptographically random, unique Fleet Code.
   * Format: FLT-XXXXXX (e.g. FLT-9AB47C)
   */
  public async generateUniqueFleetCode(): Promise<string> {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `FLT-${suffix}`;

      const existing = await this.db.fleet.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!existing) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      code = `FLT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    }
    return code;
  }

  /**
   * Central Fleet List for Admin with search, filter, pagination, and KPI metrics.
   */
  public async listFleets(query: FleetQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { ownerName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [fleets, totalCount, totalFleets, activeFleets, inactiveFleets, totalFleetDrivers] =
      await Promise.all([
        this.db.fleet.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { drivers: true },
            },
          },
        }),
        this.db.fleet.count({ where }),
        this.db.fleet.count(),
        this.db.fleet.count({ where: { status: 'ACTIVE' } }),
        this.db.fleet.count({ where: { status: 'INACTIVE' } }),
        this.db.driver.count({ where: { fleetId: { not: null } } }),
      ]);

    const items = fleets.map((f) => ({
      id: f.id,
      name: f.name,
      code: f.code,
      ownerName: f.ownerName,
      phone: f.phone,
      email: f.email,
      status: f.status,
      city: f.city,
      address: f.address,
      gstin: f.gstin,
      notes: f.notes,
      totalDrivers: f._count.drivers,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      metrics: {
        totalFleets,
        activeFleets,
        inactiveFleets,
        totalFleetDrivers,
      },
    };
  }

  /**
   * Retrieves complete Fleet Details: Profile, associated drivers, recent trips, and financial aggregates.
   */
  public async getFleetById(id: string) {
    const fleet = await this.db.fleet.findUnique({
      where: { id },
      include: {
        _count: {
          select: { drivers: true },
        },
        drivers: {
          orderBy: { fleetAssignedAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            phone: true,
            verificationStatus: true,
            availabilityStatus: true,
            vehiclePlate: true,
            vehicleModel: true,
            averageRating: true,
            totalTrips: true,
            fleetAssignedAt: true,
            createdAt: true,
          },
        },
        driverHistory: {
          take: 30,
          orderBy: { createdAt: 'desc' },
          include: {
            driver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!fleet) {
      throw new NotFoundException(`Fleet with ID "${id}" was not found.`);
    }

    // Retrieve recent platform activity executed by drivers in this fleet
    const driverIds = fleet.drivers.map((d) => d.id);
    let recentTrips: any[] = [];
    let completedTripsCount = 0;
    let totalDriverEarnings = 0;

    if (driverIds.length > 0) {
      recentTrips = await this.db.trip.findMany({
        where: { driverId: { in: driverIds } },
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          dropAddress: true,
          totalDriverEarnings: true,
          driverRate: true,
          createdAt: true,
          completedAt: true,
          driver: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      });

      completedTripsCount = await this.db.trip.count({
        where: {
          driverId: { in: driverIds },
          status: 'COMPLETED',
        },
      });

      const earningsResult = await this.db.trip.aggregate({
        where: {
          driverId: { in: driverIds },
          status: 'COMPLETED',
        },
        _sum: {
          totalDriverEarnings: true,
          driverRate: true,
        },
      });

      totalDriverEarnings =
        Number(earningsResult._sum.totalDriverEarnings || 0) ||
        Number(earningsResult._sum.driverRate || 0);
    }

    return {
      fleet: {
        id: fleet.id,
        name: fleet.name,
        code: fleet.code,
        ownerName: fleet.ownerName,
        phone: fleet.phone,
        email: fleet.email,
        status: fleet.status,
        city: fleet.city,
        address: fleet.address,
        gstin: fleet.gstin,
        notes: fleet.notes,
        totalDrivers: fleet._count.drivers,
        createdAt: fleet.createdAt,
        updatedAt: fleet.updatedAt,
      },
      drivers: fleet.drivers,
      history: fleet.driverHistory,
      activity: {
        recentTrips,
        completedTripsCount,
        totalTrips: fleet.drivers.reduce((acc, d) => acc + (d.totalTrips || 0), 0),
      },
      financials: {
        completedTrips: completedTripsCount,
        estimatedEarnings: Math.round(totalDriverEarnings),
      },
    };
  }

  /**
   * Registers a new fleet with validation and automatic Fleet Code assignment.
   */
  public async createFleet(dto: CreateFleetDto, adminId?: string) {
    let code = dto.code ? dto.code.trim().toUpperCase() : '';
    if (code) {
      const existing = await this.db.fleet.findUnique({
        where: { code },
      });
      if (existing) {
        throw new ConflictException(`Fleet Code "${code}" is already in use by another fleet.`);
      }
    } else {
      code = await this.generateUniqueFleetCode();
    }

    const portalPwd = dto.portalPassword?.trim();
    if (dto.portalPassword !== undefined && dto.portalPassword.length > 0 && (!portalPwd || portalPwd.length < 8)) {
      throw new BadRequestException('Portal owner password must be at least 8 characters.');
    }

    const fleetData = {
      name: dto.name.trim(),
      code,
      ownerName: dto.ownerName.trim(),
      phone: dto.phone.trim(),
      email: dto.email ? dto.email.trim().toLowerCase() : null,
      city: dto.city ? dto.city.trim() : null,
      address: dto.address ? dto.address.trim() : null,
      gstin: dto.gstin ? dto.gstin.trim().toUpperCase() : null,
      notes: dto.notes ? dto.notes.trim() : null,
      status: 'ACTIVE' as const,
    };

    if (!portalPwd) {
      const fleet = await this.db.fleet.create({
        data: fleetData,
      });

      this.logger.log(`Created new Fleet "${fleet.name}" (${fleet.code}) by Admin ${adminId || 'SYSTEM'}`);
      return fleet;
    }

    const cleanPhone = normalizeFleetPhone(dto.phone);
    if (cleanPhone.replace(/\D/g, '').length < 10) {
      throw new BadRequestException('A valid 10+ digit phone number is required for Portal Owner login.');
    }

    const variants = buildFleetPhoneVariants(cleanPhone);
    const email = fleetData.email;
    const passwordHash = await hashPassword(portalPwd);

    const result = await this.db.$transaction(async (tx) => {
      const existingPortalUser = await tx.fleetAdminUser.findFirst({
        where: {
          OR: [
            { phone: { in: variants } },
            ...(email ? [{ email }] : []),
          ],
        },
        select: { id: true },
      });

      if (existingPortalUser) {
        throw new ConflictException(
          'A Fleet Portal user with this phone number or email already exists.',
        );
      }

      const fleet = await tx.fleet.create({ data: fleetData });
      const portalUser = await tx.fleetAdminUser.create({
        data: {
          fleetId: fleet.id,
          fullName: fleet.ownerName,
          phone: cleanPhone,
          email,
          passwordHash,
          role: 'FLEET_OWNER',
          status: 'ACTIVE',
          permissions: [],
        },
        select: {
          id: true,
          fleetId: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        ...fleet,
        portalUser: {
          id: portalUser.id,
          fleetId: portalUser.fleetId,
          fullName: portalUser.fullName,
          email: portalUser.email || undefined,
          phone: portalUser.phone,
          role: portalUser.role,
          status: portalUser.status,
          createdAt: portalUser.createdAt,
        },
      };
    });

    this.logger.log(
      `Created new Fleet "${result.name}" (${result.code}) with Portal Owner account by Admin ${adminId || 'SYSTEM'}`,
    );
    return result;
  }

  /**
   * Updates fleet profile metadata.
   */
  public async updateFleet(id: string, dto: UpdateFleetDto, adminId?: string) {
    const fleet = await this.db.fleet.findUnique({ where: { id } });
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID "${id}" was not found.`);
    }

    const updated = await this.db.fleet.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        ownerName: dto.ownerName !== undefined ? dto.ownerName.trim() : undefined,
        phone: dto.phone !== undefined ? dto.phone.trim() : undefined,
        email: dto.email !== undefined ? (dto.email ? dto.email.trim().toLowerCase() : null) : undefined,
        city: dto.city !== undefined ? (dto.city ? dto.city.trim() : null) : undefined,
        address: dto.address !== undefined ? (dto.address ? dto.address.trim() : null) : undefined,
        gstin: dto.gstin !== undefined ? (dto.gstin ? dto.gstin.trim().toUpperCase() : null) : undefined,
        notes: dto.notes !== undefined ? (dto.notes ? dto.notes.trim() : null) : undefined,
      },
    });

    this.logger.log(`Updated Fleet "${updated.name}" (${updated.code}) by Admin ${adminId || 'SYSTEM'}`);
    return updated;
  }

  /**
   * Activates or deactivates a fleet with audit notes.
   */
  public async updateFleetStatus(id: string, dto: UpdateFleetStatusDto, adminId?: string) {
    const fleet = await this.db.fleet.findUnique({ where: { id } });
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID "${id}" was not found.`);
    }

    const updated = await this.db.fleet.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.reason ? `${fleet.notes ? fleet.notes + ' | ' : ''}Status changed to ${dto.status}: ${dto.reason}` : fleet.notes,
      },
    });

    this.logger.log(`Fleet "${updated.name}" (${updated.code}) status updated to ${dto.status} by Admin ${adminId || 'SYSTEM'}`);
    return updated;
  }

  /**
   * Regenerates a unique Fleet Code, invalidating the previous one with audit confirmation.
   */
  public async regenerateFleetCode(id: string, adminId?: string) {
    const fleet = await this.db.fleet.findUnique({ where: { id } });
    if (!fleet) {
      throw new NotFoundException(`Fleet with ID "${id}" was not found.`);
    }

    const newCode = await this.generateUniqueFleetCode();
    const oldCode = fleet.code;

    const updated = await this.db.fleet.update({
      where: { id },
      data: {
        code: newCode,
        notes: `${fleet.notes ? fleet.notes + ' | ' : ''}Code regenerated from ${oldCode} to ${newCode} on ${new Date().toISOString()}`,
      },
    });

    this.logger.log(`Regenerated Fleet Code for "${fleet.name}": ${oldCode} -> ${newCode} by Admin ${adminId || 'SYSTEM'}`);
    return updated;
  }

  /**
   * Lists driver-to-fleet associations across the platform with filtering and search.
   */
  public async listDriverFleetAssociations(query: DriverFleetQueryDto) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.associationStatus === 'ASSIGNED') {
      where.fleetId = { not: null };
    } else if (query.associationStatus === 'UNASSIGNED') {
      where.fleetId = null;
    }

    if (query.fleetId && query.fleetId.trim() && query.fleetId !== 'ALL') {
      where.fleetId = query.fleetId.trim();
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { vehiclePlate: { contains: s, mode: 'insensitive' } },
        { fleet: { name: { contains: s, mode: 'insensitive' } } },
        { fleet: { code: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [drivers, totalCount, totalDrivers, assignedDrivers, unassignedDrivers, activeDrivers] =
      await Promise.all([
        this.db.driver.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fullName: true,
            phone: true,
            verificationStatus: true,
            availabilityStatus: true,
            vehiclePlate: true,
            vehicleModel: true,
            totalTrips: true,
            averageRating: true,
            fleetId: true,
            fleetAssignedAt: true,
            createdAt: true,
            fleet: {
              select: {
                id: true,
                name: true,
                code: true,
                status: true,
                ownerName: true,
                phone: true,
              },
            },
          },
        }),
        this.db.driver.count({ where }),
        this.db.driver.count(),
        this.db.driver.count({ where: { fleetId: { not: null } } }),
        this.db.driver.count({ where: { fleetId: null } }),
        this.db.driver.count({ where: { availabilityStatus: 'AVAILABLE' } }),
      ]);

    const items = drivers.map((d) => ({
      id: d.id,
      driverName: d.fullName,
      driverId: d.id,
      phone: d.phone,
      verificationStatus: d.verificationStatus,
      driverStatus: d.availabilityStatus,
      vehiclePlate: d.vehiclePlate,
      vehicleModel: d.vehicleModel,
      totalTrips: d.totalTrips,
      averageRating: d.averageRating,
      fleetId: d.fleetId,
      fleetName: d.fleet?.name || null,
      fleetCode: d.fleet?.code || null,
      fleetStatus: d.fleet?.status || null,
      associationStatus: d.fleetId ? 'ASSIGNED' : 'UNASSIGNED',
      fleetAssignedAt: d.fleetAssignedAt,
      createdAt: d.createdAt,
    }));

    return {
      items,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      metrics: {
        totalDrivers,
        assignedDrivers,
        unassignedDrivers,
        activeDrivers,
      },
    };
  }

  /**
   * Assigns an unassigned driver to a fleet with validation ensuring the fleet is ACTIVE.
   */
  public async assignDriverToFleet(driverId: string, dto: AssignDriverFleetDto, adminId?: string) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      include: { fleet: true },
    });
    if (!driver) {
      throw new NotFoundException(`Driver with ID "${driverId}" was not found.`);
    }

    const targetFleet = await this.db.fleet.findUnique({
      where: { id: dto.fleetId },
    });
    if (!targetFleet) {
      throw new NotFoundException(`Fleet with ID "${dto.fleetId}" was not found.`);
    }

    if (targetFleet.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot assign driver to inactive fleet "${targetFleet.name}". Please activate the fleet first.`);
    }

    if (driver.fleetId === targetFleet.id) {
      return driver;
    }

    const fromFleetId = driver.fleetId;

    // Execute driver update and history entry in a transaction
    const [updatedDriver] = await this.db.$transaction([
      this.db.driver.update({
        where: { id: driverId },
        data: {
          fleetId: targetFleet.id,
          fleetAssignedAt: new Date(),
        },
        include: { fleet: true },
      }),
      this.db.fleetDriverHistory.create({
        data: {
          fleetId: targetFleet.id,
          driverId,
          action: fromFleetId ? 'TRANSFERRED' : 'ASSIGNED',
          fromFleetId: fromFleetId || null,
          toFleetId: targetFleet.id,
          performedByAdminId: adminId || null,
          notes: dto.notes || `Driver ${driver.fullName} assigned to fleet ${targetFleet.name} (${targetFleet.code})`,
        },
      }),
    ]);

    this.logger.log(`Driver "${driver.fullName}" (${driver.id}) assigned to Fleet "${targetFleet.name}" by Admin ${adminId || 'SYSTEM'}`);
    return updatedDriver;
  }

  /**
   * Transfers a driver from one fleet to another active fleet.
   */
  public async transferDriverFleet(driverId: string, dto: TransferDriverFleetDto, adminId?: string) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      include: { fleet: true },
    });
    if (!driver) {
      throw new NotFoundException(`Driver with ID "${driverId}" was not found.`);
    }

    const targetFleet = await this.db.fleet.findUnique({
      where: { id: dto.targetFleetId },
    });
    if (!targetFleet) {
      throw new NotFoundException(`Target Fleet with ID "${dto.targetFleetId}" was not found.`);
    }

    if (targetFleet.status !== 'ACTIVE') {
      throw new BadRequestException(`Cannot transfer driver to inactive fleet "${targetFleet.name}".`);
    }

    if (driver.fleetId === targetFleet.id) {
      throw new BadRequestException(`Driver is already assigned to "${targetFleet.name}".`);
    }

    const fromFleetId = driver.fleetId;

    const [updatedDriver] = await this.db.$transaction([
      this.db.driver.update({
        where: { id: driverId },
        data: {
          fleetId: targetFleet.id,
          fleetAssignedAt: new Date(),
        },
        include: { fleet: true },
      }),
      this.db.fleetDriverHistory.create({
        data: {
          fleetId: targetFleet.id,
          driverId,
          action: 'TRANSFERRED',
          fromFleetId: fromFleetId || null,
          toFleetId: targetFleet.id,
          performedByAdminId: adminId || null,
          notes: dto.notes || `Transferred from ${driver.fleet?.name || 'Unassigned'} to ${targetFleet.name}`,
        },
      }),
    ]);

    this.logger.log(`Transferred driver "${driver.fullName}" to Fleet "${targetFleet.name}" by Admin ${adminId || 'SYSTEM'}`);
    return updatedDriver;
  }

  /**
   * Removes a driver from their current fleet association.
   */
  public async removeDriverFromFleet(driverId: string, dto: RemoveDriverFleetDto, adminId?: string) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      include: { fleet: true },
    });
    if (!driver) {
      throw new NotFoundException(`Driver with ID "${driverId}" was not found.`);
    }

    if (!driver.fleetId) {
      throw new BadRequestException(`Driver "${driver.fullName}" is not currently assigned to any fleet.`);
    }

    const currentFleetId = driver.fleetId;
    const currentFleetName = driver.fleet?.name || 'Fleet';

    const [updatedDriver] = await this.db.$transaction([
      this.db.driver.update({
        where: { id: driverId },
        data: {
          fleetId: null,
          fleetAssignedAt: null,
        },
      }),
      this.db.fleetDriverHistory.create({
        data: {
          fleetId: currentFleetId,
          driverId,
          action: 'REMOVED',
          fromFleetId: currentFleetId,
          toFleetId: null,
          performedByAdminId: adminId || null,
          notes: dto.notes || `Removed from fleet ${currentFleetName}`,
        },
      }),
    ]);

    this.logger.log(`Removed driver "${driver.fullName}" from Fleet "${currentFleetName}" by Admin ${adminId || 'SYSTEM'}`);
    return updatedDriver;
  }

  /**
   * Unified platform fleet summary metrics.
   */
  public async getFleetMetrics() {
    const [totalFleets, activeFleets, inactiveFleets, totalDrivers, assignedDrivers] =
      await Promise.all([
        this.db.fleet.count(),
        this.db.fleet.count({ where: { status: 'ACTIVE' } }),
        this.db.fleet.count({ where: { status: 'INACTIVE' } }),
        this.db.driver.count(),
        this.db.driver.count({ where: { fleetId: { not: null } } }),
      ]);

    return {
      totalFleets,
      activeFleets,
      inactiveFleets,
      totalDrivers,
      assignedDrivers,
      unassignedDrivers: totalDrivers - assignedDrivers,
    };
  }
}
