import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root & System Metadata' })
  @ApiResponse({ status: 200, description: 'API status and quick reference' })
  getRoot() {
    return {
      name: 'AdhocX Authoritative Backend API',
      version: '1.0.0',
      status: 'ONLINE',
      documentation: '/docs',
      health: '/api/v1/health',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/v1/auth',
        drivers: '/api/v1/drivers',
        vendors: '/api/v1/vendors',
        requirements: '/api/v1/requirements',
        offers: '/api/v1/offers',
        assignments: '/api/v1/assignments',
        trips: '/api/v1/trips',
        payments: '/api/v1/payments',
        ledger: '/api/v1/ledger',
        settlements: '/api/v1/settlements',
        admin: '/api/v1/admin',
        health: '/api/v1/health',
      },
    };
  }
}
