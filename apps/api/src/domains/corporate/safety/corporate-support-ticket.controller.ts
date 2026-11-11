import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  Logger,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CorporateTicketCategory,
  CorporateTicketCommentVisibility,
  CorporateTicketPriority,
  CorporateTicketStatus,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard, resolveScopedTenantId } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { StorageService, uploadSigningSecret } from '../../../common/storage/storage.service';
import { CorporateSupportTicketService, SupportTicketActor } from './corporate-support-ticket.service';
import { CreateCorporateSupportTicketDto, UpdateSupportTicketStatusDto } from './safety.types';
import { TicketAttachmentInput } from './safety.types';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const parseIntOrUndefined = (value?: string): number | undefined => {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const actorFromRequest = (req: any): SupportTicketActor => ({
  userId: req.user?.id,
  role: req.user?.role,
});

@ApiTags('Corporate ETS - Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/support/tickets')
export class CorporateSupportTicketController {
  private readonly logger = new Logger(CorporateSupportTicketController.name);

  constructor(
    private readonly tickets: CorporateSupportTicketService,
    @Optional()
    private readonly storage?: StorageService,
  ) {}

  private async storeAttachments(files: Express.Multer.File[] | undefined, userId: string): Promise<TicketAttachmentInput[]> {
    if (!files?.length) return [];
    if (!this.storage) throw new BadRequestException('Ticket attachment storage is unavailable');
    if (!uploadSigningSecret()) {
      throw new InternalServerErrorException('Ticket attachment link signing is not configured');
    }
    if (files.length > MAX_FILES) throw new BadRequestException('A ticket can have at most 5 images');
    const stored: TicketAttachmentInput[] = [];
    try {
      for (const file of files) {
        if (!IMAGE_TYPES.includes(file.mimetype)) {
          throw new BadRequestException('Only JPG, JPEG, PNG and WEBP images are allowed');
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new BadRequestException('Each image must be 5 MB or smaller');
        }
        const saved = await this.storage.saveFile(file, {
          allowedMimeTypes: IMAGE_TYPES,
          maxSizeBytes: MAX_FILE_SIZE,
          minSizeBytes: 1,
          stripExif: true,
        });
        stored.push({
          fileName: saved.originalName,
          fileType: saved.mimeType,
          fileSize: saved.size,
          storageReference: saved.url,
          uploadedBy: userId,
        });
      }
      return stored;
    } catch (error) {
      for (const attachment of stored) {
        try {
          await this.storage.deleteStoredFile(attachment.storageReference);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to remove unattached support file ${attachment.fileName}`,
            cleanupError instanceof Error ? cleanupError.stack : undefined,
          );
        }
      }
      throw error;
    }
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateTenantScoped()
  @UseInterceptors(FilesInterceptor('attachments', MAX_FILES, { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiOperation({ summary: 'Create a tenant-scoped support ticket with optional images' })
  @ApiResponse({ status: 201, description: 'Ticket created with priority-based SLA' })
  public async createTicket(
    @Body() dto: CreateCorporateSupportTicketDto,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const actor = actorFromRequest(req);
    const tenantId = resolveScopedTenantId(req, dto?.tenantId);
    const prior = await this.tickets.findIdempotentTicket(idempotencyKey, tenantId, actor);
    if (prior) return prior;
    const attachments = await this.storeAttachments(files, actor.userId!);
    try {
      return await this.tickets.createForEmployee(
        dto?.employeeId,
        tenantId,
        dto,
        actor,
        attachments,
        idempotencyKey,
      );
    } catch (error) {
      for (const attachment of attachments) {
        try {
          await this.storage?.deleteStoredFile(attachment.storageReference);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to remove unattached support file ${attachment.fileName}`,
            cleanupError instanceof Error ? cleanupError.stack : undefined,
          );
        }
      }
      throw error;
    }
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List authorized corporate tickets; platform Admin may filter across tenants' })
  public async listTickets(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: CorporateTicketStatus,
    @Query('priority') priority?: CorporateTicketPriority,
    @Query('category') category?: CorporateTicketCategory,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const scopedTenantId = resolveScopedTenantId(req, tenantId);
    const actor = actorFromRequest(req);
    let scopedEmployeeId = employeeId;
    if (actor.role === UserRole.EMPLOYEE) {
      if (employeeId) throw new BadRequestException('Employees cannot filter by another employee');
      scopedEmployeeId = await this.tickets.getEmployeeIdForUser(actor.userId!);
    }
    return this.tickets.listTickets({
      tenantId: scopedTenantId,
      employeeId: scopedEmployeeId,
      status,
      priority,
      category,
      search,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
    }, actor);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateTenantScoped()
  public async summary(@Req() req: any, @Query('tenantId') tenantId?: string) {
    const actor = actorFromRequest(req);
    return this.tickets.ticketSummary({
      tenantId: resolveScopedTenantId(req, tenantId),
      employeeId: actor.role === UserRole.EMPLOYEE
        ? await this.tickets.getEmployeeIdForUser(actor.userId!)
        : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Get authorized ticket details, replies, public timeline, and signed image URLs' })
  public async getTicket(@Param('id') id: string, @Req() req: any = { user: { role: UserRole.ADMIN } }) {
    return this.tickets.getTicket(id, actorFromRequest(req));
  }

  @Post(':id/replies')
  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateResource('ticket', 'id')
  @UseInterceptors(FilesInterceptor('attachments', MAX_FILES, { limits: { fileSize: MAX_FILE_SIZE } }))
  public async reply(
    @Param('id') id: string,
    @Body('message') message: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    const actor = actorFromRequest(req);
    const attachments = await this.storeAttachments(files, actor.userId!);
    try {
      return await this.tickets.addComment(id, message, actor, CorporateTicketCommentVisibility.PUBLIC, attachments);
    } catch (error) {
      for (const attachment of attachments) {
        try {
          await this.storage?.deleteStoredFile(attachment.storageReference);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to remove unattached support file ${attachment.fileName}`,
            cleanupError instanceof Error ? cleanupError.stack : undefined,
          );
        }
      }
      throw error;
    }
  }

  @Post(':id/reopen')
  @Roles(UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.EMPLOYEE)
  @CorporateResource('ticket', 'id')
  public async reopen(@Param('id') id: string, @Req() req: any) {
    return this.tickets.updateTicketStatus(id, CorporateTicketStatus.REOPENED, actorFromRequest(req));
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @CorporateResource('ticket', 'id')
  @ApiOperation({ summary: 'Change ticket status within the shared workflow' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: Object.values(CorporateTicketStatus) }, notes: { type: 'string' } }, required: ['status'] } })
  @ApiResponse({ status: 409, description: 'Illegal ticket transition' })
  public async updateStatus(@Param('id') id: string, @Body() dto: UpdateSupportTicketStatusDto, @Req() req: any) {
    return this.tickets.updateTicketStatus(id, dto?.status, actorFromRequest(req), dto?.notes);
  }

  @Patch(':id/assignment')
  @Roles(UserRole.ADMIN)
  @CorporateResource('ticket', 'id')
  public async assign(
    @Param('id') id: string,
    @Body() dto: { team?: string | null; userId?: string | null },
    @Req() req: any,
  ) {
    return this.tickets.assignTicket(id, dto?.team, dto?.userId, actorFromRequest(req));
  }

  @Patch(':id/priority')
  @Roles(UserRole.ADMIN)
  @CorporateResource('ticket', 'id')
  public async updatePriority(@Param('id') id: string, @Body('priority') priority: CorporateTicketPriority, @Req() req: any) {
    return this.tickets.changePriority(id, priority, actorFromRequest(req));
  }

  @Post(':id/comments')
  @Roles(UserRole.ADMIN)
  @CorporateResource('ticket', 'id')
  public async adminReply(@Param('id') id: string, @Body('message') message: string, @Req() req: any) {
    return this.tickets.addComment(id, message, actorFromRequest(req), CorporateTicketCommentVisibility.PUBLIC);
  }

  @Post(':id/notes')
  @Roles(UserRole.ADMIN)
  @CorporateResource('ticket', 'id')
  public async adminNote(@Param('id') id: string, @Body('message') message: string, @Req() req: any) {
    return this.tickets.addComment(id, message, actorFromRequest(req), CorporateTicketCommentVisibility.INTERNAL);
  }
}

@ApiTags('OPS - Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ops/support/tickets')
export class OpsSupportTicketController {
  constructor(private readonly tickets: CorporateSupportTicketService) {}

  @Get()
  @Roles(UserRole.OPS)
  public async list(@Req() req: any) {
    return this.tickets.listOpsTickets(actorFromRequest(req));
  }

  @Get(':id')
  @Roles(UserRole.OPS)
  public async detail(@Param('id') id: string, @Req() req: any) {
    return this.tickets.getOpsTicket(id, actorFromRequest(req));
  }

  @Post(':id/updates')
  @Roles(UserRole.OPS)
  public async update(@Param('id') id: string, @Body('message') message: string, @Req() req: any) {
    await this.tickets.assertOpsTicket(id, actorFromRequest(req));
    return this.tickets.addComment(id, message, actorFromRequest(req), CorporateTicketCommentVisibility.INTERNAL);
  }

  @Patch(':id/status')
  @Roles(UserRole.OPS)
  public async status(@Param('id') id: string, @Body() dto: UpdateSupportTicketStatusDto, @Req() req: any) {
    const actor = actorFromRequest(req);
    await this.tickets.assertOpsTicket(id, actor);
    return this.tickets.updateTicketStatus(id, dto.status, actor, dto.notes, [
      CorporateTicketStatus.IN_PROGRESS,
      CorporateTicketStatus.WAITING_FOR_CORPORATE,
      CorporateTicketStatus.RESOLVED,
    ]);
  }
}
