import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { UserModule } from '../user/user.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { GoalService } from './goal.service'
import { Goal } from './entity/goal.entity'
import { GoalController } from './goal.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal]),
    ProjectModule,
    AppLoggerModule,
    UserModule,
    AnalyticsModule,
  ],
  providers: [GoalService],
  exports: [GoalService],
  controllers: [GoalController],
})
export class GoalModule {}
