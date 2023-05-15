import { Module } from '@nestjs/common'
import { TaskManagerService } from './task-manager.service'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    AppLoggerModule,
  ],
  providers: [TaskManagerService],
  exports: [TaskManagerService],
})
export class TaskManagerModule {}
