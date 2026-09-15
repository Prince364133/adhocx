import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponValidationResponseDto,
  CouponResponseDto,
  CouponRedemptionResponseDto,
  CouponMetricsDto,
  CouponApplicableContext,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { CouponsService } from './coupons.service';

@ApiTags('Coupons & Promotions')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate coupon code against order/booking/top-up context' })
  @SwaggerResponse({ status: 200, type: CouponValidationResponseDto })
  async validateCoupon(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponsService.validateCoupon(user.id, dto);
  }

  @Get('available')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List available active coupons for current user' })
  @SwaggerResponse({ status: 200, type: [CouponResponseDto] })
  async getAvailableCoupons(
    @CurrentUser() user: AuthUserDto,
    @Query('context') context?: CouponApplicableContext,
  ) {
    return this.couponsService.getAvailableCoupons(user.id, context);
  }
}

@ApiTags('Admin Coupon Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get coupon KPI metrics for admin overview' })
  @SwaggerResponse({ status: 200, type: CouponMetricsDto })
  async getCouponMetrics() {
    return this.couponsService.getCouponMetrics();
  }

  @Get()
  @ApiOperation({ summary: 'List all promotional coupons with filters' })
  @SwaggerResponse({ status: 200, type: [CouponResponseDto] })
  async listCoupons(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('applicableTo') applicableTo?: string,
  ) {
    return this.couponsService.listCoupons({ status, search, applicableTo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon details by ID' })
  @SwaggerResponse({ status: 200, type: CouponResponseDto })
  async getCouponById(@Param('id') id: string) {
    return this.couponsService.getCouponById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new promotional coupon' })
  @SwaggerResponse({ status: 201, type: CouponResponseDto })
  async createCoupon(
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: CreateCouponDto,
  ) {
    return this.couponsService.createCoupon(admin.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon properties or status' })
  @SwaggerResponse({ status: 200, type: CouponResponseDto })
  async updateCoupon(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.updateCoupon(admin.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete or deactivate coupon' })
  async deleteCoupon(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUserDto,
  ) {
    return this.couponsService.deleteCoupon(admin.id, id);
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'Get audit log of redemptions for a coupon' })
  @SwaggerResponse({ status: 200, type: [CouponRedemptionResponseDto] })
  async getCouponRedemptions(@Param('id') id: string) {
    return this.couponsService.getCouponRedemptions(id);
  }
}
