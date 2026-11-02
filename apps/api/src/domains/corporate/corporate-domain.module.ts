import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { AuditModule } from '../../modules/audit/audit.module';

/**
 * Corporate ETS Domain (Bounded Context: Corporate Managed Commute Transportation)
 * Encapsulates Excel roster ingestion, shift templates, OR-Tools CVRPTW route solving,
 * 5-minute stop wait buffer timers, 9-hour cancellation cutoff policies, and corporate attendance tracking.
 */
@Module({
  imports: [DatabaseModule, RedisModule, NotificationsModule, AuditModule],
  providers: [],
  controllers: [],
  exports: [],
})
export class CorporateDomainModule {}
