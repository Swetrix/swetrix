import { Module } from '@nestjs/common'
import { UserModule } from 'src/user/user.module'
import { SwetrixUpdate } from './tg.update'

@Module({
  imports: [UserModule],
  providers: [SwetrixUpdate],
})
export class TGModule {}
