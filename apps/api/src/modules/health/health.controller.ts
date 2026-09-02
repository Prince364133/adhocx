import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthReport } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Comprehensive infrastructure health diagnostics' })
  @ApiResponse({ status: 200, description: 'Component health report' })
  async getHealth(): Promise<HealthReport> {
    return await this.healthService.checkHealth();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLiveness(): { status: string; timestamp: string } {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  @ApiResponse({ status: 503, description: 'Service dependencies are degraded' })
  async getReadiness(): Promise<{ status: string; timestamp: string }> {
    return await this.healthService.checkReadiness();
  }
}
