import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as crypto from 'crypto';
import * as h3 from 'h3-js';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  RosterRowData,
  RosterRowValidationError,
  RosterDryRunValidationResult,
  RosterIngestionOutput,
  RosterDraftOutput,
} from './roster-validation.types';
import { resolveLogoutDate, ShiftTemplateLike } from '../scheduling/shift-calendar';

/** createMany batch size for roster entries. */
const ENTRY_BATCH = 1000;

interface DemandLine {
  direction: 'LOGIN' | 'LOGOUT';
  /** Shift (login) day = roster_date. */
  shiftDay: string;
  /** Day the commute happens (differs from shiftDay for an overnight LOGOUT). */
  scheduledDay: string;
  shiftTime: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  h3PickupIndex: string;
  idempotencyHash: string;
}

@Injectable()
export class RosterIngestionService {
  private readonly logger = new Logger(RosterIngestionService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Performs in-memory dry-run validation on an uploaded Excel buffer without writing to the database.
   */
  public async dryRunValidateRoster(
    tenantId: string,
    buffer: Buffer,
    officeScope?: string[] | null,
  ): Promise<RosterDryRunValidationResult> {
    const tenant = await this.db.corporateTenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Corporate tenant ${tenantId} not found`);
    }

    const rows = await this.parseExcelRows(buffer);
    const errors: RosterRowValidationError[] = [];
    let validCount = 0;
    let loginRequests = 0;
    let logoutRequests = 0;

    // Cache active office codes for tenant
    const activeOffices = await this.db.corporateOffice.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true, latitude: true, longitude: true },
    });
    const officeCodeMap = new Map(activeOffices.map((o) => [o.code.toUpperCase(), o]));

    // Track internal duplicates
    const seenLoginKeys = new Set<string>();
    const seenLogoutKeys = new Set<string>();

    for (const row of rows) {
      const rowErrors: RosterRowValidationError[] = [];

      // 1. Employee ID
      if (!row.employeeId || row.employeeId.trim().length === 0) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'employee_id',
          invalidValue: row.employeeId,
          message: 'Employee ID is required',
        });
      }

      // 2. Full Name
      if (!row.fullName || row.fullName.trim().length < 2) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'full_name',
          invalidValue: row.fullName,
          message: 'Full name must be at least 2 characters',
        });
      }

      // 3. Email
      if (!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'email',
          invalidValue: row.email,
          message: 'Valid corporate email address is required',
        });
      }

      // 4. Phone Number (Indian mobile format: 10 digits)
      const sanitizedPhone = row.phoneNumber ? row.phoneNumber.replace(/[\s\-+]/g, '') : '';
      if (!sanitizedPhone || sanitizedPhone.length < 10) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'phone_number',
          invalidValue: row.phoneNumber,
          message: 'Valid 10-digit phone number is required',
        });
      }

      // 5. Gender
      if (!row.gender || !['MALE', 'FEMALE', 'OTHER'].includes(row.gender.toUpperCase())) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'gender',
          invalidValue: row.gender,
          message: 'Gender must be MALE, FEMALE, or OTHER',
        });
      }

      // 6. Office Code
      const upperOfficeCode = (row.officeCode || '').trim().toUpperCase();
      if (!upperOfficeCode || !officeCodeMap.has(upperOfficeCode)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'office_code',
          invalidValue: row.officeCode,
          message: `Office code '${row.officeCode}' is not registered under this corporate account`,
        });
      } else if (officeScope && !officeScope.includes(officeCodeMap.get(upperOfficeCode)!.id)) {
        // WS-F: an office-scoped uploader may only roster employees of their own offices.
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'office_code',
          invalidValue: row.officeCode,
          message: `Office code '${row.officeCode}' is outside your corporate office scope`,
        });
      }

      // 7. Roster Date
      if (!row.rosterDate || !/^\d{4}-\d{2}-\d{2}$/.test(row.rosterDate)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'roster_date',
          invalidValue: row.rosterDate,
          message: 'Roster date must be in YYYY-MM-DD format',
        });
      }

      // 8. Shift Times (At least one required)
      const hasLogin = !!row.loginTime && /^\d{2}:\d{2}$/.test(row.loginTime.trim());
      const hasLogout = !!row.logoutTime && /^\d{2}:\d{2}$/.test(row.logoutTime.trim());

      if (!hasLogin && !hasLogout) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'login_time/logout_time',
          invalidValue: `${row.loginTime} / ${row.logoutTime}`,
          message: 'At least one valid shift time (login_time or logout_time in HH:mm format) must be specified',
        });
      }

      // 9. Home Address
      if (!row.homeAddress || row.homeAddress.trim().length < 5) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'home_address',
          invalidValue: row.homeAddress,
          message: 'Home address must be at least 5 characters',
        });
      }

      // 10. Check duplicates within same sheet
      if (hasLogin) {
        const loginKey = `${row.employeeId}_${row.rosterDate}_${row.loginTime}`;
        if (seenLoginKeys.has(loginKey)) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'login_time',
            invalidValue: row.loginTime,
            message: `Duplicate login request for employee ${row.employeeId} on ${row.rosterDate} at ${row.loginTime}`,
          });
        } else {
          seenLoginKeys.add(loginKey);
          loginRequests++;
        }
      }

      if (hasLogout) {
        const logoutKey = `${row.employeeId}_${row.rosterDate}_${row.logoutTime}`;
        if (seenLogoutKeys.has(logoutKey)) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            field: 'logout_time',
            invalidValue: row.logoutTime,
            message: `Duplicate logout request for employee ${row.employeeId} on ${row.rosterDate} at ${row.logoutTime}`,
          });
        } else {
          seenLogoutKeys.add(logoutKey);
          logoutRequests++;
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validCount++;
      }
    }

    return {
      isValid: errors.length === 0,
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: rows.length - validCount,
      loginRequestsCount: loginRequests,
      logoutRequestsCount: logoutRequests,
      errors,
    };
  }

  /**
   * Ingests and commits the validated Excel roster, autonomously creating
   * employees, locations, rosters, and idempotent transport requests.
   *
   * Default upload mode (unchanged by WS-F): the roster is PUBLISHED immediately and demand is
   * generated in the same transaction. WS-F only fixes the overnight LOGOUT date (logout <= login
   * => next IST day) and records the uploader. For the DRAFT -> APPROVED -> PUBLISHED lifecycle use
   * `ingestDraftRoster` (upload with mode=draft) and RosterLifecycleService.
   */
  public async ingestAndPublishRoster(
    tenantId: string,
    buffer: Buffer,
    actorUserId?: string,
    officeScope?: string[] | null,
  ): Promise<RosterIngestionOutput> {
    const dryRun = await this.dryRunValidateRoster(tenantId, buffer, officeScope);
    if (!dryRun.isValid) {
      throw new BadRequestException({
        message: 'Roster validation failed. Fix errors before publishing.',
        errorCount: dryRun.errors.length,
        errors: dryRun.errors.slice(0, 50), // return first 50 errors
      });
    }

    const rows = await this.parseExcelRows(buffer);
    const activeOffices = await this.db.corporateOffice.findMany({
      where: { tenantId, isActive: true },
    });
    const officeCodeMap = new Map(activeOffices.map((o) => [o.code.toUpperCase(), o]));

    let loginCreated = 0;
    let logoutCreated = 0;
    let skippedDuplicates = 0;

    // Use transaction for consistency
    const result = await this.db.$transaction(async (tx) => {
      // 1. Group rows by roster date & shift time to create CorporateRoster header records
      const firstRow = rows[0];
      const office = officeCodeMap.get(firstRow.officeCode.trim().toUpperCase())!;

      // Master roster header
      const masterRoster = await tx.corporateRoster.create({
        data: {
          tenantId,
          officeId: office.id,
          rosterDate: new Date(firstRow.rosterDate),
          shiftTime: firstRow.loginTime || firstRow.logoutTime || '08:00',
          direction: firstRow.loginTime ? 'LOGIN' : 'LOGOUT',
          status: 'PUBLISHED',
          passengerCount: rows.length,
          uploadedById: actorUserId ?? null,
          publishedById: actorUserId ?? null,
          publishedAt: new Date(),
        },
      });

      for (const row of rows) {
        const rowOffice = officeCodeMap.get(row.officeCode.trim().toUpperCase())!;
        const point = await this.upsertEmployeeFromRow(tx, tenantId, row, rowOffice);

        // 2. Generate Transport Requests (LOGIN: home -> office, LOGOUT: office -> home)
        for (const line of this.buildDemandLines(tenantId, point, row, rowOffice)) {
          try {
            await tx.corporateTransportRequest.create({
              data: {
                tenantId,
                rosterId: masterRoster.id,
                employeeId: point.employeeId,
                scheduledDate: new Date(line.scheduledDay),
                shiftTime: line.shiftTime,
                direction: line.direction,
                pickupLat: line.pickupLat,
                pickupLng: line.pickupLng,
                dropoffLat: line.dropoffLat,
                dropoffLng: line.dropoffLng,
                h3PickupIndex: line.h3PickupIndex,
                status: 'APPROVED',
                idempotencyHash: line.idempotencyHash,
              },
            });
            if (line.direction === 'LOGIN') loginCreated++;
            else logoutCreated++;
          } catch (e: any) {
            if (e.code === 'P2002') {
              skippedDuplicates++;
            } else {
              throw e;
            }
          }
        }
      }

      return {
        rosterId: masterRoster.id,
        tenantId,
        officeId: office.id,
        rosterDate: firstRow.rosterDate,
        totalEmployeesProcessed: rows.length,
        loginRequestsCreated: loginCreated,
        logoutRequestsCreated: logoutCreated,
        duplicateRequestsSkipped: skippedDuplicates,
      };
    });

    this.logger.log(
      `Roster published: ${result.totalEmployeesProcessed} employees, ${loginCreated} login, ${logoutCreated} logout requests.`,
    );

    await this.audit.log({
      action: 'CORPORATE_ROSTER_PUBLISHED',
      userId: actorUserId,
      actorRole: 'CORPORATE_ADMIN',
      entityId: result.rosterId,
      entityType: 'CORPORATE_ROSTER',
      metadata: result as any,
    });

    return result;
  }

  /**
   * WS-F draft upload: validates, upserts employees / locations and stores the demand as
   * CorporateRosterEntry lines of a new DRAFT roster version. No transport request exists until
   * the version is approved and published (RosterLifecycleService.publish).
   * Version = 1 + highest version for the same (tenant, office, rosterDate).
   */
  public async ingestDraftRoster(
    tenantId: string,
    buffer: Buffer,
    actorUserId?: string,
    officeScope?: string[] | null,
  ): Promise<RosterDraftOutput> {
    const dryRun = await this.dryRunValidateRoster(tenantId, buffer, officeScope);
    if (!dryRun.isValid) {
      throw new BadRequestException({
        message: 'Roster validation failed. Fix errors before saving the draft.',
        errorCount: dryRun.errors.length,
        errors: dryRun.errors.slice(0, 50),
      });
    }

    const rows = await this.parseExcelRows(buffer);
    const offices = await this.db.corporateOffice.findMany({ where: { tenantId, isActive: true } });
    const officeCodeMap = new Map(offices.map((o) => [o.code.toUpperCase(), o]));
    const templates = await this.db.corporateShiftTemplate.findMany({
      where: { tenantId, isActive: true },
      select: { officeId: true, loginTime: true, logoutTime: true, isOvernight: true, isActive: true, weekdays: true },
    });
    const templatesByOffice = new Map<string, ShiftTemplateLike[]>();
    for (const t of templates) {
      templatesByOffice.set(t.officeId, [...(templatesByOffice.get(t.officeId) ?? []), t]);
    }

    const firstRow = rows[0];
    const headOffice = officeCodeMap.get(firstRow.officeCode.trim().toUpperCase())!;
    const rosterDate = new Date(`${firstRow.rosterDate}T00:00:00.000Z`);

    const result = await this.db.$transaction(async (tx: any) => {
      const latest = await tx.corporateRoster.findFirst({
        where: { tenantId, officeId: headOffice.id, rosterDate },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const roster = await tx.corporateRoster.create({
        data: {
          tenantId,
          officeId: headOffice.id,
          rosterDate,
          shiftTime: firstRow.loginTime || firstRow.logoutTime || '08:00',
          direction: firstRow.loginTime ? 'LOGIN' : 'LOGOUT',
          status: 'DRAFT',
          passengerCount: rows.length,
          version: (latest?.version ?? 0) + 1,
          uploadedById: actorUserId ?? null,
        },
      });

      const entries: any[] = [];
      for (const row of rows) {
        const rowOffice = officeCodeMap.get(row.officeCode.trim().toUpperCase())!;
        const point = await this.upsertEmployeeFromRow(tx, tenantId, row, rowOffice);
        for (const line of this.buildDemandLines(tenantId, point, row, rowOffice, templatesByOffice.get(rowOffice.id))) {
          entries.push({
            rosterId: roster.id,
            tenantId,
            employeeId: point.employeeId,
            officeId: rowOffice.id,
            shiftDate: new Date(`${line.shiftDay}T00:00:00.000Z`),
            scheduledDate: new Date(`${line.scheduledDay}T00:00:00.000Z`),
            shiftTime: line.shiftTime,
            direction: line.direction,
            pickupLat: line.pickupLat,
            pickupLng: line.pickupLng,
            dropoffLat: line.dropoffLat,
            dropoffLng: line.dropoffLng,
            h3PickupIndex: line.h3PickupIndex,
            idempotencyHash: line.idempotencyHash,
          });
        }
      }
      let entriesCreated = 0;
      for (let i = 0; i < entries.length; i += ENTRY_BATCH) {
        const res = await tx.corporateRosterEntry.createMany({ data: entries.slice(i, i + ENTRY_BATCH), skipDuplicates: true });
        entriesCreated += res.count;
      }
      return { rosterId: roster.id, version: roster.version, entriesCreated };
    });

    const output: RosterDraftOutput = {
      rosterId: result.rosterId,
      tenantId,
      officeId: headOffice.id,
      rosterDate: firstRow.rosterDate,
      version: result.version,
      status: 'DRAFT',
      totalEmployeesProcessed: rows.length,
      entriesCreated: result.entriesCreated,
    };
    await this.audit.log({
      action: 'CORPORATE_ROSTER_DRAFT_UPLOADED',
      userId: actorUserId,
      entityId: output.rosterId,
      entityType: 'CORPORATE_ROSTER',
      metadata: output as any,
    });
    return output;
  }

  /** Upserts the employee of a roster row and records its home location. */
  private async upsertEmployeeFromRow(
    tx: any,
    tenantId: string,
    row: RosterRowData,
    rowOffice: any,
  ): Promise<{ employeeId: string; lat: number; lng: number; h3Index: string }> {
    const genderVal = row.gender.toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER';

    // Coordinates resolution: use provided or default to the office position
    const empLat = row.latitude && row.latitude !== 0 ? row.latitude : Number(rowOffice.latitude);
    const empLng = row.longitude && row.longitude !== 0 ? row.longitude : Number(rowOffice.longitude);

    // H3 resolution 8 index calculation
    const h3Index = h3.latLngToCell(empLat, empLng, 8);

    const employee = await tx.corporateEmployee.upsert({
      where: {
        tenantId_employeeCode: {
          tenantId,
          employeeCode: row.employeeId.trim(),
        },
      },
      update: {
        fullName: row.fullName.trim(),
        email: row.email.trim(),
        phoneNumber: row.phoneNumber.trim(),
        gender: genderVal,
        department: row.department?.trim() || null,
        costCenter: row.costCenter?.trim() || null,
        officeId: rowOffice.id,
        isActive: true,
      },
      create: {
        tenantId,
        officeId: rowOffice.id,
        employeeCode: row.employeeId.trim(),
        fullName: row.fullName.trim(),
        email: row.email.trim(),
        phoneNumber: row.phoneNumber.trim(),
        gender: genderVal,
        department: row.department?.trim() || null,
        costCenter: row.costCenter?.trim() || null,
        isActive: true,
      },
    });

    await tx.corporateEmployeeLocation.create({
      data: {
        employeeId: employee.id,
        addressText: row.homeAddress.trim(),
        landmark: row.landmark?.trim() || null,
        latitude: empLat,
        longitude: empLng,
        h3Res8Index: h3Index,
        isDefault: true,
      },
    });

    return { employeeId: employee.id, lat: empLat, lng: empLng, h3Index };
  }

  /**
   * Demand lines of one roster row. The idempotency hash is
   * sha256(tenant_employee_<service day>_<HH:mm>_<direction>), the same formula the upload has
   * always used, so re-uploads and re-publishes never duplicate a commute. The service day of an
   * overnight LOGOUT (20:00 -> 02:00) is the next IST calendar day.
   */
  private buildDemandLines(
    tenantId: string,
    point: { employeeId: string; lat: number; lng: number; h3Index: string },
    row: RosterRowData,
    rowOffice: any,
    templates: ShiftTemplateLike[] = [],
  ): DemandLine[] {
    const lines: DemandLine[] = [];
    const hash = (day: string, time: string, dir: string) =>
      crypto.createHash('sha256').update(`${tenantId}_${point.employeeId}_${day}_${time}_${dir}`).digest('hex');
    const loginTime = row.loginTime && /^\d{2}:\d{2}$/.test(row.loginTime.trim()) ? row.loginTime.trim() : undefined;
    const logoutTime = row.logoutTime && /^\d{2}:\d{2}$/.test(row.logoutTime.trim()) ? row.logoutTime.trim() : undefined;

    if (loginTime) {
      lines.push({
        direction: 'LOGIN',
        shiftDay: row.rosterDate,
        scheduledDay: row.rosterDate,
        shiftTime: loginTime,
        pickupLat: point.lat,
        pickupLng: point.lng,
        dropoffLat: Number(rowOffice.latitude),
        dropoffLng: Number(rowOffice.longitude),
        h3PickupIndex: point.h3Index,
        idempotencyHash: hash(row.rosterDate, loginTime, 'LOGIN'),
      });
    }
    if (logoutTime) {
      const day = resolveLogoutDate(row.rosterDate, loginTime, logoutTime, templates);
      const officeH3 =
        rowOffice.h3Res8Index || h3.latLngToCell(Number(rowOffice.latitude), Number(rowOffice.longitude), 8);
      lines.push({
        direction: 'LOGOUT',
        shiftDay: row.rosterDate,
        scheduledDay: day,
        shiftTime: logoutTime,
        pickupLat: Number(rowOffice.latitude),
        pickupLng: Number(rowOffice.longitude),
        dropoffLat: point.lat,
        dropoffLng: point.lng,
        h3PickupIndex: officeH3,
        idempotencyHash: hash(day, logoutTime, 'LOGOUT'),
      });
    }
    return lines;
  }

  /**
   * Helper: Parses Excel file rows into strongly-typed RosterRowData structures.
   */
  private async parseExcelRows(buffer: Buffer): Promise<RosterRowData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Uploaded workbook contains no worksheets');
    }

    const rows: RosterRowData[] = [];

    // Header index mapping
    const headerMap = new Map<string, number>();
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value ? cell.value.toString().trim().toLowerCase().replace('*', '') : '';
      headerMap.set(val, colNumber);
    });

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const getCellString = (key: string): string => {
        const col = headerMap.get(key);
        if (!col) return '';
        const cellVal = row.getCell(col).value;
        if (cellVal === null || cellVal === undefined) return '';
        if (typeof cellVal === 'object' && 'text' in cellVal) return (cellVal as any).text.trim();
        return cellVal.toString().trim();
      };

      const getCellNumber = (key: string): number | undefined => {
        const col = headerMap.get(key);
        if (!col) return undefined;
        const cellVal = row.getCell(col).value;
        if (cellVal === null || cellVal === undefined) return undefined;
        const num = parseFloat(cellVal.toString());
        return isNaN(num) ? undefined : num;
      };

      const employeeId = getCellString('employee_id');
      const fullName = getCellString('full_name');
      if (!employeeId && !fullName) return; // Skip blank rows

      rows.push({
        rowNumber,
        employeeId,
        fullName,
        email: getCellString('email'),
        phoneNumber: getCellString('phone_number'),
        gender: getCellString('gender').toUpperCase() as any,
        department: getCellString('department') || undefined,
        costCenter: getCellString('cost_center') || undefined,
        officeCode: getCellString('office_code'),
        rosterDate: getCellString('roster_date'),
        loginTime: getCellString('login_time') || undefined,
        logoutTime: getCellString('logout_time') || undefined,
        homeAddress: getCellString('home_address'),
        landmark: getCellString('landmark') || undefined,
        latitude: getCellNumber('latitude'),
        longitude: getCellNumber('longitude'),
        specialNotes: getCellString('special_notes') || undefined,
      });
    });

    return rows;
  }
}
