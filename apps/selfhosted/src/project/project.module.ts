import { Module } from '@nestjs/common'

import { ProjectService } from './project.service'
import { ProjectController } from './project.controller'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [AppLoggerModule],
  providers: [ProjectService],
  exports: [ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
