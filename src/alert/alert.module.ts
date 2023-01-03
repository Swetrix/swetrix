import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Alert } from './entity/alert.entity'
import { AlertService } from './alert.service'
import { AlertController } from './alert.controller'

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
  ],
  providers: [AlertService],
  exports: [AlertService],
  controllers: [AlertController],
})
export class AlertModule {}
