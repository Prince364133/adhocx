import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  UpdateAvailabilityDto,
  UpdateDriverProfileDto,
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
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Get current driver profile' })
  async getProfile(@CurrentUser() user: AuthUserDto) {
    return this.driversService.getProfile(user.id);
  }

  @Patch('profile')
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Update driver profile details' })
  async updateProfile(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.driversService.updateProfile(user.id, dto);
  }

  @Get('trust-score')
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get driver performance and trust score 100-point breakdown' })
  async getTrustScore(@CurrentUser() user: AuthUserDto) {
    return this.driversService.getTrustScoreBreakdown(user.id);
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
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Submit driver KYC details for verification' })
  async submitKyc(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: KycSubmissionDto,
  ) {
    return this.driversService.submitKyc(user.id, dto);
  }

  @Post('documents/upload')
  @Roles(UserRole.DRIVER, UserRole.ADMIN, UserRole.VENDOR)
  @UseInterceptors(
    FileInterceptor('document', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a driver KYC document to Cloudflare R2 (supports multipart/form-data or base64 JSON)' })
  @SwaggerResponse({ status: 201, type: UploadDocumentResponseDto, description: 'Document uploaded successfully' })
  async uploadDocument(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.driversService.uploadDocument(user.id, dto, file);
  }
}
