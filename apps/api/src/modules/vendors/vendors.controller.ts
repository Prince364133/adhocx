import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
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

  @Get('profile')
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get current vendor profile' })
  async getProfile(@CurrentUser() user: AuthUserDto) {
    return this.vendorsService.getProfile(user.id);
  }
}
