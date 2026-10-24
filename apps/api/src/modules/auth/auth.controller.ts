import { Controller, Post, Get, Patch, Delete, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
  SocialAuthDto,
  SetPasswordDto,
  LoginDto,
  ResetPasswordDto,
  AuthUserDto,
  UpdateUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate Administrator using Admin ID/Email and Password (with MFA challenge)' })
  @SwaggerResponse({ status: 200, description: 'Admin authentication or MFA challenge returned' })
  async adminLogin(@Body() dto: LoginDto & { mfaCode?: string }) {
    return this.authService.adminLogin(dto);
  }

  @Post('admin/mfa-verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Admin Multi-Factor Authentication (MFA) challenge code' })
  @SwaggerResponse({ status: 200, description: 'MFA verified, administrative JWT tokens returned' })
  async adminMfaVerify(@Body() dto: { mfaSessionToken: string; mfaCode: string }) {
    return this.authService.adminMfaVerify(dto);
  }

  @Get('admin/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify active administrative session and credentials' })
  @SwaggerResponse({ status: 200, description: 'Administrative session is valid' })
  async verifyAdminSession(@CurrentUser() user: AuthUserDto) {
    return this.authService.verifyAdminSession(user.id);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user using Mobile Number / Email and Password' })
  @SwaggerResponse({ status: 200, description: 'Authentication successful, JWT tokens returned' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP for Mobile Number or Email Address' })
  @SwaggerResponse({ status: 200, description: 'OTP requested and dispatched via notification service' })
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

  @Post('social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google / Apple Social Authentication with pre-verified email (Skips OTP)' })
  @SwaggerResponse({ status: 200, description: 'Social login successful, tokens returned' })
  async socialAuth(@Body() dto: SocialAuthDto) {
    return this.authService.socialAuth(dto);
  }

  @Post('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set or update user password' })
  @SwaggerResponse({ status: 200, description: 'Password updated successfully' })
  async setPassword(@CurrentUser() user: AuthUserDto, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(user.id, dto);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password using verified OTP' })
  @SwaggerResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
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

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current authenticated user profile details' })
  @SwaggerResponse({ status: 200, description: 'User profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUserProfile(user.id, dto);
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

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete user account and all data from database' })
  @SwaggerResponse({ status: 200, description: 'Account permanently deleted from database' })
  async deleteAccount(@CurrentUser() user: AuthUserDto, @Req() req: any) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || '';
    await this.authService.deleteAccount(user.id, token);
    return { success: true, message: 'Account permanently deleted from database' };
  }
}
