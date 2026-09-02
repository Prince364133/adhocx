import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';

@Module({
  imports: [AuthModule, DispatchModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
