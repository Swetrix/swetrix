import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { SaltService } from './salt.service'
import { Salt } from './entities/salt.entity'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'
import { ProjectModule } from '../project/project.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Salt]),
    forwardRef(() => UserModule),
    AppLoggerModule,
    ProjectModule,
  ],
  providers: [AnalyticsService, SaltService],
  exports: [AnalyticsService, SaltService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
