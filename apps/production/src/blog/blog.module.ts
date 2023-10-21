import { Module } from '@nestjs/common'

import { AppLoggerModule } from '../logger/logger.module'
import { BlogController } from './blog.controller'
import { BlogService } from './blog.service'

@Module({
  imports: [AppLoggerModule],
  providers: [BlogService],
  exports: [BlogService],
  controllers: [BlogController],
})
export class BlogModule {}
