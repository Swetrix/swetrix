import { Module } from '@nestjs/common'
import { AnalyticsModule } from 'src/analytics/analytics.module'
import { ProjectModule } from 'src/project/project.module'
import { UserModule } from 'src/user/user.module'
import { SwetrixUpdate } from './tg.update'
import { AlertModule } from 'src/alert/alert.module'

@Module({
  imports: [UserModule, ProjectModule, AnalyticsModule, AlertModule],
  providers: [SwetrixUpdate],
})
export class TGModule {}
