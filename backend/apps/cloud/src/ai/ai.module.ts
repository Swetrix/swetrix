import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { GoalModule } from '../goal/goal.module'
import { AiService } from './ai.service'
import { AiChatService } from './ai-chat.service'
import { AiController } from './ai.controller'
import { AiChat } from './entity/ai-chat.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([AiChat]),
    ProjectModule,
    AppLoggerModule,
    AnalyticsModule,
    GoalModule,
  ],
  providers: [AiService, AiChatService],
  controllers: [AiController],
})
export class AiModule {}
