import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FileSanitizerService } from './file-sanitizer.service';

@Global()
@Module({
  providers: [StorageService, FileSanitizerService],
  exports: [StorageService, FileSanitizerService],
})
export class StorageModule {}
