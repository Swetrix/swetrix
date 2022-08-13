import { Module } from '@nestjs/common'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'

@Module({
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
})
export class ExtensionsModule {}
