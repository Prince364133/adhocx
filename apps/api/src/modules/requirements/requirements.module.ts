import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';

@Module({
  imports: [AuthModule, DispatchModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
