import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController, AdminFeatureFlagsController } from './feature-flags.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FeatureFlagsController, AdminFeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
