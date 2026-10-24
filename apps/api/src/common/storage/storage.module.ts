import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileSanitizerService } from './file-sanitizer.service';
import { UploadsController } from './uploads.controller';

@Global()
@Module({
  controllers: [UploadsController],
  providers: [StorageService, FileSanitizerService],
  exports: [StorageService, FileSanitizerService],
})
export class StorageModule {}
