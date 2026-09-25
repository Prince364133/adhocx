import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  CreateRequirementDto,
  CancelRequirementDto,
  RequirementQueryDto,
  RequirementResponseDto,
  RequirementDetailResponseDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { RequirementsService } from './requirements.service';

@ApiTags('Requirements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create and post a new vehicle requirement' })
  @SwaggerResponse({ status: 201, type: RequirementResponseDto })
  async createRequirement(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CreateRequirementDto,
  ) {
    return this.requirementsService.createRequirement(user.id, dto);
  }

  @Get()
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get requirements created by current vendor or all requirements if admin' })
  async getRequirements(
    @CurrentUser() user: AuthUserDto,
    @Query() query: RequirementQueryDto,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.requirementsService.getAllRequirements(query);
    }
    return this.requirementsService.getRequirementsByVendor(user.id, query);
  }

  @Get('summary')
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get aggregated requirement metrics and fulfillment counts for vendor or admin dashboard' })
  async getRequirementsSummary(@CurrentUser() user: AuthUserDto) {
    if (user.role === UserRole.ADMIN) {
      return this.requirementsService.getAllRequirementsSummary();
    }
    return this.requirementsService.getRequirementsSummary(user.id);
  }

  @Get(':id')
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed requirement view including offers, remaining capacity, and assigned drivers' })
  @SwaggerResponse({ status: 200, type: RequirementDetailResponseDto })
  async getRequirementDetails(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.requirementsService.getRequirementDetails(id, user.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a requirement' })
  @SwaggerResponse({ status: 200, type: RequirementResponseDto })
  async cancelRequirement(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CancelRequirementDto,
  ) {
    return this.requirementsService.cancelRequirement(id, user.id, dto);
  }

  @Post(':id/retry')
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Retry dispatch for a requirement marked NO_DRIVER_AVAILABLE' })
  @SwaggerResponse({ status: 200, type: RequirementDetailResponseDto })
  async retryRequirement(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.requirementsService.retryRequirement(id, user.id);
  }
}
