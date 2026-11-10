import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DigioClient } from './digio.client';
import { DigioService } from './digio.service';
import { DigioController } from './digio.controller';

@Module({
  imports: [AuthModule],
  controllers: [DigioController],
  providers: [DigioClient, DigioService],
  exports: [DigioClient, DigioService],
})
export class DigioModule {}

