import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateFleetSupportTicketDto,
  FleetSupportTicketQueryDto,
  PresignFleetSupportAttachmentDto,
  ReplyFleetSupportTicketDto,
} from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import { CurrentFleetUser, FleetRequestContext } from '../guards/fleet.decorators';
import { FleetSupportService } from './fleet-support.service';

@ApiTags('Fleet Portal Support')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/support')
export class FleetSupportController {
  constructor(private readonly supportService: FleetSupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List paginated support tickets for the current fleet' })
  async listTickets(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetSupportTicketQueryDto,
  ) {
    return this.supportService.listTickets(user.fleetId, query);
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fleet support ticket with optional validated attachment keys' })
  async createTicket(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: CreateFleetSupportTicketDto,
  ) {
    return this.supportService.createTicket(user, dto);
  }

  @Post('attachments/presign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a scoped attachment upload URL (R2 presigned or multipart fallback)' })
  async presignAttachment(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: PresignFleetSupportAttachmentDto,
  ) {
    return this.supportService.presignAttachment(user, dto);
  }

  @Post('attachments/upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload a sanitized support attachment via managed StorageService fallback' })
  async uploadAttachmentFallback(
    @CurrentFleetUser() user: FleetRequestContext,
    @UploadedFile() file?: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number },
  ) {
    return this.supportService.uploadAttachmentFallback(user, file);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Retrieve support ticket detail with chronological messages and attachment links' })
  async getTicketDetail(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.supportService.getTicketDetail(user.fleetId, id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post a reply to a support ticket (with optional reopen of resolved/closed tickets)' })
  async replyToTicket(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReplyFleetSupportTicketDto,
  ) {
    return this.supportService.replyToTicket(user, id, dto);
  }
}
