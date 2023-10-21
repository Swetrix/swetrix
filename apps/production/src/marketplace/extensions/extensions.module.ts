import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CategoriesModule } from '../categories/categories.module'
import { CdnModule } from '../cdn/cdn.module'
import { ExtensionsController } from './extensions.controller'
import { ExtensionsService } from './extensions.service'
import { Extension } from './entities/extension.entity'
import { ExtensionToProject } from './entities/extension-to-project.entity'
import { ExtensionToUser } from './entities/extension-to-user.entity'
import { ProjectModule } from '../../project/project.module'
import { UserModule } from '../../user/user.module'
import { AppLoggerModule } from '../../logger/logger.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Extension, ExtensionToUser, ExtensionToProject]),
    CategoriesModule,
    CdnModule,
    UserModule,
    ProjectModule,
    AppLoggerModule,
  ],
  controllers: [ExtensionsController],
  providers: [ExtensionsService],
  exports: [ExtensionsService],
})
export class ExtensionsModule {}
