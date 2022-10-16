import { Module } from '@nestjs/common'
import { ComplaintsController } from './complaints.controller'
import { ComplaintsService } from './complaints.service'

@Module({
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
