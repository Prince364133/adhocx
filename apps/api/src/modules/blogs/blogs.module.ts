import { Module } from '@nestjs/common';
import { BlogsController, AdminBlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BlogsController, AdminBlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
