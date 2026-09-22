import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateEnterpriseLeadDto, SubscribeNewsletterDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Capture and persist enterprise corporate fleet inquiry to PostgreSQL.
   */
  async createEnterpriseLead(dto: CreateEnterpriseLeadDto) {
    this.logger.log(`New Enterprise Demo Request received from: ${dto.companyName} (${dto.email})`);

    const lead = await this.db.leadCapture.create({
      data: {
        type: 'ENTERPRISE_DEMO',
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone.trim(),
        companyName: dto.companyName.trim(),
        contactName: dto.contactName.trim(),
        city: dto.city?.trim() || 'Hyderabad',
        fleetRequirements: dto.fleetRequirements?.trim(),
        monthlyTripsEstimate: dto.monthlyTripsEstimate?.trim(),
        preferredVehicles: dto.preferredVehicles?.trim(),
        notes: dto.notes?.trim(),
        status: 'NEW',
      },
    });

    // Create system audit entry
    try {
      await this.db.auditLog.create({
        data: {
          action: 'LEAD_ENTERPRISE_SUBMITTED',
          actorRole: 'SYSTEM',
          entityName: 'LEAD',
          entityId: lead.id,
          payload: {
            companyName: dto.companyName,
            contactName: dto.contactName,
            email: dto.email,
            phone: dto.phone,
            city: dto.city,
            monthlyTripsEstimate: dto.monthlyTripsEstimate,
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Lead audit entry warning: ${auditErr.message}`);
    }

    return {
      success: true,
      id: lead.id,
      companyName: lead.companyName,
      contactName: lead.contactName,
      message: 'Enterprise inquiry successfully recorded. Our logistics team will reach out within 30 minutes.',
      createdAt: lead.createdAt,
    };
  }

  /**
   * Capture newsletter email subscription.
   */
  async subscribeNewsletter(dto: SubscribeNewsletterDto) {
    const email = dto.email.trim().toLowerCase();
    this.logger.log(`Newsletter subscription received for: ${email}`);

    // Check if already subscribed
    const existing = await this.db.leadCapture.findFirst({
      where: {
        type: 'NEWSLETTER',
        email,
      },
    });

    if (existing) {
      return {
        success: true,
        message: 'You are already subscribed to the AdhocX Fleet Dispatch newsletter.',
      };
    }

    const lead = await this.db.leadCapture.create({
      data: {
        type: 'NEWSLETTER',
        email,
        status: 'NEW',
      },
    });

    return {
      success: true,
      id: lead.id,
      message: 'Thank you for subscribing to AdhocX Fleet Dispatch!',
      createdAt: lead.createdAt,
    };
  }

  /**
   * List all captured leads for Admin Portal with pagination and filtering.
   */
  async listLeads(type?: string, status?: string, page = 1, limit = 50) {
    const where: any = {};
    if (type && type !== 'ALL') where.type = type;
    if (status && status !== 'ALL') where.status = status;

    const skip = (Math.max(1, page) - 1) * limit;

    const [items, total] = await Promise.all([
      this.db.leadCapture.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.leadCapture.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
