import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  DisputeResponseDto,
  DisputeQueryDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { DisputesService } from './disputes.service';

@ApiTags('Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'File a dispute ticket for a trip' })
  @SwaggerResponse({ status: 201, type: DisputeResponseDto })
  async createDispute(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.createDispute(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List dispute tickets (Admin / Customer Care only)' })
  @SwaggerResponse({ status: 200, type: [DisputeResponseDto] })
  async getDisputes(
    @Query() query: DisputeQueryDto,
  ) {
    return this.disputesService.getDisputes(query);
  }

  @Get('my')
  @ApiOperation({ summary: 'List current user dispute tickets' })
  @SwaggerResponse({ status: 200, type: [DisputeResponseDto] })
  async getMyDisputes(@CurrentUser() user: AuthUserDto) {
    return this.disputesService.getUserDisputes(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute ticket details by ID' })
  @SwaggerResponse({ status: 200, type: DisputeResponseDto })
  async getDisputeById(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.disputesService.getDisputeById(id, user.id, user.role === UserRole.ADMIN);
  }

  @Patch(':id/resolve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve or close a dispute ticket (Admin only)' })
  @SwaggerResponse({ status: 200, type: DisputeResponseDto })
  async resolveDispute(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(id, user.id, dto);
  }
}
