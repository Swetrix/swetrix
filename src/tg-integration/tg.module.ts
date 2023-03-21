import { Module } from '@nestjs/common'
import { AnalyticsModule } from 'src/analytics/analytics.module'
import { ProjectModule } from 'src/project/project.module'
import { UserModule } from 'src/user/user.module'
import { AlertModule } from 'src/alert/alert.module'
import { SwetrixUpdate } from './tg.update'

@Module({
  imports: [UserModule, ProjectModule, AnalyticsModule, AlertModule],
  providers: [SwetrixUpdate],
})
export class TGModule {}
