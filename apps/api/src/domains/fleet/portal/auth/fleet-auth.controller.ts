import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FleetLoginDto } from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { CurrentFleetUser, FleetRequestContext } from '../guards/fleet.decorators';
import { FleetAuthService } from './fleet-auth.service';

@ApiTags('Fleet Portal Auth')
@Controller('fleet/auth')
export class FleetAuthController {
  constructor(private readonly authService: FleetAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate Fleet Owner or Fleet Manager' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token and fleet user context' })
  async login(@Body() dto: FleetLoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(FleetAuthGuard)
  @ApiOperation({ summary: 'Get authenticated fleet administrator profile and permissions' })
  async getMe(@CurrentFleetUser() user: FleetRequestContext) {
    return this.authService.getMe(user);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(FleetAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of Fleet Portal session' })
  async logout() {
    return { success: true };
  }
}
