import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  CreateReviewDto,
  ReviewResponseDto,
  ReviewQueryDto,
  AuthUserDto,
} from '@adhocx/contracts';
import { JwtAuthGuard, CurrentUser } from '../../common';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a 1-5 star review for a completed trip' })
  @SwaggerResponse({ status: 201, type: ReviewResponseDto })
  async createReview(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Get reviews for a driver' })
  @SwaggerResponse({ status: 200, type: [ReviewResponseDto] })
  async getDriverReviews(
    @Param('driverId') driverId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.getDriverReviews(driverId, query);
  }

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Get reviews for a trip' })
  @SwaggerResponse({ status: 200, type: [ReviewResponseDto] })
  async getTripReviews(
    @Param('tripId') tripId: string,
  ) {
    return this.reviewsService.getTripReviews(tripId);
  }
}
