import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FleetSupportTicketStatus } from '../../enums';
import { PaginationQueryDto } from '../common.dto';

export class FleetSupportTicketQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateFleetSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsNotEmpty()
  @IsString()
  subject!: string;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    key: string;
    fileName: string;
    mimeType: string;
  }>;
}

export class ReplyFleetSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  body!: string;

  @IsOptional()
  @IsBoolean()
  reopen?: boolean;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    key: string;
    fileName: string;
    mimeType: string;
  }>;
}

export class PresignFleetSupportAttachmentDto {
  @IsNotEmpty()
  @IsString()
  fileName!: string;

  @IsNotEmpty()
  @IsString()
  mimeType!: string;
}

export class FleetSupportAttachmentLinkDto {
  key!: string;
  fileName!: string;
  mimeType!: string;
  downloadUrl?: string;
}

export class FleetSupportMessageDto {
  id!: string;
  ticketId!: string;
  senderRole!: string;
  senderName?: string;
  body!: string;
  attachments!: FleetSupportAttachmentLinkDto[];
  createdAt!: string;
}

export class FleetSupportTicketDto {
  id!: string;
  ticketNumber!: string;
  fleetId!: string;
  category!: string;
  subject!: string;
  description!: string;
  status!: FleetSupportTicketStatus;
  attachments?: FleetSupportAttachmentLinkDto[];
  createdAt!: string;
  updatedAt!: string;
}

export class FleetSupportTicketDetailDto extends FleetSupportTicketDto {
  messages!: FleetSupportMessageDto[];
}
