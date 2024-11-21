import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { ProjectModule } from '../project/project.module'
import { AppLoggerModule } from '../logger/logger.module'
import { UserModule } from '../user/user.module'
import { AlertService } from './alert.service'
import { Alert } from './entity/alert.entity'
import { AlertController } from './alert.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    ProjectModule,
    AppLoggerModule,
    UserModule,
  ],
  providers: [AlertService],
  exports: [AlertService],
  controllers: [AlertController],
})
export class AlertModule {}
