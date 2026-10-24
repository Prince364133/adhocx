import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Uploads')
@Controller()
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  @Get(['uploads/:filename', 'api/v1/uploads/:filename'])
  @ApiOperation({ summary: 'Serve locally stored uploaded documents and images' })
  @ApiResponse({ status: 200, description: 'File delivered successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getUploadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (
      !filename ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new BadRequestException('Invalid filename provided.');
    }

    const cleanFilename = path.basename(filename);
    const filePath = path.resolve(this.uploadDir, cleanFilename);

    if (!filePath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Security violation: Attempted path traversal.');
    }

    if (!fs.existsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      throw new NotFoundException(`File ${cleanFilename} not found on server.`);
    }

    // Set cache control for static document assets
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.sendFile(filePath);
  }
}
