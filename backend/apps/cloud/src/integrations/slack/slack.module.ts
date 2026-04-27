import { Module } from '@nestjs/common'
import { SlackService } from './slack.service'

@Module({
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
