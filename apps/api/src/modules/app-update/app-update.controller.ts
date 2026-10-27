import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppUpdateService } from './app-update.service';
import { AppVersionQueryDto, AppVersionResponseDto } from './dto/app-version.dto';

@ApiTags('App Update')
@Controller('app')
export class AppUpdateController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Get('version')
  @ApiOperation({ summary: 'Get latest release version metadata and check for updates' })
  @ApiResponse({ status: 200, type: AppVersionResponseDto, description: 'Latest app version metadata' })
  getVersion(@Query() query: AppVersionQueryDto): AppVersionResponseDto {
    return this.appUpdateService.getVersionInfo(query);
  }
}
