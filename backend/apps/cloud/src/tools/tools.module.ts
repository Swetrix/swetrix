import { Module } from '@nestjs/common'
import { ToolsController } from './tools.controller'
import { ToolsService } from './tools.service'

@Module({
  controllers: [ToolsController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
