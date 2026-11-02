import { Module } from '@nestjs/common';
import { AdminModule } from '../../modules/admin/admin.module';
import { AuditModule } from '../../modules/audit/audit.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { HealthModule } from '../../modules/health/health.module';
import { LeadsModule } from '../../modules/leads/leads.module';
import { BlogsModule } from '../../modules/blogs/blogs.module';
import { AppUpdateModule } from '../../modules/app-update/app-update.module';
import { DisputesModule } from '../../modules/disputes/disputes.module';

/**
 * Platform Domain (Bounded Context: Platform Governance & Infrastructure)
 * Encapsulates super admin controls, audit logging, push notifications, disputes, and system telemetry.
 */
@Module({
  imports: [
    AdminModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
    LeadsModule,
    BlogsModule,
    AppUpdateModule,
    DisputesModule,
  ],
  exports: [
    AdminModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
    LeadsModule,
    BlogsModule,
    AppUpdateModule,
    DisputesModule,
  ],
})
export class PlatformDomainModule {}

