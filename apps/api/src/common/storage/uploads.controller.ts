import {
  Controller,
  Get,
  Param,
  Res,
  Query,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { StorageService, verifyPrivateUploadSignature, verifyUploadSignature } from './storage.service';

@ApiTags('Uploads')
@Controller()
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor(private readonly storage: StorageService) {}

  @Get(['private-uploads/:filename', 'api/v1/private-uploads/:filename'])
  @ApiOperation({ summary: 'Serve a private ticket attachment via a short-lived signed capability URL' })
  async getPrivateUploadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Query('provider') provider?: string,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
  ) {
    if (!filename || filename !== path.basename(filename) || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename provided.');
    }
    if (!verifyPrivateUploadSignature(filename, provider, exp, sig)) {
      throw new ForbiddenException('This attachment link has expired or is invalid. Reopen it from the ticket.');
    }
    const file = await this.storage.getPrivateFileBuffer(filename, provider!);
    if (!file) throw new NotFoundException('Support attachment not found.');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(file.filename)}"`);
    return res.send(file.buffer);
  }

  @Get(['uploads/:filename', 'api/v1/uploads/:filename'])
  @ApiOperation({ summary: 'Serve locally stored uploaded documents and images' })
  @ApiResponse({ status: 200, description: 'File delivered successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getUploadedFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Query('exp') exp?: string,
    @Query('sig') sig?: string,
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

    // Identity documents are served through signed, expiring links (StorageService.getDocumentAccessUrl).
    // A link that carries a signature must be valid. With STORAGE_REQUIRE_SIGNED_UPLOADS=true, unsigned
    // requests are refused as well (turn on once every client uses signed links).
    const signed = exp !== undefined || sig !== undefined;
    if (signed && !verifyUploadSignature(cleanFilename, exp, sig)) {
      throw new ForbiddenException('This document link has expired or is invalid. Reopen it from the app.');
    }
    if (!signed && process.env.STORAGE_REQUIRE_SIGNED_UPLOADS === 'true') {
      throw new ForbiddenException('A signed link is required for this file.');
    }

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

    // Signed (sensitive) documents must not be cached by shared caches or the browser beyond the link.
    res.setHeader('Cache-Control', signed ? 'private, no-store' : 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(resolvedPath);
  }
}
