import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * AuditService records all significant system operations.
 * Per docs/16_ENGINEERING_STANDARDS.md, audit logs must capture:
 * - Who performed the action (userId)
 * - What action was performed
 * - What entity was affected
 * - When it happened (auto-timestamped)
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Record an audit log entry.
   */
  async log(data: {
    userId?: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          actorId: data.userId,
          actorRole: data.actorRole,
          action: data.action,
          entityName: data.entityType,
          entityId: data.entityId,
          payload: data.metadata ? (data.metadata as any) : undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Audit logging should never break the main flow
      this.logger.error(`Failed to write audit log: ${error}`, {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
      });
    }
  }

  /**
   * Get audit logs for an entity.
   */
  async getLogsForEntity(entityType: string, entityId: string) {
    return this.db.auditLog.findMany({
      where: { entityName: entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
