import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserModule } from '../../user/user.module'
import { ExtensionsModule } from '../extensions/extensions.module'
import { ComplaintsController } from './complaints.controller'
import { ComplaintsService } from './complaints.service'
import { Complaint } from './entities/complaint.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Complaint]),
    UserModule,
    ExtensionsModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
