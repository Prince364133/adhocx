import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  UserRole,
  AuthUserDto,
  FeatureFlagDto,
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  ToggleFeatureFlagDto,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('Feature Flags (Client)')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active feature flags map and list for mobile and web clients' })
  async getClientFeatureFlags() {
    return this.featureFlagsService.getActiveFlags();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get single feature flag by key' })
  async getSingleFeatureFlag(@Param('key') key: string) {
    return this.featureFlagsService.getFlagByKey(key);
  }
}

@ApiTags('Admin Feature Flags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags with operational metadata (Admin only)' })
  @SwaggerResponse({ status: 200, type: [FeatureFlagDto] })
  async listAdminFeatureFlags() {
    return this.featureFlagsService.getAllFlags();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feature flag (Admin only)' })
  @SwaggerResponse({ status: 201, type: FeatureFlagDto })
  async createFeatureFlag(
    @Body() dto: CreateFeatureFlagDto,
    @CurrentUser() admin: AuthUserDto,
  ) {
    return this.featureFlagsService.createFlag(dto, admin?.email);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update feature flag details and metadata (Admin only)' })
  @SwaggerResponse({ status: 200, type: FeatureFlagDto })
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @CurrentUser() admin: AuthUserDto,
  ) {
    return this.featureFlagsService.updateFlag(key, dto, admin?.email);
  }

  @Patch(':key/toggle')
  @ApiOperation({ summary: 'Toggle feature flag enabled/disabled state (Admin only)' })
  @SwaggerResponse({ status: 200, type: FeatureFlagDto })
  async toggleFeatureFlag(
    @Param('key') key: string,
    @Body() dto: ToggleFeatureFlagDto,
    @CurrentUser() admin: AuthUserDto,
  ) {
    return this.featureFlagsService.toggleFlag(key, dto.isEnabled, admin?.email);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a feature flag (Admin only)' })
  async deleteFeatureFlag(@Param('key') key: string) {
    return this.featureFlagsService.deleteFlag(key);
  }
}
