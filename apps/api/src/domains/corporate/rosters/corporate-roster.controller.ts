import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RosterTemplateService } from './roster-template.service';
import { RosterIngestionService } from './roster-ingestion.service';
import { DatabaseService } from '../../../database/database.service';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard, resolveScopedTenantId } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { RosterLifecycleService } from './roster-lifecycle.service';

/** Office scope bound by CorporateAccessGuard (null = all offices / platform admin). */
const scopeOf = (req: any): string[] | null => req?.corporateOfficeScope ?? null;

@ApiTags('Corporate ETS - Rosters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/rosters')
export class CorporateRosterController {
  constructor(
    private readonly rosterTemplateService: RosterTemplateService,
    private readonly rosterIngestionService: RosterIngestionService,
    private readonly db: DatabaseService,
    private readonly rosterLifecycleService: RosterLifecycleService,
  ) {}

  @Get('template')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Download the official AdhocX Corporate Roster Excel template (.xlsx)' })
  @ApiResponse({ status: 200, description: 'Excel template stream' })
  public async downloadTemplate(@Res() res: Response): Promise<void> {
    const buffer = await this.rosterTemplateService.generateTemplateBuffer();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="AdhocX_Corporate_Roster_Template.xlsx"',
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).send(buffer);
  }

  @Post('validate')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Dry-run validate an uploaded Excel roster file without persisting changes' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        tenantId: { type: 'string' },
      },
      required: ['file', 'tenantId'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  public async validateRoster(
    @UploadedFile() file: Express.Multer.File,
    @Body('tenantId') tenantIdFromBody?: string,
    @Query('tenantId') tenantIdFromQuery?: string,
    @Req() req?: any,
  ) {
    // Multipart bodies are parsed after guards run, so re-check the tenant scope here.
    const tenantId = resolveScopedTenantId(req, tenantIdFromBody, tenantIdFromQuery);
    if (!tenantId) {
      throw new BadRequestException('tenantId is required (in body or query)');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Excel file is required as multipart/form-data field "file"');
    }

    return this.rosterIngestionService.dryRunValidateRoster(tenantId, file.buffer, scopeOf(req));
  }

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({
    summary: 'Upload, validate, and ingest corporate roster; generates transport requests',
    description:
      'Default (mode omitted or "publish"): published immediately and demand is generated (unchanged behaviour; ' +
      'corporate users also need rosters:publish). mode=draft: stored as a new DRAFT roster version without demand; ' +
      'then POST /corporate/rosters/:id/approve and /publish.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        tenantId: { type: 'string' },
        uploadedByUserId: { type: 'string' },
        mode: { type: 'string', enum: ['publish', 'draft'], default: 'publish' },
      },
      required: ['file', 'tenantId'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  public async uploadRoster(
    @UploadedFile() file: Express.Multer.File,
    @Body('tenantId') tenantIdFromBody?: string,
    @Query('tenantId') tenantIdFromQuery?: string,
    @Body('uploadedByUserId') uploadedByUserId?: string,
    @Req() req?: any,
    @Body('mode') modeFromBody?: string,
    @Query('mode') modeFromQuery?: string,
  ) {
    // Multipart bodies are parsed after guards run, so re-check the tenant scope here.
    const tenantId = resolveScopedTenantId(req, tenantIdFromBody, tenantIdFromQuery);
    if (!tenantId) {
      throw new BadRequestException('tenantId is required (in body or query)');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Excel file is required as multipart/form-data field "file"');
    }

    const mode = String(modeFromBody ?? modeFromQuery ?? 'publish').trim().toLowerCase();
    if (mode !== 'publish' && mode !== 'draft') {
      throw new BadRequestException('mode must be "publish" or "draft"');
    }
    // The uploader recorded on the roster is the authenticated user, not a body field.
    const actorId = req?.user?.id ?? uploadedByUserId;
    if (mode === 'draft') {
      return this.rosterIngestionService.ingestDraftRoster(tenantId, file.buffer, actorId, scopeOf(req));
    }
    return this.rosterIngestionService.ingestAndPublishRoster(tenantId, file.buffer, actorId, scopeOf(req));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List corporate rosters for a tenant (office-scoped users: their offices)' })
  public async listRosters(
    @Query('tenantId') tenantId: string,
    @Query('rosterDate') rosterDate?: string,
    @Query('officeId') officeId?: string,
    @Req() req?: any,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId query parameter is required');
    }

    const where: any = { tenantId };
    if (officeId) {
      where.officeId = officeId; // the guard already rejected an out-of-scope officeId
    } else if (scopeOf(req)) {
      where.officeId = { in: scopeOf(req) };
    }
    if (rosterDate) {
      where.rosterDate = new Date(rosterDate);
    }

    return this.db.corporateRoster.findMany({
      where,
      include: {
        office: {
          select: {
            id: true,
            code: true,
            name: true,
            addressText: true,
          },
        },
        _count: {
          select: {
            requests: true,
          },
        },
      },
      orderBy: [{ rosterDate: 'desc' }, { shiftTime: 'asc' }],
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('roster', 'id')
  @ApiOperation({ summary: 'Get details of a specific corporate roster' })
  public async getRosterById(@Param('id') id: string) {
    const roster = await this.db.corporateRoster.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { id: true, code: true, name: true },
        },
        office: true,
        requests: {
          take: 50,
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                gender: true,
                email: true,
                phoneNumber: true,
              },
            },
            routeStop: {
              select: {
                id: true,
                routeId: true,
                stopSequence: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            requests: true,
          },
        },
      },
    });

    if (!roster) {
      throw new NotFoundException(`Corporate roster ${id} not found`);
    }

    return roster;
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('roster', 'id')
  @ApiOperation({ summary: 'Approve a DRAFT roster version (DRAFT -> APPROVED); idempotent; actor audited' })
  public async approveRoster(@Param('id') id: string, @Req() req: any) {
    return this.rosterLifecycleService.approve(id, this.actorOf(req));
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('roster', 'id')
  @ApiOperation({
    summary: 'Publish an APPROVED roster version (APPROVED -> PUBLISHED) and generate demand idempotently',
    description: 'Requests are keyed by idempotencyHash; re-publishing creates nothing. Holiday shift days are skipped.',
  })
  public async publishRoster(@Param('id') id: string, @Req() req: any) {
    return this.rosterLifecycleService.publish(id, this.actorOf(req));
  }

  @Get(':id/requests')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('roster', 'id')
  @ApiOperation({ summary: 'Get all transport requests belonging to a corporate roster' })
  public async getRosterTransportRequests(
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    const where: any = { rosterId: id };
    if (status) {
      where.status = status;
    }

    return this.db.corporateTransportRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            gender: true,
            department: true,
          },
        },
        routeStop: {
          select: {
            id: true,
            routeId: true,
            stopSequence: true,
            stopType: true,
            plannedEta: true,
            actualArrivalTime: true,
            status: true,
          },
        },
      },
      orderBy: [{ shiftTime: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private actorOf(req: any) {
    return { id: req?.user?.id, role: req?.user?.role, corporateRole: req?.corporateRole ?? null };
  }
}
