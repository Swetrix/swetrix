import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoriesModule } from '../categories/categories.module'
import { CdnModule } from '../cdn/cdn.module'
import { Extension } from './extension.entity'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'

@Module({
  imports: [TypeOrmModule.forFeature([Extension]), CategoriesModule, CdnModule],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
})
export class ExtensionsModule {}
