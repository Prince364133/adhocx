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

    // Check multiple candidate directories to handle Docker, monorepo root, or subpackage cwd
    const candidateDirs = [
      this.uploadDir,
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), 'apps/api/uploads'),
      path.resolve(process.cwd(), '../../uploads'),
      '/app/apps/api/uploads',
      '/app/uploads',
    ];

    let resolvedPath: string | null = null;
    for (const dir of candidateDirs) {
      if (fs.existsSync(dir)) {
        const potential = path.resolve(dir, cleanFilename);
        if (potential.startsWith(path.resolve(dir)) && fs.existsSync(potential)) {
          resolvedPath = potential;
          break;
        }
      }
    }

    if (!resolvedPath) {
      this.logger.warn(`File not found: ${cleanFilename} (searched candidate directories)`);
      throw new NotFoundException(`File ${cleanFilename} not found on server.`);
    }

    // Set cache control for static document assets
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.sendFile(resolvedPath);
  }
}
