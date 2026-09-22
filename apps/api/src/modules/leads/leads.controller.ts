import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles } from '../../common';
import { LeadsService } from './leads.service';
import { CreateEnterpriseLeadDto, SubscribeNewsletterDto } from './dto/create-lead.dto';

@ApiTags('Marketing & Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('enterprise')
  @ApiOperation({ summary: 'Submit corporate enterprise fleet demo inquiry (Public)' })
  @ApiResponse({ status: 201, description: 'Lead successfully captured in database' })
  async createEnterpriseLead(@Body() dto: CreateEnterpriseLeadDto) {
    return this.leadsService.createEnterpriseLead(dto);
  }

  @Post('newsletter')
  @ApiOperation({ summary: 'Subscribe email to AdhocX Fleet Dispatch newsletter (Public)' })
  @ApiResponse({ status: 201, description: 'Newsletter subscription confirmed' })
  async subscribeNewsletter(@Body() dto: SubscribeNewsletterDto) {
    return this.leadsService.subscribeNewsletter(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all captured enterprise leads and newsletter subscribers (Admin Only)' })
  @ApiQuery({ name: 'type', required: false, enum: ['ALL', 'ENTERPRISE_DEMO', 'NEWSLETTER'] })
  @ApiQuery({ name: 'status', required: false, enum: ['ALL', 'NEW', 'CONTACTED', 'RESOLVED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listLeads(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.listLeads(
      type,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
