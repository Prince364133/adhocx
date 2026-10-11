import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  DeclineOfferDto,
  OfferQueryDto,
  OfferResponseDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { OffersService } from './offers.service';

@ApiTags('Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Get trip offers sent to current driver' })
  @SwaggerResponse({ status: 200, type: [OfferResponseDto] })
  async getOffers(
    @CurrentUser() user: AuthUserDto,
    @Query() query: OfferQueryDto,
  ) {
    return this.offersService.getOffersForDriver(user.id, query);
  }

  @Post(':id/accept')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Accept a trip offer (atomically allocates capacity, creates assignment & trip)' })
  @SwaggerResponse({ status: 200, type: OfferResponseDto })
  async acceptOffer(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.offersService.acceptOffer(id, user.id);
  }

  @Post(':id/decline')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Decline a trip offer (triggers redispatch for next candidate)' })
  @SwaggerResponse({ status: 200, type: OfferResponseDto })
  async declineOffer(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: DeclineOfferDto,
  ) {
    return this.offersService.declineOffer(id, user.id, dto.reason);
  }

  @Post(':id/seen')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Delivery receipt: driver app displayed this offer' })
  async markSeen(@Param('id') id: string, @CurrentUser() user: AuthUserDto) {
    return this.offersService.markOfferSeen(id, user.id);
  }
}
