import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  CreateBidDto,
  BidResponseDto,
  BidQueryDto,
  AcceptBidDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { BidsService } from './bids.service';

@ApiTags('Bids')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Submit a price bid on a BIDDING requirement (Driver only)' })
  @SwaggerResponse({ status: 201, type: BidResponseDto })
  async createBid(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CreateBidDto,
  ) {
    return this.bidsService.createBid(user.id, dto);
  }

  @Get()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get bids submitted by current driver' })
  @SwaggerResponse({ status: 200, type: [BidResponseDto] })
  async getDriverBids(
    @CurrentUser() user: AuthUserDto,
    @Query() query: BidQueryDto,
  ) {
    return this.bidsService.getBidsForDriver(user.id, query);
  }

  @Get('requirement/:requirementId')
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.DRIVER)
  @ApiOperation({ summary: 'Get all competing bids for a requirement' })
  @SwaggerResponse({ status: 200, type: [BidResponseDto] })
  async getBidsForRequirement(
    @Param('requirementId') requirementId: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.bidsService.getBidsForRequirement(requirementId, user.id);
  }

  @Post(':id/accept')
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Accept a winning driver bid (locks escrow, creates assignment & trip)' })
  @SwaggerResponse({ status: 200, type: BidResponseDto })
  async acceptBid(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto?: AcceptBidDto,
  ) {
    return this.bidsService.acceptBid(id, user.id, dto);
  }

  @Post(':id/withdraw')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Withdraw a pending bid before it is accepted' })
  @SwaggerResponse({ status: 200, type: BidResponseDto })
  async withdrawBid(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.bidsService.withdrawBid(id, user.id);
  }
}
