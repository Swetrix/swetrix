import { UserModule } from 'src/user/user.module'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoriesModule } from '../categories/categories.module'
import { CdnModule } from '../cdn/cdn.module'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'
import { Extension } from './entities/extension.entity'
import { ExtensionToProject } from './entities/extension-to-project.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Extension, ExtensionToProject]),
    CategoriesModule,
    CdnModule,
    UserModule,
  ],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
})
export class ExtensionsModule {}
