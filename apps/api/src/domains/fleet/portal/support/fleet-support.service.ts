import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import {
  CreateFleetSupportTicketDto,
  FleetSupportAttachmentLinkDto,
  FleetSupportMessageDto,
  FleetSupportTicketDetailDto,
  FleetSupportTicketDto,
  FleetSupportTicketQueryDto,
  FleetSupportTicketStatus,
  PresignFleetSupportAttachmentDto,
  ReplyFleetSupportTicketDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';
import { StorageService } from '../../../../common/storage/storage.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

@Injectable()
export class FleetSupportService {
  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly storage?: StorageService,
  ) {}

  async presignAttachment(
    ctx: FleetRequestContext,
    dto: PresignFleetSupportAttachmentDto,
  ) {
    const mime = dto.mimeType.trim().toLowerCase();
    if (!ALLOWED_ATTACHMENT_MIMES.has(mime)) {
      throw new BadRequestException({
        errorCode: 'UNSUPPORTED_ATTACHMENT_TYPE',
        message: 'Supported attachment types are JPEG, PNG, WEBP, PDF, and plain text.',
      });
    }

    const baseName = path.basename(dto.fileName).replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment';
    const key = `documents/fleet-support/${ctx.fleetId}/${randomUUID()}-${baseName}`;
    const presignedUrl = this.storage?.getPresignedUploadUrl
      ? await this.storage.getPresignedUploadUrl(key, mime, 300)
      : null;

    if (presignedUrl) {
      return {
        key,
        uploadUrl: presignedUrl,
        method: 'PUT',
        uploadMode: 'S3_PRESIGNED',
        expiresInSeconds: 300,
      };
    }

    return {
      key,
      uploadUrl: '/api/v1/fleet/support/attachments/upload',
      method: 'POST',
      uploadMode: 'MULTIPART_FALLBACK',
      expiresInSeconds: 300,
    };
  }

  async uploadAttachmentFallback(
    _ctx: FleetRequestContext,
    file?: {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
  ): Promise<FleetSupportAttachmentLinkDto> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        errorCode: 'ATTACHMENT_FILE_REQUIRED',
        message: 'Please attach a valid non-empty file.',
      });
    }

    if (!this.storage?.saveFile) {
      throw new BadRequestException({
        errorCode: 'STORAGE_UNAVAILABLE',
        message: 'Attachment storage service is unavailable.',
      });
    }

    const stored = await this.storage.saveFile(file, {
      allowedMimeTypes: Array.from(ALLOWED_ATTACHMENT_MIMES),
      maxSizeBytes: 10 * 1024 * 1024,
    });

    const key =
      stored.storageProvider === 'r2'
        ? `documents/${stored.filename}`
        : `/uploads/${stored.filename}`;
    const downloadUrl = await this.resolveAttachmentDownloadUrl(key);

    return {
      key,
      fileName: stored.originalName || stored.filename,
      mimeType: stored.mimeType,
      downloadUrl,
    };
  }

  async listTickets(
    fleetId: string,
    query: FleetSupportTicketQueryDto,
  ): Promise<{
    items: FleetSupportTicketDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { fleetId };
    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category.trim();
    }

    const [rows, total] = await Promise.all([
      this.db.fleetSupportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.fleetSupportTicket.count({ where }),
    ]);

    return {
      items: await Promise.all(rows.map((r) => this.mapTicketDto(r))),
      total,
      page,
      limit,
    };
  }

  async createTicket(
    ctx: FleetRequestContext,
    dto: CreateFleetSupportTicketDto,
  ): Promise<FleetSupportTicketDto> {
    const subject = dto.subject.trim();
    const description = dto.description.trim();
    const category = dto.category.trim();
    if (!subject || !description || !category) {
      throw new BadRequestException({
        errorCode: 'INVALID_SUPPORT_TICKET',
        message: 'Category, subject, and description are required.',
      });
    }

    const attachments = this.validateAttachments(ctx.fleetId, dto.attachments);
    const ticketNumber = `TCK-FLT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

    const created = await this.db.$transaction(async (tx) => {
      const ticket = await tx.fleetSupportTicket.create({
        data: {
          ticketNumber,
          fleetId: ctx.fleetId,
          createdById: ctx.userId,
          category,
          subject,
          description,
          status: 'OPEN',
          attachments: attachments as any,
        },
      });

      await tx.fleetSupportMessage.create({
        data: {
          ticketId: ticket.id,
          senderRole: ctx.role,
          senderName: ctx.fullName,
          body: description,
          attachments: attachments as any,
        },
      });

      return ticket;
    });

    return this.mapTicketDto(created);
  }

  async getTicketDetail(
    fleetId: string,
    id: string,
  ): Promise<FleetSupportTicketDetailDto> {
    const ticket = await this.db.fleetSupportTicket.findFirst({
      where: { id, fleetId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException({
        errorCode: 'SUPPORT_TICKET_NOT_FOUND',
        message: 'Support ticket does not exist in your fleet.',
      });
    }

    const baseDto = await this.mapTicketDto(ticket);
    const messages: FleetSupportMessageDto[] = await Promise.all(
      (ticket.messages || []).map(async (m: any) => ({
        id: m.id,
        ticketId: m.ticketId,
        senderRole: m.senderRole,
        senderName: m.senderName || undefined,
        body: m.body,
        attachments: await this.enrichAttachmentLinks(m.attachments),
        createdAt: new Date(m.createdAt).toISOString(),
      })),
    );

    return {
      ...baseDto,
      messages,
    };
  }

  async replyToTicket(
    ctx: FleetRequestContext,
    id: string,
    dto: ReplyFleetSupportTicketDto,
  ): Promise<{ ticket: FleetSupportTicketDto; message: FleetSupportMessageDto }> {
    const existing = await this.db.fleetSupportTicket.findFirst({
      where: { id, fleetId: ctx.fleetId },
    });

    if (!existing) {
      throw new NotFoundException({
        errorCode: 'SUPPORT_TICKET_NOT_FOUND',
        message: 'Support ticket does not exist in your fleet.',
      });
    }

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException({
        errorCode: 'EMPTY_TICKET_REPLY',
        message: 'Reply message body cannot be empty.',
      });
    }

    const isClosedOrResolved =
      existing.status === 'RESOLVED' || existing.status === 'CLOSED';
    if (isClosedOrResolved && !dto.reopen) {
      throw new BadRequestException({
        errorCode: 'TICKET_REOPEN_REQUIRED',
        message: `Ticket ${existing.ticketNumber} is ${existing.status}. Confirm reopen to post a new reply.`,
      });
    }

    const nextStatus =
      isClosedOrResolved && dto.reopen ? 'OPEN' : existing.status;
    const attachments = this.validateAttachments(ctx.fleetId, dto.attachments);

    const { updatedTicket, message } = await this.db.$transaction(async (tx) => {
      const msg = await tx.fleetSupportMessage.create({
        data: {
          ticketId: existing.id,
          senderRole: ctx.role,
          senderName: ctx.fullName,
          body,
          attachments: attachments as any,
        },
      });

      const upd = await tx.fleetSupportTicket.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      });

      return { updatedTicket: upd, message: msg };
    });

    if (this.db.fleetNotification?.create) {
      await this.db.fleetNotification
        .create({
          data: {
            fleetId: ctx.fleetId,
            eventType: 'SUPPORT_TICKET_REPLY',
            title:
              isClosedOrResolved && dto.reopen
                ? `Ticket ${existing.ticketNumber} Reopened`
                : `New Reply on Ticket ${existing.ticketNumber}`,
            message: `${ctx.fullName} replied on "${existing.subject}".`,
            entityType: 'SUPPORT_TICKET',
            entityId: existing.id,
            actionUrl: `/support?ticketId=${existing.id}`,
          },
        })
        .catch(() => null);
    }

    return {
      ticket: await this.mapTicketDto(updatedTicket),
      message: {
        id: message.id,
        ticketId: message.ticketId,
        senderRole: message.senderRole,
        senderName: message.senderName || undefined,
        body: message.body,
        attachments: await this.enrichAttachmentLinks(message.attachments),
        createdAt: new Date(message.createdAt).toISOString(),
      },
    };
  }

  private validateAttachments(
    fleetId: string,
    attachments?: Array<{ key: string; fileName: string; mimeType: string }>,
  ) {
    if (!attachments || attachments.length === 0) return [];
    if (attachments.length > 5) {
      throw new BadRequestException({
        errorCode: 'TOO_MANY_ATTACHMENTS',
        message: 'At most 5 attachments can be added per ticket or reply.',
      });
    }

    return attachments.map((att) => {
      if (!att.key || att.key.includes('..') || !att.fileName || !att.mimeType) {
        throw new BadRequestException({
          errorCode: 'INVALID_ATTACHMENT',
          message: 'Attachment key, fileName, and mimeType are required.',
        });
      }
      if (!ALLOWED_ATTACHMENT_MIMES.has(att.mimeType.trim().toLowerCase())) {
        throw new BadRequestException({
          errorCode: 'UNSUPPORTED_ATTACHMENT_TYPE',
          message: `Attachment MIME type "${att.mimeType}" is not permitted.`,
        });
      }
      if (
        att.key.startsWith('documents/fleet-support/') &&
        !att.key.startsWith(`documents/fleet-support/${fleetId}/`)
      ) {
        throw new BadRequestException({
          errorCode: 'FOREIGN_ATTACHMENT_KEY',
          message: 'Attachment key does not belong to your fleet.',
        });
      }
      return {
        key: att.key.trim(),
        fileName: path.basename(att.fileName.trim()),
        mimeType: att.mimeType.trim().toLowerCase(),
      };
    });
  }

  private async resolveAttachmentDownloadUrl(key: string): Promise<string | undefined> {
    if (!key) return undefined;
    try {
      if (this.storage?.getDocumentAccessUrl) {
        return await this.storage.getDocumentAccessUrl(key);
      }
    } catch {
      return undefined;
    }
    return key;
  }

  async enrichAttachmentLinks(raw: unknown): Promise<FleetSupportAttachmentLinkDto[]> {
    const arr = Array.isArray(raw) ? raw : [];
    return Promise.all(
      arr.map(async (item: any) => ({
        key: String(item.key || ''),
        fileName: String(item.fileName || 'attachment'),
        mimeType: String(item.mimeType || 'application/octet-stream'),
        downloadUrl: await this.resolveAttachmentDownloadUrl(String(item.key || '')),
      })),
    );
  }

  private async mapTicketDto(r: any): Promise<FleetSupportTicketDto> {
    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      fleetId: r.fleetId,
      category: r.category,
      subject: r.subject,
      description: r.description,
      status: r.status as FleetSupportTicketStatus,
      attachments: await this.enrichAttachmentLinks(r.attachments),
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }
}
