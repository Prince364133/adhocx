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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RosterTemplateService } from './roster-template.service';
import { RosterIngestionService } from './roster-ingestion.service';
import { DatabaseService } from '../../../database/database.service';

@ApiTags('Corporate ETS - Rosters')
@Controller('corporate/rosters')
export class CorporateRosterController {
  constructor(
    private readonly rosterTemplateService: RosterTemplateService,
    private readonly rosterIngestionService: RosterIngestionService,
    private readonly db: DatabaseService,
  ) {}

  @Get('template')
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
  ) {
    const tenantId = tenantIdFromBody || tenantIdFromQuery;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required (in body or query)');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Excel file is required as multipart/form-data field "file"');
    }

    return this.rosterIngestionService.dryRunValidateRoster(tenantId, file.buffer);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload, validate, and ingest corporate roster; generates transport requests' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        tenantId: { type: 'string' },
        uploadedByUserId: { type: 'string' },
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
  ) {
    const tenantId = tenantIdFromBody || tenantIdFromQuery;
    if (!tenantId) {
      throw new BadRequestException('tenantId is required (in body or query)');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Excel file is required as multipart/form-data field "file"');
    }

    return this.rosterIngestionService.ingestAndPublishRoster(tenantId, file.buffer, uploadedByUserId);
  }

  @Get()
  @ApiOperation({ summary: 'List corporate rosters for a tenant' })
  public async listRosters(
    @Query('tenantId') tenantId: string,
    @Query('rosterDate') rosterDate?: string,
    @Query('officeId') officeId?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId query parameter is required');
    }

    const where: any = { tenantId };
    if (officeId) {
      where.officeId = officeId;
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

  @Get(':id/requests')
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
}
