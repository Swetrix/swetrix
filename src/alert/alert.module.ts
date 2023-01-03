import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Alert } from './entity/alert.entity'
import { AlertService } from './alert.service'
import { ProjectModule } from 'src/project/project.module'
import { AppLoggerModule } from 'src/logger/logger.module'
import { UserModule } from 'src/user/user.module'
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
