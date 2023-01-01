import { Module } from '@nestjs/common'
import { ProjectModule } from 'src/project/project.module'
import { UserModule } from 'src/user/user.module'
import { SwetrixUpdate } from './tg.update'

@Module({
  imports: [UserModule, ProjectModule],
  providers: [SwetrixUpdate],
})
export class TGModule {}
