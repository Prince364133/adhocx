
import { Controller, Get, Post, Patch, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateVendorProfileDto, AuthUserDto, UserRole } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { VendorsService } from './vendors.service';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('profile')
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Create or update vendor profile' })
  async createProfile(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CreateVendorProfileDto,
  ) {
    return this.vendorsService.createProfile(user.id, dto, dto.phone || user.phone || '');
  }

  @Patch('profile')
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Update vendor profile' })
  async updateProfile(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: any,
  ) {
    return this.vendorsService.updateProfile(user.id, dto);
  }

  @Post('profile-photo')
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload vendor profile image to Cloudflare R2 (multipart or base64 JSON)' })
  async uploadProfilePhoto(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: { contentBase64?: string; filename?: string; mimeType?: string },
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.vendorsService.uploadProfilePhoto(user.id, dto, file);
  }

  @Get('profile')
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get current vendor profile' })
  async getProfile(@CurrentUser() user: AuthUserDto) {
    return this.vendorsService.getProfile(user.id);
  }
}
