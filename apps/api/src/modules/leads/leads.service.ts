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

  /**
   * Process corporate AI consultation chat request securely on the server.
   * Reads OPENAI_API_KEY from environment variables without exposing secrets to frontend.
   */
  async processAiChat(messages: { role: string; content: string }[]) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('processAiChat: OPENAI_API_KEY is not configured in environment.');
      return {
        reply: 'Our corporate mobility team is ready to assist your company. Please feel free to request a 1-week pilot route or tailored quotation below.',
      };
    }

    const sanitizedMessages = (Array.isArray(messages) ? messages : [])
      .slice(-10)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

    const systemPrompt = `You are a warm, helpful, and consultative Human Corporate Mobility Advisor representing AdhocX (operated by Estemporaneo Technologies Private Limited, Hyderabad).
You are having a live back-and-forth conversation with corporate decision-makers (HR Directors, Corporate Transport / ETS Managers, Admin Heads, Facilities Leads, Operations VPs) who are exploring employee transportation services for their company.

CONVERSATIONAL PERSONA & TONE:
1. TALK LIKE A REAL HUMAN CONSULTANT:
   - Always sound like a warm, supportive, knowledgeable human mobility partner ("I'd be glad to help with that!", "We work closely with IT and BPO firms in Hyderabad...", "I can help you arrange a pilot route for your team...").
   - Vary your opening naturally. DO NOT use canned repetitive phrases like "I appreciate your interest" or "Thank you for reaching out". Speak naturally, directly, and with genuine warmth.
   - NEVER sound like a robotic encyclopedia, search engine, or regurgitator. NEVER output massive numbered lists, textbook definitions, or walls of text.
2. STRICT LENGTH LIMIT — KEEP IT SHORT & BITE-SIZED:
   - Every response MUST be strictly 2 to 3 concise, punchy sentences (under 55 words total).
   - If using bullet points, use at most 2 brief bullet points.
3. CONVERSATIONAL DISCOVERY & PROACTIVE GUIDANCE (ALWAYS LEAD TO ACTION):
   - Answer their specific question crisply first.
   - Proactively guide them towards trying our services (e.g., offer a risk-free 1-week pilot route or a free route-cost assessment for their campus).
   - Always end with an engaging discovery question about their company.
4. COMPLETE ADHOCX CONSCIOUSNESS & WEBSITE FACTS:
   - Direct Contract Model: Direct corporate enterprise agreements and direct commercial driver onboarding. Zero middleman brokers, zero hidden markups, transparent pre-agreed rate cards.
   - 100% Commercial Yellow-Plate Fleet: 4-seater sedans (Maruti Dzire, Toyota Etios, Tata Tigor EV, Hyundai Aura) and 6/7-seater MUVs (Maruti Ertiga, XL6, Toyota Innova Crysta, Kia Carens). Strictly commercial yellow-board vehicles with calibrated speed governors (80 km/h) and real-time GPS tracking. Never private white-plate cars.
   - Primary Operating Corridors: Hyderabad technology hubs (HITEC City, Gachibowli, Financial District, Madhapur, Kondapur, Pocharam, Uppal, Begumpet, Shamshabad RGIA).
   - Core Services: Scheduled Shift Commutes, 24/7 BPO Transit, Women Night Safety (SCSC Compliance), Executive Airport Transfers, Adhoc Spot Mobility.
   - Technology Suite: Corporate Client Portal, Employee Mobile App, Driver Mobile App.
   - Trial / Pilot Offer: Companies can test AdhocX with a risk-free 1-week pilot route or shift assessment before committing to a contract.
5. FORMATTING & SCOPE:
   - Use markdown asterisks for bold text on 1 or 2 key highlights (e.g. **1-week pilot route**, **100% commercial yellow-plate**, **safe-drop protocol**).
   - Only answer queries related to employee transit, fleets, safety, and AdhocX corporate mobility. Politely decline off-topic queries with a human touch.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...sanitizedMessages,
          ],
          temperature: 0.35,
          max_tokens: 180,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        this.logger.error(`OpenAI API returned status ${response.status}: ${errText}`);
        return {
          reply: 'Our corporate mobility team is ready to assist your company. Please feel free to request a 1-week pilot route or tailored quotation below.',
        };
      }

      const data: any = await response.json();
      const reply = data?.choices?.[0]?.message?.content ||
        'Our corporate mobility team is ready to assist your company. Please feel free to request a 1-week pilot route or tailored quotation below.';

      return { reply };
    } catch (error: any) {
      this.logger.error(`processAiChat error: ${error.message}`);
      return {
        reply: 'Our corporate mobility team is ready to assist your company. Please feel free to request a 1-week pilot route or tailored quotation below.',
      };
    }
  }
}
