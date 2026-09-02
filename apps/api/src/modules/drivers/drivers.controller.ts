import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  UpdateAvailabilityDto,
  KycSubmissionDto,
  UploadDocumentDto,
  UploadDocumentResponseDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { DriversService } from './drivers.service';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('profile')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current driver profile' })
  async getProfile(@CurrentUser() user: AuthUserDto) {
    return this.driversService.getProfile(user.id);
  }

  @Patch('availability')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Update driver availability status and location' })
  async updateAvailability(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.driversService.updateAvailability(user.id, dto);
  }

  @Post('kyc')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Submit driver KYC details for verification' })
  async submitKyc(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: KycSubmissionDto,
  ) {
    return this.driversService.submitKyc(user.id, dto);
  }

  @Post('documents/upload')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Upload a driver KYC document (base64 encoded)' })
  @SwaggerResponse({ status: 201, type: UploadDocumentResponseDto, description: 'Document uploaded successfully' })
  async uploadDocument(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.driversService.uploadDocument(user.id, dto);
  }
}
