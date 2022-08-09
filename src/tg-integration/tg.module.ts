import { Module } from '@nestjs/common'
import { SwetrixUpdate } from './tg.update'

@Module({
  providers: [SwetrixUpdate],
})
export class TGModule {}
