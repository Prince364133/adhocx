import { Controller, Post, Get, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto, AuthUserDto } from '@adhocx/contracts';
import { JwtAuthGuard, CurrentUser } from '../../common';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for login or registration' })
  @SwaggerResponse({ status: 200, description: 'OTP requested successfully' })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and obtain JWT tokens' })
  @SwaggerResponse({ status: 200, description: 'Authentication successful' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @SwaggerResponse({ status: 200, description: 'Tokens refreshed successfully' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @SwaggerResponse({ status: 200, description: 'User profile retrieved' })
  async getMe(@CurrentUser() user: AuthUserDto) {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and invalidate current session token' })
  @SwaggerResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || '';
    await this.authService.logout(token);
    return { success: true, message: 'Logged out successfully' };
  }
}
