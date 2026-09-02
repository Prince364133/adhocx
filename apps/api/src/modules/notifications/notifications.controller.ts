import { Controller, Sse, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard, CurrentUser } from '../../common';
import { AuthUserDto } from '@adhocx/contracts';
import { NotificationsService, RealtimeEvent } from './notifications.service';

@ApiTags('Realtime & Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('events')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe to real-time events stream via Server-Sent Events (SSE)' })
  streamEvents(
    @CurrentUser() user: AuthUserDto,
    @Query('channel') channel?: string,
  ): Observable<{ data: RealtimeEvent }> {
    // Default to user-specific channel if no specific channel requested
    const targetChannel = channel || `user:${user.id}`;
    return this.notificationsService.getEventStream(targetChannel);
  }
}
