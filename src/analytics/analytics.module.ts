import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Analytics } from './entity/analytics.entity'
import { AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'
import { UserModule } from '../user/user.module'
import { AppLoggerModule } from '../logger/logger.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Analytics]),
    forwardRef(() => UserModule),
    AppLoggerModule,
  ],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
